// Unternehmen Routes — own company profile (onboarding + edit)
// Stored in BAFA_DB (bafa_antraege).unternehmen
// Mounted at /api/unternehmen and aliased via me.ts → /api/me/unternehmen
import { Hono } from "hono";
import { z } from "zod";
import type { Bindings, Variables } from "../types";
import { requireAuth } from "../middleware/auth";

const unternehmen = new Hono<{ Bindings: Bindings; Variables: Variables }>();

interface UnternehmenRow {
  id: string;
  user_id: string;
  firmenname: string;
  rechtsform: string | null;
  handelsregister_nr: string | null;
  steuernummer: string | null;
  ust_id: string | null;
  strasse: string | null;
  plz: string | null;
  ort: string | null;
  bundesland: string | null;
  land: string;
  branche: string | null;
  branche_code: string | null;
  unterbranche: string | null;
  gruendungsjahr: number | null;
  mitarbeiter_anzahl: number | null;
  jahresumsatz: number | null;
  bilanzsumme: number | null;
  eigenkapitalquote: number | null;
  ist_kmu: number;
  kmu_klasse: string | null;
  de_minimis_summe_3j: number;
  insolvenzverfahren: number;
  unternehmen_in_schwierigkeiten: number;
  ocr_daten: string | null;
  ocr_confidence: number | null;
  ocr_quellen: string | null;
  profil_vollstaendigkeit: number;
  created_at: string;
  updated_at: string;
  brand: string;
  deleted_at: string | null;
  owner_user_id: string | null;
}

function shape(r: UnternehmenRow) {
  return {
    ...r,
    ist_kmu: !!r.ist_kmu,
    insolvenzverfahren: !!r.insolvenzverfahren,
    unternehmen_in_schwierigkeiten: !!r.unternehmen_in_schwierigkeiten,
  };
}

// MVP-Schema — covers what an unternehmen onboarding form realistically asks.
// Optional fields are nullable; the rest defaults from D1.
const profilSchema = z.object({
  firmenname: z.string().min(1).max(200),
  rechtsform: z.string().max(80).optional().nullable(),
  steuernummer: z.string().max(40).optional().nullable(),
  ust_id: z.string().max(40).optional().nullable(),
  strasse: z.string().max(200).optional().nullable(),
  plz: z.string().max(10).optional().nullable(),
  ort: z.string().max(120).optional().nullable(),
  bundesland: z.string().max(80).optional().nullable(),
  branche: z.string().max(120).optional().nullable(),
  unterbranche: z.string().max(120).optional().nullable(),
  gruendungsjahr: z.number().int().min(1800).max(2100).optional().nullable(),
  mitarbeiter_anzahl: z.number().int().min(0).max(1_000_000).optional().nullable(),
  jahresumsatz: z.number().min(0).optional().nullable(),
  ist_kmu: z.boolean().default(true),
});

// GET /profil — own unternehmen row
unternehmen.get("/profil", requireAuth, async (c) => {
  const user = c.get("user");
  const row = await c.env.BAFA_DB.prepare(
    "SELECT * FROM unternehmen WHERE user_id = ? AND deleted_at IS NULL"
  )
    .bind(user.id)
    .first<UnternehmenRow>();
  return c.json({ success: true, unternehmen: row ? shape(row) : null });
});

// POST /profil — upsert
unternehmen.post("/profil", requireAuth, async (c) => {
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
    "SELECT id FROM unternehmen WHERE user_id = ?"
  )
    .bind(user.id)
    .first<{ id: string }>();

  if (existing) {
    await c.env.BAFA_DB.prepare(
      `UPDATE unternehmen SET
         firmenname = ?, rechtsform = ?, steuernummer = ?, ust_id = ?,
         strasse = ?, plz = ?, ort = ?, bundesland = ?,
         branche = ?, unterbranche = ?,
         gruendungsjahr = ?, mitarbeiter_anzahl = ?, jahresumsatz = ?,
         ist_kmu = ?,
         updated_at = datetime('now')
       WHERE user_id = ?`
    )
      .bind(
        d.firmenname,
        d.rechtsform ?? null,
        d.steuernummer ?? null,
        d.ust_id ?? null,
        d.strasse ?? null,
        d.plz ?? null,
        d.ort ?? null,
        d.bundesland ?? null,
        d.branche ?? null,
        d.unterbranche ?? null,
        d.gruendungsjahr ?? null,
        d.mitarbeiter_anzahl ?? null,
        d.jahresumsatz ?? null,
        d.ist_kmu ? 1 : 0,
        user.id
      )
      .run();
  } else {
    await c.env.BAFA_DB.prepare(
      `INSERT INTO unternehmen
        (user_id, firmenname, rechtsform, steuernummer, ust_id,
         strasse, plz, ort, bundesland, branche, unterbranche,
         gruendungsjahr, mitarbeiter_anzahl, jahresumsatz, ist_kmu)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        user.id,
        d.firmenname,
        d.rechtsform ?? null,
        d.steuernummer ?? null,
        d.ust_id ?? null,
        d.strasse ?? null,
        d.plz ?? null,
        d.ort ?? null,
        d.bundesland ?? null,
        d.branche ?? null,
        d.unterbranche ?? null,
        d.gruendungsjahr ?? null,
        d.mitarbeiter_anzahl ?? null,
        d.jahresumsatz ?? null,
        d.ist_kmu ? 1 : 0
      )
      .run();
  }

  const row = await c.env.BAFA_DB.prepare(
    "SELECT * FROM unternehmen WHERE user_id = ?"
  )
    .bind(user.id)
    .first<UnternehmenRow>();
  return c.json({ success: true, unternehmen: row ? shape(row) : null });
});

export { unternehmen };
