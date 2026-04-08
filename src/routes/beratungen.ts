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

type BeratungPhase = "anlauf" | "beratung" | "nachbereitung" | "abgeschlossen";
const ALLOWED_PHASES: BeratungPhase[] = ["anlauf", "beratung", "nachbereitung", "abgeschlossen"];

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

// PATCH /:id — Update Beratung (nur eigene). Whitelisted fields only.
beratungen.patch("/:id", requireAuth, requireRole("berater"), async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  const body = await c.req.json<{
    phase?: string;
    status?: string;
    protokoll?: string;
    foerderhoehe?: number;
    eigenanteil?: number;
  }>();

  const sets: string[] = [];
  const vals: unknown[] = [];

  if (body.phase !== undefined) {
    if (!ALLOWED_PHASES.includes(body.phase as BeratungPhase)) {
      return c.json({ success: false, error: "Ungültige phase" }, 400);
    }
    sets.push("phase = ?");
    vals.push(body.phase);
  }
  if (body.status !== undefined) {
    sets.push("status = ?");
    vals.push(body.status);
  }
  if (body.protokoll !== undefined) {
    sets.push("protokoll = ?");
    vals.push(body.protokoll);
  }
  if (body.foerderhoehe !== undefined) {
    sets.push("foerderhoehe = ?");
    vals.push(body.foerderhoehe);
  }
  if (body.eigenanteil !== undefined) {
    sets.push("eigenanteil = ?");
    vals.push(body.eigenanteil);
  }

  if (sets.length === 0) {
    return c.json({ success: false, error: "Keine Änderungen" }, 400);
  }

  sets.push("updated_at = datetime('now')");
  vals.push(id, user.id);

  const result = await c.env.BAFA_DB.prepare(
    `UPDATE bafa_beratungen SET ${sets.join(", ")} WHERE id = ? AND berater_id = ?`
  )
    .bind(...vals)
    .run();

  if (!result.meta.changes) {
    return c.json({ success: false, error: "Beratung nicht gefunden" }, 404);
  }

  return c.json({ success: true });
});

export { beratungen };
