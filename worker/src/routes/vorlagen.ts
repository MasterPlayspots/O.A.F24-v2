// Vorlagen Routes — Berater Template-Library
// Requires table bafa_vorlagen (see db/migrations/023-vorlagen.sql)
// Stored in BAFA_DB (bafa_antraege)
import { Hono } from "hono";
import type { Bindings, Variables } from "../types";
import { requireAuth, requireRole } from "../middleware/auth";

const vorlagen = new Hono<{ Bindings: Bindings; Variables: Variables }>();

interface VorlageRow {
  id: string;
  user_id: string;
  titel: string;
  kategorie: string | null;
  inhalt: string;
  created_at: string;
  updated_at: string;
}

// GET / — list own vorlagen
vorlagen.get("/", requireAuth, requireRole("berater"), async (c) => {
  const user = c.get("user");
  const result = await c.env.BAFA_DB.prepare(
    `SELECT * FROM bafa_vorlagen WHERE user_id = ? ORDER BY created_at DESC`
  )
    .bind(user.id)
    .all<VorlageRow>();
  return c.json({ success: true, data: result.results ?? [] });
});

// POST / — create
vorlagen.post("/", requireAuth, requireRole("berater"), async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ titel?: string; kategorie?: string; inhalt?: string }>();
  if (!body.titel?.trim() || !body.inhalt?.trim()) {
    return c.json({ success: false, error: "titel und inhalt sind erforderlich" }, 400);
  }
  const id = crypto.randomUUID();
  await c.env.BAFA_DB.prepare(
    `INSERT INTO bafa_vorlagen (id, user_id, titel, kategorie, inhalt) VALUES (?, ?, ?, ?, ?)`
  )
    .bind(id, user.id, body.titel.trim(), body.kategorie?.trim() || null, body.inhalt.trim())
    .run();
  return c.json({ success: true, id });
});

// DELETE /:id — delete own vorlage
vorlagen.delete("/:id", requireAuth, requireRole("berater"), async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const res = await c.env.BAFA_DB.prepare(
    `DELETE FROM bafa_vorlagen WHERE id = ? AND user_id = ?`
  )
    .bind(id, user.id)
    .run();
  if (!res.meta.changes) {
    return c.json({ success: false, error: "Vorlage nicht gefunden" }, 404);
  }
  return c.json({ success: true });
});

export { vorlagen };
