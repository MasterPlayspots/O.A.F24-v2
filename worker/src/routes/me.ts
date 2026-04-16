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

// Defense-in-depth: router-level guard. Any new /api/me/* handler is then
// auto-protected — developers can't accidentally ship an unauthenticated
// /me endpoint. Per-handler requireAuth below becomes redundant-but-safe.
me.use("/*", requireAuth);

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

// GET /api/me/dashboard — aggregated summary for the logged-in user.
// Antrag status is derived the same way as /api/antraege/:id:
//   status='rejected' | status='completed' & phase < submission → abgelehnt
//   status='completed' & phase in (submission, follow_up)       → bewilligt
//   phase in (submission, follow_up)                            → eingereicht
//   else                                                        → entwurf
me.get("/dashboard", requireAuth, async (c) => {
  const user = c.get("user");

  const casesQuery = c.env.BAFA_DB
    .prepare(
      `SELECT fc.phase, fc.status
         FROM foerdermittel_cases fc
         JOIN foerdermittel_profile fp ON fp.id = fc.profile_id
        WHERE fp.user_id = ?`
    )
    .bind(user.id)
    .all<{ phase: string; status: string }>();

  const dokumenteQuery = c.env.BAFA_DB
    .prepare(
      `SELECT COUNT(*) AS n
         FROM foerdermittel_dokumente fd
         JOIN foerdermittel_cases fc ON fc.id = fd.case_id
         JOIN foerdermittel_profile fp ON fp.id = fc.profile_id
        WHERE fp.user_id = ?`
    )
    .bind(user.id)
    .first<{ n: number }>();

  const reportsQuery = c.env.DB
    .prepare("SELECT COUNT(*) AS n FROM reports WHERE user_id = ?")
    .bind(user.id)
    .first<{ n: number }>();

  const [cases, dokCount, repCount] = await Promise.all([
    casesQuery,
    dokumenteQuery,
    reportsQuery,
  ]);

  let entwurf = 0;
  let eingereicht = 0;
  let bewilligt = 0;
  let abgelehnt = 0;
  for (const row of cases.results ?? []) {
    const phase = row.phase;
    const status = row.status;
    const submitted = phase === "submission" || phase === "follow_up";
    if (status === "rejected") {
      abgelehnt++;
    } else if (status === "completed") {
      if (submitted) bewilligt++;
      else abgelehnt++;
    } else if (submitted) {
      eingereicht++;
    } else {
      entwurf++;
    }
  }

  return c.json({
    success: true,
    antraege: {
      n: (cases.results ?? []).length,
      entwurf,
      eingereicht,
      bewilligt,
      abgelehnt,
    },
    reports: { n: Number(repCount?.n ?? 0) },
    dokumente: { n: Number(dokCount?.n ?? 0) },
  });
});

export { me };
