# Requirements: TenantFlow — v4.0 Hardening & Hygiene

**Defined:** 2026-06-04
**Core Value:** Every shipped surface is provably correct — typed at its data boundaries, tested for owner isolation, accessible, and CI-gated against regressions — and the decayed organic-search assets from the v1.0 blog rebuild are reclaimed. No new product features; this milestone converts the verified audit tail into permanent, regression-pinned hardening.

**Source of truth:** `.planning/repo-audit/AUDIT-2026-05-29.md` + `.planning/seo-audit/ANALYSIS-2026-05-29.md`, re-verified against live prod 2026-06-03 (advisor steady-state confirmed; demolition residue confirmed already cleaned; `function_search_path_mutable = 0`; 7 `as unknown as` RPC casts confirmed present; 4 pg_cron jobs confirmed colliding at `0 3 * * *`; no CodeQL/deno-test/secret-scanning in CI — the last shipped via PR #781).

## v1 Requirements

### CISEC — CI / supply-chain hardening

- [ ] **CISEC-01**: Stripe-webhook signature verification (and the other security-critical edge-function assertions) run in CI as a hard gate — either a `deno test` job wired to `supabase functions serve` + secrets, or the security-critical assertions ported into the vitest integration suite.
- [ ] **CISEC-02**: The Content-Security-Policy serves a per-request nonce with `strict-dynamic`; `script-src 'unsafe-inline'` is removed from `vercel.json` / `proxy.ts`.
- [x] **CISEC-03**: The `auth-email-send` Edge Function compares its hook secret in constant time (`crypto.subtle.timingSafeEqual` / the shared XOR helper), never `token !== hookSecret`.
- [ ] **CISEC-04**: All third-party GitHub Actions across `.github/workflows/` are pinned to commit SHAs (CodeQL's `actions` scan stays clean).

### TYPE — typed RPC/PostgREST boundaries (zero-tolerance rule #8)

- [ ] **TYPE-01**: The analytics RPC factories (`use-analytics.ts` `LeaseAnalyticsPageData`) return data through a typed mapper with Zod validation — no `as unknown as`.
- [x] **TYPE-02**: The tenant and maintenance factories (`tenant-mutation-options.ts`, `maintenance-keys.ts`) return data through typed mappers — no `as unknown as`.
- [ ] **TYPE-03**: The remaining `src/hooks/api/` RPC-boundary casts (`expiring-leases-widget.tsx` and any siblings) are eliminated, and a drift-guard test asserts zero `as unknown as` at PostgREST/RPC boundaries under `src/hooks/api/` (library-shim casts in chart/slider excluded).

### PERF — query + cron consolidation

- [ ] **PERF-01**: The 4 pg_cron cleanup jobs (`cleanup-cron-history`, `cleanup-pg-net-responses`, `cleanup-security-events`, `expire-trials`) are staggered across the 3 AM UTC window instead of all firing at `0 3 * * *`.
- [ ] **PERF-02**: `unitQueries.stats()` is served by a single `get_unit_stats()` SECURITY DEFINER RPC — no unbounded `rent_amount` fetch, no 4 HEAD counts.
- [ ] **PERF-03**: `tenantQueries.stats()` is served by a single `get_tenant_stats()` RPC — no 3 HEAD counts; any embedded-resource filter uses an inner join.
- [ ] **PERF-04**: Confirmed-unused indexes (idx_scan = 0 over a representative window AND not FK-backing) are dropped in one migration; every FK-supporting index is explicitly kept.

### TEST — owner-isolation + auth coverage

- [ ] **TEST-01**: Cross-owner RLS integration tests (dual-client ownerA/ownerB) cover `reports`, `expenses`, and `document_template_definitions`.
- [ ] **TEST-02**: Cross-owner RLS tests cover the join-policy child tables `inspection_photos`, `inspection_rooms`, `maintenance_request_photos`, `property_images`.
- [ ] **TEST-03**: Unit tests cover the auth-critical hooks `use-auth-mutations`, `use-mfa`, `use-sessions`, and the dollar-amount hooks `use-expense-mutations` / `use-report-mutations` / `use-reports`.
- [ ] **TEST-04**: RLS-rejection tests assert SQLSTATE / `error.code` (not message strings), and the `REVOKED_CODES` literal is extracted to one shared test helper consumed by all 4 call sites.

### A11Y — programmatic labels

- [ ] **A11Y-01**: Every raw form input has a programmatic label — emergency-contact, change-password, and personal-information inputs auto-associate label/input (thread `useId` through `Field`, no bare `<Label>`).
- [ ] **A11Y-02**: The tenant-toolbar input/select, row-select checkboxes (tenant-grid, leases-table), and the clause-selector info tooltip button all have accessible names.
- [ ] **A11Y-03**: `error-boundary.tsx` uses `text-muted-foreground` (not bare `text-muted`); an axe pass over the affected settings/tenant screens is clean.

### SEO — organic-traffic recovery

- [ ] **SEO-01**: The highest-impression deleted ranked blog posts are republished at their original slugs (content via the n8n pipeline), and each republished slug's entry is removed from `src/lib/seo/blog-redirects.ts` so the post serves instead of 301-redirecting — pinned by the existing collision-guard test.
- [ ] **SEO-02**: The `/pricing` Product/Offer JSON-LD validates clean — the Google "Merchant listings: 1 invalid item" error is resolved (rich-results-test verified).
- [ ] **SEO-03**: The `financial-management` and `maintenance` blog category pages no longer surface as empty/noindex content gaps — either seeded with ≥1 published post each or handled so they don't bleed crawl signal.

## v2 Requirements

Deferred follow-ups (small, optional, non-blocking — fold into a later milestone or a quick PR):

### Defense-in-depth (optional)

- **HARD-01**: Flip `SET search_path = public` → `SET search_path = ''` (fully-qualified references) on the SECURITY DEFINER functions still using `public`. Advisor-clean today (`function_search_path_mutable = 0`); body-by-body review required.
- **HARD-02**: Tighten the in-body `IF p_id != auth.uid()` guards in the GATES_INTERNALLY functions to `IS DISTINCT FROM` (role-level revoke already closes the reachable gap — PR #758).
- **HARD-03**: Trigger-function grant cleanup so `pg_function_privilege('anon', oid, 'EXECUTE')` returns false for `log_lease_signature_activity` and peers (cosmetic; triggers bypass EXECUTE checks).

## Out of Scope

| Feature | Reason |
|---------|--------|
| CodeQL SAST + gitleaks CI secret-scanning | Already shipped ahead of the milestone (PR #781). |
| Enable GitHub secret-scanning / push-protection / CodeQL default-setup, branch-protection required-checks | Repo-settings toggles — owner's action, not a code PR (`feedback_never_change_repo_settings`). |
| `auth_leaked_password_protection` | Paid feature (HaveIBeenPwned); intentionally disabled (carried from v3.0). |
| Supabase grace-period / quota billing banner | Operational/billing decision for the owner, not a code change. |
| New product features (tenant portal, rent facilitation, auto-categorization) | Permanently out of scope per PROJECT.md. |
| `payment_transactions` / `user_is_tenant` / `public.sql` demolition cleanup | Already done — verified gone in prod 2026-06-03. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CISEC-01 | Phase 1 — Security-CI Hardening | Pending |
| CISEC-02 | Phase 1 — Security-CI Hardening | Pending |
| CISEC-03 | Phase 1 — Security-CI Hardening | Complete |
| CISEC-04 | Phase 1 — Security-CI Hardening | Pending |
| TYPE-01 | Phase 2 — Typed RPC Boundaries | Pending |
| TYPE-02 | Phase 2 — Typed RPC Boundaries | Complete |
| TYPE-03 | Phase 2 — Typed RPC Boundaries | Pending |
| PERF-02 | Phase 3 — Stats RPC Consolidation | Pending |
| PERF-03 | Phase 3 — Stats RPC Consolidation | Pending |
| PERF-01 | Phase 4 — Cron Stagger & Index Cleanup | Pending |
| PERF-04 | Phase 4 — Cron Stagger & Index Cleanup | Pending |
| TEST-01 | Phase 5 — Cross-Owner RLS Coverage | Pending |
| TEST-02 | Phase 5 — Cross-Owner RLS Coverage | Pending |
| TEST-04 | Phase 5 — Cross-Owner RLS Coverage | Pending |
| TEST-03 | Phase 6 — Auth & Dollar-Hook Unit Tests | Pending |
| A11Y-01 | Phase 7 — Accessibility Labels | Pending |
| A11Y-02 | Phase 7 — Accessibility Labels | Pending |
| A11Y-03 | Phase 7 — Accessibility Labels | Pending |
| SEO-01 | Phase 8 — SEO Recovery | Pending |
| SEO-02 | Phase 8 — SEO Recovery | Pending |
| SEO-03 | Phase 8 — SEO Recovery | Pending |

**Coverage:**
- v1 requirements: 21 total (CISEC 4, TYPE 3, PERF 4, TEST 4, A11Y 3, SEO 3)
- Mapped to phases: 21/21 ✓ (no orphans, no requirement in two phases)
- Phases: 8 (Phase 1-8, integer numbering, v4.0 sequence)

---
*Requirements defined: 2026-06-04*
*Last updated: 2026-06-04 after v4.0 roadmap creation — 21/21 requirements mapped to 8 phases.*
