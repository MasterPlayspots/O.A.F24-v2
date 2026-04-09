// /api/me/* — Alias-Router for fund24 v2 frontend.
// The v2 frontend was built against a /api/me/* convention that doesn't
// exist natively in the worker. Rather than duplicate handlers, this router
// forwards each /api/me/* request to the equivalent /api/foerdermittel/*
// endpoint by re-dispatching through the foerdermittel sub-app's fetch().
import { Hono } from "hono";
import type { Bindings, Variables } from "../types";
import { requireAuth } from "../middleware/auth";
import { foerdermittel } from "./foerdermittel";
import { unternehmen as unternehmenRoutes } from "./unternehmen";

const me = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function forward(targetPath: string) {
  return async (c: import("hono").Context<{ Bindings: Bindings; Variables: Variables }>) => {
    const url = new URL(c.req.url);
    url.pathname = targetPath;
    // Re-dispatch into the foerdermittel sub-app. Hono's sub-app .fetch()
    // matches the request's URL pathname against its own internal routes
    // (which begin at "/", relative to whatever prefix it gets mounted at).
    const proxied = new Request(url.toString(), c.req.raw);
    return foerdermittel.fetch(proxied, c.env, c.executionCtx);
  };
}

// GET  /api/me/antraege → /api/foerdermittel/cases
me.get("/antraege", requireAuth, forward("/cases"));
// POST /api/me/antraege → /api/foerdermittel/cases  (auto-bridge handles profile)
me.post("/antraege", requireAuth, forward("/cases"));

// GET /api/me/favoriten →  /api/foerdermittel/favorites
me.get("/favoriten", requireAuth, forward("/favorites"));

// GET /api/me/notifications → /api/foerdermittel/notifications
me.get("/notifications", requireAuth, forward("/notifications"));

// /api/me/unternehmen → /api/unternehmen/profil  (sub-app dispatch)
function forwardToUnternehmen(targetPath: string) {
  return async (c: import("hono").Context<{ Bindings: Bindings; Variables: Variables }>) => {
    const url = new URL(c.req.url);
    url.pathname = targetPath;
    const proxied = new Request(url.toString(), c.req.raw);
    return unternehmenRoutes.fetch(proxied, c.env, c.executionCtx);
  };
}
me.get("/unternehmen", requireAuth, forwardToUnternehmen("/profil"));
me.put("/unternehmen", requireAuth, forwardToUnternehmen("/profil"));
me.post("/unternehmen", requireAuth, forwardToUnternehmen("/profil"));

// GET /api/me/beratungen — unternehmen sees own beratungen with berater meta
me.get("/beratungen", requireAuth, async (c) => {
  const user = c.get("user");
  const result = await c.env.BAFA_DB
    .prepare(
      `SELECT b.*, bp.display_name AS berater_name, bp.region AS berater_region
         FROM bafa_beratungen b
         LEFT JOIN berater_profiles bp ON bp.id = b.berater_id
        WHERE b.user_id = ? AND b.deleted_at IS NULL
        ORDER BY b.created_at DESC`
    )
    .bind(user.id)
    .all<Record<string, unknown>>();
  return c.json({ success: true, beratungen: result.results ?? [] });
});

// GET /api/me/anfragen — outgoing anfragen (von_user_id = self),
// joined with berater profile metadata for display.
me.get("/anfragen", requireAuth, async (c) => {
  const user = c.get("user");
  const result = await c.env.BAFA_DB
    .prepare(
      `SELECT na.*, bp.display_name AS berater_name, bp.region AS berater_region
         FROM netzwerk_anfragen na
         LEFT JOIN berater_profiles bp ON bp.id = na.an_berater_id
        WHERE na.von_user_id = ?
        ORDER BY na.created_at DESC`
    )
    .bind(user.id)
    .all<Record<string, unknown>>();
  return c.json({ success: true, anfragen: result.results ?? [] });
});

// TODO: GET /api/me/dashboard — kein Backend-Endpoint vorhanden.
// Frontend ruft `/api/me/dashboard` (lib/api/fund24.ts: getDashboard).
// Sobald ein Aggregations-Endpoint existiert, hier mappen.
me.get("/dashboard", requireAuth, (c) =>
  c.json({ success: false, error: "Dashboard-Endpoint noch nicht implementiert" }, 501)
);

export { me };
