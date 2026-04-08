// /api/me/* — Alias-Router for fund24 v2 frontend.
// The v2 frontend was built against a /api/me/* convention that doesn't
// exist natively in the worker. Rather than duplicate handlers, this router
// forwards each /api/me/* request to the equivalent /api/foerdermittel/*
// endpoint by re-dispatching through the foerdermittel sub-app's fetch().
import { Hono } from "hono";
import type { Bindings, Variables } from "../types";
import { requireAuth } from "../middleware/auth";
import { foerdermittel } from "./foerdermittel";

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

// GET /api/me/antraege  →  /api/foerdermittel/cases
me.get("/antraege", requireAuth, forward("/cases"));

// GET /api/me/favoriten →  /api/foerdermittel/favorites
me.get("/favoriten", requireAuth, forward("/favorites"));

// GET /api/me/notifications → /api/foerdermittel/notifications
me.get("/notifications", requireAuth, forward("/notifications"));

// TODO: GET /api/me/dashboard — kein Backend-Endpoint vorhanden.
// Frontend ruft `/api/me/dashboard` (lib/api/fund24.ts: getDashboard).
// Sobald ein Aggregations-Endpoint existiert, hier mappen.
me.get("/dashboard", requireAuth, (c) =>
  c.json({ success: false, error: "Dashboard-Endpoint noch nicht implementiert" }, 501)
);

export { me };
