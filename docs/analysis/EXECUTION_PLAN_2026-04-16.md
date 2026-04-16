# Fund24 Execution Plan 2026-04-16

**Status**: Master Plan v1.0  
**Date**: 2026-04-16  
**Scope**: 115 remaining findings (121 total − 6 Phase A quick-wins)  
**Critical findings**: 1 (C-P4-01, multi-week migration)  
**High findings**: 21 remaining  
**Estimated effort**: 480–620 hours across 8 phases

---

## Executive Summary

Fund24 (Next.js 15 App Router + Cloudflare Workers + 5× D1) has 121 audit findings across architecture, security, frontend UX, and data consistency. Phase A quick-wins (6 findings) are already complete. This plan covers the remaining 115 findings in 8 strategic phases over 4–6 weeks.

**Key constraints:**
- **C-P4-01** (canonical users table, 32 vs 40 col schema split) is critical and requires multi-week migration planning.
- Schema deduplications (5 high-priority table consolidations) must precede worker refactors.
- Security hardening (auth, SSRF, rate-limits, CSP) must complete before Phase 5.
- Frontend fixes (router.push, alert/confirm dialogs) unblock UX testing.

**Phases overview:**
1. ✅ Phase A (DONE): 6 quick-wins
2. **Phase 2**: Security hardening (Week 1, 9 tasks, ~80 hours)
3. **Phase 3**: Frontend UX fixes (Week 1–2, 14 tasks, ~110 hours)
4. **Phase 4**: Navigation & metadata (Week 2, 10 tasks, ~90 hours)
5. **Phase 5**: Backend hardening (Week 2–3, 12 tasks, ~100 hours)
6. **Phase 6**: Schema consolidation (Week 3–4, 3 tasks, ~120 hours)
7. **Phase 7**: Feature completion (Week 4+, 4 tasks, ~60 hours)
8. **Phase 8**: Dead code cleanup (Week 4+, 8 tasks, ~80 hours)

---

## Phase 1: Quick Wins (COMPLETED) ✅

| ID | Title | Status |
|----|-------|--------|
| H-P1-01 | Dead /programme/[id] endpoint | ✅ FIXED |
| H-P1-02 | /antraege auth gate | ✅ FIXED |
| H-P1-03 | Sitemap data shape | ✅ FIXED |
| H-P1-04 | Berater profil data loss | ✅ FIXED |
| H-P1-05 | Dead link /dashboard/checks/[id] | ✅ FIXED |
| G-P5-01 | ComingSoonBanner cleanup | ✅ FIXED |

**Total effort Phase A**: 12 hours (complete)

---

## Phase 2: Security Hardening (Week 1)

**Goal**: Close all authentication gaps, SSRF vectors, rate-limit abuse, and CSP violations.  
**Effort**: ~80 hours | **Tasks**: 9

### TASK-001: Add Auth to /api/check/* Endpoints (H-P3-01)

| Property | Value |
|----------|-------|
| **Priority** | P0 (HIGH) |
| **Effort** | 4 hours |
| **Tool** | Claude Code |
| **Audit finding** | H-P3-01 |
| **Risk** | AI quota abuse, unmetered R2 requests |

**Problem**: 5 handlers in `/api/check/*` (checkUrl, scrapeCompany, checkEmail, listAntrag, inspectAntrag) have zero auth; consuming AI models and R2 bandwidth unmetered.

**Affected files:**
- `worker/src/routes/check.ts` (5 handlers)
- `app/api/check/[action]/route.ts` (proxy entry)

**Acceptance criteria:**
- [ ] All 5 handlers require `requireAuth()` middleware
- [ ] Unauthenticated requests return 401 with `{ error: "Unauthorized" }`
- [ ] Auth token from `Authorization: Bearer <token>` header
- [ ] Rate-limit: max 10 calls/min per user
- [ ] Metrics: count auth failures in worker logs

**Rollback**: Remove `requireAuth()` calls; revert to v1

**Dependencies**: None (independent)

---

### TASK-002: SSRF Allowlist on /api/admin/check-foerdermittel (H-P3-03)

| Property | Value |
|----------|-------|
| **Priority** | P0 (CRITICAL) |
| **Effort** | 3 hours |
| **Tool** | Claude Code |
| **Audit finding** | H-P3-03 |
| **Risk** | SSRF to DB URLs, internal network access |

**Problem**: `fetch(url, { redirect: "follow" })` on user-controlled URLs; attacker can redirect to internal DB endpoints.

**Affected files:**
- `worker/src/routes/admin.ts` (checkFoerdermittel handler)

**Acceptance criteria:**
- [ ] Allowlist: only `https://www.foerdermittel.net`, `https://api.bafa.de` permitted
- [ ] Change `redirect: "follow"` → `redirect: "error"`
- [ ] Disallowed URLs return 400 with `{ error: "URL not allowed" }`
- [ ] Test with malicious redirects (localhost:5432, 169.254.169.254)

**Rollback**: Revert fetch params; remove allowlist

**Dependencies**: None

---

### TASK-003: DSGVO Consent Split (H-P2-01 / M-P1-01)

| Property | Value |
|----------|-------|
| **Priority** | P0 (HIGH) |
| **Effort** | 5 hours |
| **Tool** | Claude Code + v0.dev |
| **Audit findings** | H-P2-01, M-P1-01 |
| **Risk** | Privacy violation: bundled consent |

**Problem**: Single checkbox on `/foerder-schnellcheck/bericht` bundles privacy + marketing opt-in; violates GDPR (granular consent required).

**Affected files:**
- `app/(public)/foerder-schnellcheck/bericht/page.tsx`
- `components/DatenschutzCheckbox.tsx` (new file)

**Acceptance criteria:**
- [ ] Split into 2 independent checkboxes: "Datenschutzerklärung" + "Marketing-Mails"
- [ ] Each checkbox has own label + link to `/datenschutz`
- [ ] Uncheck one → other remains checked
- [ ] Form submission requires both checked (or only privacy checked)
- [ ] Visual design: 2 separate inputs, clear labels

**Rollback**: Restore single checkbox; revert page.tsx

**Dependencies**: None

---

### TASK-004: Stripe Webhook 4xx on Mismatch

| Property | Value |
|----------|-------|
| **Priority** | P0 (HIGH) |
| **Effort** | 2 hours |
| **Tool** | Claude Code |
| **Audit finding** | P3 MEDIUM (Stripe webhook returns 200 on error) |
| **Risk** | Silent payment failures |

**Problem**: Webhook returns HTTP 200 even on signature mismatch; Stripe retries stop.

**Affected files:**
- `app/api/webhooks/stripe/route.ts`

**Acceptance criteria:**
- [ ] Signature mismatch → 401 Unauthorized
- [ ] JSON parse error → 400 Bad Request
- [ ] Invalid event type → 400 Bad Request
- [ ] Success → 200 OK
- [ ] All errors logged with event ID

**Rollback**: Revert status codes; restore 200

**Dependencies**: None

---

### TASK-005: Rate-Limit /api/auth/refresh

| Property | Value |
|----------|-------|
| **Priority** | P1 (HIGH) |
| **Effort** | 3 hours |
| **Tool** | Claude Code |
| **Audit finding** | P3 MEDIUM (no per-user rate limit) |
| **Risk** | Token brute-force |

**Problem**: No rate-limit on refresh endpoint; attacker can hammer token generation.

**Affected files:**
- `app/api/auth/refresh/route.ts`

**Acceptance criteria:**
- [ ] Max 5 refreshes per minute per user ID
- [ ] Exceed limit → 429 Too Many Requests
- [ ] Use Redis or in-memory bucket (Durable Objects preferred)
- [ ] Include `Retry-After` header on 429
- [ ] Metrics: log 429s

**Rollback**: Remove rate-limit logic

**Dependencies**: None (if using in-memory; Redis requires setup)

---

### TASK-006: Reports XSS — Add CSP Header

| Property | Value |
|----------|-------|
| **Priority** | P1 (HIGH) |
| **Effort** | 4 hours |
| **Tool** | Claude Code |
| **Audit finding** | P3 MEDIUM (Reports XSS, raw HTML without CSP) |
| **Risk** | Arbitrary JS execution in reports |

**Problem**: Reports page renders user HTML without CSP; attacker injects JS via report data.

**Affected files:**
- `app/(private)/reports/[id]/page.tsx`
- `middleware.ts` (global CSP header)

**Acceptance criteria:**
- [ ] CSP header: `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`
- [ ] Reports rendered with `dangerouslySetInnerHTML` sanitized via DOMPurify
- [ ] Test XSS payloads: `<img src=x onerror=alert(1)>`, `<script>alert(1)</script>`
- [ ] All payloads blocked

**Rollback**: Remove CSP header; revert DOMPurify calls

**Dependencies**: npm install dompurify (already in project)

---

### TASK-007: Admin Email Update Re-Verification

| Property | Value |
|----------|-------|
| **Priority** | P1 (HIGH) |
| **Effort** | 6 hours |
| **Tool** | Claude Code |
| **Audit finding** | P3 MEDIUM (Admin email update without re-verify) |
| **Risk** | Account takeover via unverified email |

**Problem**: `/api/admin/update-email` allows instant email change; attacker with account access changes email to their own.

**Affected files:**
- `app/api/admin/update-email/route.ts` (new verification flow)
- `app/(private)/admin/settings/page.tsx` (new form)
- `lib/email/send-verification.ts` (new helper)

**Acceptance criteria:**
- [ ] Email change sends verification link to NEW email
- [ ] Email not changed until link clicked (24h expiry)
- [ ] Verification token stored in temp table: `email_change_tokens(id, user_id, new_email, token, expires_at)`
- [ ] Old email still primary until confirmed
- [ ] Audit log entry for each change attempt

**Rollback**: Restore instant email change; drop verification tokens table

**Dependencies**: TASK-035 (soft-delete for audit logs)

---

### TASK-008: Consent Gate on Website URL Submission

| Property | Value |
|----------|-------|
| **Priority** | P1 (MEDIUM) |
| **Effort** | 3 hours |
| **Tool** | Claude Code |
| **Audit finding** | P2 MEDIUM (No consent gate on website URL submission) |
| **Risk** | Privacy: scraping company URLs without consent |

**Problem**: `/foerdercheck/[sessionId]/ergebnisse` or website input form doesn't require privacy consent before scraping.

**Affected files:**
- `app/(public)/foerdercheck/[sessionId]/ergebnisse/page.tsx`
- `components/WebsiteInputForm.tsx` (new)

**Acceptance criteria:**
- [ ] Before scraping, show modal: "By continuing, we'll analyze your website. [Privacy policy link] [I accept] [Cancel]"
- [ ] Only proceed if accepted
- [ ] Store consent in session/user record
- [ ] Never re-prompt within same session

**Rollback**: Remove consent modal

**Dependencies**: None

---

### TASK-009: /api/check scrapeCompanyFromUrl SSRF

| Property | Value |
|----------|-------|
| **Priority** | P0 (CRITICAL) |
| **Effort** | 3 hours |
| **Tool** | Claude Code |
| **Audit finding** | H-P3-01 related |
| **Risk** | SSRF via scraping endpoint |

**Problem**: `scrapeCompanyFromUrl` fetches arbitrary URLs; no allowlist (unlike TASK-002).

**Affected files:**
- `worker/src/routes/check.ts` (scrapeCompanyFromUrl handler)

**Acceptance criteria:**
- [ ] Allowlist: only .de domains + public URL schemes (http, https)
- [ ] Reject localhost, 127.0.0.1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
- [ ] Reject private IP ranges
- [ ] Timeout: 5s max

**Rollback**: Remove allowlist

**Dependencies**: None

---

## Phase 2 Quality Gate

**Checklist before Phase 3:**
- [ ] All 5 /api/check handlers require auth (TASK-001)
- [ ] SSRF vectors patched (TASK-002, TASK-009)
- [ ] DSGVO consent split (TASK-003)
- [ ] Stripe webhook returns correct status codes (TASK-004)
- [ ] /api/auth/refresh rate-limited (TASK-005)
- [ ] CSP header added; XSS payloads blocked (TASK-006)
- [ ] Email change requires verification (TASK-007)
- [ ] Website scraping requires consent (TASK-008)
- [ ] All 9 tasks merged to staging; no regressions in worker logs

**Effort**: ~80 hours | **Timeline**: 5 business days

---

## Phase 3: Frontend UX & Routing Fixes (Week 1–2)

**Goal**: Fix client-side navigation bugs, replace native dialogs, unify routing, and resolve UX inconsistencies.  
**Effort**: ~110 hours | **Tasks**: 14

### TASK-010: Fix router.push() During Render

| Property | Value |
|----------|-------|
| **Priority** | P1 (HIGH) |
| **Effort** | 6 hours |
| **Tool** | Claude Code |
| **Audit finding** | M-P1-07, P2 MEDIUM (router.push during render) |
| **Risk** | Hydration mismatch, infinite redirects |

**Problem**: 3 pages call `router.push()` synchronously during render (schnellcheck/chat, /ergebnis, /bericht).

**Affected files:**
- `app/(public)/foerder-schnellcheck/chat/page.tsx`
- `app/(public)/foerder-schnellcheck/ergebnis/page.tsx`
- `app/(public)/foerder-schnellcheck/bericht/page.tsx`

**Acceptance criteria:**
- [ ] Move all `router.push()` calls into `useEffect` with empty dependency (one-time redirect)
- [ ] Test: no console hydration warnings
- [ ] Test: redirect happens after initial render (no flicker acceptable)
- [ ] Redirect only if condition unmet (e.g., no sessionId)

**Rollback**: Revert to synchronous calls

**Dependencies**: None

---

### TASK-011: Replace All Native alert()/confirm() with shadcn Dialog/Toaster

| Property | Value |
|----------|-------|
| **Priority** | P1 (HIGH) |
| **Effort** | 12 hours |
| **Tool** | Claude Code + v0.dev |
| **Audit findings** | M-P1-03, M-P1-06, P2 MEDIUM (native alert/confirm) |
| **Risk** | Unprofessional UX, accessibility issues |

**Problem**: 8+ pages use `alert()` or `confirm()`; doesn't match design system.

**Affected files:**
- `app/(private)/berater/[id]/page.tsx` (alert on profile save)
- `app/(private)/vorlagen/page.tsx` (confirm on delete)
- `app/(private)/admin/users/page.tsx` (confirm on deactivate)
- `components/DokumenteListe.tsx` (confirm on doc delete)
- `app/(public)/foerdercheck/*/page.tsx` (various alerts)

**Acceptance criteria:**
- [ ] Create reusable `ConfirmDialog` component (shadcn-based)
- [ ] Create reusable `AlertDialog` component
- [ ] Replace 8+ alert/confirm calls
- [ ] Test: dialogs close on backdrop click, Escape key, button actions
- [ ] Styling matches rest of app (dark mode support)

**Rollback**: Restore native alert/confirm

**Dependencies**: TASK-017 (theme consistency)

---

### TASK-012: Fix Dead 'Nachricht' Button on /unternehmen/anfragen

| Property | Value |
|----------|-------|
| **Priority** | P1 (MEDIUM) |
| **Effort** | 4 hours |
| **Tool** | Claude Code |
| **Audit finding** | P2 MEDIUM (Dead 'Nachricht' button) |
| **Risk** | Broken user flow |

**Problem**: Button to send message is non-functional; no integration with nachrichten API.

**Affected files:**
- `app/(private)/unternehmen/anfragen/page.tsx`
- `app/api/nachrichten/send/route.ts` (if missing)

**Acceptance criteria:**
- [ ] Button opens modal with textarea for message
- [ ] Submit calls working API endpoint (TASK-044 validates endpoint)
- [ ] Success: toast notification, modal closes
- [ ] Error: toast with error message

**Rollback**: Hide button

**Dependencies**: TASK-044 (nachrichten endpoint)

---

### TASK-013: Add Missing h1 on /foerder-schnellcheck/chat

| Property | Value |
|----------|-------|
| **Priority** | P1 (MEDIUM) |
| **Effort** | 1 hour |
| **Tool** | Claude Code |
| **Audit finding** | M-P1-02 (Missing h1) |
| **Risk** | SEO, accessibility |

**Problem**: Page has no h1; required for semantic HTML.

**Affected files:**
- `app/(public)/foerder-schnellcheck/chat/page.tsx`

**Acceptance criteria:**
- [ ] Add h1 with text "Fördercheck"
- [ ] Validate: axe accessibility scan passes

**Rollback**: Remove h1

**Dependencies**: None

---

### TASK-014: Unify Fördercheck Path (/foerdercheck vs /foerder-schnellcheck)

| Property | Value |
|----------|-------|
| **Priority** | P1 (MEDIUM) |
| **Effort** | 8 hours |
| **Tool** | Claude Code |
| **Audit finding** | P2 MEDIUM (Inconsistent Fördercheck path) |
| **Risk** | User confusion, broken bookmarks |

**Problem**: `/foerdercheck` and `/foerder-schnellcheck` both exist; inconsistent naming.

**Affected files:**
- `app/(public)/foerdercheck/` (entire directory)
- `app/(public)/foerder-schnellcheck/` (entire directory)
- All internal links

**Acceptance criteria:**
- [ ] Decide canonical: `/foerder-schnellcheck` (matches audit expectation)
- [ ] Delete `/foerdercheck` directory
- [ ] Add route redirects: `/foerdercheck/*` → `/foerder-schnellcheck/*` (308 permanent)
- [ ] Update all internal links (40+ places)
- [ ] Test: old links still work

**Rollback**: Restore `/foerdercheck`; revert redirects

**Dependencies**: None

---

### TASK-015: Read ?programm= Query Param in Schnellcheck Entry

| Property | Value |
|----------|-------|
| **Priority** | P1 (MEDIUM) |
| **Effort** | 3 hours |
| **Tool** | Claude Code |
| **Audit finding** | P2 MEDIUM (/foerder-schnellcheck drops ?programm= query param) |
| **Risk** | Lost user context |

**Problem**: `/foerder-schnellcheck` entry doesn't read `?programm=ID` param; pre-population fails.

**Affected files:**
- `app/(public)/foerder-schnellcheck/page.tsx` (or layout)
- `components/ProgrammSelect.tsx` (populate from param)

**Acceptance criteria:**
- [ ] Extract `programm` param from URL
- [ ] If param present, pre-select program in form
- [ ] If param invalid, show error toast
- [ ] Pass through to /chat and /ergebnis pages

**Rollback**: Ignore param

**Dependencies**: None

---

### TASK-016: Fix Admin Provisionen Structured Columns

| Property | Value |
|----------|-------|
| **Priority** | P1 (HIGH) |
| **Effort** | 8 hours |
| **Tool** | Claude Code |
| **Audit findings** | M-P1-08, P2 HIGH (Admin Provisionen hardcoded 9.99% + notiz misuse) |
| **Risk** | Data integrity, audit trail loss |

**Problem**: Admin provisionen page uses free-text `notiz` column for structured data; hardcoded 9.99% fee.

**Affected files:**
- `app/(private)/admin/provisionen/page.tsx`
- `app/api/admin/provisionen/route.ts`
- D1 schema: `provisionen` table

**Acceptance criteria:**
- [ ] Add columns to provisionen table: `fee_percent REAL, fee_type TEXT (fixed|percentage), description TEXT`
- [ ] Migrate existing `notiz` → `description`
- [ ] UI: form fields for fee_percent, fee_type, description (separate)
- [ ] Validation: 0.0 ≤ fee_percent ≤ 100
- [ ] Display: show calculated fee per antrag

**Rollback**: Revert schema; restore notiz usage

**Dependencies**: TASK-037 (DB indexes)

---

### TASK-017: Fix Theme Inconsistency (foerdercheck light vs dark)

| Property | Value |
|----------|-------|
| **Priority** | P1 (MEDIUM) |
| **Effort** | 4 hours |
| **Tool** | Claude Code |
| **Audit finding** | M-P1-10 (Light-theme gradient on foerdercheck vs dark elsewhere) |
| **Risk** | Poor UX, brand inconsistency |

**Problem**: `/foerdercheck` pages use light theme + gradient; rest of app is dark.

**Affected files:**
- `app/(public)/foerdercheck/layout.tsx` (theme config)
- `app/(public)/foerder-schnellcheck/layout.tsx` (theme config)
- All foerdercheck/*.tsx pages

**Acceptance criteria:**
- [ ] Standardize to app's default theme (dark)
- [ ] Remove light-theme overrides
- [ ] Test: all pages render correctly
- [ ] Gradient consistent with brand

**Rollback**: Restore light theme

**Dependencies**: None

---

### TASK-018: Branche Taxonomy Alignment (11 vs 10 entries)

| Property | Value |
|----------|-------|
| **Priority** | P1 (MEDIUM) |
| **Effort** | 2 hours |
| **Tool** | Claude Code |
| **Audit finding** | M-P1-05 (Branche taxonomy mismatch) |
| **Risk** | Data inconsistency |

**Problem**: 11 branches in one list, 10 in another; attacker/user confusion.

**Affected files:**
- `lib/constants/branchen.ts` (source of truth)
- `components/BranchenSelect.tsx` (multiple instances)
- D1 table: `unternehmen.branche` (values)

**Acceptance criteria:**
- [ ] Audit all 3 sources; identify correct list (10 or 11)
- [ ] Standardize to one canonical list
- [ ] Update all consumers
- [ ] Verify D1 data consistency (no orphaned values)

**Rollback**: Restore original lists

**Dependencies**: None

---

### TASK-019: Fix Partial-Failure in Onboarding Expertise/Dienstleistungen

| Property | Value |
|----------|-------|
| **Priority** | P1 (HIGH) |
| **Effort** | 6 hours |
| **Tool** | Claude Code |
| **Audit findings** | P2 HIGH (partial-failure risk), M-P1-09 (same) |
| **Risk** | Incomplete onboarding, silent failures |

**Problem**: `/onboarding/expertise` and `/onboarding/dienstleistungen` use sequential for-await; one failure stops all.

**Affected files:**
- `app/(auth)/onboarding/expertise/page.tsx` (form handler)
- `app/(auth)/onboarding/dienstleistungen/page.tsx` (form handler)
- `app/api/onboarding/expertise/route.ts`
- `app/api/onboarding/dienstleistungen/route.ts`

**Acceptance criteria:**
- [ ] Change from sequential for-await to `Promise.allSettled()`
- [ ] Collect results; report per-item success/failure
- [ ] Show toast: "X of Y items saved. Y failed: [list]"
- [ ] User can retry failed items
- [ ] No silent failures

**Rollback**: Restore sequential for-await

**Dependencies**: None

---

### TASK-020: Favoriten Delete Confirmation

| Property | Value |
|----------|-------|
| **Priority** | P1 (MEDIUM) |
| **Effort** | 2 hours |
| **Tool** | Claude Code |
| **Audit finding** | P2 MEDIUM (Favoriten delete has no confirmation) |
| **Risk** | Accidental deletion |

**Problem**: Delete button on favoriten list has no confirmation.

**Affected files:**
- `app/(private)/favoriten/page.tsx`
- `components/FavoritenList.tsx`

**Acceptance criteria:**
- [ ] Delete button → confirmation dialog
- [ ] Dialog: "Delete [name]? This cannot be undone."
- [ ] Confirm → POST /api/favoriten/delete with ID
- [ ] Success: item removed from list

**Rollback**: Remove confirmation

**Dependencies**: TASK-011 (ConfirmDialog component)

---

### TASK-021: Berater Onboarding Server-Side Role Check

| Property | Value |
|----------|-------|
| **Priority** | P1 (MEDIUM) |
| **Effort** | 4 hours |
| **Tool** | Claude Code |
| **Audit finding** | P2 MEDIUM (Berater onboarding pages rely only on client-side role check) |
| **Risk** | Authorization bypass |

**Problem**: `/onboarding/berater` checks role only on client; attacker can bypass via API.

**Affected files:**
- `app/(auth)/onboarding/berater/page.tsx`
- `app/api/onboarding/berater/route.ts`

**Acceptance criteria:**
- [ ] Page: server-side check in `getSession()` → `session.role === 'berater'` else redirect
- [ ] API: same check before processing
- [ ] Return 403 if role mismatch

**Rollback**: Remove server-side checks

**Dependencies**: None

---

### TASK-022: Fix Anfrage Status Coercion (Silent abgelehnt)

| Property | Value |
|----------|-------|
| **Priority** | P1 (MEDIUM) |
| **Effort** | 3 hours |
| **Tool** | Claude Code |
| **Audit finding** | P3 MEDIUM (updateAnfrage silently coerces status to 'abgelehnt') |
| **Risk** | Data corruption |

**Problem**: `updateAnfrage()` function silently defaults status to 'abgelehnt' if missing.

**Affected files:**
- `lib/api/anfragen.ts` (updateAnfrage function)
- Any callers of `updateAnfrage()`

**Acceptance criteria:**
- [ ] Change: if status missing, throw error (don't default)
- [ ] Or: require explicit status enum validation
- [ ] Audit all callers; ensure they pass valid status
- [ ] Add tests: invalid status → error

**Rollback**: Restore default to 'abgelehnt'

**Dependencies**: None

---

### TASK-023: Password Regex Alignment (registrieren vs reset)

| Property | Value |
|----------|-------|
| **Priority** | P1 (LOW) |
| **Effort** | 1 hour |
| **Tool** | Claude Code |
| **Audit finding** | Low (implicit in audit) |
| **Risk** | Confusing UX, validation mismatch |

**Problem**: `/registrieren` and `/passwort-reset` use different password strength rules.

**Affected files:**
- `app/(auth)/registrieren/page.tsx` (regex A)
- `app/(auth)/passwort-reset/page.tsx` (regex B)

**Acceptance criteria:**
- [ ] Create canonical regex: `lib/validation/password.ts`
- [ ] Both pages use same regex
- [ ] Regex enforced on server (API route) and client

**Rollback**: Restore separate regexes

**Dependencies**: None

---

## Phase 3 Quality Gate

**Checklist before Phase 4:**
- [ ] No router.push during render (TASK-010)
- [ ] All native alert/confirm replaced with shadcn components (TASK-011)
- [ ] Nachricht button functional (TASK-012)
- [ ] h1 present on schnellcheck/chat (TASK-013)
- [ ] /foerdercheck path unified (TASK-014)
- [ ] ?programm= param read and used (TASK-015)
- [ ] Admin provisionen UI has structured columns (TASK-016)
- [ ] Theme consistent across app (TASK-017)
- [ ] Branche list unified (TASK-018)
- [ ] Onboarding expertise/dienstleistungen use Promise.allSettled (TASK-019)
- [ ] Favoriten delete has confirmation (TASK-020)
- [ ] Berater onboarding checks role server-side (TASK-021)
- [ ] Anfrage status never defaults silently (TASK-022)
- [ ] Password regex unified (TASK-023)
- [ ] All tasks merged; Lighthouse score ≥ 85; no hydration warnings

**Effort**: ~110 hours | **Timeline**: 8 business days

---

## Phase 4: Navigation & Metadata (Week 2)

**Goal**: Surface orphaned pages, fix metadata, standardize components, fix auth/session issues.  
**Effort**: ~90 hours | **Tasks**: 10

### TASK-024: Add Nav Links for 8 Orphan Pages

| Property | Value |
|----------|-------|
| **Priority** | P2 (MEDIUM) |
| **Effort** | 5 hours |
| **Tool** | Claude Code |
| **Audit finding** | L-P1 series (metadata, orphan pages) |
| **Risk** | Pages undiscoverable |

**Problem**: 8 pages have no navigation links; users can't find them.

**Affected files (samples):**
- `app/(private)/layout.tsx` (sidebar nav)
- Pages needing links: TBD (audit specifies which 8)

**Acceptance criteria:**
- [ ] Identify all 8 orphan pages from audit
- [ ] Add sidebar/breadcrumb links for each
- [ ] Links respect user role (admin, berater, unternehmen)
- [ ] Test: all links functional; pages accessible

**Rollback**: Remove nav links

**Dependencies**: None

---

### TASK-025: Per-Page Metadata for 54 Pages

| Property | Value |
|----------|-------|
| **Priority** | P2 (MEDIUM) |
| **Effort** | 20 hours |
| **Tool** | Claude Code |
| **Audit finding** | L-P1 series (metadata) |
| **Risk** | SEO, OG tags missing |

**Problem**: 54 pages lack proper `<head>` metadata (title, description, OG tags).

**Affected files:**
- Each page's metadata export (Next.js 15 App Router)

**Acceptance criteria:**
- [ ] Create helper: `lib/seo/generateMetadata.ts`
- [ ] Each page exports `generateMetadata()` function
- [ ] Metadata includes: title, description, og:title, og:description, og:image
- [ ] 54 pages updated
- [ ] Test: validate with SEO checker

**Rollback**: Remove metadata exports

**Dependencies**: None

---

### TASK-026: Fix Program-Count Inconsistency

| Property | Value |
|----------|-------|
| **Priority** | P2 (MEDIUM) |
| **Effort** | 3 hours |
| **Tool** | Claude Code |
| **Audit finding** | L-P1 (consistency) |
| **Risk** | Incorrect data displayed |

**Problem**: Program count displayed on homepage differs from actual program table.

**Affected files:**
- `app/(public)/page.tsx` (displays count)
- `app/api/programmes/count/route.ts` (or similar)

**Acceptance criteria:**
- [ ] Count always = COUNT(*) from programme table
- [ ] Cache: max 1h staleness
- [ ] Test: add/delete programme → count updates

**Rollback**: Restore hardcoded count

**Dependencies**: None

---

### TASK-027: Fix All Typos / Denglisch

| Property | Value |
|----------|-------|
| **Priority** | P2 (MEDIUM) |
| **Effort** | 8 hours |
| **Tool** | Claude Code |
| **Audit finding** | L-P1 series (typos) |
| **Risk** | Unprofessional UX |

**Problem**: Multiple typos and Denglisch across UI (audit provides list).

**Acceptance criteria:**
- [ ] Identify all typos from audit report
- [ ] Fix across codebase: UI strings, component names, variable names
- [ ] Global find-replace where applicable
- [ ] Manual review: each typo fixed once

**Rollback**: Revert spelling

**Dependencies**: None

---

### TASK-028: Move /passwort-reset to (auth) Group

| Property | Value |
|----------|-------|
| **Priority** | P2 (MEDIUM) |
| **Effort** | 2 hours |
| **Tool** | Claude Code |
| **Audit finding** | L-P1 (routing consistency) |
| **Risk** | Routing inconsistency |

**Problem**: `/passwort-reset` outside `(auth)` group; `registrieren`, `login` inside.

**Affected files:**
- Move `app/(public)/passwort-reset/` → `app/(auth)/passwort-reset/`

**Acceptance criteria:**
- [ ] Move directory
- [ ] Update all links (40+ places)
- [ ] Test: 308 redirects from old path
- [ ] No auth required on password reset (allow unauthenticated)

**Rollback**: Restore old path

**Dependencies**: None

---

### TASK-029: Fix Legal Pages (Jurisdiction, TMG→DDG, Date, Email, TODO Banners)

| Property | Value |
|----------|-------|
| **Priority** | P2 (MEDIUM) |
| **Effort** | 6 hours |
| **Tool** | Claude Code |
| **Audit finding** | L-P1 series (legal compliance) |
| **Risk** | Regulatory non-compliance |

**Problem**: Legal pages (AGB, Datenschutz, Impressum) have outdated info, TODO banners, wrong references.

**Affected files:**
- `app/(public)/impressum/page.tsx`
- `app/(public)/datenschutz/page.tsx`
- `app/(public)/agb/page.tsx`

**Acceptance criteria:**
- [ ] Update jurisdiction (Germany)
- [ ] Change "TMG" → "DDG" (new German law)
- [ ] Update last-modified date to 2026-04-16
- [ ] Update contact email to canonical address
- [ ] Remove all [TODO] banners
- [ ] Legal review: flag for compliance team

**Rollback**: Restore old legal pages

**Dependencies**: None

---

### TASK-030: Fix global-error.tsx reset() + Sentry

| Property | Value |
|----------|-------|
| **Priority** | P2 (MEDIUM) |
| **Effort** | 4 hours |
| **Tool** | Claude Code |
| **Audit finding** | L-P1 (error handling) |
| **Risk** | Silent errors, no monitoring |

**Problem**: Global error page doesn't call reset() or report to Sentry.

**Affected files:**
- `app/global-error.tsx`

**Acceptance criteria:**
- [ ] Add error button: "Try again" → calls reset()
- [ ] Capture error in Sentry (if configured)
- [ ] Display user-friendly error message
- [ ] Include error ID for support reference

**Rollback**: Restore original error page

**Dependencies**: None

---

### TASK-031: Unify Select Components (shadcn Everywhere)

| Property | Value |
|----------|-------|
| **Priority** | P2 (MEDIUM) |
| **Effort** | 10 hours |
| **Tool** | Claude Code + v0.dev |
| **Audit finding** | L-P3 (component consistency) |
| **Risk** | Inconsistent UX |

**Problem**: 20+ places use custom `<select>` or headless selects; not unified.

**Affected files:**
- All form pages

**Acceptance criteria:**
- [ ] Audit all select inputs
- [ ] Replace with shadcn `<Select>` component
- [ ] Test: keyboard navigation, styling, mobile

**Rollback**: Restore old selects

**Dependencies**: None

---

### TASK-032: Fix auth.ts Logout Cookie Name Mismatch

| Property | Value |
|----------|-------|
| **Priority** | P2 (MEDIUM) |
| **Effort** | 2 hours |
| **Tool** | Claude Code |
| **Audit finding** | L-P3 (auth config mismatch) |
| **Risk** | Logout fails silently |

**Problem**: Logout clears cookie `sessionToken`, but auth.ts reads `token`.

**Affected files:**
- `lib/auth.ts` (logout logic)
- `middleware.ts` (session check)

**Acceptance criteria:**
- [ ] Identify correct cookie name (likely `sessionToken`)
- [ ] Update all references consistently
- [ ] Test: logout clears correct cookie; session reset

**Rollback**: Restore original names

**Dependencies**: None

---

### TASK-033: Add JWT_SECRET to .env.example

| Property | Value |
|----------|-------|
| **Priority** | P2 (LOW) |
| **Effort** | 1 hour |
| **Tool** | Claude Code |
| **Audit finding** | G-P5-04 (JWT_SECRET not in .env.example) |
| **Risk** | Deployment issues for new devs |

**Problem**: `.env.example` missing `JWT_SECRET`; developers don't know it's required.

**Affected files:**
- `.env.example`

**Acceptance criteria:**
- [ ] Add `JWT_SECRET=your-secret-here` to .env.example
- [ ] Document: required, min 32 chars

**Rollback**: Remove from .env.example

**Dependencies**: None

---

## Phase 4 Quality Gate

**Checklist before Phase 5:**
- [ ] 8 orphan pages linked in nav (TASK-024)
- [ ] 54 pages have metadata (TASK-025)
- [ ] Program count accurate (TASK-026)
- [ ] All typos fixed (TASK-027)
- [ ] /passwort-reset in (auth) group (TASK-028)
- [ ] Legal pages updated (TASK-029)
- [ ] global-error.tsx handles reset + Sentry (TASK-030)
- [ ] All Select components use shadcn (TASK-031)
- [ ] Logout cookie name consistent (TASK-032)
- [ ] JWT_SECRET in .env.example (TASK-033)
- [ ] All 10 tasks merged; no regressions

**Effort**: ~90 hours | **Timeline**: 6 business days

---

## Phase 5: Backend Hardening (Week 2–3)

**Goal**: Add database indexes, protect AI quotas, fix soft-deletes, consolidate redundant tables, port worker endpoints.  
**Effort**: ~100 hours | **Tasks**: 12

### TASK-034: AI Quota Protection (/api/foerdermittel/cases + match)

| Property | Value |
|----------|-------|
| **Priority** | P1 (HIGH) |
| **Effort** | 6 hours |
| **Tool** | Claude Code |
| **Audit finding** | P3 MEDIUM (/api/foerdermittel/cases AI quota per-call, /api/foerdermittel/match AI quota hammering) |
| **Risk** | Unmetered AI spend, quota exhaustion |

**Problem**: `/api/foerdermittel/cases` and `/match` call AI on every request; no per-user quota.

**Affected files:**
- `app/api/foerdermittel/cases/route.ts`
- `app/api/foerdermittel/match/route.ts`
- `lib/quotas/ai.ts` (new quota tracker)

**Acceptance criteria:**
- [ ] Create quota tracker: `ai_quota_daily(user_id, date, calls_used, limit)`
- [ ] Limit: 50 calls/user/day (configurable)
- [ ] Check quota before calling AI; return 429 if exceeded
- [ ] Cache AI responses by query hash (24h)
- [ ] Metrics: track quota usage per endpoint

**Rollback**: Remove quota checks

**Dependencies**: None

---

### TASK-035: Soft-Delete for Admin News

| Property | Value |
|----------|-------|
| **Priority** | P1 (MEDIUM) |
| **Effort** | 5 hours |
| **Tool** | Claude Code |
| **Audit finding** | P3 MEDIUM (/api/admin/news hard-delete) |
| **Risk** | Data loss, audit trail breach |

**Problem**: DELETE on news table is hard-delete; no recovery.

**Affected files:**
- `app/api/admin/news/route.ts`
- D1 schema: `news` table (add `deleted_at TIMESTAMP NULL`)

**Acceptance criteria:**
- [ ] Add `deleted_at TIMESTAMP` to news table
- [ ] DELETE request → set `deleted_at = NOW()`
- [ ] SELECT queries → exclude `WHERE deleted_at IS NULL`
- [ ] Admin: option to restore deleted news (unset `deleted_at`)
- [ ] Audit log all deletes

**Rollback**: Restore hard-delete; revert schema

**Dependencies**: None

---

### TASK-036: Fix /api/me/* Sub-App Middleware Bypass

| Property | Value |
|----------|-------|
| **Priority** | P1 (HIGH) |
| **Effort** | 4 hours |
| **Tool** | Claude Code |
| **Audit finding** | P3 MEDIUM (/api/me/* sub-app fetch bypasses middleware) |
| **Risk** | Authentication bypass |

**Problem**: `/api/me/` sub-app doesn't inherit root middleware; attacker can call without auth.

**Affected files:**
- `app/api/me/` (route group or app router)
- `middleware.ts` (root middleware)

**Acceptance criteria:**
- [ ] Ensure `/api/me/*` routes inherit auth middleware
- [ ] Test: unauthenticated request → 401
- [ ] Verify all /me/* endpoints check auth

**Rollback**: Revert middleware changes

**Dependencies**: None

---

### TASK-037: Add DB Indexes (H-P4-05)

| Property | Value |
|----------|-------|
| **Priority** | P1 (HIGH) |
| **Effort** | 8 hours |
| **Tool** | Claude Code / Cloudflare D1 CLI |
| **Audit finding** | H-P4-05 (Most bafa_antraege tables have 0 indexes) |
| **Risk** | Slow queries, N+1 problems |

**Problem**: 10+ tables (bafa_antraege, berater_profiles, unternehmen, etc.) have 0 indexes; queries are slow.

**Affected tables:**
- bafa_antraege: add idx_unternehmen_id, idx_berater_id, idx_status, idx_created_at
- berater_profiles: add idx_user_id, idx_status
- unternehmen: add idx_user_id
- antraege: add idx_unternehmen_id, idx_status, idx_created_at
- favoriten: add idx_user_id, idx_antrag_id

**Acceptance criteria:**
- [ ] Create indexes (5 tables min, per audit)
- [ ] Benchmark queries before/after (target: <50ms)
- [ ] No duplicate indexes
- [ ] Document all indexes created

**Rollback**: DROP INDEX statements for each

**Dependencies**: None

---

### TASK-038: Backup All 5 D1 Databases

| Property | Value |
|----------|-------|
| **Priority** | P1 (MEDIUM) |
| **Effort** | 4 hours |
| **Tool** | Cloudflare D1 CLI |
| **Audit finding** | L-P4-05 (backup all D1 databases) |
| **Risk** | Data loss in case of corruption |

**Problem**: No automated backups of D1 databases.

**Databases to backup:**
- production (main)
- legacy (old)
- check_db
- foerdermittel_db
- bafa_db

**Acceptance criteria:**
- [ ] Export all 5 D1 databases to SQLite dumps
- [ ] Store in R2 with timestamp (daily rotation)
- [ ] Create Durable Object/Cron job for daily backups
- [ ] Document restore process

**Rollback**: N/A (backups are additive)

**Dependencies**: None

---

### TASK-039: Consolidate Favorites to Single Table (H-P4-01)

| Property | Value |
|----------|-------|
| **Priority** | P1 (HIGH) |
| **Effort** | 12 hours |
| **Tool** | Claude Code / Cloudflare D1 CLI |
| **Audit finding** | H-P4-01 (3 favorites tables across 2 DBs) |
| **Risk** | Data inconsistency, lost favorites |

**Problem**: 3 `favoriten` tables (possibly with different schemas) across 2 databases; users' favorites scattered.

**Affected tables/files:**
- DB1.favoriten, DB2.favoriten, DB2.user_favorites (pick 1 canonical)
- `app/api/favoriten/*` (update all routes)

**Acceptance criteria:**
- [ ] Choose canonical table (likely DB1.favoriten)
- [ ] Create migration: consolidate all 3 → canonical
- [ ] Verify no data loss (count before/after)
- [ ] Drop 2 legacy tables
- [ ] Update API routes to use canonical table only
- [ ] Test: create/read/delete favorites works

**Rollback**: Restore legacy tables; revert API

**Dependencies**: TASK-037 (indexes), TASK-046 (users table)

---

### TASK-040: Drop Legacy Antraege Table (H-P4-02)

| Property | Value |
|----------|-------|
| **Priority** | P1 (HIGH) |
| **Effort** | 8 hours |
| **Tool** | Claude Code / Cloudflare D1 CLI |
| **Audit finding** | H-P4-02 (antraege vs antraege_v2 coexist) |
| **Risk** | Data inconsistency, confusion |

**Problem**: `antraege` (legacy) and `antraege_v2` (canonical) both exist; queries sometimes use wrong table.

**Affected tables/files:**
- DB1.antraege (legacy)
- DB1.antraege_v2 (canonical)
- All API routes using antraege

**Acceptance criteria:**
- [ ] Confirm antraege_v2 is canonical (audit specifies)
- [ ] Migrate any remaining antraege records → antraege_v2
- [ ] Update all queries to use antraege_v2 only
- [ ] DROP TABLE antraege
- [ ] Test: no queries break

**Rollback**: Restore antraege table

**Dependencies**: TASK-037 (indexes)

---

### TASK-041: Consolidate Audit_Logs (H-P4-03)

| Property | Value |
|----------|-------|
| **Priority** | P1 (HIGH) |
| **Effort** | 8 hours |
| **Tool** | Claude Code / Cloudflare D1 CLI |
| **Audit finding** | H-P4-03 (2 audit_logs tables across 2 DBs) |
| **Risk** | Inconsistent compliance audit trail |

**Problem**: 2 `audit_logs` tables (different schemas) in different DBs; no single compliance source.

**Affected tables/files:**
- DB1.audit_logs
- DB2.audit_logs (drop or consolidate)

**Acceptance criteria:**
- [ ] Choose canonical schema (likely larger table)
- [ ] Consolidate both → 1 canonical table (DB1 or central DB)
- [ ] Ensure all events logged consistently
- [ ] Drop duplicate table
- [ ] Update all logging calls

**Rollback**: Restore both tables

**Dependencies**: TASK-037 (indexes)

---

### TASK-042: Resolve Berater_Profile vs Berater_Profiles Naming (H-P4-04)

| Property | Value |
|----------|-------|
| **Priority** | P1 (HIGH) |
| **Effort** | 6 hours |
| **Tool** | Claude Code / Cloudflare D1 CLI |
| **Audit finding** | H-P4-04 (berater_profile singular 11 cols vs berater_profiles plural 17 cols) |
| **Risk** | Data loss, confused queries |

**Problem**: `berater_profile` (singular, 11 cols) and `berater_profiles` (plural, 17 cols) both exist; different schemas.

**Affected tables/files:**
- `berater_profile` (legacy, 11 cols)
- `berater_profiles` (canonical, 17 cols)
- All API routes

**Acceptance criteria:**
- [ ] Confirm berater_profiles is canonical (17 cols)
- [ ] Migrate any berater_profile records → berater_profiles
- [ ] Update all queries
- [ ] DROP TABLE berater_profile
- [ ] Test: all berater data accessible

**Rollback**: Restore berater_profile

**Dependencies**: TASK-037 (indexes)

---

### TASK-043: Port CHECK Worker Endpoints to Main Worker

| Property | Value |
|----------|-------|
| **Priority** | P1 (MEDIUM) |
| **Effort** | 10 hours |
| **Tool** | Claude Code |
| **Audit finding** | P3 HIGH (lib/api/check.ts massive legacy surface shadowed by fund24.ts) |
| **Risk** | Confusing codebase, unmaintained endpoints |

**Problem**: CHECK worker has separate codebase; fund24.ts shadows old API. Consolidate.

**Affected files:**
- `worker/src/routes/check.ts` (CHECK worker routes)
- `worker/src/routes/fund24.ts` (main worker routes)

**Acceptance criteria:**
- [ ] Audit: which CHECK endpoints are still used
- [ ] Port active endpoints → fund24.ts (/api/check/checkUrl, etc.)
- [ ] Delete CHECK worker after porting
- [ ] Test: all endpoints functional
- [ ] No breaking changes

**Rollback**: Restore CHECK worker

**Dependencies**: TASK-001 (auth on /api/check)

---

### TASK-044: Verify/Fix Nachrichten Endpoint

| Property | Value |
|----------|-------|
| **Priority** | P1 (MEDIUM) |
| **Effort** | 5 hours |
| **Tool** | Claude Code |
| **Audit finding** | P3 HIGH (getNachrichten + sendeNachricht target API.CHECK — nachrichten page likely broken) |
| **Risk** | Messaging feature broken |

**Problem**: getNachrichten and sendeNachricht call old API.CHECK endpoints; likely broken.

**Affected files:**
- `lib/api/nachrichten.ts` (API calls)
- `app/api/nachrichten/*` (endpoints)
- `app/(private)/nachrichten/page.tsx` (UI)

**Acceptance criteria:**
- [ ] Audit: confirm nachrichten endpoints working or broken
- [ ] If broken: create working endpoints (or port from CHECK worker)
- [ ] Test: send/receive messages
- [ ] Update UI if endpoints changed

**Rollback**: Revert to old API calls

**Dependencies**: TASK-043 (port CHECK endpoints)

---

### TASK-045: Clean Up lib/api/check.ts Legacy Surface

| Property | Value |
|----------|-------|
| **Priority** | P2 (MEDIUM) |
| **Effort** | 4 hours |
| **Tool** | Claude Code |
| **Audit finding** | P3 HIGH (lib/api/check.ts massive legacy surface shadowed by fund24.ts) |
| **Risk** | Dead code, confusion |

**Problem**: `lib/api/check.ts` is 500+ lines; mostly shadowed by newer fund24.ts.

**Affected files:**
- `lib/api/check.ts` (legacy)
- `lib/api/fund24.ts` (canonical)

**Acceptance criteria:**
- [ ] Audit: identify used vs unused exports in check.ts
- [ ] Migrate used → fund24.ts (or consolidate)
- [ ] Remove unused exports
- [ ] Delete check.ts if fully migrated

**Rollback**: Restore check.ts

**Dependencies**: TASK-043, TASK-044

---

## Phase 5 Quality Gate

**Checklist before Phase 6:**
- [ ] AI quota protection active (TASK-034)
- [ ] News table uses soft-delete (TASK-035)
- [ ] /api/me/* checks auth (TASK-036)
- [ ] Database indexes created (TASK-037)
- [ ] All 5 D1 databases backed up (TASK-038)
- [ ] Favorites consolidated to 1 table (TASK-039)
- [ ] Legacy antraege table dropped (TASK-040)
- [ ] audit_logs consolidated (TASK-041)
- [ ] berater_profile/profiles naming resolved (TASK-042)
- [ ] CHECK worker endpoints ported (TASK-043)
- [ ] Nachrichten endpoints verified (TASK-044)
- [ ] check.ts legacy surface cleaned (TASK-045)
- [ ] Query performance benchmarked (index improvement ≥20%)
- [ ] All 12 tasks merged; staging stable

**Effort**: ~100 hours | **Timeline**: 7 business days

---

## Phase 6: Schema Consolidation (Week 3–4)

**Goal**: Resolve critical `users` table schema split (C-P4-01), deduplicate `foerdermittel_*` tables, unbind redundant databases.  
**Effort**: ~120 hours | **Tasks**: 3

**⚠️ CRITICAL PHASE**: Multi-week migration required. Coordinate with team; plan rollback carefully.

### TASK-046: Canonical Users Table (C-P4-01) — Multi-Week Migration

| Property | Value |
|----------|-------|
| **Priority** | P0 (CRITICAL) |
| **Effort** | 80 hours |
| **Tool** | Claude Code / Cloudflare D1 CLI |
| **Audit finding** | C-P4-01 (users table in TWO DBs with different schemas: 32 vs 40 cols. Worker queries both inconsistently.) |
| **Risk** | Data corruption, authentication failures, multi-week rollback |

**Problem**: `users` table exists in 2 databases with incompatible schemas:
- DB1.users: 32 columns (older schema)
- DB2.users: 40 columns (newer schema, extras: feature flags, preferences, etc.)

Worker queries both inconsistently; creates race conditions and data loss.

**Affected tables/files:**
- DB1.users (32 cols)
- DB2.users (40 cols)
- `app/api/auth/*` (session/token routes)
- `lib/auth.ts` (user lookup)
- `middleware.ts` (session validation)
- `worker/src/auth/index.ts` (worker auth)

**Migration strategy (phased):**

**Phase 6a (Planning week, 10 hours):**
- [ ] Audit both schemas; document all 40 columns (canonical)
- [ ] Identify which DB is authoritative (likely DB2 with 40 cols)
- [ ] Create migration plan document (share with team)
- [ ] Backup both databases (TASK-038)

**Phase 6b (Prepare, 15 hours):**
- [ ] Add 8 missing columns to DB1.users (or vice versa, depending on direction)
- [ ] Write migration scripts (SQL)
- [ ] Test migration on staging replica (not production)
- [ ] Validate data integrity (count, checksums, sample rows)

**Phase 6c (Cutover, 30 hours):**
- [ ] Plan maintenance window (2–4 hours)
- [ ] Disable writes to both tables (feature flag)
- [ ] Run migration on production (live)
- [ ] Validate: both tables match
- [ ] Switch worker to use single canonical table
- [ ] Monitor: auth/token endpoints for errors
- [ ] Re-enable writes

**Phase 6d (Verification, 10 hours):**
- [ ] Run 24h sanity checks (login/logout, token refresh)
- [ ] Audit logs: verify no auth errors
- [ ] Performance: ensure no N+1 queries
- [ ] User feedback: monitor support tickets

**Phase 6e (Cleanup, 15 hours):**
- [ ] Drop legacy table (DB1.users or DB2.users, whichever is not canonical)
- [ ] Update all code to use single table only
- [ ] Remove conditional/fallback queries
- [ ] Document new canonical schema in README

**Acceptance criteria:**
- [ ] Single users table with 40 columns (canonical)
- [ ] All 40 columns populated (no NULLs from migration)
- [ ] Worker code uses single users table only
- [ ] Auth endpoints: 100% success rate for 24h post-cutover
- [ ] Rollback tested: can restore to dual-table state in <1h
- [ ] Zero authentication failures (audit log clean)

**Rollback strategy (if needed):**
- Restore both databases from backup (TASK-038)
- Revert worker code to dual-table queries
- Monitor auth endpoints
- Communicate issue to users (brief outage window)

**Timeline**: 3–4 weeks (not concurrent with other phases)

**Dependencies**: 
- TASK-038 (backups created first)
- TASK-037 (indexes on canonical table)
- Phase 5 complete (other schema consolidations done first)

**Team coordination required**: YES (notify devops, QA, support)

---

### TASK-047: Deduplicate 8 foerdermittel_* Tables (M-P4-01)

| Property | Value |
|----------|-------|
| **Priority** | P1 (HIGH) |
| **Effort** | 25 hours |
| **Tool** | Claude Code / Cloudflare D1 CLI |
| **Audit finding** | M-P4-01 (8 foerdermittel_* tables duplicated across 2 DBs) |
| **Risk** | Data inconsistency, slow queries |

**Problem**: 8 tables (foerdermittel_kategorien, foerdermittel_arten, etc.) exist in both DBs with different data.

**Affected tables (8 total):**
- foerdermittel_kategorien
- foerdermittel_arten
- foerdermittel_zielgruppen
- foerdermittel_branchen
- foerdermittel_regionen
- foerdermittel_bundes_ids
- foerdermittel_themen
- foerdermittel_details

**Migration strategy:**
- [ ] Choose canonical database (likely foerdermittel_db or production DB)
- [ ] Migrate all 8 tables → canonical DB
- [ ] Verify data integrity (row counts match, checksums)
- [ ] Drop 8 tables from legacy DB
- [ ] Update all queries to use canonical DB only
- [ ] Test: foerdermittel API endpoints functional

**Acceptance criteria:**
- [ ] All 8 tables in single canonical DB
- [ ] No duplicate rows
- [ ] All queries use canonical DB
- [ ] Row counts verified before/after

**Rollback**: Restore 8 tables to legacy DB; revert queries

**Dependencies**: TASK-038 (backups), TASK-046 (coordinate with users migration)

---

### TASK-048: Unbind CHECK_DB from Main Worker (M-P4-02)

| Property | Value |
|----------|-------|
| **Priority** | P1 (HIGH) |
| **Effort** | 15 hours |
| **Tool** | Claude Code / Cloudflare |
| **Audit finding** | M-P4-02 (CHECK_DB bound to both workers) |
| **Risk** | Connection overhead, confusion |

**Problem**: CHECK_DB bound to both main worker and CHECK worker; redundant after CHECK endpoints ported.

**Affected files:**
- `wrangler.toml` (worker config, CHECK_DB binding)
- `worker/src/env.ts` (Env type, references CHECK_DB)
- `worker/src/routes/fund24.ts` (uses CHECK_DB indirectly)

**Acceptance criteria:**
- [ ] After TASK-043 (port CHECK endpoints), CHECK_DB no longer needed by main worker
- [ ] Remove CHECK_DB binding from wrangler.toml
- [ ] Update Env type in worker/src/env.ts
- [ ] Verify: no code references CHECK_DB after removal
- [ ] Deploy: main worker uses foerdermittel_db or production DB only

**Rollback**: Restore CHECK_DB binding in wrangler.toml

**Dependencies**: TASK-043 (CHECK endpoints ported), TASK-047 (consolidate foerdermittel tables)

---

## Phase 6 Quality Gate

**Checklist before Phase 7:**
- [ ] CRITICAL: Users table consolidated (TASK-046, multi-week)
- [ ] All team members notified of maintenance window
- [ ] 8 foerdermittel_* tables consolidated (TASK-047)
- [ ] Legacy databases backed up before any drops
- [ ] CHECK_DB binding removed (TASK-048)
- [ ] Production auth working (zero token failures)
- [ ] All queries use canonical databases only
- [ ] Performance: no slowdown from consolidations
- [ ] Rollback tested: all 3 tasks can be reverted

**Effort**: ~120 hours over 3–4 weeks | **Timeline**: 2 weeks active work (plus TASK-046 multi-week migration)

**⚠️ Risk level**: HIGH (data migration, auth critical path)

---

## Phase 7: Feature Completion (Week 4+)

**Goal**: Deliver missing features (PDF export), merge in-flight PRs, complete R2 setup.  
**Effort**: ~60 hours | **Tasks**: 4

### TASK-049: Build Real PDF Export for Fördercheck-Ergebnisse (G-P5-02)

| Property | Value |
|----------|-------|
| **Priority** | P2 (MEDIUM) |
| **Effort** | 25 hours |
| **Tool** | Claude Code |
| **Audit finding** | G-P5-02, P2 HIGH (PDF download mock on /foerdercheck/[sessionId]/ergebnisse — button disabled + alert) |
| **Risk** | Feature incomplete, poor UX |

**Problem**: PDF export button on results page is mocked (disabled, shows alert); not implemented.

**Affected files:**
- `app/(public)/foerdercheck/[sessionId]/ergebnisse/page.tsx` (PDF button)
- `app/api/foerdercheck/export-pdf/route.ts` (new endpoint)
- `lib/pdf/generate-report.ts` (new helper)

**Acceptance criteria:**
- [ ] PDF button enabled (no disabled attr)
- [ ] Click → generates PDF with:
  - Program list (name, funding amount, conditions)
  - Summary of eligibility
  - Contact info for programs
  - Footer: "Generated on [date]"
- [ ] PDF downloaded as `foerdercheck-[sessionId].pdf`
- [ ] No crashes on large result sets (100+ programs)
- [ ] Styling: matches brand, readable on mobile

**Rollback**: Disable button again; revert to mock

**Dependencies**: None (independent feature)

---

### TASK-050: Merge BAFA-Cert Upload PR #26 (G-P5-03)

| Property | Value |
|----------|-------|
| **Priority** | P2 (MEDIUM) |
| **Effort** | 5 hours |
| **Tool** | GitHub |
| **Audit finding** | G-P5-03 (BAFA-Cert upload not merged) |
| **Risk** | Feature stalled |

**Problem**: PR #26 (BAFA certificate upload) is open but not merged.

**Affected files:**
- PR #26 (TBD specific files)

**Acceptance criteria:**
- [ ] Review PR #26 code
- [ ] Run tests locally (ensure passing)
- [ ] Resolve any conflicts with main
- [ ] Merge to main branch
- [ ] Deploy to staging; test upload flow
- [ ] Document in CHANGELOG

**Rollback**: Revert PR #26 commit

**Dependencies**: None

---

### TASK-051: Add BAFA_CERTS R2 Binding (M-P4-03)

| Property | Value |
|----------|-------|
| **Priority** | P1 (MEDIUM) |
| **Effort** | 3 hours |
| **Tool** | Cloudflare |
| **Audit finding** | M-P4-03 (BAFA_CERTS R2 bucket not bound) |
| **Risk** | Upload feature broken |

**Problem**: R2 bucket `BAFA_CERTS` exists but not bound to worker; upload endpoint can't store files.

**Affected files:**
- `wrangler.toml` (add BAFA_CERTS R2 binding)
- `worker/src/env.ts` (Env type, reference BAFA_CERTS)
- `app/api/bafa/upload-cert/route.ts` (use binding)

**Acceptance criteria:**
- [ ] Add `[[r2_buckets]]` binding in wrangler.toml: `binding = "BAFA_CERTS"`
- [ ] Update Env type with `BAFA_CERTS: R2Bucket`
- [ ] Test: upload file to R2 via API
- [ ] File appears in bucket (verify in dashboard)

**Rollback**: Remove R2 binding from wrangler.toml

**Dependencies**: TASK-050 (BAFA upload PR merged first)

---

### TASK-052: Berater Autosave Improvement (Debounced Interval)

| Property | Value |
|----------|-------|
| **Priority** | P2 (LOW) |
| **Effort** | 10 hours |
| **Tool** | Claude Code |
| **Audit finding** | Low (implicit in audit as quality improvement) |
| **Risk** | UX polish |

**Problem**: Berater profile edit form saves on every keystroke; generates excessive API calls.

**Affected files:**
- `app/(private)/berater/[id]/page.tsx`
- `lib/hooks/useAutosave.ts` (new hook)

**Acceptance criteria:**
- [ ] Implement debounced autosave: wait 500ms after last keystroke
- [ ] Interval save: save every 30s regardless (if unsaved changes)
- [ ] Show "Saving..." indicator during save
- [ ] Show "Saved" confirmation after success
- [ ] Cancel pending saves on unmount
- [ ] Test: no double-saves, no race conditions

**Rollback**: Restore save-on-keystroke

**Dependencies**: None

---

## Phase 7 Quality Gate

**Checklist before Phase 8:**
- [ ] PDF export working end-to-end (TASK-049)
- [ ] BAFA cert upload PR merged (TASK-050)
- [ ] R2 BAFA_CERTS binding functional (TASK-051)
- [ ] Berater autosave debounced (TASK-052)
- [ ] No new bugs introduced
- [ ] User feedback: features working as expected

**Effort**: ~60 hours | **Timeline**: 4 business days

---

## Phase 8: Dead Code Cleanup (Week 4+)

**Goal**: Remove 50+ dead/orphaned code, unused dependencies, confirm DB cleanup.  
**Effort**: ~80 hours | **Tasks**: 8

### TASK-053: Remove 10 Dead Frontend Wrapper Exports

| Property | Value |
|----------|-------|
| **Priority** | P3 (LOW) |
| **Effort** | 3 hours |
| **Tool** | Claude Code |
| **Audit finding** | P3 MEDIUM (Dead exports in lib/api/*) |
| **Risk** | Code clutter, confusion |

**Problem**: 10 functions exported from `lib/api/*` are never called.

**Affected files:**
- `lib/api/*.ts` (identify dead exports)

**Acceptance criteria:**
- [ ] Search codebase: find all exports from lib/api
- [ ] Identify unused exports (cross-ref with grep)
- [ ] Remove unused exports (keep comments if useful)
- [ ] No import errors after removal
- [ ] Lint check passes

**Rollback**: Restore exports

**Dependencies**: None

---

### TASK-054: Remove EmptyState.tsx

| Property | Value |
|----------|-------|
| **Priority** | P3 (LOW) |
| **Effort** | 2 hours |
| **Tool** | Claude Code |
| **Audit finding** | L-P3 (dead component) |
| **Risk** | Code clutter |

**Problem**: `components/EmptyState.tsx` is imported nowhere; orphaned component.

**Affected files:**
- `components/EmptyState.tsx` (delete)

**Acceptance criteria:**
- [ ] Verify no imports of EmptyState
- [ ] Delete file
- [ ] No build errors

**Rollback**: Restore file from git

**Dependencies**: None

---

### TASK-055: Remove 2 Unused npm Dependencies

| Property | Value |
|----------|-------|
| **Priority** | P3 (LOW) |
| **Effort** | 1 hour |
| **Tool** | Claude Code / npm |
| **Audit finding** | G-P5 series (unused deps) |
| **Risk** | Bundle size, outdated deps |

**Problem**: 2 npm packages installed but never used.

**Affected files:**
- `package.json` (audit specifies which 2)

**Acceptance criteria:**
- [ ] Identify 2 unused packages (audit provides list)
- [ ] Verify: no code imports them
- [ ] Run `npm uninstall <package1> <package2>`
- [ ] Build passes; bundle size verified

**Rollback**: `npm install` specific versions

**Dependencies**: None

---

### TASK-056: Triage and Remove Dead Worker Endpoints (50 Candidates)

| Property | Value |
|----------|-------|
| **Priority** | P3 (LOW) |
| **Effort** | 15 hours |
| **Tool** | Claude Code |
| **Audit finding** | P3 (dead code, 50 candidates) |
| **Risk** | Code maintenance burden |

**Problem**: 50 worker endpoints are old/unused; create confusion.

**Affected files:**
- `worker/src/routes/*.ts` (multiple handlers)

**Acceptance criteria:**
- [ ] Audit: identify all 50 candidates (grep all POST/GET/PUT handlers)
- [ ] Cross-ref: which are called by frontend?
- [ ] Remove 50 unused endpoints
- [ ] No 404s on remaining endpoints
- [ ] Worker bundle size reduced

**Rollback**: Restore deleted endpoints

**Dependencies**: None

---

### TASK-057: Drop 18 Confirmed Dead Tables

| Property | Value |
|----------|-------|
| **Priority** | P3 (LOW) |
| **Effort** | 4 hours |
| **Tool** | Cloudflare D1 CLI |
| **Audit finding** | L-P4 series (DB cleanup, orphans) |
| **Risk** | Database bloat |

**Problem**: 18 tables in D1 are confirmed unused (e.g., old audit tables, test data).

**Affected tables (samples):**
- (audit specifies which 18)

**Acceptance criteria:**
- [ ] Backup databases (TASK-038 ensures this)
- [ ] DROP TABLE statements for each
- [ ] Verify: no queries reference dropped tables
- [ ] No application errors post-cleanup

**Rollback**: Restore from backup

**Dependencies**: TASK-038 (backups exist)

---

### TASK-058: Drop Orphan Tables (forum, kombinationsregeln, phone/voice)

| Property | Value |
|----------|-------|
| **Priority** | P3 (LOW) |
| **Effort** | 2 hours |
| **Tool** | Cloudflare D1 CLI |
| **Audit finding** | L-P4 (orphan tables) |
| **Risk** | Database bloat |

**Problem**: 3 tables (forum, kombinationsregeln, phone/voice) are completely unused.

**Affected tables:**
- forum
- kombinationsregeln
- phone_interactions / voice_calls (or similar)

**Acceptance criteria:**
- [ ] Verify: no queries reference these tables
- [ ] DROP TABLE for each
- [ ] No application errors

**Rollback**: Restore from backup

**Dependencies**: TASK-038 (backups exist)

---

### TASK-059: Clean Up createAntrag Response Normalization

| Property | Value |
|----------|-------|
| **Priority** | P3 (LOW) |
| **Effort** | 3 hours |
| **Tool** | Claude Code |
| **Audit finding** | P3 MEDIUM (createAntrag normalizes 3 response shapes) |
| **Risk** | Confusing API contract |

**Problem**: `createAntrag()` returns 3 different response shapes depending on path.

**Affected files:**
- `app/api/antraege/create/route.ts` (or similar)
- `lib/api/antraege.ts` (client wrapper)

**Acceptance criteria:**
- [ ] Audit: identify all 3 response shapes
- [ ] Standardize to single response shape
- [ ] Update tests
- [ ] Document API contract

**Rollback**: Revert to multi-shape responses

**Dependencies**: None

---

### TASK-060: Remove Dead Frontend Calls (40 Unmatched)

| Property | Value |
|----------|-------|
| **Priority** | P3 (LOW) |
| **Effort** | 8 hours |
| **Tool** | Claude Code |
| **Audit finding** | P3 (dead frontend calls, 40 unmatched) |
| **Risk** | Dead code, confusion |

**Problem**: 40 API calls made from frontend to endpoints that don't exist or never complete.

**Affected files:**
- Various `app/api/*` and `app/(private)/*.tsx` files

**Acceptance criteria:**
- [ ] Identify 40 unmatched calls (grep frontend for `fetch()` calls)
- [ ] Check: do target endpoints exist?
- [ ] If not: remove the calls OR implement the endpoints
- [ ] If exists but unused: remove the calls
- [ ] No 404s on used endpoints

**Rollback**: Restore calls (if removing intentionally)

**Dependencies**: None

---

## Phase 8 Quality Gate

**Checklist before release:**
- [ ] 10 dead exports removed (TASK-053)
- [ ] EmptyState.tsx deleted (TASK-054)
- [ ] 2 unused npm deps removed (TASK-055)
- [ ] 50 dead worker endpoints removed (TASK-056)
- [ ] 18 dead tables dropped (TASK-057)
- [ ] 3 orphan tables dropped (TASK-058)
- [ ] createAntrag response normalized (TASK-059)
- [ ] 40 dead frontend calls removed (TASK-060)
- [ ] No build errors; no 404s in logs
- [ ] Database integrity verified (row counts, referential integrity)
- [ ] Worker bundle size reduced by ≥10%

**Effort**: ~80 hours | **Timeline**: 5 business days

---

## Cross-Phase Dependencies & Rollout Order

```
Phase 2 (Security) ──┐
                     ├─→ Phase 3 (UX) ──┐
Phase 5 (Backend)    │                  │
                     ├──────────────────┴─→ Phase 4 (Metadata)
                     │
                     └─→ Phase 6 (Schema) ──→ Phase 7 (Features) ──→ Phase 8 (Cleanup)
```

**Critical path:**
1. Phase 2 MUST complete before Phase 5
2. Phase 5 schema consolidations (TASK-039 through TASK-042) MUST complete before Phase 6
3. Phase 6 (users migration) is longest; can be parallel with Phase 7 (features)
4. Phase 8 cleanup can run anytime after Phase 7

---

## Total Effort Summary

| Phase | Tasks | Hours | Timeline | Risk |
|-------|-------|-------|----------|------|
| 1 (Quick-wins) | 6 | 12 | ✅ DONE | LOW |
| 2 (Security) | 9 | 80 | Week 1 | HIGH |
| 3 (UX) | 14 | 110 | Week 1–2 | MEDIUM |
| 4 (Metadata) | 10 | 90 | Week 2 | LOW |
| 5 (Backend) | 12 | 100 | Week 2–3 | HIGH |
| 6 (Schema) | 3 | 120 | Week 3–4 (multi-week) | CRITICAL |
| 7 (Features) | 4 | 60 | Week 4+ | MEDIUM |
| 8 (Cleanup) | 8 | 80 | Week 4+ | LOW |
| **TOTAL** | **60** | **480–620** | **4–6 weeks** | **MEDIUM–HIGH** |

**Effort breakdown:**
- Security/hardening (Phase 2, 5, 6): ~300 hours (60%)
- UX/metadata (Phase 3, 4): ~200 hours (25%)
- Features/cleanup (Phase 7, 8): ~140 hours (15%)

---

## Quality Assurance Gates

**Between each phase:**
- [ ] All tasks merged to staging branch
- [ ] Zero high-severity lint/TypeScript errors
- [ ] Unit tests: ≥95% pass rate
- [ ] E2E tests: critical paths pass
- [ ] Performance: Lighthouse score ≥85
- [ ] Security: OWASP scan clean
- [ ] Team sign-off: code review complete

**Pre-production cutover:**
- [ ] Phase 6 users table migration tested on staging replica
- [ ] All 60 tasks merged to main
- [ ] Staging environment stable for 24h
- [ ] Rollback procedures documented and tested
- [ ] Team ready for on-call support during cutover

---

## Risk Matrix (Top 5)

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|-----------|
| **C-P4-01 users table migration fails** | CRITICAL (auth broken) | MEDIUM | Phase in; test on replica; rollback plan; 4h maintenance window |
| **Phase 5 schema consolidations cause data loss** | CRITICAL (data loss) | LOW | Backups (TASK-038); migration scripts tested; checksums verified |
| **Security fixes incomplete (SSRF, auth)** | HIGH (exploit vectors remain) | MEDIUM | Code review by security; OWASP scan; pen testing post-Phase 2 |
| **Frontend UX fixes break existing flows** | MEDIUM (user complaints) | MEDIUM | E2E tests; staging deploy before prod; feature flags for rollback |
| **Database indexes degrade performance** | MEDIUM (slow queries) | LOW | Benchmark before/after; query plans analyzed; rollback indexes if needed |

---

## Merge Strategy

**Branch naming convention:**
- `phase-2/security-hardening`
- `phase-3/ux-fixes`
- `phase-4/metadata`
- `phase-5/backend-hardening`
- `phase-6/schema-consolidation`
- `phase-7/features`
- `phase-8/cleanup`

**Per-task PRs:**
- Each task gets own branch: `phase-X/task-YYY`
- Merge to phase branch after review
- Merge phase branch to `staging` after QA gate passes
- Merge `staging` to `main` after team sign-off

**Staging → Production:**
- Weekly deploys to staging
- Staging validation: 24h stability
- Friday afternoon cutover (if major changes) or Tuesday morning (if minor)
- On-call support for 48h post-deploy

---

## Rollback Procedures

**Per-task rollback:**
- Revert single commit; redeploy

**Per-phase rollback:**
- Revert phase branch to main; restart from QA gate
- Notify team of delay

**Production emergency rollback:**
- Revert to last stable commit
- Restore D1 databases from backup (TASK-038)
- Notify users of brief outage

**Users table migration rollback (TASK-046):**
- Restore both user tables from backup
- Revert worker to dual-table queries
- Recompile and redeploy
- Estimated time: 1–2 hours

---

## Communication Plan

**Stakeholders:** Noah (lead), devops, QA, support, design

**Weekly sync:** Monday 10am (15 min standup)
- Phase status, blockers, risks

**Phase gates:** Async approval via GitHub PR
- Code review, tests pass, QA sign-off

**Production cutover (Phase 6):**
- 1 week notice: announce maintenance window
- 24h before: final dry-run on staging
- Cutover day: on-call support active, team available
- Post-cutover: daily check-ins for 1 week

---

## Appendix A: Files Affected (Summary)

**Frontend (app/):**
- 14 route files (UX fixes, auth)
- 5 component files (dialogs, forms)
- 2 API routes (PDF export, auth)

**Backend (worker/):**
- 5 route files (security, auth, consolidation)
- 2 env/config files
- 1 new quota tracking module

**Database (D1):**
- 15 tables modified/consolidated
- 5 indexes added
- 3 backup procedures

**Dependencies:**
- +0 new npm packages (DOMPurify already present)
- −2 unused npm packages (TASK-055)

---

## Appendix B: Deployment Checklist

**Before Phase 2:**
- [ ] All team members read this plan
- [ ] Backups created (TASK-038 prepped)
- [ ] Staging environment refreshed from production
- [ ] Alerting/monitoring configured for Phase 2 endpoints

**Phase 2 deploy:**
- [ ] All 9 security tasks merged and tested
- [ ] No new security issues introduced (scan clean)
- [ ] Rate-limiting and quota tracking functional
- [ ] Stripe webhook tested with test events

**Phases 3–5 deploy:**
- [ ] All tasks per phase merged
- [ ] E2E tests pass
- [ ] Lighthouse ≥85
- [ ] No regressions in auth, payments, core flows

**Phase 6 deploy (users migration):**
- [ ] Maintenance window scheduled
- [ ] All team members on-call
- [ ] Rollback procedure tested
- [ ] Backup verified restorable

**Phases 7–8 deploy:**
- [ ] Feature completeness verified
- [ ] Dead code removal validated
- [ ] Performance stable
- [ ] No new bugs reported

---

## Appendix C: Audit Findings Mapping

**Phase 2:**
- H-P3-01 → TASK-001
- H-P3-03 → TASK-002
- H-P2-01 → TASK-003
- P3 MEDIUM (Stripe) → TASK-004
- P3 MEDIUM (rate-limit) → TASK-005
- P3 MEDIUM (XSS) → TASK-006
- P3 MEDIUM (email) → TASK-007
- P2 MEDIUM (consent) → TASK-008
- H-P3-01 related → TASK-009

**Phase 3:**
- M-P1-07, P2 MEDIUM (router.push) → TASK-010
- M-P1-03, M-P1-06, P2 MEDIUM → TASK-011
- P2 MEDIUM (Nachricht) → TASK-012
- M-P1-02 → TASK-013
- P2 MEDIUM (path) → TASK-014
- P2 MEDIUM (param) → TASK-015
- M-P1-08, P2 HIGH → TASK-016
- M-P1-10 → TASK-017
- M-P1-05 → TASK-018
- P2 HIGH, M-P1-09 → TASK-019
- P2 MEDIUM (favorites) → TASK-020
- P2 MEDIUM (berater) → TASK-021
- P3 MEDIUM (anfrage) → TASK-022
- (implicit) → TASK-023

**Phase 4:**
- L-P1 series → TASK-024 through TASK-033

**Phase 5:**
- P3 MEDIUM (AI quota) → TASK-034
- P3 MEDIUM (news) → TASK-035
- P3 MEDIUM (/api/me) → TASK-036
- H-P4-05 → TASK-037
- L-P4-05 → TASK-038
- H-P4-01 → TASK-039
- H-P4-02 → TASK-040
- H-P4-03 → TASK-041
- H-P4-04 → TASK-042
- P3 HIGH (legacy) → TASK-043
- P3 HIGH (nachrichten) → TASK-044
- P3 HIGH (check.ts) → TASK-045

**Phase 6:**
- C-P4-01 → TASK-046
- M-P4-01 → TASK-047
- M-P4-02 → TASK-048

**Phase 7:**
- G-P5-02, P2 HIGH → TASK-049
- G-P5-03 → TASK-050
- M-P4-03 → TASK-051
- (quality improvement) → TASK-052

**Phase 8:**
- P3 MEDIUM (dead) → TASK-053
- L-P3 (orphan) → TASK-054
- G-P5 series → TASK-055
- P3 (dead) → TASK-056
- L-P4 series → TASK-057, TASK-058
- P3 MEDIUM (response) → TASK-059
- P3 (dead) → TASK-060

---

**Plan generated**: 2026-04-16  
**Status**: Ready for implementation  
**Next step**: Team kickoff meeting to review Phases 2–3 scope and timeline

