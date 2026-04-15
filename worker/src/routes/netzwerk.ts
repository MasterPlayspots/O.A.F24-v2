// Netzwerk Routes - Berater profiles and connection requests
import { Hono } from "hono";
import { z } from "zod";
import type { Bindings, Variables } from "../types";
import { requireAuth } from "../middleware/auth";
import * as NetzwerkRepo from "../repositories/netzwerk.repository";

const netzwerk = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// JSON-Array helper (mirrors routes/berater.ts pattern)
function parseJsonArray(raw: string | null): string[] {
  try { return raw ? (JSON.parse(raw) as string[]) : []; } catch { return []; }
}

// ============================================
// Public: List berater
// ============================================

// GET /berater — public listing from BAFA_DB.berater_profiles
netzwerk.get("/berater", async (c) => {
  const { branche, region, page, pageSize } = c.req.query();
  const p = page ? parseInt(page, 10) : 1;
  const ps = pageSize ? parseInt(pageSize, 10) : 20;
  const offset = (p - 1) * ps;

  const conditions: string[] = ["bp.verfuegbar = 1"];
  const binds: (string | number)[] = [];

  if (region) {
    conditions.push("bp.region LIKE ?");
    binds.push(`%${region}%`);
  }
  if (branche) {
    conditions.push("bp.branchen LIKE ?");
    binds.push(`%${branche}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const total =
    (
      await c.env.BAFA_DB.prepare(
        `SELECT COUNT(*) as n FROM berater_profiles bp ${where}`
      )
        .bind(...binds)
        .first<{ n: number }>()
    )?.n ?? 0;

  const rows = await c.env.BAFA_DB.prepare(
    `SELECT bp.id, bp.display_name, bp.bio, bp.photo_url,
            bp.branchen, bp.spezialisierungen, bp.region,
            bp.verfuegbar, bp.rating_avg, bp.rating_count,
            bp.profil_views, bp.created_at
       FROM berater_profiles bp ${where}
       ORDER BY bp.rating_avg DESC
       LIMIT ? OFFSET ?`
  )
    .bind(...binds, ps, offset)
    .all<Record<string, unknown>>();

  const profiles = (rows.results ?? []).map((r) => ({
    ...r,
    verfuegbar: !!r.verfuegbar,
    branchen: parseJsonArray(r.branchen as string | null),
    spezialisierungen: parseJsonArray(r.spezialisierungen as string | null),
  }));

  return c.json({ success: true, profiles, total, page: p, pageSize: ps });
});

// GET /berater/:id — public detail with expertise + dienstleistungen
netzwerk.get("/berater/:id", async (c) => {
  const id = c.req.param("id");
  const profil = await c.env.BAFA_DB
    .prepare("SELECT * FROM berater_profiles WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();

  if (!profil) return c.json({ success: false, error: "Berater nicht gefunden" }, 404);

  const expertise =
    (
      await c.env.BAFA_DB.prepare(
        "SELECT * FROM berater_foerder_expertise WHERE berater_id = ? ORDER BY created_at DESC"
      )
        .bind(id)
        .all<Record<string, unknown>>()
    ).results ?? [];

  const dienstleistungen =
    (
      await c.env.BAFA_DB.prepare(
        "SELECT * FROM berater_dienstleistungen WHERE berater_id = ? AND aktiv = 1 ORDER BY created_at DESC"
      )
        .bind(id)
        .all<Record<string, unknown>>()
    ).results ?? [];

  return c.json({
    success: true,
    profile: {
      ...profil,
      verfuegbar: !!profil.verfuegbar,
      branchen: parseJsonArray(profil.branchen as string | null),
      spezialisierungen: parseJsonArray(profil.spezialisierungen as string | null),
      expertise: expertise.map((e) => ({
        ...e,
        bundeslaender: parseJsonArray(e.bundeslaender as string | null),
      })),
      dienstleistungen: dienstleistungen.map((d) => ({
        ...d,
        aktiv: !!d.aktiv,
        bafa_required: !!d.bafa_required,
        foerderbereiche: parseJsonArray(d.foerderbereiche as string | null),
        foerderarten: parseJsonArray(d.foerderarten as string | null),
        inklusiv_leistungen: parseJsonArray(d.inklusiv_leistungen as string | null),
      })),
    },
  });
});

// ============================================
// /profil handlers REMOVED 2026-04-09 — they wrote to zfbf-db.berater_profile
// (legacy singular, 0 rows). Source of truth is now bafa_antraege.berater_profiles
// served by routes/berater.ts (/api/berater/profil).
// ============================================

// ============================================
// Auth-required: Anfragen (connection requests)
// ============================================

// GET /anfragen — list my connection requests (sent + received)
netzwerk.get("/anfragen", requireAuth, async (c) => {
  const user = c.get("user");
  const anfragen = await NetzwerkRepo.listAnfragen(c.env.DB, user.id);
  return c.json({ success: true, anfragen });
});

const anfrageSchema = z.object({
  an_user_id: z.string().uuid(),
  nachricht: z.string().max(1000).optional(),
});

// POST /anfragen — send a connection request
netzwerk.post("/anfragen", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const parsed = anfrageSchema.safeParse(body);
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

  if (parsed.data.an_user_id === user.id) {
    return c.json({ success: false, error: "Kann keine Anfrage an sich selbst senden" }, 400);
  }

  const anfrage = await NetzwerkRepo.createAnfrage(
    c.env.DB,
    user.id,
    parsed.data.an_user_id,
    parsed.data.nachricht ?? null
  );
  return c.json({ success: true, anfrage }, 201);
});

const statusSchema = z.object({
  status: z.enum(["angenommen", "abgelehnt"]),
});

// PATCH /anfragen/:id — accept or reject a connection request
netzwerk.patch("/anfragen/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const anfrageId = c.req.param("id");
  const body = await c.req.json();
  const parsed = statusSchema.safeParse(body);
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

  const anfrage = await NetzwerkRepo.updateAnfrageStatus(
    c.env.DB,
    anfrageId,
    user.id,
    parsed.data.status
  );
  if (!anfrage) {
    return c.json({ success: false, error: "Anfrage nicht gefunden oder keine Berechtigung" }, 404);
  }
  return c.json({ success: true, anfrage });
});

export { netzwerk };
