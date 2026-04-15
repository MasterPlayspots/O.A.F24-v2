# Architecture Audit

## 3-Tier System Structure

### Tier 1: Next.js Frontend (Vercel)
- Directory: `/app`
- Source files: 75 (TS/TSX)
- Framework: Next.js 15.5.14 with React 19.1.0
- Purpose: User-facing application (Unternehmen, Berater, Admin interfaces)
- Auth: JWT from HttpOnly cookies + middleware.ts validation

### Tier 2: Cloudflare Worker 1 (Hono) — Primary API
- Directory: `/worker/src`
- Source files: 70 (TypeScript)
- Framework: Hono 4.x running on Cloudflare Workers
- Purpose: Main API (auth, reports, payments, forum, netzwerk, etc.)
- Database: D1 (SQLite on CF), KV (rate limiting), R2 (file storage)
- Routes: auth.ts, reports.ts, payments.ts, foerdermittel.ts, check.ts, admin.ts, etc.

### Tier 3: Cloudflare Worker 2 (Plain JS) — Proxy
- Directory: `/worker-check/src`
- Source files: 2 (JavaScript)
- Purpose: Proxy/gateway for foerderprogramme-check microservice
- Note: Minimal; delegates to external service

### Shared Libraries
- Directory: `/lib`
- Source files: 15 (TS/TSX)
- Purpose: Utility functions, API clients (fund24.ts), types, validators

## Cross-Layer Leaky Import Check

Worker using Next.js: 0 violations (PASS)
- Worker must NOT import 'next' framework
- Verified: no imports of 'next' in worker/src

App/Lib using Hono: 0 violations (PASS)
- Frontend/lib must NOT import 'hono' framework
- Verified: no imports of 'hono' in app/ or lib/

## Circular Dependencies

madge --circular app lib: No circular dependencies found
madge --circular worker/src: No circular dependencies found

## Architecture Quality

Overall: GOOD

Findings:
- Clean separation of concerns (Next.js frontend isolated from Workers)
- Type safety: 48 instances of `as any` (some type constraints inherent to D1/Hono bindings)
- File organization: Follows feature-based structure (routes, services, repositories, middleware)
- Shared utilities properly separated in /lib
- No cross-contamination between frontend and backend frameworks
