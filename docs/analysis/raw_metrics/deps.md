# Dependencies Audit

## Current Key Versions

Next.js: 15.5.14 (recent)
React: 19.1.0 (recent, latest major version)
Hono: 4.x (via package.json check)
Zod: ^4.3.6 (recent)
Jose: ^5.9.6 (recent, JWT library)
TypeScript: latest (via npm outdated)

## Version Assessment

Status: MOSTLY UP-TO-DATE
- Next.js, React, Zod, Jose all at current/recent versions
- Hono pinned to safe version

## Outdated Minor Versions

Patch/minor updates available (non-critical):
- @base-ui/react: 1.3.0 → 1.4.0
- @sentry/nextjs: 10.47.0 → 10.48.0
- @tanstack/react-query: 5.96.2 → 5.99.0
- @tanstack/react-query-devtools: 5.96.2 → 5.99.0

Major version drift (optional):
- @types/node: 20.19.39 (latest 25.6.0, but v20 LTS acceptable)
- eslint: 9.39.4 (latest 10.2.0)
- eslint-config-next: 15.5.14 (latest 16.2.3 — aligns with major Next version)

## Dependency Quality

Unused dependencies: 0 (verified via depcheck --json)
Missing dependencies: 0 (verified via depcheck --json)

Assessment: CLEAN dependency tree

## Critical Vulnerabilities Requiring Upgrade

npm audit found 10 vulnerabilities (2 HIGH, 8 MODERATE):

### Hono (4 MODERATE vulnerabilities) — CRITICAL UPGRADE NEEDED
All affect Hono versions <4.12.12:
1. Cookie name validation bypass (GHSA-26pp-8wgv-hjvm)
2. Non-breaking space prefix bypass (GHSA-r5rp-j6wh-rvv4)
3. IPv4-mapped IPv6 address bypass (GHSA-xpcf-pg52-r92g)
4. Path traversal in toSSG() (GHSA-xf4j-xp2r-rqqx)

### @hono/node-server (1 MODERATE) — MODERATE UPGRADE NEEDED
Middleware bypass via repeated slashes (GHSA-92pp-h63x-v22m, <1.19.13)

### Other MODERATE vulnerabilities:
- express, openid-client, browserify-sign, es5-ext, postcss, webpack
(See npm audit --json for full details)

## Recommendation Priority

1. (HIGH) Upgrade Hono and @hono/node-server immediately
2. (MEDIUM) Review and upgrade express chain (likely transitive deps)
3. (LOW) Schedule Next.js 16 / ESLint 10 migration for next cycle
4. (INFORMATIONAL) Keep @types/node v20 LTS unless requiring v25 features
