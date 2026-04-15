# Security Audit

## Secret Detection

No exposed production secrets found in source code (grep scan for sk_, AKIA, ghp_, cfat_ patterns found only placeholder in .env.example and test fixtures).

## CSP Configuration (next.config.ts:20-31)

UNSAFE-INLINE and UNSAFE-EVAL present:
- script-src: 'unsafe-inline' 'unsafe-eval' (needed for Tailwind inline styles)
- style-src: 'unsafe-inline'

Justification documented in code. Can be tightened after production Sentry/CDN setup.

## Database Security

SQL Injection Status: SECURE
- All 33+ database queries verified use .prepare().bind() pattern
- No string interpolation in WHERE/FROM clauses
- Example (worker/src/repositories/report.repository.ts:318):
  ```
  .prepare(`SELECT id, unternehmen_name, ... FROM antraege WHERE id IN (${placeholders})`)
  .bind(...reportIds)
  ```
  Placeholders generated programmatically, reportIds passed via bind().

## Authentication & Authorization

Worker (worker/src/middleware/auth.ts:7-46):
- JWT signature verification using jose library
- HttpOnly cookie enforcement via jose
- Role-based access control (line 54)
- User existence check + soft-delete awareness (line 30)

Frontend (middleware.ts:33-46):
- JWT verification with TextEncoder + jose
- Fail-closed if JWT_SECRET missing (line 36)
- Admin role check for /admin prefix (line 75)

## Security Headers

Middleware (worker/src/middleware/security.ts):
- X-Content-Type-Options: nosniff (line 10)
- X-Frame-Options: DENY (line 11)
- X-XSS-Protection: 1; mode=block (line 12)
- Referrer-Policy: strict-origin-when-cross-origin (line 13)
- Permissions-Policy: camera, microphone, geolocation blocked (line 14)
- HSTS: max-age=31536000 with preload (line 15)
- CSP: default-src 'none'; frame-ancestors 'none' on Worker (line 16)

Frontend (next.config.ts:7-33):
- Matches OWASP standards
- All headers present

## CORS

Environment-aware allowlist (worker/src/middleware/cors.ts:27-38):
- Production: 6 hardcoded origins (zfbf.info, fund24.info, fund24.io)
- Preview: Vercel preview pattern + v0.dev pattern
- Development: localhost:3000, localhost:5173
- No wildcard (*) origins

Strict CORS check (line 59-85):
- Same-origin requests bypass allowlist (CF Worker pattern)
- All cross-origin requests validated against allowlist
- CSRF protection (line 19-50)

## Rate Limiting

worker/src/middleware/rateLimit.ts (12 preset configs):
- Login: 5 requests/300s (line 47)
- Register: 3 requests/3600s (line 48-52)
- Download: 10 requests/300s (line 53-57)
- Generate: 5 requests/600s (line 58-62)
- Forgot Password: 3 requests/900s (line 63-67)
- Verify Email: 5 requests/300s (line 69-73)
- Global API: 120 requests/60s (line 76-80)

Fail-closed option (line 9) on KV errors returns 503.

## Password Security

worker/src/services/password.ts:
- PBKDF2 with SHA-256 (line 21-30)
- 100,000 iterations (line 25) — industry standard
- 32-byte random salt (line 32-35)
- Time-safe comparison (line 38-44) vs timing attacks
- Supports legacy SHA-256 for migration (line 14-18)

## Sentry PII Configuration

instrumentation-client.ts (lines 14, 28):
- tracesSampleRate: 1 (100% sampling) — review for production
- sendDefaultPii: true — HIGH RISK for GDPR

RISK: PII leakage to Sentry (user emails, IDs, etc.)
MITIGATION: DSN uses de.sentry.io (EU data processing)
RECOMMENDATION: Disable sendDefaultPii in production or scrub at middleware level

sentry.edge.config.ts, sentry.server.config.ts (same settings):
- Same PII + sampling rate issue

## Dependency Vulnerabilities

npm audit report: 10 vulnerabilities
- 2 HIGH severity
- 8 MODERATE severity

HIGH vulnerabilities:
1. Hono cookie validation (GHSA-26pp-8wgv-hjvm, range <4.12.12)
2. Hono cookie parsing bypass (GHSA-r5rp-j6wh-rvv4, range <4.12.12)
3. Hono IP matching IPv6 bypass (GHSA-xpcf-pg52-r92g, range <4.12.12)
4. Hono path traversal toSSG (GHSA-xf4j-xp2r-rqqx, range >=4.0.0 <=4.12.11)

MODERATE vulnerabilities:
- @hono/node-server middleware bypass (GHSA-92pp-h63x-v22m)
- express, openid-client, browserify-sign, es5-ext, postcss, webpack (7 more)

STATUS: All require dependency upgrades; check wrangler.toml and package.json for pinned versions.
