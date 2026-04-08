// Beratungen Routes — BAFA-Beratungen (berater-only)
// Uses BAFA_DB (bafa_antraege) for bafa_beratungen + unternehmen
import { Hono } from "hono";
import type { Bindings, Variables } from "../types";
import { requireAuth, requireRole } from "../middleware/auth";

const beratungen = new Hono<{ Bindings: Bindings; Variables: Variables }>();

interface BeratungRow {
  id: string;
  berater_id: string;
  unternehmen_id: string;
  user_id: string | null;
  phase: string;
  bafa_antrag_nr: string | null;
  foerderhoehe: number | null;
  eigenanteil: number | null;
  protokoll: string | null;
  branche: string | null;
  unternehmen_name: string | null;
  created_at: string;
  updated_at: string;
}

// GET /:id — Beratung-Detail (nur eigene)
beratungen.get("/:id", requireAuth, requireRole("berater"), async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  const row = await c.env.BAFA_DB.prepare(
    `SELECT b.*, u.firmenname AS unternehmen_name
       FROM bafa_beratungen b
       LEFT JOIN unternehmen u ON u.owner_user_id = b.unternehmen_id
      WHERE b.id = ? AND b.berater_id = ?`
  )
    .bind(id, user.id)
    .first<BeratungRow>();

  if (!row) {
    return c.json({ success: false, error: "Beratung nicht gefunden" }, 404);
  }

  return c.json({ success: true, beratung: row });
});

export { beratungen };
