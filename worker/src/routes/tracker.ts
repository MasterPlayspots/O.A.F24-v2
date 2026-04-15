// Tracker Routes — eigene Vorgänge (Pipeline-/Kanban-Stil).
// BAFA_DB tables: tracker_vorgaenge, tracker_aktivitaeten, tracker_benachrichtigungen.
// All writes scoped by user_id = jwt.user.id. No role-gate — both berater
// and unternehmen users track their own Vorgänge.
import { Hono } from "hono";
import { z } from "zod";
import type { Bindings, Variables } from "../types";
import { requireAuth } from "../middleware/auth";

const tracker = new Hono<{ Bindings: Bindings; Variables: Variables }>();

interface VorgangRow {
  id: string;
  user_id: string;
  titel: string;
  beschreibung: string | null;
  programm_name: string | null;
  foerdersumme: number | null;
  phase: string;
  naechste_frist: string | null;
  prioritaet: string;
  notizen: string | null;
  check_id: string | null;
  anfrage_id: string | null;
  programm_id: number | null;
  created_at: string;
  updated_at: string;
}

// Phase labels the frontend uses (see lib/types.ts TrackerPhase).
const ALLOWED_PHASES = [
  "vorbereitung",
  "antrag",
  "pruefung",
  "bewilligt",
  "abgeschlossen",
  "abgelehnt",
] as const;

// ---------- GET / — list own Vorgänge ----------
tracker.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const phase = c.req.query("phase");
  const conds: string[] = ["user_id = ?"];
  const params: (string | number)[] = [user.id];
  if (phase) {
    conds.push("phase = ?");
    params.push(phase);
  }
  const result = await c.env.BAFA_DB
    .prepare(
      `SELECT * FROM tracker_vorgaenge
         WHERE ${conds.join(" AND ")}
         ORDER BY
           CASE WHEN naechste_frist IS NOT NULL THEN 0 ELSE 1 END,
           naechste_frist ASC,
           created_at DESC
         LIMIT 100`
    )
    .bind(...params)
    .all<VorgangRow>();

  return c.json({ success: true, vorgaenge: result.results ?? [] });
});

// ---------- POST / — create Vorgang ----------
const createSchema = z.object({
  titel: z.string().min(1).max(200),
  beschreibung: z.string().max(2000).optional(),
  programm_name: z.string().max(200).optional(),
  foerdersumme: z.number().min(0).optional(),
  naechste_frist: z.string().optional(),
  prioritaet: z.enum(["niedrig", "normal", "hoch", "dringend"]).default("normal"),
});

tracker.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const parsed = createSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json(
      { success: false, error: "Validierungsfehler", details: parsed.error.issues.map((e) => e.message) },
      400
    );
  }
  const d = parsed.data;
  const id = crypto.randomUUID().replace(/-/g, "");
  const now = new Date().toISOString();

  await c.env.BAFA_DB
    .prepare(
      `INSERT INTO tracker_vorgaenge
         (id, user_id, titel, beschreibung, programm_name, foerdersumme,
          phase, naechste_frist, prioritaet, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'vorbereitung', ?, ?, ?, ?)`
    )
    .bind(
      id,
      user.id,
      d.titel,
      d.beschreibung ?? null,
      d.programm_name ?? null,
      d.foerdersumme ?? null,
      d.naechste_frist ?? null,
      d.prioritaet,
      now,
      now
    )
    .run();

  // Log activity
  await c.env.BAFA_DB
    .prepare(
      `INSERT INTO tracker_aktivitaeten
         (id, vorgang_id, user_id, typ, beschreibung, created_at)
       VALUES (?, ?, ?, 'erstellt', 'Vorgang erstellt', ?)`
    )
    .bind(crypto.randomUUID().replace(/-/g, ""), id, user.id, now)
    .run();

  return c.json({ success: true, id, titel: d.titel, phase: "vorbereitung", created_at: now }, 201);
});

// ---------- GET /:id — single Vorgang ----------
tracker.get("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const row = await c.env.BAFA_DB
    .prepare("SELECT * FROM tracker_vorgaenge WHERE id = ? AND user_id = ?")
    .bind(id, user.id)
    .first<VorgangRow>();
  if (!row) return c.json({ success: false, error: "Vorgang nicht gefunden" }, 404);
  return c.json({ success: true, vorgang: row });
});

// ---------- PATCH /:id — update Vorgang ----------
const patchSchema = z.object({
  titel: z.string().min(1).max(200).optional(),
  beschreibung: z.string().max(2000).optional().nullable(),
  programm_name: z.string().max(200).optional().nullable(),
  foerdersumme: z.number().min(0).optional().nullable(),
  phase: z.enum(ALLOWED_PHASES).optional(),
  naechste_frist: z.string().optional().nullable(),
  prioritaet: z.enum(["niedrig", "normal", "hoch", "dringend"]).optional(),
  notizen: z.string().max(10000).optional().nullable(),
});

tracker.patch("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const parsed = patchSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json(
      { success: false, error: "Validierungsfehler", details: parsed.error.issues.map((e) => e.message) },
      400
    );
  }
  const d = parsed.data;

  const before = await c.env.BAFA_DB
    .prepare("SELECT phase FROM tracker_vorgaenge WHERE id = ? AND user_id = ?")
    .bind(id, user.id)
    .first<{ phase: string }>();
  if (!before) return c.json({ success: false, error: "Vorgang nicht gefunden" }, 404);

  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, v] of Object.entries(d)) {
    if (v === undefined) continue;
    sets.push(`${k} = ?`);
    vals.push(v);
  }
  if (sets.length === 0) return c.json({ success: false, error: "Keine Änderungen" }, 400);
  sets.push("updated_at = datetime('now')");
  vals.push(id, user.id);

  await c.env.BAFA_DB
    .prepare(`UPDATE tracker_vorgaenge SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`)
    .bind(...vals)
    .run();

  // Log phase transitions as activity
  if (d.phase && d.phase !== before.phase) {
    await c.env.BAFA_DB
      .prepare(
        `INSERT INTO tracker_aktivitaeten
           (id, vorgang_id, user_id, typ, beschreibung, created_at)
         VALUES (?, ?, ?, 'phase_change', ?, datetime('now'))`
      )
      .bind(
        crypto.randomUUID().replace(/-/g, ""),
        id,
        user.id,
        `Phase ${before.phase} → ${d.phase}`
      )
      .run();
  }

  return c.json({ success: true });
});

// ---------- DELETE /:id ----------
tracker.delete("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const res = await c.env.BAFA_DB
    .prepare("DELETE FROM tracker_vorgaenge WHERE id = ? AND user_id = ?")
    .bind(id, user.id)
    .run();
  if (!res.meta.changes) return c.json({ success: false, error: "Vorgang nicht gefunden" }, 404);
  return c.json({ success: true });
});

export { tracker };
