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
  // Sprint 18: real DB column is `ausgangslage`; we map it to the
  // semantic `protokoll` field that the frontend uses.
  ausgangslage: string | null;
  unternehmen_name: string | null;
  created_at: string;
  updated_at: string;
}

function shapeBeratung(r: BeratungRow & { ausgangslage: string | null }) {
  const { ausgangslage, ...rest } = r;
  return { ...rest, protokoll: ausgangslage, branche: null as string | null };
}

// Sprint 18: aligned with bafa_beratungen.phase CHECK constraint.
// Sprint 9 originally allowed (anlauf|beratung|nachbereitung|abgeschlossen)
// — only 2 of those exist in the DB constraint, so 'beratung'+'nachbereitung'
// would fire SQLITE_CONSTRAINT_CHECK on every editor interaction.
type BeratungPhase =
  | "anlauf"
  | "datenerhebung"
  | "durchfuehrung"
  | "bericht"
  | "eingereicht"
  | "bewilligt"
  | "abgeschlossen"
  | "abgelehnt";
const ALLOWED_PHASES: BeratungPhase[] = [
  "anlauf",
  "datenerhebung",
  "durchfuehrung",
  "bericht",
  "eingereicht",
  "bewilligt",
  "abgeschlossen",
  "abgelehnt",
];

// GET / — berater lists own beratungen with unternehmen-name join
beratungen.get("/", requireAuth, requireRole("berater"), async (c) => {
  const user = c.get("user");
  const result = await c.env.BAFA_DB
    .prepare(
      `SELECT b.*, u.firmenname AS unternehmen_name
         FROM bafa_beratungen b
         LEFT JOIN unternehmen u ON u.user_id = b.unternehmen_id
        WHERE b.berater_id = (SELECT id FROM berater_profiles WHERE user_id = ?)
          AND b.deleted_at IS NULL
        ORDER BY b.created_at DESC`
    )
    .bind(user.id)
    .all<BeratungRow>();
  return c.json({
    success: true,
    beratungen: (result.results ?? []).map(shapeBeratung),
  });
});

// GET /:id — Beratung-Detail (nur eigene)
beratungen.get("/:id", requireAuth, requireRole("berater"), async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  // Sprint 18: berater_id = berater_profiles.id, not user.id.
  // Also use u.user_id (not owner_user_id) per Sprint 17 join convention.
  const row = await c.env.BAFA_DB.prepare(
    `SELECT b.*, u.firmenname AS unternehmen_name
       FROM bafa_beratungen b
       LEFT JOIN unternehmen u ON u.user_id = b.unternehmen_id
      WHERE b.id = ?
        AND b.berater_id = (SELECT id FROM berater_profiles WHERE user_id = ?)`
  )
    .bind(id, user.id)
    .first<BeratungRow>();

  if (!row) {
    return c.json({ success: false, error: "Beratung nicht gefunden" }, 404);
  }

  return c.json({ success: true, beratung: shapeBeratung(row) });
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
  // Sprint 18: bafa_beratungen has no `status` or `protokoll` columns —
  // they were Sprint 4 wishful thinking. Map to existing columns instead.
  if (body.protokoll !== undefined) {
    sets.push("ausgangslage = ?");
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
  // Sprint 18: berater_id in bafa_beratungen is the berater_profiles.id,
  // not user.id. Use a subquery to scope by ownership.
  vals.push(id, user.id);

  const result = await c.env.BAFA_DB.prepare(
    `UPDATE bafa_beratungen SET ${sets.join(", ")}
       WHERE id = ?
         AND berater_id = (SELECT id FROM berater_profiles WHERE user_id = ?)`
  )
    .bind(...vals)
    .run();

  if (!result.meta.changes) {
    return c.json({ success: false, error: "Beratung nicht gefunden" }, 404);
  }

  return c.json({ success: true });
});

export { beratungen };
