// Berater Routes — Onboarding + own profile/expertise/dienstleistungen
// Stored in BAFA_DB (bafa_antraege):
//   berater_profiles, berater_foerder_expertise, berater_dienstleistungen
// All routes are berater-only (requireAuth + requireRole("berater")).
import { Hono } from "hono";
import { z } from "zod";
import type { Bindings, Variables } from "../types";
import { requireAuth, requireRole } from "../middleware/auth";

const berater = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ============================================================
// Row types (raw D1 — JSON columns are still TEXT here)
// ============================================================
interface BeraterProfileRow {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  photo_url: string | null;
  branchen: string | null;          // JSON
  spezialisierungen: string | null; // JSON
  region: string | null;
  plz: string | null;
  telefon: string | null;
  website: string | null;
  verfuegbar: number;
  rating_avg: number;
  rating_count: number;
  profil_views: number;
  created_at: string;
  updated_at: string;
}
interface ExpertiseRow {
  id: string;
  berater_id: string;
  foerderbereich: string;
  foerderart: string | null;
  bundeslaender: string | null;     // JSON
  erfolgreiche_antraege: number;
  gesamtvolumen_eur: number;
  letzte_aktivitaet: string | null;
  kompetenz_level: string;
  created_at: string;
}
interface DienstleistungRow {
  id: string;
  berater_id: string;
  titel: string;
  beschreibung: string | null;
  kategorie: string;
  foerderbereiche: string | null;       // JSON
  foerderarten: string | null;          // JSON
  preis_typ: string;
  preis_von: number | null;
  preis_bis: number | null;
  dauer_tage: number | null;
  inklusiv_leistungen: string | null;   // JSON
  erfolgsquote: number;
  abgeschlossene_projekte: number;
  aktiv: number;
  service_typ: string;
  bafa_required: number;
  brand: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// JSON-field helpers (inline pattern, no shared util)
// ============================================================
function parseJsonArray(raw: string | null): string[] {
  try { return raw ? (JSON.parse(raw) as string[]) : []; } catch { return []; }
}
function shapeProfile(r: BeraterProfileRow) {
  return {
    ...r,
    verfuegbar: !!r.verfuegbar,
    branchen: parseJsonArray(r.branchen),
    spezialisierungen: parseJsonArray(r.spezialisierungen),
  };
}
function shapeExpertise(r: ExpertiseRow) {
  return { ...r, bundeslaender: parseJsonArray(r.bundeslaender) };
}
function shapeDienstleistung(r: DienstleistungRow) {
  return {
    ...r,
    aktiv: !!r.aktiv,
    bafa_required: !!r.bafa_required,
    foerderbereiche: parseJsonArray(r.foerderbereiche),
    foerderarten: parseJsonArray(r.foerderarten),
    inklusiv_leistungen: parseJsonArray(r.inklusiv_leistungen),
  };
}

async function getOwnBeraterId(
  db: D1Database,
  userId: string
): Promise<string | null> {
  const row = await db
    .prepare("SELECT id FROM berater_profiles WHERE user_id = ?")
    .bind(userId)
    .first<{ id: string }>();
  return row?.id ?? null;
}

// ============================================================
// /profil — upsert + read own berater_profiles row
// ============================================================
const profilSchema = z.object({
  display_name: z.string().min(2).max(120),
  bio: z.string().max(2000).optional().nullable(),
  photo_url: z.string().url().optional().nullable(),
  branchen: z.array(z.string()).default([]),
  spezialisierungen: z.array(z.string()).default([]),
  region: z.string().max(120).optional().nullable(),
  plz: z.string().max(10).optional().nullable(),
  telefon: z.string().max(40).optional().nullable(),
  website: z.string().url().optional().nullable(),
  verfuegbar: z.boolean().default(true),
});

berater.get("/profil", requireAuth, requireRole("berater"), async (c) => {
  const user = c.get("user");
  const row = await c.env.BAFA_DB.prepare(
    "SELECT * FROM berater_profiles WHERE user_id = ?"
  )
    .bind(user.id)
    .first<BeraterProfileRow>();
  return c.json({ success: true, profil: row ? shapeProfile(row) : null });
});

berater.post("/profil", requireAuth, requireRole("berater"), async (c) => {
  const user = c.get("user");
  const parsed = profilSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        error: "Validierungsfehler",
        details: parsed.error.issues.map((e) => e.message),
      },
      400
    );
  }
  const d = parsed.data;
  const existing = await c.env.BAFA_DB.prepare(
    "SELECT id FROM berater_profiles WHERE user_id = ?"
  )
    .bind(user.id)
    .first<{ id: string }>();

  if (existing) {
    await c.env.BAFA_DB.prepare(
      `UPDATE berater_profiles SET
         display_name = ?, bio = ?, photo_url = ?,
         branchen = ?, spezialisierungen = ?,
         region = ?, plz = ?, telefon = ?, website = ?,
         verfuegbar = ?, updated_at = datetime('now')
       WHERE user_id = ?`
    )
      .bind(
        d.display_name,
        d.bio ?? null,
        d.photo_url ?? null,
        JSON.stringify(d.branchen),
        JSON.stringify(d.spezialisierungen),
        d.region ?? null,
        d.plz ?? null,
        d.telefon ?? null,
        d.website ?? null,
        d.verfuegbar ? 1 : 0,
        user.id
      )
      .run();
  } else {
    await c.env.BAFA_DB.prepare(
      `INSERT INTO berater_profiles
        (user_id, display_name, bio, photo_url, branchen, spezialisierungen,
         region, plz, telefon, website, verfuegbar)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        user.id,
        d.display_name,
        d.bio ?? null,
        d.photo_url ?? null,
        JSON.stringify(d.branchen),
        JSON.stringify(d.spezialisierungen),
        d.region ?? null,
        d.plz ?? null,
        d.telefon ?? null,
        d.website ?? null,
        d.verfuegbar ? 1 : 0
      )
      .run();
  }

  const row = await c.env.BAFA_DB.prepare(
    "SELECT * FROM berater_profiles WHERE user_id = ?"
  )
    .bind(user.id)
    .first<BeraterProfileRow>();
  return c.json({ success: true, profil: row ? shapeProfile(row) : null });
});

// ============================================================
// /expertise — list + insert berater_foerder_expertise rows
// ============================================================
const expertiseSchema = z.object({
  foerderbereich: z.string().min(1).max(200),
  foerderart: z.string().max(200).optional().nullable(),
  bundeslaender: z.array(z.string()).default([]),
  erfolgreiche_antraege: z.number().int().min(0).default(0),
  gesamtvolumen_eur: z.number().min(0).default(0),
  letzte_aktivitaet: z.string().optional().nullable(),
  kompetenz_level: z.enum(["basis", "fortgeschritten", "experte"]).default("basis"),
});

berater.get("/expertise", requireAuth, requireRole("berater"), async (c) => {
  const user = c.get("user");
  const beraterId = await getOwnBeraterId(c.env.BAFA_DB, user.id);
  if (!beraterId) return c.json({ success: true, expertise: [] });
  const result = await c.env.BAFA_DB.prepare(
    "SELECT * FROM berater_foerder_expertise WHERE berater_id = ? ORDER BY created_at DESC"
  )
    .bind(beraterId)
    .all<ExpertiseRow>();
  return c.json({
    success: true,
    expertise: (result.results ?? []).map(shapeExpertise),
  });
});

berater.post("/expertise", requireAuth, requireRole("berater"), async (c) => {
  const user = c.get("user");
  const parsed = expertiseSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        error: "Validierungsfehler",
        details: parsed.error.issues.map((e) => e.message),
      },
      400
    );
  }
  const beraterId = await getOwnBeraterId(c.env.BAFA_DB, user.id);
  if (!beraterId) {
    return c.json(
      { success: false, error: "Bitte zuerst Berater-Profil anlegen" },
      400
    );
  }
  const d = parsed.data;
  const insert = await c.env.BAFA_DB.prepare(
    `INSERT INTO berater_foerder_expertise
      (berater_id, foerderbereich, foerderart, bundeslaender,
       erfolgreiche_antraege, gesamtvolumen_eur, letzte_aktivitaet, kompetenz_level)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING *`
  )
    .bind(
      beraterId,
      d.foerderbereich,
      d.foerderart ?? null,
      JSON.stringify(d.bundeslaender),
      d.erfolgreiche_antraege,
      d.gesamtvolumen_eur,
      d.letzte_aktivitaet ?? null,
      d.kompetenz_level
    )
    .first<ExpertiseRow>();
  return c.json({
    success: true,
    expertise: insert ? shapeExpertise(insert) : null,
  });
});

// ============================================================
// /dienstleistungen — list + insert berater_dienstleistungen rows
// ============================================================
const dienstleistungSchema = z.object({
  titel: z.string().min(1).max(200),
  beschreibung: z.string().max(2000).optional().nullable(),
  kategorie: z.string().min(1).max(100),
  foerderbereiche: z.array(z.string()).default([]),
  foerderarten: z.array(z.string()).default([]),
  preis_typ: z.enum(["pauschal", "stunde", "tag", "erfolgshonorar"]).default("pauschal"),
  preis_von: z.number().min(0).optional().nullable(),
  preis_bis: z.number().min(0).optional().nullable(),
  dauer_tage: z.number().int().min(0).optional().nullable(),
  inklusiv_leistungen: z.array(z.string()).default([]),
  service_typ: z.string().max(100).default("allgemein"),
  bafa_required: z.boolean().default(false),
});

berater.get("/dienstleistungen", requireAuth, requireRole("berater"), async (c) => {
  const user = c.get("user");
  const beraterId = await getOwnBeraterId(c.env.BAFA_DB, user.id);
  if (!beraterId) return c.json({ success: true, dienstleistungen: [] });
  const result = await c.env.BAFA_DB.prepare(
    "SELECT * FROM berater_dienstleistungen WHERE berater_id = ? ORDER BY created_at DESC"
  )
    .bind(beraterId)
    .all<DienstleistungRow>();
  return c.json({
    success: true,
    dienstleistungen: (result.results ?? []).map(shapeDienstleistung),
  });
});

berater.post("/dienstleistungen", requireAuth, requireRole("berater"), async (c) => {
  const user = c.get("user");
  const parsed = dienstleistungSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        error: "Validierungsfehler",
        details: parsed.error.issues.map((e) => e.message),
      },
      400
    );
  }
  const beraterId = await getOwnBeraterId(c.env.BAFA_DB, user.id);
  if (!beraterId) {
    return c.json(
      { success: false, error: "Bitte zuerst Berater-Profil anlegen" },
      400
    );
  }
  const d = parsed.data;
  const insert = await c.env.BAFA_DB.prepare(
    `INSERT INTO berater_dienstleistungen
      (berater_id, titel, beschreibung, kategorie,
       foerderbereiche, foerderarten,
       preis_typ, preis_von, preis_bis, dauer_tage,
       inklusiv_leistungen, service_typ, bafa_required)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING *`
  )
    .bind(
      beraterId,
      d.titel,
      d.beschreibung ?? null,
      d.kategorie,
      JSON.stringify(d.foerderbereiche),
      JSON.stringify(d.foerderarten),
      d.preis_typ,
      d.preis_von ?? null,
      d.preis_bis ?? null,
      d.dauer_tage ?? null,
      JSON.stringify(d.inklusiv_leistungen),
      d.service_typ,
      d.bafa_required ? 1 : 0
    )
    .first<DienstleistungRow>();
  return c.json({
    success: true,
    dienstleistung: insert ? shapeDienstleistung(insert) : null,
  });
});

// ============================================================
// /anfragen — Unternehmen → Berater + Berater inbox
// ============================================================
const anfrageSchema = z.object({
  typ: z.enum(["beratung", "zusammenarbeit", "frage"]).default("beratung"),
  nachricht: z.string().max(1000).optional().nullable(),
});

// GET /api/berater/anfragen — berater inbox  (must be defined BEFORE /:id/anfrage
// so the static segment doesn't get swallowed by the dynamic route)
berater.get("/anfragen", requireAuth, requireRole("berater"), async (c) => {
  const user = c.get("user");
  const beraterId = await getOwnBeraterId(c.env.BAFA_DB, user.id);
  if (!beraterId) return c.json({ success: true, anfragen: [] });

  const result = await c.env.BAFA_DB.prepare(
    `SELECT * FROM netzwerk_anfragen
       WHERE an_berater_id = ?
       ORDER BY created_at DESC`
  )
    .bind(beraterId)
    .all<Record<string, unknown>>();

  return c.json({ success: true, anfragen: result.results ?? [] });
});

// PATCH /api/berater/anfragen/:id — accept/reject
const anfrageStatusSchema = z.object({
  status: z.enum(["angenommen", "abgelehnt"]),
});

berater.patch("/anfragen/:id", requireAuth, requireRole("berater"), async (c) => {
  const user = c.get("user");
  const anfrageId = c.req.param("id");
  const beraterId = await getOwnBeraterId(c.env.BAFA_DB, user.id);
  if (!beraterId) return c.json({ success: false, error: "Kein Berater-Profil" }, 403);

  const parsed = anfrageStatusSchema.safeParse(await c.req.json());
  if (!parsed.success)
    return c.json({ success: false, error: "Validierungsfehler" }, 400);

  await c.env.BAFA_DB.prepare(
    `UPDATE netzwerk_anfragen SET status = ?, updated_at = datetime('now')
       WHERE id = ? AND an_berater_id = ?`
  )
    .bind(parsed.data.status, anfrageId, beraterId)
    .run();

  const updated = await c.env.BAFA_DB.prepare(
    "SELECT * FROM netzwerk_anfragen WHERE id = ?"
  )
    .bind(anfrageId)
    .first<Record<string, unknown>>();

  return c.json({ success: !!updated, anfrage: updated ?? null });
});

// POST /api/berater/:id/anfrage — any auth role can send
berater.post("/:id/anfrage", requireAuth, async (c) => {
  const user = c.get("user");
  const beraterId = c.req.param("id");

  const parsed = anfrageSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        error: "Validierungsfehler",
        details: parsed.error.issues.map((e) => e.message),
      },
      400
    );
  }

  const profil = await c.env.BAFA_DB
    .prepare("SELECT id FROM berater_profiles WHERE id = ?")
    .bind(beraterId)
    .first<{ id: string }>();
  if (!profil)
    return c.json({ success: false, error: "Berater nicht gefunden" }, 404);

  const ownProfil = await c.env.BAFA_DB
    .prepare("SELECT id FROM berater_profiles WHERE user_id = ?")
    .bind(user.id)
    .first<{ id: string }>();
  if (ownProfil?.id === beraterId) {
    return c.json(
      { success: false, error: "Kann keine Anfrage an sich selbst senden" },
      400
    );
  }

  const d = parsed.data;
  const insert = await c.env.BAFA_DB
    .prepare(
      `INSERT INTO netzwerk_anfragen
        (von_user_id, an_berater_id, typ, nachricht)
       VALUES (?, ?, ?, ?)
       RETURNING *`
    )
    .bind(user.id, beraterId, d.typ, d.nachricht ?? null)
    .first<Record<string, unknown>>();

  return c.json({ success: true, anfrage: insert }, 201);
});

export { berater };
