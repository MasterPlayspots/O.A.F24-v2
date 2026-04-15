// Berater Routes — Onboarding + own profile/expertise/dienstleistungen
// Stored in BAFA_DB (bafa_antraege):
//   berater_profiles, berater_foerder_expertise, berater_dienstleistungen
// All routes are berater-only (requireAuth + requireRole("berater")).
import { Hono } from "hono";
import { z } from "zod";
import type { Bindings, Variables } from "../types";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  sendAnfrageReceivedEmail,
  sendAnfrageAcceptedEmail,
  sendAnfrageRejectedEmail,
} from "../services/email";

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

// User-facing name + email lookup for email notifications. Users are in
// zfbf-db (c.env.DB), not in BAFA_DB — explicit cross-DB fetch.
async function getUserContact(
  db: D1Database,
  userId: string
): Promise<{ email: string; firstName: string; lastName: string } | null> {
  return db
    .prepare("SELECT email, first_name AS firstName, last_name AS lastName FROM users WHERE id = ?")
    .bind(userId)
    .first<{ email: string; firstName: string; lastName: string }>();
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

  // Idempotency guard: only transition from 'offen'. Prevents double-create
  // of bafa_beratungen on repeat PATCH.
  const anfrage = await c.env.BAFA_DB
    .prepare(
      `SELECT * FROM netzwerk_anfragen
         WHERE id = ? AND an_berater_id = ? AND status = 'offen'`
    )
    .bind(anfrageId, beraterId)
    .first<Record<string, unknown>>();
  if (!anfrage) {
    return c.json(
      { success: false, error: "Anfrage nicht gefunden oder bereits bearbeitet" },
      404
    );
  }

  await c.env.BAFA_DB
    .prepare(
      "UPDATE netzwerk_anfragen SET status = ?, updated_at = datetime('now') WHERE id = ?"
    )
    .bind(parsed.data.status, anfrageId)
    .run();

  let beratung: Record<string, unknown> | null = null;

  if (parsed.data.status === "angenommen") {
    // Sprint 17: auto-create bafa_beratungen row.
    // unternehmen_id mirrors von_user_id (per existing JOIN convention
    // in beratungen.ts: u.owner_user_id = b.unternehmen_id). user_id is
    // the company-side user that filed the anfrage.
    beratung = await c.env.BAFA_DB
      .prepare(
        `INSERT INTO bafa_beratungen
            (berater_id, unternehmen_id, user_id, beratungsanlass, phase)
          VALUES (?, ?, ?, ?, 'anlauf')
          RETURNING *`
      )
      .bind(
        beraterId,
        anfrage.von_user_id as string,
        anfrage.von_user_id as string,
        anfrage.typ as string
      )
      .first<Record<string, unknown>>();
  }

  const updated = await c.env.BAFA_DB
    .prepare("SELECT * FROM netzwerk_anfragen WHERE id = ?")
    .bind(anfrageId)
    .first<Record<string, unknown>>();

  // Notify the requester about the outcome.
  if (c.env.RESEND_API_KEY) {
    const [requesterContact, beraterProfile] = await Promise.all([
      getUserContact(c.env.DB, anfrage.von_user_id as string),
      c.env.BAFA_DB
        .prepare("SELECT display_name FROM berater_profiles WHERE id = ?")
        .bind(beraterId)
        .first<{ display_name: string }>(),
    ]);
    if (requesterContact?.email && beraterProfile?.display_name) {
      const sender = parsed.data.status === "angenommen" ? sendAnfrageAcceptedEmail : sendAnfrageRejectedEmail;
      c.executionCtx.waitUntil(
        sender(
          c.env.RESEND_API_KEY,
          requesterContact.email,
          requesterContact.firstName || "",
          beraterProfile.display_name
        )
      );
    }
  }

  return c.json({ success: true, anfrage: updated, beratung });
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

  // Notify berater via email (fire-and-forget — don't fail the request).
  if (c.env.RESEND_API_KEY) {
    const profileOwner = await c.env.BAFA_DB
      .prepare(
        `SELECT bp.user_id, bp.display_name
           FROM berater_profiles bp WHERE bp.id = ?`
      )
      .bind(beraterId)
      .first<{ user_id: string; display_name: string }>();
    if (profileOwner) {
      const beraterContact = await getUserContact(c.env.DB, profileOwner.user_id);
      if (beraterContact?.email) {
        const absenderName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
        c.executionCtx.waitUntil(
          sendAnfrageReceivedEmail(
            c.env.RESEND_API_KEY,
            beraterContact.email,
            profileOwner.display_name,
            absenderName,
            d.typ,
            d.nachricht ?? null
          )
        );
      }
    }
  }

  return c.json({ success: true, anfrage: insert }, 201);
});

// ============================================================
// Abwicklung — provision contract overview (berater-only)
// Until a real `provisions_vertraege` table exists, this returns the
// berater's own `provisionen` rows shaped as the frontend expects.
// ============================================================

interface ProvisionVertragRow {
  id: string;
  berater_profile_id: string;
  unternehmen_user_id: string | null;
  referenz_id: string;
  foerderbereich: string | null;
  betrag_basis: number | null;
  provisions_satz: number;
  provisions_betrag: number;
  status: string;
  created_at: string;
}

berater.get("/provision-vertraege", requireAuth, requireRole("berater"), async (c) => {
  const user = c.get("user");
  const beraterId = await getOwnBeraterId(c.env.BAFA_DB, user.id);
  if (!beraterId) return c.json({ success: true, provisionen: [] });

  const result = await c.env.BAFA_DB
    .prepare(
      `SELECT * FROM provisionen
         WHERE berater_profile_id = ?
         ORDER BY created_at DESC
         LIMIT 100`
    )
    .bind(beraterId)
    .all<ProvisionVertragRow>();

  const provisionen = (result.results ?? []).map((r) => ({
    id: r.id,
    beraterId: r.berater_profile_id,
    unternehmenId: r.unternehmen_user_id ?? "",
    anfrageId: r.referenz_id,
    programmName: r.foerderbereich,
    bewilligteSummeEur: r.betrag_basis,
    provisionsSatz: r.provisions_satz,
    provisionBetrag: r.provisions_betrag,
    status: r.status,
    erstelltAm: r.created_at,
  }));

  return c.json({ success: true, provisionen });
});

// POST /abwicklung/upload — accept a document (multipart), store into R2,
// return a stub acknowledgement. Full contract-management flow (linking
// to a specific provision, admin approval) is a future sprint.
berater.post("/abwicklung/upload", requireAuth, requireRole("berater"), async (c) => {
  const user = c.get("user");
  const form = await c.req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return c.json({ success: false, error: "Datei fehlt" }, 400);
  }
  if (file.size > 25 * 1024 * 1024) {
    return c.json({ success: false, error: "Datei zu gross (max 25 MB)" }, 413);
  }
  const vertragId = (form.get("vertrag_id") as string | null) ?? "unzugeordnet";
  const docId = crypto.randomUUID();
  const safeName = file.name.replace(/[^\w.\-]/g, "_");
  const r2Key = `abwicklung/${user.id}/${vertragId}/${docId}-${safeName}`;
  await c.env.REPORTS.put(r2Key, file.stream(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });
  return c.json({
    success: true,
    id: docId,
    filename: file.name,
    size: file.size,
    uploaded_at: new Date().toISOString(),
  }, 201);
});

export { berater };
