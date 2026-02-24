# Phase 3: Testing & Documentation Review

## Test Coverage Findings

### CRITICAL

**TEST-01: DocuSeal Webhook — No Signature Enforcement Test**
File: `supabase/functions/docuseal-webhook/index.ts`
The fail-open vulnerability (SEC-01) has zero test coverage. No test verifies that requests without a signature receive 400 when the secret IS set, nor that the missing-secret path is explicitly flagged. The function has no Deno test file at all. Fix: Create `supabase/functions/docuseal-webhook/index.test.ts` with three tests: (1) reject when secret set + signature absent → 400, (2) reject when secret set + signature wrong → 400, (3) document fail-open explicitly — a test that passes when no secret is configured should be labeled as documenting the vulnerability.

**TEST-02: DocuSeal IDOR — No Ownership Assertion Test**
The `metadata.lease_id` fallback path (SEC-02) has no tests. An attacker can send a `submission.completed` event with an arbitrary `lease_id` in metadata to flip any lease to `active`. No test verifies that a `metadata.lease_id` referencing a lease that belongs to a different submission is rejected. Fix: Deno integration test verifying that the cross-submission fallback does not activate a lease when `submission_id` does not match any lease's `docuseal_submission_id`.

**TEST-03: `undefined` userId Inserted as `owner_user_id` — No Guard Tests**
Files: `use-properties.ts`, `use-maintenance.ts`, `use-unit.ts`, `use-vendor.ts`, `use-lease.ts`, `use-inspections.ts`
Every create mutation extracts `userId = user.user?.id` — which is `undefined` on expired sessions — and passes it directly to the insert. None of the 19 frontend unit tests ever assert the value of `owner_user_id` in the insert payload. A regression test that simulates an expired session and verifies the mutation throws before inserting is entirely absent.

---

### HIGH

**TEST-04: RLS INSERT/UPDATE/DELETE Isolation — Zero Tests Across 7 Tables**
All 7 RLS test files test only SELECT isolation. Since NestJS middleware no longer enforces ownership, write-path isolation is enforced solely by RLS policies. There are no tests verifying: (a) Owner A cannot INSERT a row claiming to be Owner B, (b) Owner A cannot UPDATE a row owned by Owner B, (c) Owner A cannot DELETE a row owned by Owner B. This is the most critical gap in the entire test suite given the architectural change in this PR.

**TEST-05: Stripe `notification_type` Constraint Violation — No Tests**
File: `supabase/functions/stripe-webhooks/index.ts` lines 170, 244
`notification_type: 'stripe_connect_verified'` and `notification_type: 'payment_failed'` are inserted on Stripe `account.updated` and `payment_intent.payment_failed` events. The DB CHECK constraint only allows `('maintenance', 'lease', 'payment', 'system')`. Both inserts fail silently with `23514`. No test verifies the notification_type values or the constraint.

**TEST-06: PostgREST Search Injection — No Input Validation Tests**
Files: `property-keys.ts`, `tenant-keys.ts`, `unit-keys.ts`, `use-vendor.ts`
The `.or()` filter strings receive `filters.search` without sanitization. No test verifies that inputs containing `,`, `.`, or `%` characters are handled safely before PostgREST interpolation.

**TEST-07: E2E Cache and Error Tests — Permanently Broken (Stale NestJS Route Intercepts)**
Files: `cache-behavior.spec.ts`, `error-handling.spec.ts`
These tests use `page.route('**/api/properties**')` and `page.waitForResponse(r => r.url().includes('/api/v1/properties'))` — NestJS paths that no longer exist. After the NestJS deletion, all PostgREST traffic goes to Supabase's domain. The `page.route()` intercepts never fire; tests silently pass against the real Supabase endpoint. These tests provide false assurance about error handling and cache behavior.

---

### MEDIUM

**TEST-08: Duplicate `usePaymentMethods` — No Cache Coherence Test**
Files: `use-payments.ts` (keys: `['paymentMethods', 'list']`), `use-payment-methods.ts` (keys: `['payment-methods', 'list']`)
Two complete parallel implementations exist. A mutation invalidating one query key will never cause the other to refetch. No test verifies that both implementations are consistent or that invalidation from `useDeletePaymentMethod` in one file affects the list in the other.

**TEST-09: Frontend Unit Tests — Shallow Mock Assertions (Method Called, Not Arguments)**
All 19 frontend unit tests assert `mockFrom` was called with `'properties'` or `supabaseFromMock` was called with `'tenants'` — but not what filters, column selections, or values were passed. The soft-delete filter (`.neq('status', 'inactive')`), pagination range (`.range(offset, offset + limit - 1)`), and `owner_user_id` value are all unverifiable from the current test assertions.

**TEST-10: Analytics Stub Tests Assert Known Stubs**
`use-properties.test.tsx` lines 302–348 contain 4 tests asserting that analytics hooks return `[]` or `{}`. These test the stub behavior, not production behavior. When the RPC wiring is completed, these tests will fail for the wrong reason and must be deleted rather than updated.

---

### LOW

**TEST-11: Performance Tests Are Observational, Not Gates**
File: `apps/e2e-tests/tests/performance/performance.spec.ts`
Collects Core Web Vitals via the Performance API but does not assert thresholds. No `expect(metrics.lcp).toBeLessThan(2500)` assertion is present. The tests observe metrics but do not fail CI on violations.

**TEST-12: `auth-redirect.test.ts` Is a Tautology**
Constructs local arrays of path strings and then asserts those arrays contain the strings it just put in them. No middleware function is invoked, no request is created, no redirect is observed. This test cannot catch regressions.

**TEST-13: 97 NestJS Tests Deleted With No Unit Coverage Equivalent for Edge Functions**
The deleted backend tests included DTO validation tests (Zod schema enforcement), auth guard tests, and service-layer logic tests. The new architecture has no equivalent. If an Edge Function passes a wrong field name to PostgREST, no unit test will catch it before runtime.

---

## Documentation Findings

### CRITICAL

**DOC-01: `CLAUDE.md` Contains Extensive NestJS Content That No Longer Applies**
File: `CLAUDE.md`
8 sections describe a deleted backend. Key stale content: the "Backend (NestJS): Use built-in exceptions only" section (lines 126–136), the full "Backend Structure (NestJS)" module tree (lines 194–212), the "Backend Patterns" section (lines 297–403 — Ultra-Native NestJS Philosophy, Zod DTO Pattern, Route Ordering, Controller Pattern, Service Pattern), deleted commands (`pnpm --filter @repo/backend dev`, `pnpm test:unit:backend`, `pnpm test:integration`), and the "Best Practices Reference" table pointing to 6 deleted files. This is the primary AI-facing reference document — stale NestJS patterns will actively cause wrong code to be generated in all AI-assisted development sessions going forward.

**DOC-02: RLS-Only Security Model Is Not Documented**
The architectural change from "NestJS middleware + RLS" to "RLS-only" as the security boundary is undocumented in `CLAUDE.md`. A developer unfamiliar with this shift could write code assuming a server-side authorization layer exists between the browser and the database. The constraint that every mutation must rely solely on RLS policies, and that the service role client must never reach the browser, is not stated anywhere in the primary reference document.

---

### HIGH

**DOC-03: `CLAUDE.md` Has No PostgREST or Edge Function Patterns**
The deleted "Backend Patterns" section has no replacement. There are no canonical examples for: the correct PostgREST query pattern (explicit column selection + `handlePostgrestError`), the `callEdgeFunction` pattern used in 4+ hook files, how to write a new Edge Function (JWT auth, CORS, `Deno.env.get()`, fail-fast strategy), or the `queryOptions()` factory pattern with a real PostgREST-backed query example.

**DOC-04: 31 `TODO(phase-57)` Stubs With No Central Tracking**
Files: `use-financials.ts` (7 TODOs), `use-reports.ts` (8 TODOs), `use-tenant.ts` (2 stubs throwing in production), `use-identity-verification.ts` (1 stub throwing in production), `invite-tenant-form.tsx`, `onboarding-step-tenant.tsx`, `bulk-import-stepper.tsx`, `reports/generate/page.tsx`, `tenant/payments/new/page.tsx` (2 stubs causing runtime throws for tenants), `use-template-pdf.ts`
No central tracking exists. Two stubs in `tenant/payments/new/page.tsx` cause runtime `throw` errors for tenant-facing features — these are P1 runtime regressions, not just technical debt.

**DOC-05: Edge Function Environment Variables Undocumented**
8 Edge Functions require up to 8 distinct secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DOCUSEAL_URL`, `DOCUSEAL_API_KEY`, `STIRLING_PDF_URL`, `FRONTEND_URL`, `SUPABASE_SERVICE_ROLE_KEY`). There is no consolidated reference. `FRONTEND_URL` — the variable needed to fix the wildcard CORS issue — is not mentioned in any documentation file, not in `CLAUDE.md`, not in any `.env.example` (which does not exist).

**DOC-06: "Best Practices Reference" Table Points to 6 Deleted Files**
`CLAUDE.md` lines 671–684 cite ADRs (ADR-0004 through ADR-0008) and source files in `apps/backend/src/database/` and `apps/backend/src/app.module.ts` — all deleted. The ADR directory `.planning/adr/` does not exist. Every entry in this table is a dead link.

---

### MEDIUM

**DOC-07: Root-Level `roadmap.md` Is a Stale Template**
`/Users/richard/Developer/tenant-flow/roadmap.md` is a generic "solo developer roadmap" template with unchecked items for features completed in v3.0–v6.0 and `[Insert your current focus here]` placeholders. It was tracked as `?? roadmap.md` (untracked by git). It should be deleted.

**DOC-08: `docs/PDF_GENERATION_DOCUSEAL_INTEGRATION.md` Describes Deleted NestJS Architecture**
Dated December 2025, this document shows `LeaseSignatureService`, `LeasePdfMapperService`, and `PdfStorageService` — all deleted with `apps/backend/`. The actual architecture (Edge Functions calling StirlingPDF/DocuSeal) is not documented in `docs/`.

**DOC-09: `CLAUDE.md` Testing Section References 4 Deleted Commands and Old Integration Test Path**
Lines 250–265 reference `pnpm test:unit:backend` (deleted), `--testPathPattern` (Jest flag for deleted backend), `pnpm test:integration` (deleted). Line 592 describes "Backend unit tests co-located with source" which no longer exist. Line 594 shows `test/integration/*.integration.spec.ts` — the old backend path. Actual RLS integration tests are at `apps/integration-tests/src/rls/`.

**DOC-10: `CLAUDE.md` Key Directories Table Has 3 Deleted Paths**
Line 613 lists `apps/frontend/src/lib/api-client.ts` (deleted), `apps/backend/src/modules/` (deleted), `apps/backend/src/shared/` (deleted). Missing new key paths: `apps/frontend/src/lib/postgrest-error-handler.ts`, `supabase/functions/`, `apps/integration-tests/src/rls/`.

**DOC-11: `57-05-SUMMARY.md` Not Yet Written**
The human verification plan (57-05) confirms Railway teardown, Sentry monitoring, and ENV cleanup. Once complete, `STATE.md` should show Phase 57 as done. The current state leaves the milestone open.

---

### LOW

**DOC-12: `.planning/PROJECT.md` Shows v7.0 Requirements as Unchecked**
Lines 34–41 list v7.0 requirements as `[ ]` pending. As of Plan 57-04 complete, all are done (pending Plan 05 human verification).

**DOC-13: n8n Workflow Files Have No README**
`supabase/n8n-workflows/` has 3 JSON workflow files with no documentation on how to import, activate, configure email nodes (currently NoOp placeholders), or what environment variables are required.

**DOC-14: CORS Wildcard Not Flagged as Known Gap**
All 8 Edge Functions have `'Access-Control-Allow-Origin': '*'`. Webhook endpoints should not have browser CORS headers at all. There is no `// TODO` comment indicating this is a known gap or where `FRONTEND_URL` should be applied.

---

## Critical Issues for Phase 4 Context

**For best practices and CI/CD review:**
1. **TEST-07**: E2E cache/error tests use stale NestJS route intercepts — affects CI validity
2. **TEST-04**: RLS write-path isolation tests missing — highest coverage gap post-NestJS removal
3. **DOC-01**: `CLAUDE.md` stale NestJS content — affects all developer tooling and AI-assisted sessions
4. **DOC-02**: RLS-only security model undocumented — foundational architectural pattern missing
5. **DOC-05**: Edge Function env vars undocumented — impacts deployment and operations
