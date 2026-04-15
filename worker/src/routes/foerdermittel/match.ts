import { Hono } from "hono";
import { z } from "zod";
import type {
  Bindings,
  Variables,
  FoerderprogrammRow,
  FoerdermittelProfileRow,
  FoerdermittelMatchRow,
} from "../../types";
import { requireAuth } from "../../middleware/auth";

export const match = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const profileSchema = z.object({
  company_name: z.string().min(1, "Firmenname erforderlich"),
  branche: z.string().optional(),
  standort: z.string().optional(),
  rechtsform: z.string().optional(),
  mitarbeiter_anzahl: z.number().int().min(0).optional(),
  jahresumsatz: z.number().min(0).optional(),
  gruendungsjahr: z.number().int().min(1800).max(2030).optional(),
  beschreibung: z.string().max(5000).optional(),
});

match.get("/profile", requireAuth, async (c) => {
  const user = c.get("user");
  const bafaDb = c.env.BAFA_DB;

  const profile = await bafaDb
    .prepare(
      "SELECT * FROM foerdermittel_profile WHERE user_id = ? ORDER BY created_at DESC LIMIT 1"
    )
    .bind(user.id)
    .first<FoerdermittelProfileRow>();

  if (!profile) return c.json({ success: true, data: null });

  return c.json({ success: true, data: profile });
});

match.post("/profile", requireAuth, async (c) => {
  const user = c.get("user");
  const bafaDb = c.env.BAFA_DB;
  const body = await c.req.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: "Validierungsfehler", details: parsed.error.issues },
      400
    );
  }

  const data = parsed.data;

  // Check if profile exists
  const existing = await bafaDb
    .prepare("SELECT id FROM foerdermittel_profile WHERE user_id = ? LIMIT 1")
    .bind(user.id)
    .first<{ id: string }>();

  if (existing) {
    await bafaDb
      .prepare(
        `UPDATE foerdermittel_profile SET
        company_name = ?, branche = ?, standort = ?, rechtsform = ?,
        mitarbeiter_anzahl = ?, jahresumsatz = ?, gruendungsjahr = ?,
        beschreibung = ?, updated_at = datetime('now')
      WHERE id = ?`
      )
      .bind(
        data.company_name,
        data.branche ?? null,
        data.standort ?? null,
        data.rechtsform ?? null,
        data.mitarbeiter_anzahl ?? null,
        data.jahresumsatz ?? null,
        data.gruendungsjahr ?? null,
        data.beschreibung ?? null,
        existing.id
      )
      .run();

    return c.json({ success: true, data: { id: existing.id } });
  }

  const id = crypto.randomUUID();
  await bafaDb
    .prepare(
      `INSERT INTO foerdermittel_profile
      (id, user_id, company_name, branche, standort, rechtsform, mitarbeiter_anzahl, jahresumsatz, gruendungsjahr, beschreibung)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      user.id,
      data.company_name,
      data.branche ?? null,
      data.standort ?? null,
      data.rechtsform ?? null,
      data.mitarbeiter_anzahl ?? null,
      data.jahresumsatz ?? null,
      data.gruendungsjahr ?? null,
      data.beschreibung ?? null
    )
    .run();

  return c.json({ success: true, data: { id } }, 201);
});

match.post("/match", requireAuth, async (c) => {
  const user = c.get("user");
  const bafaDb = c.env.BAFA_DB;
  const foerderDb = c.env.FOERDER_DB;
  const ai = c.env.AI;

  const profile = await bafaDb
    .prepare(
      "SELECT * FROM foerdermittel_profile WHERE user_id = ? ORDER BY created_at DESC LIMIT 1"
    )
    .bind(user.id)
    .first<FoerdermittelProfileRow>();

  if (!profile) {
    return c.json(
      { success: false, error: "Bitte erstellen Sie zuerst ein Unternehmensprofil" },
      400
    );
  }

  // Layer 1: rule-based pre-filter.
  const filterConditions: string[] = [];
  const filterParams: string[] = [];

  if (profile.standort) {
    filterConditions.push("(foerdergebiet LIKE ? OR foerdergebiet LIKE ?)");
    filterParams.push(`%${profile.standort}%`, "%Bundesweit%");
  }
  if (profile.branche) {
    filterConditions.push("foerderbereich LIKE ?");
    filterParams.push(`%${profile.branche}%`);
  }

  const whereClause = filterConditions.length > 0 ? `WHERE ${filterConditions.join(" AND ")}` : "";
  const candidateSql = `SELECT id, titel, foerderart, foerderbereich, foerdergebiet, foerderberechtigte, kurztext, volltext, rechtliche_voraussetzungen
    FROM foerderprogramme ${whereClause} LIMIT 100`;
  const candidates = await foerderDb
    .prepare(candidateSql)
    .bind(...filterParams)
    .all<FoerderprogrammRow>();

  if (!candidates.results || candidates.results.length === 0) {
    return c.json({ success: true, data: { matches: [], total: 0 } });
  }

  // Layer 2: AI scoring in batches of 10.
  const profileSummary = `Firma: ${profile.company_name}, Branche: ${profile.branche || "k.A."}, Standort: ${profile.standort || "k.A."}, Rechtsform: ${profile.rechtsform || "k.A."}, Mitarbeiter: ${profile.mitarbeiter_anzahl || "k.A."}, Jahresumsatz: ${profile.jahresumsatz || "k.A."}, Gründungsjahr: ${profile.gruendungsjahr || "k.A."}, Beschreibung: ${profile.beschreibung || "k.A."}`;

  const scoredMatches: Array<{
    programm_id: number;
    match_score: number;
    match_reasons: string[];
    disqualifiers: string[];
  }> = [];

  const chunks = [];
  for (let i = 0; i < candidates.results.length; i += 10) {
    chunks.push(candidates.results.slice(i, i + 10));
  }

  for (const chunk of chunks) {
    const programList = chunk
      .map(
        (p, idx) =>
          `[${idx}] ${p.titel} | Art: ${p.foerderart} | Berechtigte: ${p.foerderberechtigte} | Voraussetzungen: ${(p.rechtliche_voraussetzungen || "").slice(0, 500)}`
      )
      .join("\n\n");

    const prompt = `Du bist ein Experte für deutsche Förderprogramme. Bewerte die folgenden Programme für dieses Unternehmen.

UNTERNEHMEN:
${profileSummary}

PROGRAMME:
${programList}

Antworte AUSSCHLIESSLICH mit einem JSON-Array. Für jedes Programm:
[{"index": 0, "score": 0-100, "reasons": ["Grund1", "Grund2"], "disqualifiers": ["Blocker1"]}]

Bewerte score=0 wenn das Unternehmen eindeutig nicht berechtigt ist. Höhere Scores für bessere Passung.`;

    try {
      const result = (await ai.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
      })) as { response?: string };

      if (result.response) {
        const jsonMatch = result.response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const scores = JSON.parse(jsonMatch[0]) as Array<{
            index: number;
            score: number;
            reasons: string[];
            disqualifiers: string[];
          }>;
          for (const s of scores) {
            const program = chunk[s.index];
            if (program && s.score > 0) {
              scoredMatches.push({
                programm_id: program.id,
                match_score: Math.min(100, Math.max(0, s.score)),
                match_reasons: s.reasons || [],
                disqualifiers: s.disqualifiers || [],
              });
            }
          }
        }
      }
    } catch {
      // Partial results are acceptable if AI fails for a chunk.
    }
  }

  scoredMatches.sort((a, b) => b.match_score - a.match_score);

  await bafaDb
    .prepare("DELETE FROM foerdermittel_matches WHERE profile_id = ?")
    .bind(profile.id)
    .run();

  const topMatches = scoredMatches.slice(0, 50);
  for (const m of topMatches) {
    const matchId = crypto.randomUUID();
    await bafaDb
      .prepare(
        `INSERT INTO foerdermittel_matches (id, profile_id, programm_id, match_score, match_reasons, disqualifiers, status)
       VALUES (?, ?, ?, ?, ?, ?, 'matched')`
      )
      .bind(
        matchId,
        profile.id,
        m.programm_id,
        m.match_score,
        JSON.stringify(m.match_reasons),
        JSON.stringify(m.disqualifiers)
      )
      .run();
  }

  return c.json({
    success: true,
    data: {
      matches: topMatches,
      total: topMatches.length,
    },
  });
});

match.get("/matches", requireAuth, async (c) => {
  const user = c.get("user");
  const bafaDb = c.env.BAFA_DB;
  const foerderDb = c.env.FOERDER_DB;

  const profile = await bafaDb
    .prepare("SELECT id FROM foerdermittel_profile WHERE user_id = ? LIMIT 1")
    .bind(user.id)
    .first<{ id: string }>();

  if (!profile) return c.json({ success: true, data: { matches: [] } });

  const matches = await bafaDb
    .prepare(
      `SELECT * FROM foerdermittel_matches WHERE profile_id = ? AND status != 'dismissed'
     ORDER BY match_score DESC`
    )
    .bind(profile.id)
    .all<FoerdermittelMatchRow>();

  const enriched = [];
  for (const m of matches.results ?? []) {
    const program = await foerderDb
      .prepare(
        "SELECT id, titel, foerderart, foerdergebiet, kurztext FROM foerderprogramme WHERE id = ?"
      )
      .bind(m.programm_id)
      .first<FoerderprogrammRow>();

    enriched.push({
      ...m,
      match_reasons: JSON.parse(m.match_reasons || "[]"),
      disqualifiers: JSON.parse(m.disqualifiers || "[]"),
      programm: program || null,
    });
  }

  return c.json({ success: true, data: { matches: enriched } });
});
