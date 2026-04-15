import { Hono } from "hono";
import { z } from "zod";
import type {
  Bindings,
  Variables,
  FoerderprogrammRow,
  FoerdermittelProfileRow,
  FoerdermittelMatchRow,
  FoerdermittelCaseRow,
  FoerdermittelCaseStepRow,
  FoerdermittelFunnelTemplateRow,
  FoerdermittelDokumentRow,
  FoerdermittelConversationRow,
} from "../../types";
import * as FavoritesRepo from "../../repositories/favorites.repository";
import { requireAuth } from "../../middleware/auth";

const foerdermittel = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ============================================
// Catalog: List & Search programs
// ============================================

const katalogQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(50).default(20),
  limit: z.coerce.number().min(1).max(50).optional(), // backward compat
  foerderart: z.string().optional(),
  foerderbereich: z.string().optional(),
  foerdergebiet: z.string().optional(),
  foerderberechtigte: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(["titel", "foerderart", "foerdergebiet"]).default("titel"),
});

foerdermittel.get("/katalog", async (c) => {
  const raw = Object.fromEntries(new URL(c.req.url).searchParams);
  const parsed = katalogQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return c.json(
      { success: false, error: "Ungültige Parameter", details: parsed.error.issues },
      400
    );
  }

  const {
    page,
    pageSize: ps,
    limit: legacyLimit,
    foerderart,
    foerderbereich,
    foerdergebiet,
    foerderberechtigte,
    search,
    sort,
  } = parsed.data;
  const limit = legacyLimit ?? ps;
  const offset = (page - 1) * limit;
  const foerderDb = c.env.FOERDER_DB;

  // Build dynamic WHERE clauses — only show active programs by default
  const conditions: string[] = ["status != 'abgelaufen'"];
  const params: (string | number)[] = [];

  if (foerderart) {
    conditions.push("foerderart = ?");
    params.push(foerderart);
  }
  if (foerderbereich) {
    conditions.push("foerderbereich LIKE ?");
    params.push(`%${foerderbereich}%`);
  }
  if (foerdergebiet) {
    conditions.push("foerdergebiet LIKE ?");
    params.push(`%${foerdergebiet}%`);
  }
  if (foerderberechtigte) {
    conditions.push("foerderberechtigte LIKE ?");
    params.push(`%${foerderberechtigte}%`);
  }
  if (search) {
    conditions.push("(titel LIKE ? OR kurztext LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Count total
  const countSql = `SELECT COUNT(*) as total FROM foerderprogramme ${whereClause}`;
  const countResult = await foerderDb
    .prepare(countSql)
    .bind(...params)
    .first<{ total: number }>();
  const total = countResult?.total ?? 0;

  // Fetch page
  const pageSize = limit;
  const dataSql = `SELECT id, titel, typ, foerderart, foerderbereich, foerdergebiet, foerderberechtigte, kurztext
    FROM foerderprogramme ${whereClause}
    ORDER BY ${sort} ASC
    LIMIT ? OFFSET ?`;
  const dataResult = await foerderDb
    .prepare(dataSql)
    .bind(...params, pageSize, offset)
    .all<FoerderprogrammRow>();

  return c.json({
    success: true,
    data: dataResult.results ?? [],
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

// ============================================
// Catalog: Get filter options (distinct values)
// MUST be before /katalog/:id to avoid param catching "filters"
// ============================================

foerdermittel.get("/katalog/filters", async (c) => {
  const foerderDb = c.env.FOERDER_DB;

  const [artResult, bereichResult, gebietResult, berechtigteResult] = await foerderDb.batch([
    foerderDb.prepare(
      "SELECT DISTINCT foerderart FROM foerderprogramme WHERE foerderart IS NOT NULL AND status != 'abgelaufen' ORDER BY foerderart"
    ),
    foerderDb.prepare(
      "SELECT DISTINCT foerderbereich FROM foerderprogramme WHERE foerderbereich IS NOT NULL AND status != 'abgelaufen' ORDER BY foerderbereich"
    ),
    foerderDb.prepare(
      "SELECT DISTINCT foerdergebiet FROM foerderprogramme WHERE foerdergebiet IS NOT NULL AND status != 'abgelaufen' ORDER BY foerdergebiet"
    ),
    foerderDb.prepare(
      "SELECT DISTINCT foerderberechtigte FROM foerderprogramme WHERE foerderberechtigte IS NOT NULL AND status != 'abgelaufen' ORDER BY foerderberechtigte"
    ),
  ]);

  return c.json({
    success: true,
    data: {
      foerderart: ((artResult?.results ?? []) as Record<string, unknown>[]).map(
        (r) => r.foerderart
      ),
      foerderbereich: ((bereichResult?.results ?? []) as Record<string, unknown>[]).map(
        (r) => r.foerderbereich
      ),
      foerdergebiet: ((gebietResult?.results ?? []) as Record<string, unknown>[]).map(
        (r) => r.foerdergebiet
      ),
      foerderberechtigte: ((berechtigteResult?.results ?? []) as Record<string, unknown>[]).map(
        (r) => r.foerderberechtigte
      ),
    },
  });
});

// ============================================
// Catalog: Get single program detail
// ============================================

foerdermittel.get("/katalog/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ success: false, error: "Ungültige Programm-ID" }, 400);

  const foerderDb = c.env.FOERDER_DB;
  const program = await foerderDb
    .prepare("SELECT * FROM foerderprogramme WHERE id = ?")
    .bind(id)
    .first<FoerderprogrammRow>();

  if (!program) return c.json({ success: false, error: "Programm nicht gefunden" }, 404);

  return c.json({ success: true, data: program });
});

// ============================================
// Profile: Business profile for matchmaking
// ============================================

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

foerdermittel.get("/profile", requireAuth, async (c) => {
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

foerdermittel.post("/profile", requireAuth, async (c) => {
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
    // Update
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

  // Create
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

// ============================================
// Matchmaking: AI-powered program matching
// ============================================

foerdermittel.post("/match", requireAuth, async (c) => {
  const user = c.get("user");
  const bafaDb = c.env.BAFA_DB;
  const foerderDb = c.env.FOERDER_DB;
  const ai = c.env.AI;

  // Get user's profile
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

  // Layer 1: Rule-based pre-filter
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

  // Layer 2: AI scoring (batch in chunks of 10)
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
        // Extract JSON from response
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
      // If AI fails for a chunk, skip it — partial results are acceptable
    }
  }

  // Sort by score descending
  scoredMatches.sort((a, b) => b.match_score - a.match_score);

  // Delete old matches for this profile
  await bafaDb
    .prepare("DELETE FROM foerdermittel_matches WHERE profile_id = ?")
    .bind(profile.id)
    .run();

  // Save top 50 matches
  const topMatches = scoredMatches.slice(0, 50);
  for (const match of topMatches) {
    const matchId = crypto.randomUUID();
    await bafaDb
      .prepare(
        `INSERT INTO foerdermittel_matches (id, profile_id, programm_id, match_score, match_reasons, disqualifiers, status)
       VALUES (?, ?, ?, ?, ?, ?, 'matched')`
      )
      .bind(
        matchId,
        profile.id,
        match.programm_id,
        match.match_score,
        JSON.stringify(match.match_reasons),
        JSON.stringify(match.disqualifiers)
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

// Get saved matches
foerdermittel.get("/matches", requireAuth, async (c) => {
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

  // Enrich with program titles
  const enriched = [];
  for (const match of matches.results ?? []) {
    const program = await foerderDb
      .prepare(
        "SELECT id, titel, foerderart, foerdergebiet, kurztext FROM foerderprogramme WHERE id = ?"
      )
      .bind(match.programm_id)
      .first<FoerderprogrammRow>();

    enriched.push({
      ...match,
      match_reasons: JSON.parse(match.match_reasons || "[]"),
      disqualifiers: JSON.parse(match.disqualifiers || "[]"),
      programm: program || null,
    });
  }

  return c.json({ success: true, data: { matches: enriched } });
});

// ============================================
// Cases: Workflow engine
// ============================================

foerdermittel.post("/cases", requireAuth, async (c) => {
  const user = c.get("user");
  const bafaDb = c.env.BAFA_DB;
  const foerderDb = c.env.FOERDER_DB;
  const ai = c.env.AI;

  const rawBody = (await c.req.json()) as { match_id?: string; programm_id: number | string };
  if (!rawBody.programm_id && rawBody.programm_id !== 0)
    return c.json({ success: false, error: "programm_id erforderlich" }, 400);
  // Type-coerce: frontend may send a string id; foerderprogramme.id is INTEGER.
  const coercedProgrammId =
    typeof rawBody.programm_id === "number"
      ? rawBody.programm_id
      : Number(rawBody.programm_id);
  if (Number.isNaN(coercedProgrammId)) {
    return c.json({ success: false, error: "programm_id ungültig" }, 400);
  }
  const body = { ...rawBody, programm_id: coercedProgrammId };

  // Sprint 19: always read fresh from bafa_antraege.unternehmen and
  // upsert foerdermittel_profile so subsequent updates to the company
  // profile sync through to the funnel generator. Replaces the
  // Sprint-14 one-shot mirror that froze data on first antrag.
  const u = await bafaDb
    .prepare("SELECT * FROM unternehmen WHERE user_id = ? AND deleted_at IS NULL LIMIT 1")
    .bind(user.id)
    .first<{
      firmenname: string;
      branche: string | null;
      ort: string | null;
      bundesland: string | null;
      rechtsform: string | null;
      mitarbeiter_anzahl: number | null;
      jahresumsatz: number | null;
      gruendungsjahr: number | null;
    }>();
  if (!u) {
    return c.json(
      { success: false, error: "Bitte zuerst Unternehmensprofil unter /onboarding/unternehmen anlegen" },
      400
    );
  }
  const standort = [u.ort, u.bundesland].filter(Boolean).join(", ") || null;
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
            updated_at = datetime('now')
          WHERE id = ?`
      )
      .bind(
        u.firmenname,
        u.branche,
        standort,
        u.rechtsform,
        u.mitarbeiter_anzahl,
        u.jahresumsatz,
        u.gruendungsjahr,
        existing.id
      )
      .run();
  } else {
    await bafaDb
      .prepare(
        `INSERT INTO foerdermittel_profile
          (id, user_id, company_name, branche, standort, rechtsform,
           mitarbeiter_anzahl, jahresumsatz, gruendungsjahr)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        user.id,
        u.firmenname,
        u.branche,
        standort,
        u.rechtsform,
        u.mitarbeiter_anzahl,
        u.jahresumsatz,
        u.gruendungsjahr
      )
      .run();
  }
  const profile = await bafaDb
    .prepare("SELECT * FROM foerdermittel_profile WHERE user_id = ? LIMIT 1")
    .bind(user.id)
    .first<FoerdermittelProfileRow>();
  if (!profile) return c.json({ success: false, error: "Profil-Sync fehlgeschlagen" }, 500);

  // Get program details for funnel generation
  const program = await foerderDb
    .prepare("SELECT * FROM foerderprogramme WHERE id = ?")
    .bind(body.programm_id)
    .first<FoerderprogrammRow>();
  if (!program) return c.json({ success: false, error: "Programm nicht gefunden" }, 404);

  // Check for existing funnel template or generate one
  let template = await bafaDb
    .prepare("SELECT * FROM foerdermittel_funnel_templates WHERE programm_id = ?")
    .bind(body.programm_id)
    .first<FoerdermittelFunnelTemplateRow>();

  if (!template) {
    // Generate funnel template via AI
    const funnelPrompt = `Du bist ein Experte für deutsche Fördermittelanträge. Erstelle einen strukturierten Antragsprozess für folgendes Förderprogramm:

PROGRAMM: ${program.titel}
ART: ${program.foerderart}
VORAUSSETZUNGEN: ${program.rechtliche_voraussetzungen || "Keine angegeben"}
VOLLTEXT: ${(program.volltext || "").slice(0, 2000)}

Erstelle ein JSON mit Phasen und Schritten. Jede Phase hat steps mit Typ:
- document_upload: Dokument hochladen
- form_fill: Formular ausfüllen
- ai_review: KI-Prüfung
- consultant_action: Berater-Aktion
- approval: Genehmigung

Format:
{
  "phases": [
    {
      "id": "eligibility_check",
      "title": "Eignungsprüfung",
      "steps": [
        {"title": "...", "description": "...", "type": "form_fill", "required": true}
      ]
    }
  ]
}

Verwende diese Phase-IDs: eligibility_check, document_collection, application_draft, review, submission, follow_up.
Antworte NUR mit dem JSON.`;

    try {
      const result = (await ai.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
        messages: [{ role: "user", content: funnelPrompt }],
        max_tokens: 3000,
      })) as { response?: string };

      let phasesJson = "[]";
      if (result.response) {
        const jsonMatch = result.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          phasesJson = JSON.stringify(parsed.phases || []);
        }
      }

      const templateId = crypto.randomUUID();
      await bafaDb
        .prepare(
          `INSERT INTO foerdermittel_funnel_templates (id, programm_id, phases, generated_by)
         VALUES (?, ?, ?, ?)`
        )
        .bind(templateId, body.programm_id, phasesJson, "@cf/meta/llama-3.1-8b-instruct-fp8")
        .run();

      template = await bafaDb
        .prepare("SELECT * FROM foerdermittel_funnel_templates WHERE id = ?")
        .bind(templateId)
        .first<FoerdermittelFunnelTemplateRow>();
    } catch {
      // Fallback: create with default phases
      const defaultPhases = JSON.stringify([
        {
          id: "eligibility_check",
          title: "Eignungsprüfung",
          steps: [
            {
              title: "Unternehmensform prüfen",
              description: "Prüfen Sie ob Ihre Unternehmensform berechtigt ist",
              type: "form_fill",
              required: true,
            },
            {
              title: "KI-Eignungsbewertung",
              description: "Automatische Prüfung der Grundvoraussetzungen",
              type: "ai_review",
              required: true,
            },
          ],
        },
        {
          id: "document_collection",
          title: "Dokumentensammlung",
          steps: [
            {
              title: "Handelsregisterauszug",
              description: "Aktueller Handelsregisterauszug hochladen",
              type: "document_upload",
              required: true,
            },
            {
              title: "Jahresabschluss",
              description: "Jahresabschluss der letzten 2 Jahre",
              type: "document_upload",
              required: true,
            },
          ],
        },
        {
          id: "application_draft",
          title: "Antragsentwurf",
          steps: [
            {
              title: "KI-Antragsgenerierung",
              description: "KI erstellt einen Antragsentwurf",
              type: "ai_review",
              required: true,
            },
            {
              title: "Berater-Review",
              description: "Ihr Berater prüft den Entwurf",
              type: "consultant_action",
              required: true,
            },
          ],
        },
        {
          id: "review",
          title: "Prüfung",
          steps: [
            {
              title: "Finale Prüfung",
              description: "Letzte Überprüfung aller Unterlagen",
              type: "consultant_action",
              required: true,
            },
            {
              title: "Freigabe",
              description: "Bestätigen Sie die Einreichung",
              type: "approval",
              required: true,
            },
          ],
        },
        {
          id: "submission",
          title: "Einreichung",
          steps: [
            {
              title: "Antragspaket erstellen",
              description: "Alle Unterlagen zusammenstellen",
              type: "ai_review",
              required: true,
            },
            {
              title: "Einreichung bestätigen",
              description: "Antrag als eingereicht markieren",
              type: "approval",
              required: true,
            },
          ],
        },
        {
          id: "follow_up",
          title: "Nachverfolgung",
          steps: [
            {
              title: "Bescheid abwarten",
              description: "Bearbeitungsstatus verfolgen",
              type: "form_fill",
              required: false,
            },
          ],
        },
      ]);

      const templateId = crypto.randomUUID();
      await bafaDb
        .prepare(
          `INSERT INTO foerdermittel_funnel_templates (id, programm_id, phases, generated_by)
         VALUES (?, ?, ?, 'fallback')`
        )
        .bind(templateId, body.programm_id, defaultPhases)
        .run();

      template = await bafaDb
        .prepare("SELECT * FROM foerdermittel_funnel_templates WHERE id = ?")
        .bind(templateId)
        .first<FoerdermittelFunnelTemplateRow>();
    }
  }

  // Create the case
  const caseId = crypto.randomUUID();
  await bafaDb
    .prepare(
      `INSERT INTO foerdermittel_cases (id, match_id, profile_id, programm_id, phase, status)
     VALUES (?, ?, ?, ?, 'eligibility_check', 'active')`
    )
    .bind(caseId, body.match_id ?? null, profile.id, body.programm_id)
    .run();

  // Copy template steps into case_steps
  if (template) {
    const phases = JSON.parse(template.phases) as Array<{
      id: string;
      title: string;
      steps: Array<{ title: string; description: string; type: string; required: boolean }>;
    }>;

    let stepOrder = 0;
    for (const phase of phases) {
      for (const step of phase.steps || []) {
        stepOrder++;
        await bafaDb
          .prepare(
            `INSERT INTO foerdermittel_case_steps (id, case_id, phase, step_order, title, description, step_type, required, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
          )
          .bind(
            crypto.randomUUID(),
            caseId,
            phase.id,
            stepOrder,
            step.title,
            step.description,
            step.type,
            step.required ? 1 : 0
          )
          .run();
      }
    }
  }

  // Update match status if applicable
  if (body.match_id) {
    await bafaDb
      .prepare("UPDATE foerdermittel_matches SET status = 'started' WHERE id = ?")
      .bind(body.match_id)
      .run();
  }

  return c.json({ success: true, data: { caseId } }, 201);
});

// List user's cases
foerdermittel.get("/cases", requireAuth, async (c) => {
  const user = c.get("user");
  const bafaDb = c.env.BAFA_DB;
  const foerderDb = c.env.FOERDER_DB;

  const profile = await bafaDb
    .prepare("SELECT id FROM foerdermittel_profile WHERE user_id = ? LIMIT 1")
    .bind(user.id)
    .first<{ id: string }>();
  if (!profile) return c.json({ success: true, data: { cases: [] } });

  const cases = await bafaDb
    .prepare(`SELECT * FROM foerdermittel_cases WHERE profile_id = ? ORDER BY created_at DESC`)
    .bind(profile.id)
    .all<FoerdermittelCaseRow>();

  // Enrich with program info and step counts
  const enriched = [];
  for (const cs of cases.results ?? []) {
    const program = await foerderDb
      .prepare("SELECT id, titel, foerderart FROM foerderprogramme WHERE id = ?")
      .bind(cs.programm_id)
      .first<FoerderprogrammRow>();

    const stepCounts = await bafaDb
      .prepare(
        `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM foerdermittel_case_steps WHERE case_id = ?`
      )
      .bind(cs.id)
      .first<{ total: number; completed: number }>();

    enriched.push({
      ...cs,
      programm: program || null,
      steps_total: stepCounts?.total ?? 0,
      steps_completed: stepCounts?.completed ?? 0,
    });
  }

  return c.json({ success: true, data: { cases: enriched } });
});

// Get single case with all steps
foerdermittel.get("/cases/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const caseId = c.req.param("id");
  const bafaDb = c.env.BAFA_DB;
  const foerderDb = c.env.FOERDER_DB;

  const profile = await bafaDb
    .prepare("SELECT id FROM foerdermittel_profile WHERE user_id = ? LIMIT 1")
    .bind(user.id)
    .first<{ id: string }>();
  if (!profile) return c.json({ success: false, error: "Nicht autorisiert" }, 403);

  const cs = await bafaDb
    .prepare("SELECT * FROM foerdermittel_cases WHERE id = ? AND profile_id = ?")
    .bind(caseId, profile.id)
    .first<FoerdermittelCaseRow>();
  if (!cs) return c.json({ success: false, error: "Fall nicht gefunden" }, 404);

  const steps = await bafaDb
    .prepare("SELECT * FROM foerdermittel_case_steps WHERE case_id = ? ORDER BY step_order")
    .bind(caseId)
    .all<FoerdermittelCaseStepRow>();

  const program = await foerderDb
    .prepare("SELECT * FROM foerderprogramme WHERE id = ?")
    .bind(cs.programm_id)
    .first<FoerderprogrammRow>();

  return c.json({
    success: true,
    data: {
      ...cs,
      steps: steps.results ?? [],
      programm: program || null,
    },
  });
});

// Complete a step
foerdermittel.patch("/cases/:caseId/steps/:stepId", requireAuth, async (c) => {
  const user = c.get("user");
  const { caseId, stepId } = c.req.param();
  const bafaDb = c.env.BAFA_DB;
  const body = (await c.req.json()) as { status?: string; result_data?: Record<string, unknown> };

  // Verify ownership
  const profile = await bafaDb
    .prepare("SELECT id FROM foerdermittel_profile WHERE user_id = ? LIMIT 1")
    .bind(user.id)
    .first<{ id: string }>();
  if (!profile) return c.json({ success: false, error: "Nicht autorisiert" }, 403);

  const cs = await bafaDb
    .prepare("SELECT id, phase FROM foerdermittel_cases WHERE id = ? AND profile_id = ?")
    .bind(caseId, profile.id)
    .first<{ id: string; phase: string }>();
  if (!cs) return c.json({ success: false, error: "Fall nicht gefunden" }, 404);

  const newStatus = body.status || "completed";
  const resultData = body.result_data ? JSON.stringify(body.result_data) : null;

  await bafaDb
    .prepare(
      `UPDATE foerdermittel_case_steps SET
      status = ?, result_data = ?, completed_at = CASE WHEN ? = 'completed' THEN datetime('now') ELSE completed_at END
    WHERE id = ? AND case_id = ?`
    )
    .bind(newStatus, resultData, newStatus, stepId, caseId)
    .run();

  // Check if all required steps in current phase are completed → advance phase
  const phaseSteps = await bafaDb
    .prepare(
      `SELECT required, status FROM foerdermittel_case_steps WHERE case_id = ? AND phase = ?`
    )
    .bind(caseId, cs.phase)
    .all<{ required: number; status: string }>();

  const allRequiredDone = (phaseSteps.results ?? []).every(
    (s) => s.required === 0 || s.status === "completed"
  );

  if (allRequiredDone) {
    const phaseOrder = [
      "eligibility_check",
      "document_collection",
      "application_draft",
      "review",
      "submission",
      "follow_up",
    ];
    const currentIdx = phaseOrder.indexOf(cs.phase);
    if (currentIdx < phaseOrder.length - 1) {
      const nextPhase = phaseOrder[currentIdx + 1];
      await bafaDb
        .prepare(
          "UPDATE foerdermittel_cases SET phase = ?, updated_at = datetime('now') WHERE id = ?"
        )
        .bind(nextPhase, caseId)
        .run();
    } else {
      // Final phase completed
      await bafaDb
        .prepare(
          "UPDATE foerdermittel_cases SET status = 'completed', updated_at = datetime('now') WHERE id = ?"
        )
        .bind(caseId)
        .run();
    }
  }

  return c.json({ success: true });
});

// ============================================
// Cases Chat: Dedicated case-scoped chat endpoint
// ============================================

const caseChatSchema = z.object({
  message: z.string().min(1).max(5000),
  conversation_id: z.string().optional(),
});

foerdermittel.post("/cases/:id/chat", requireAuth, async (c) => {
  const user = c.get("user");
  const caseId = c.req.param("id");
  const bafaDb = c.env.BAFA_DB;
  const foerderDb = c.env.FOERDER_DB;
  const ai = c.env.AI;

  const body = await c.req.json();
  const parsed = caseChatSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { success: false, error: "Validierungsfehler", details: parsed.error.issues },
      400
    );
  const { message, conversation_id } = parsed.data;

  // Get profile and verify ownership
  const profile = await bafaDb
    .prepare("SELECT * FROM foerdermittel_profile WHERE user_id = ? LIMIT 1")
    .bind(user.id)
    .first<FoerdermittelProfileRow>();
  if (!profile) return c.json({ success: false, error: "Profil erforderlich" }, 400);

  const cs = await bafaDb
    .prepare("SELECT * FROM foerdermittel_cases WHERE id = ? AND profile_id = ?")
    .bind(caseId, profile.id)
    .first<FoerdermittelCaseRow>();
  if (!cs)
    return c.json({ success: false, error: "Fall nicht gefunden oder nicht autorisiert" }, 404);

  // Load or create conversation
  let conversation: FoerdermittelConversationRow | null = null;
  let messages: Array<{ role: string; content: string; timestamp: string }> = [];

  if (conversation_id) {
    conversation = await bafaDb
      .prepare("SELECT * FROM foerdermittel_conversations WHERE id = ? AND profile_id = ?")
      .bind(conversation_id, profile.id)
      .first<FoerdermittelConversationRow>();
    if (conversation) messages = JSON.parse(conversation.messages);
  }

  // Build system context with case + program info
  let systemPrompt = `Du bist ein Experte für deutsche Fördermittel und unterstützt Unternehmen bei der Antragstellung. Antworte auf Deutsch, professionell und hilfreich. Beziehe dich auf konkrete Förderprogramme und rechtliche Anforderungen.

UNTERNEHMEN: ${profile.company_name}, Branche: ${profile.branche || "k.A."}, Standort: ${profile.standort || "k.A."}, Rechtsform: ${profile.rechtsform || "k.A."}`;

  // Always load case context for this endpoint
  const program = await foerderDb
    .prepare(
      "SELECT titel, volltext, rechtliche_voraussetzungen FROM foerderprogramme WHERE id = ?"
    )
    .bind(cs.programm_id)
    .first<FoerderprogrammRow>();

  if (program) {
    systemPrompt += `\n\nAKTUELLES FÖRDERPROGRAMM: ${program.titel}
PHASE: ${cs.phase}
VORAUSSETZUNGEN: ${(program.rechtliche_voraussetzungen || "").slice(0, 2000)}`;
  }

  // Load current steps for richer context
  const steps = await bafaDb
    .prepare(
      "SELECT title, phase, status FROM foerdermittel_case_steps WHERE case_id = ? ORDER BY step_order"
    )
    .bind(caseId)
    .all<{ title: string; phase: string; status: string }>();

  if (steps.results && steps.results.length > 0) {
    const stepsInfo = steps.results
      .map((s) => `- [${s.status}] ${s.title} (${s.phase})`)
      .join("\n");
    systemPrompt += `\n\nAKTUELLE SCHRITTE:\n${stepsInfo}`;
  }

  // Add user message
  const timestamp = new Date().toISOString();
  messages.push({ role: "user", content: message, timestamp });

  // Build AI messages (keep last 20 for context)
  const aiMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages
      .slice(-20)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  const result = (await ai.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
    messages: aiMessages,
    max_tokens: 1500,
  })) as { response?: string };

  const assistantMessage =
    result.response || "Entschuldigung, ich konnte keine Antwort generieren.";
  messages.push({
    role: "assistant",
    content: assistantMessage,
    timestamp: new Date().toISOString(),
  });

  // Save conversation
  if (conversation) {
    await bafaDb
      .prepare(
        "UPDATE foerdermittel_conversations SET messages = ?, updated_at = datetime('now') WHERE id = ?"
      )
      .bind(JSON.stringify(messages), conversation.id)
      .run();
  } else {
    const convId = conversation_id || crypto.randomUUID();
    await bafaDb
      .prepare(
        `INSERT INTO foerdermittel_conversations (id, case_id, profile_id, context, messages)
       VALUES (?, ?, ?, ?, ?)`
      )
      .bind(convId, caseId, profile.id, "funnel_guidance", JSON.stringify(messages))
      .run();
    conversation = { id: convId } as FoerdermittelConversationRow;
  }

  return c.json({
    success: true,
    data: {
      conversation_id: conversation!.id,
      message: assistantMessage,
    },
  });
});

// ============================================
// AI Chat: Conversation with funnel agent
// ============================================

const chatSchema = z.object({
  message: z.string().min(1).max(5000),
  case_id: z.string().optional(),
  context: z.enum(["matchmaking", "funnel_guidance", "document_help"]).default("funnel_guidance"),
  conversation_id: z.string().optional(),
});

foerdermittel.post("/chat", requireAuth, async (c) => {
  const user = c.get("user");
  const bafaDb = c.env.BAFA_DB;
  const foerderDb = c.env.FOERDER_DB;
  const ai = c.env.AI;

  const body = await c.req.json();
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { success: false, error: "Validierungsfehler", details: parsed.error.issues },
      400
    );
  const { message, case_id, context, conversation_id } = parsed.data;

  // Get profile
  const profile = await bafaDb
    .prepare("SELECT * FROM foerdermittel_profile WHERE user_id = ? LIMIT 1")
    .bind(user.id)
    .first<FoerdermittelProfileRow>();
  if (!profile) return c.json({ success: false, error: "Profil erforderlich" }, 400);

  // Load or create conversation
  let conversation: FoerdermittelConversationRow | null = null;
  let messages: Array<{ role: string; content: string; timestamp: string }> = [];

  if (conversation_id) {
    conversation = await bafaDb
      .prepare("SELECT * FROM foerdermittel_conversations WHERE id = ? AND profile_id = ?")
      .bind(conversation_id, profile.id)
      .first<FoerdermittelConversationRow>();
    if (conversation) messages = JSON.parse(conversation.messages);
  }

  // Build system context
  let systemPrompt = `Du bist ein Experte für deutsche Fördermittel und unterstützt Unternehmen bei der Antragstellung. Antworte auf Deutsch, professionell und hilfreich. Beziehe dich auf konkrete Förderprogramme und rechtliche Anforderungen.

UNTERNEHMEN: ${profile.company_name}, Branche: ${profile.branche || "k.A."}, Standort: ${profile.standort || "k.A."}, Rechtsform: ${profile.rechtsform || "k.A."}`;

  // Add case context if available
  if (case_id) {
    const cs = await bafaDb
      .prepare("SELECT * FROM foerdermittel_cases WHERE id = ? AND profile_id = ?")
      .bind(case_id, profile.id)
      .first<FoerdermittelCaseRow>();

    if (cs) {
      const program = await foerderDb
        .prepare(
          "SELECT titel, volltext, rechtliche_voraussetzungen FROM foerderprogramme WHERE id = ?"
        )
        .bind(cs.programm_id)
        .first<FoerderprogrammRow>();

      if (program) {
        systemPrompt += `\n\nAKTUELLES FÖRDERPROGRAMM: ${program.titel}
PHASE: ${cs.phase}
VORAUSSETZUNGEN: ${(program.rechtliche_voraussetzungen || "").slice(0, 2000)}`;
      }
    }
  }

  // Add user message
  const timestamp = new Date().toISOString();
  messages.push({ role: "user", content: message, timestamp });

  // Build AI messages (keep last 20 messages for context)
  const aiMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages
      .slice(-20)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  const result = (await ai.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
    messages: aiMessages,
    max_tokens: 1500,
  })) as { response?: string };

  const assistantMessage =
    result.response || "Entschuldigung, ich konnte keine Antwort generieren.";
  messages.push({
    role: "assistant",
    content: assistantMessage,
    timestamp: new Date().toISOString(),
  });

  // Save conversation
  if (conversation) {
    await bafaDb
      .prepare(
        "UPDATE foerdermittel_conversations SET messages = ?, updated_at = datetime('now') WHERE id = ?"
      )
      .bind(JSON.stringify(messages), conversation.id)
      .run();
  } else {
    const convId = conversation_id || crypto.randomUUID();
    await bafaDb
      .prepare(
        `INSERT INTO foerdermittel_conversations (id, case_id, profile_id, context, messages)
       VALUES (?, ?, ?, ?, ?)`
      )
      .bind(convId, case_id ?? null, profile.id, context, JSON.stringify(messages))
      .run();
    conversation = { id: convId } as FoerdermittelConversationRow;
  }

  return c.json({
    success: true,
    data: {
      conversation_id: conversation!.id,
      message: assistantMessage,
    },
  });
});

// Get conversation history
foerdermittel.get("/chat/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const conversationId = c.req.param("id");
  const bafaDb = c.env.BAFA_DB;

  const profile = await bafaDb
    .prepare("SELECT id FROM foerdermittel_profile WHERE user_id = ? LIMIT 1")
    .bind(user.id)
    .first<{ id: string }>();
  if (!profile) return c.json({ success: false, error: "Nicht autorisiert" }, 403);

  const conversation = await bafaDb
    .prepare("SELECT * FROM foerdermittel_conversations WHERE id = ? AND profile_id = ?")
    .bind(conversationId, profile.id)
    .first<FoerdermittelConversationRow>();

  if (!conversation) return c.json({ success: false, error: "Konversation nicht gefunden" }, 404);

  return c.json({
    success: true,
    data: {
      ...conversation,
      messages: JSON.parse(conversation.messages),
    },
  });
});

// ============================================
// Documents: Upload & tracking
// ============================================

foerdermittel.post("/cases/:caseId/dokumente", requireAuth, async (c) => {
  const user = c.get("user");
  const caseId = c.req.param("caseId");
  const bafaDb = c.env.BAFA_DB;
  const r2 = c.env.REPORTS;

  // Verify ownership
  const profile = await bafaDb
    .prepare("SELECT id FROM foerdermittel_profile WHERE user_id = ? LIMIT 1")
    .bind(user.id)
    .first<{ id: string }>();
  if (!profile) return c.json({ success: false, error: "Nicht autorisiert" }, 403);

  const cs = await bafaDb
    .prepare("SELECT id FROM foerdermittel_cases WHERE id = ? AND profile_id = ?")
    .bind(caseId, profile.id)
    .first<{ id: string }>();
  if (!cs) return c.json({ success: false, error: "Fall nicht gefunden" }, 404);

  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  const stepId = formData.get("step_id") as string | null;
  const dokumentTyp = (formData.get("dokument_typ") as string) || "custom";

  if (!file) return c.json({ success: false, error: "Datei erforderlich" }, 400);

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return c.json({ success: false, error: "Datei zu groß (max 10 MB)" }, 400);
  }

  // Upload to R2
  const docId = crypto.randomUUID();
  const r2Key = `foerdermittel/${caseId}/${docId}-${file.name}`;
  await r2.put(r2Key, await file.arrayBuffer(), {
    customMetadata: { caseId, dokumentTyp, originalName: file.name },
  });

  // Save metadata
  await bafaDb
    .prepare(
      `INSERT INTO foerdermittel_dokumente (id, case_id, step_id, dokument_typ, dateiname, dateityp, dateigroesse, r2_key, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'uploaded')`
    )
    .bind(docId, caseId, stepId ?? null, dokumentTyp, file.name, file.type, file.size, r2Key)
    .run();

  // If linked to a step, mark step as in_progress
  if (stepId) {
    await bafaDb
      .prepare(
        "UPDATE foerdermittel_case_steps SET status = 'in_progress' WHERE id = ? AND case_id = ?"
      )
      .bind(stepId, caseId)
      .run();
  }

  return c.json({ success: true, data: { id: docId, r2_key: r2Key } }, 201);
});

// List documents for a case
foerdermittel.get("/cases/:caseId/dokumente", requireAuth, async (c) => {
  const user = c.get("user");
  const caseId = c.req.param("caseId");
  const bafaDb = c.env.BAFA_DB;

  const profile = await bafaDb
    .prepare("SELECT id FROM foerdermittel_profile WHERE user_id = ? LIMIT 1")
    .bind(user.id)
    .first<{ id: string }>();
  if (!profile) return c.json({ success: false, error: "Nicht autorisiert" }, 403);

  const cs = await bafaDb
    .prepare("SELECT id FROM foerdermittel_cases WHERE id = ? AND profile_id = ?")
    .bind(caseId, profile.id)
    .first<{ id: string }>();
  if (!cs) return c.json({ success: false, error: "Fall nicht gefunden" }, 404);

  const docs = await bafaDb
    .prepare("SELECT * FROM foerdermittel_dokumente WHERE case_id = ? ORDER BY uploaded_at DESC")
    .bind(caseId)
    .all<FoerdermittelDokumentRow>();

  return c.json({ success: true, data: { dokumente: docs.results ?? [] } });
});

// ============================================
// Notifications
// ============================================

foerdermittel.get("/notifications", requireAuth, async (c) => {
  const user = c.get("user");
  const bafaDb = c.env.BAFA_DB;

  const notifications = await bafaDb
    .prepare(
      `SELECT * FROM foerdermittel_benachrichtigungen
     WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
    )
    .bind(user.id)
    .all();

  const unreadCount = await bafaDb
    .prepare(
      "SELECT COUNT(*) as count FROM foerdermittel_benachrichtigungen WHERE user_id = ? AND gelesen = 0"
    )
    .bind(user.id)
    .first<{ count: number }>();

  return c.json({
    success: true,
    data: {
      notifications: notifications.results ?? [],
      unread_count: unreadCount?.count ?? 0,
    },
  });
});

foerdermittel.patch("/notifications/:id/read", requireAuth, async (c) => {
  const user = c.get("user");
  const notifId = c.req.param("id");
  const bafaDb = c.env.BAFA_DB;

  await bafaDb
    .prepare("UPDATE foerdermittel_benachrichtigungen SET gelesen = 1 WHERE id = ? AND user_id = ?")
    .bind(notifId, user.id)
    .run();

  return c.json({ success: true });
});

// ============================================
// Favorites: Bookmark programs
// ============================================

foerdermittel.get("/favorites", requireAuth, async (c) => {
  const user = c.get("user");
  const foerderDb = c.env.FOERDER_DB;

  const favorites = await FavoritesRepo.listByUser(foerderDb, user.id);

  return c.json({ success: true, data: favorites });
});

foerdermittel.post("/favorites", requireAuth, async (c) => {
  const user = c.get("user");
  const foerderDb = c.env.FOERDER_DB;
  const body = await c.req.json();

  const programId = Number(body.programId);
  if (!programId || isNaN(programId)) {
    return c.json({ success: false, error: "programId erforderlich" }, 400);
  }

  // Verify program exists
  const program = await foerderDb
    .prepare("SELECT id FROM foerderprogramme WHERE id = ?")
    .bind(programId)
    .first<{ id: number }>();

  if (!program) {
    return c.json({ success: false, error: "Programm nicht gefunden" }, 404);
  }

  const id = await FavoritesRepo.add(foerderDb, user.id, programId);

  return c.json({ success: true, data: { id } }, 201);
});

foerdermittel.delete("/favorites/:programId", requireAuth, async (c) => {
  const user = c.get("user");
  const foerderDb = c.env.FOERDER_DB;
  const programId = parseInt(c.req.param("programId"), 10);

  if (isNaN(programId)) {
    return c.json({ success: false, error: "Ungültige Programm-ID" }, 400);
  }

  const removed = await FavoritesRepo.remove(foerderDb, user.id, programId);

  if (!removed) {
    return c.json({ success: false, error: "Favorit nicht gefunden" }, 404);
  }

  return c.json({ success: true });
});

foerdermittel.get("/favorites/:programId/check", requireAuth, async (c) => {
  const user = c.get("user");
  const foerderDb = c.env.FOERDER_DB;
  const programId = parseInt(c.req.param("programId"), 10);

  if (isNaN(programId)) {
    return c.json({ success: false, error: "Ungültige Programm-ID" }, 400);
  }

  const isFav = await FavoritesRepo.isFavorite(foerderDb, user.id, programId);

  return c.json({ success: true, data: { isFavorite: isFav } });
});

// GET /program-documents/:programId — fetch required documents for a program
foerdermittel.get("/program-documents/:programId", requireAuth, async (c) => {
  const { programId } = c.req.param();
  const foerderDb = c.env.FOERDER_DB;

  const { results } = await foerderDb
    .prepare(
      "SELECT * FROM program_documents WHERE program_id = ? OR program_id = '*' ORDER BY required DESC, document_name ASC"
    )
    .bind(programId)
    .all();

  return c.json({ documents: results || [] });
});

export { foerdermittel };
