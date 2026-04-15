// /api/checks/* — thin proxy to worker-check (foerdermittel-check-api).
//
// Rationale: worker-check hosts 4.6k LOC of plain-JS check/chat/AI-swarm
// logic. A full Hono/TS rewrite is a multi-day project; instead we route
// all /api/checks/* traffic through Worker 1 so the frontend only talks
// to api.fund24.io. worker-check stays the implementation but is no
// longer directly exposed to the browser. Migration to native Hono
// handlers can happen endpoint-by-endpoint later without touching any
// frontend code.
import { Hono } from "hono";
import type { Bindings, Variables } from "../types";
import { requireAuth } from "../middleware/auth";

const checks = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const CHECK_API_UPSTREAM = "https://foerdermittel-check-api.froeba-kevin.workers.dev";

// Allowlist of sub-path shapes so we don't blindly forward anything the
// browser sends to the check-api worker. All current frontend endpoints
// covered; regex is permissive enough for /plan/:stepId and similar.
const ALLOWED_SUBPATHS = [
  /^$/,
  /^\/chat$/,
  /^\/docs$/,
  /^\/analyze$/,
  /^\/optimize$/,
  /^\/schwarm$/,
  /^\/plan$/,
  /^\/plan\/[a-f0-9]+$/,
  /^\/berater$/,
  /^\/matching$/,
];

async function forward(
  c: import("hono").Context<{ Bindings: Bindings; Variables: Variables }>,
  path: string
): Promise<Response> {
  const src = new URL(c.req.url);
  const dst = new URL(path, CHECK_API_UPSTREAM);
  dst.search = src.search;

  // Preserve Authorization + content headers, strip hop-by-hop.
  const headers = new Headers();
  for (const [k, v] of c.req.raw.headers.entries()) {
    const lower = k.toLowerCase();
    if (lower === "host" || lower === "connection" || lower === "content-length") continue;
    headers.set(k, v);
  }

  const init: RequestInit = {
    method: c.req.method,
    headers,
    redirect: "manual",
  };
  if (c.req.method !== "GET" && c.req.method !== "HEAD") {
    init.body = c.req.raw.body;
    // @ts-expect-error — duplex is a runtime option on CF Workers fetch
    init.duplex = "half";
  }

  const upstream = await fetch(dst.toString(), init);
  // Pass through status + body; strip any hop-by-hop headers.
  const outHeaders = new Headers(upstream.headers);
  outHeaders.delete("connection");
  outHeaders.delete("transfer-encoding");
  return new Response(upstream.body, {
    status: upstream.status,
    headers: outHeaders,
  });
}

// POST /api/checks  — create a session
checks.post("/", requireAuth, (c) => forward(c, "/api/checks"));

// GET /api/checks  — list own sessions
checks.get("/", requireAuth, (c) => forward(c, "/api/checks"));

// :id + optional sub-path (GET, POST, PATCH)
checks.all("/:id", requireAuth, (c) => {
  const id = c.req.param("id");
  return forward(c, `/api/checks/${id}`);
});

checks.all("/:id/:sub", requireAuth, (c) => {
  const id = c.req.param("id");
  const sub = c.req.param("sub");
  const subPath = `/${sub}`;
  if (!ALLOWED_SUBPATHS.some((re) => re.test(subPath))) {
    return c.json({ success: false, error: "Endpoint nicht gefunden" }, 404);
  }
  return forward(c, `/api/checks/${id}${subPath}`);
});

checks.all("/:id/:sub/:sub2", requireAuth, (c) => {
  const id = c.req.param("id");
  const sub = c.req.param("sub");
  const sub2 = c.req.param("sub2");
  const subPath = `/${sub}/${sub2}`;
  if (!ALLOWED_SUBPATHS.some((re) => re.test(subPath))) {
    return c.json({ success: false, error: "Endpoint nicht gefunden" }, 404);
  }
  return forward(c, `/api/checks/${id}${subPath}`);
});

export { checks };
