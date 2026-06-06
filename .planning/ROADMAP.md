# Roadmap: TenantFlow

## Milestones

- ✅ **v1.0 Marketing Surface Honesty** — Phases 1-15 (shipped 2026-05-22) — see [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 Dashboard Command Center** — Phases 1-7 (shipped 2026-06-02, 34/34 requirements) — see [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)
- ✅ **v3.0 Security Hardening** — Phases 1-3 (shipped 2026-06-02, 12/12 requirements) — see [milestones/v3.0-ROADMAP.md](milestones/v3.0-ROADMAP.md)
- 📋 **v4.0 Hardening & Hygiene** — Phases 1-8 (planning, 21 requirements) — active

## Phases

### v4.0 Hardening & Hygiene (active)

- [ ] **Phase 1: Security-CI Hardening** — edge-fn/Stripe-webhook test gate, CSP nonce + strict-dynamic, constant-time secret compare, SHA-pinned Actions
- [ ] **Phase 2: Typed RPC Boundaries** — replace the 7 `as unknown as` RPC casts in `src/hooks/api/` with `mapXRow()` mappers + zero-cast drift guard
- [ ] **Phase 3: Stats RPC Consolidation** — `get_unit_stats()` + `get_tenant_stats()` SECURITY DEFINER RPCs collapse the multi-query stat hooks
- [ ] **Phase 4: Cron Stagger & Index Cleanup** — stagger 4 pg_cron jobs off `0 3 * * *`; drop confirmed-unused (non-FK) indexes
- [ ] **Phase 5: Cross-Owner RLS Coverage** — dual-client ownerA/ownerB tests for reports/expenses/templates + join-policy child tables; SQLSTATE assertions + shared `REVOKED_CODES` helper
- [ ] **Phase 6: Auth & Dollar-Hook Unit Tests** — vitest coverage for auth-critical hooks + expense/report mutation hooks
- [ ] **Phase 7: Accessibility Labels** — programmatic labels on raw inputs, accessible names on toolbar/checkbox/tooltip controls, `text-muted-foreground` fix
- [ ] **Phase 8: SEO Recovery** — republish-reclaim top deleted blog posts at original slugs; fix `/pricing` JSON-LD; resolve empty category pages

<details>
<summary>✅ v3.0 Security Hardening (Phases 1-3) — SHIPPED 2026-06-02</summary>

- [x] Phase 1: SECURITY DEFINER Classification & Tightening (2/2 plans) — PR #776 — advisor `authenticated_security_definer` 46→44
- [x] Phase 2: RLS-No-Policy Resolution (2/2 plans) — PR #777 — advisor `rls_enabled_no_policy` 10→0
- [x] Phase 3: Documented Advisor Steady State & Verification (1/1 plan) — PR #778 — steady state 44/0/1 confirmed

Closed at 12/12 requirements (SDEF-01..03, TIGHTEN-01..03, RLSNP-01..03, SECTEST-01..03). Full phase detail in [milestones/v3.0-ROADMAP.md](milestones/v3.0-ROADMAP.md); summary in [MILESTONES.md](MILESTONES.md); steady-state in [anon-exec-audit/STEADY-STATE.md](anon-exec-audit/STEADY-STATE.md).

</details>

<details>
<summary>✅ v2.0 Dashboard Command Center (Phases 1-7) — SHIPPED 2026-06-02</summary>

- [x] Phase 1: Foundation & Dedup (3/3 plans) — PR #744
- [x] Phase 2: Data Layer & RPC (3/3 plans) — PR #745
- [x] Phase 3: KPI Bento Row (3/3 plans) — PR #746
- [x] Phase 4: Charts (4/4 plans) — PR #748
- [x] Phase 5: Portfolio DataTable (5/5 plans) — PR #763
- [x] Phase 6: Polish & A11y (4/4 plans) — PR #767
- [x] Phase 7: Verification (2/2 plans) — PR #773

Closed at 34/34 requirements. Full detail in [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md).

</details>

<details>
<summary>✅ v1.0 Marketing Surface Honesty (Phases 1-15) — SHIPPED 2026-05-22</summary>

15 phases, 33 plans, 56/56 audit findings closed. Audit round 3 verdict: PERFECT BY ALL MEASURES. Full detail in [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) + [milestones/v1.0-MILESTONE-AUDIT.md](milestones/v1.0-MILESTONE-AUDIT.md).

</details>

## Phase Details (v4.0 Hardening & Hygiene)

### Phase 1: Security-CI Hardening
**Goal**: Security-critical edge-function assertions run as a hard CI gate, and the remaining supply-chain / runtime hardening gaps (CSP, constant-time compare, SHA-pinned Actions) are closed and regression-pinned.
**Depends on**: Nothing (first phase of v4.0)
**Requirements**: CISEC-01, CISEC-02, CISEC-03, CISEC-04
**Success Criteria** (what must be TRUE):
  1. Stripe-webhook signature verification (and the other security-critical edge-function assertions) fail the CI run when broken — either a `deno test` job wired to `supabase functions serve` + secrets, or those assertions ported into the vitest integration suite that PRs already gate on.
  2. The deployed Content-Security-Policy serves a per-request nonce with `strict-dynamic` and no `script-src 'unsafe-inline'` remains in `vercel.json` / `proxy.ts`.
  3. `auth-email-send` compares its hook secret in constant time (`crypto.subtle.timingSafeEqual` / shared XOR helper); a grep/test confirms no `token !== hookSecret` short-circuit compare remains.
  4. Every third-party action under `.github/workflows/` is pinned to a commit SHA, and CodeQL's `actions` scan stays clean.
**Plans**: 4 plans (all Wave 1 — parallel, zero file overlap)
- [x] 01-01-PLAN.md — CISEC-01: Stripe-webhook signature accept/reject Vitest gate
- [ ] 01-02-PLAN.md — CISEC-02: route-scoped per-request nonce CSP + drop script-src 'unsafe-inline'
- [x] 01-03-PLAN.md — CISEC-03: shared timing-safe helper + constant-time auth-email-send compare
- [x] 01-04-PLAN.md — CISEC-04: SHA-pin all workflow actions + drift-guard test

### Phase 2: Typed RPC Boundaries
**Goal**: Every RPC/PostgREST boundary under `src/hooks/api/` returns through a typed mapper with Zod validation — zero `as unknown as` casts — enforced by a drift guard so the violation cannot silently return.
**Depends on**: Nothing (independent of Phase 1; can run in parallel)
**Requirements**: TYPE-01, TYPE-02, TYPE-03
**Success Criteria** (what must be TRUE):
  1. `use-analytics.ts` (`LeaseAnalyticsPageData`) returns data through a typed `mapXRow()` mapper with Zod validation — no `as unknown as`.
  2. `tenant-mutation-options.ts` and `maintenance-keys.ts` return data through typed mappers — no `as unknown as`.
  3. The remaining `src/hooks/api/` RPC-boundary casts (`expiring-leases-widget.tsx` and siblings) are eliminated.
  4. A drift-guard test asserts zero `as unknown as` at PostgREST/RPC boundaries under `src/hooks/api/` (library-shim casts in chart/slider excluded), and `bun run typecheck` stays clean.
**Plans**: 4 plans (all Wave 1 — parallel, zero file overlap)
- [ ] 02-01-PLAN.md — TYPE-01: mapLeaseAnalytics validated mapper for use-analytics.ts lease paths
- [x] 02-02-PLAN.md — TYPE-02: validated mapTenantBaseRow + upgrade mapTenantRow; tenant-mutation-options.ts write boundary (commit 81d740d23)
- [x] 02-03-PLAN.md — TYPE-02: mapMaintenanceRow validated mapper across maintenance-keys.ts read/write boundaries (commits 2219f2a20, 4439223a3)
- [ ] 02-04-PLAN.md — TYPE-03: mapExpiringLeaseRow validated mapper + zero-`as unknown as` drift guard

### Phase 3: Stats RPC Consolidation
**Goal**: The unit and tenant stat hooks each resolve through a single owner-scoped SECURITY DEFINER RPC instead of multiple HEAD counts plus an unbounded fetch, with owner-isolation pinned by a dual-client RLS test.
**Depends on**: Nothing (independent; DB-boundary work scoped away from the cron/index DB-ops phase)
**Requirements**: PERF-02, PERF-03
**Success Criteria** (what must be TRUE):
  1. `unitQueries.stats()` is served by a single `get_unit_stats()` SECURITY DEFINER RPC — no unbounded `rent_amount` fetch, no 4 HEAD counts — and the returned shape passes through a typed mapper.
  2. `tenantQueries.stats()` is served by a single `get_tenant_stats()` RPC — no 3 HEAD counts — and any embedded-resource filter uses an inner join.
  3. Both new RPCs validate `auth.uid()`, lock `search_path = public`, and a dual-client (ownerA/ownerB) RLS test confirms ownerB cannot read ownerA's stats.
  4. The dashboard / consuming surfaces render identical values to the pre-consolidation multi-query path (no regression).
**Plans**: 3 plans (Wave 1: migration + db:types regen [BLOCKING]; Wave 2: hook rewire ∥ RLS test)
- [ ] 03-01-PLAN.md — PERF-02, PERF-03: one migration defining both SECURITY DEFINER RPCs, [BLOCKING] prod apply + filename reconcile, `bun run db:types` regen
- [ ] 03-02-PLAN.md — PERF-02, PERF-03: Zod-validated `mapUnitStats`/`mapTenantStats` mappers + rewire `unitQueries.stats()` / `tenantQueries.stats()` to the RPCs (no-regression value pins)
- [ ] 03-03-PLAN.md — PERF-02, PERF-03: dual-client ownerA/ownerB RLS test pinning the `auth.uid()` 'Unauthorized' owner-isolation guard for both RPCs

### Phase 4: Cron Stagger & Index Cleanup
**Goal**: The four pg_cron cleanup jobs no longer contend at a single timestamp, and the one provably-dead index is dropped in one migration while every FK-supporting index is explicitly retained.
**Depends on**: Nothing (pure DB-ops migration; deliberately separate from the stats-RPC phase so migration-boundary work is not bunched)
**Requirements**: PERF-01, PERF-04
**Success Criteria** (what must be TRUE):
  1. The 4 cleanup jobs (`cleanup-cron-history`, `cleanup-pg-net-responses`, `cleanup-security-events`, `expire-trials`) fire at distinct minutes across the 3 AM UTC window (`0/5/10/20 3 * * *`) — verifiable via `cron.job` schedule rows post-migration.
  2. The single provably-dead index (`idx_properties_property_owner_id`, a btree on the projection-only `properties.stripe_connected_account_id`) is dropped in one migration; the migration body documents the projection-only evidence. No other index is dropped (the broader idx_scan=0 sweep is deferred to a post-launch representative-traffic review).
  3. Every FK-supporting index is explicitly kept (documented in the migration, spot-checked present in prod), and the repo migration is reconciled against the prod-assigned timestamp via `list_migrations`.
**Plans**: 1 plan (Wave 1 — author the migration; Task 2 is a [BLOCKING] MCP prod-apply + filename-reconcile checkpoint)
- [ ] 04-01-PLAN.md — PERF-01, PERF-04: one migration (3 schedule-only `cron.alter_job` reschedules + 1 `DROP INDEX`), [BLOCKING] MCP prod apply + filename reconcile + introspection; no `db:types`

### Phase 5: Cross-Owner RLS Coverage
**Goal**: Owner isolation is regression-pinned across the tables that lacked dual-client coverage, and RLS-rejection assertions are hardened to SQLSTATE codes via a single shared helper.
**Depends on**: Nothing (integration-suite work; independent of the RPC/migration phases)
**Requirements**: TEST-01, TEST-02, TEST-04
**Success Criteria** (what must be TRUE):
  1. The `rls-security` suite includes dual-client (ownerA/ownerB) tests that fail when ownerB can read or mutate ownerA's `reports`, `expenses`, or `document_template_definitions`.
  2. Dual-client tests cover the join-policy child tables `inspection_photos`, `inspection_rooms`, `maintenance_request_photos`, and `property_images`, failing on any cross-owner read/write.
  3. RLS-rejection tests assert `error.code` / SQLSTATE (not message strings), insulating them from the chai-6 / message-drift fragility.
  4. The `REVOKED_CODES` literal is extracted to one shared test helper consumed by all 4 call sites (no duplicated code-list literals remain).
**Plans**: 3 plans (all Wave 1 — parallel, zero files_modified overlap)
- [x] 05-01-PLAN.md — TEST-01: dual-client RLS for reports + document_template_definitions (direct owner_user_id) + expenses (indirect via maintenance_request chain)
- [x] 05-02-PLAN.md — TEST-02: dual-client RLS for the 4 join-policy child tables (property_images, inspection_rooms S/I/U/D; inspection_photos, maintenance_request_photos S/I/D only)
- [x] 05-03-PLAN.md — TEST-04: shared REVOKED_CODES/DENIED_CODES helper consumed by all 5 dup sites + SQLSTATE (P0001) migration of the dashboard/bulk-import ownership-guard assertions

### Phase 6: Auth & Dollar-Hook Unit Tests
**Goal**: The auth-critical hooks and the dollar-amount mutation/read hooks have vitest unit coverage, raising confidence on the highest-risk untested surfaces without touching their behavior.
**Depends on**: Nothing (test-only; independent of all other phases)
**Requirements**: TEST-03
**Success Criteria** (what must be TRUE):
  1. `use-auth-mutations`, `use-mfa`, and `use-sessions` have vitest unit tests covering success + failure paths.
  2. `use-expense-mutations`, `use-report-mutations`, and `use-reports` have vitest unit tests, including the dollar-amount handling (no `*100` / `÷100` drift).
  3. The new tests pass under the existing 80% coverage threshold and the suite stays green across the lefthook pre-commit gate.
**Plans**: TBD

### Phase 7: Accessibility Labels
**Goal**: Every flagged raw input and interactive control has a programmatic accessible name, the bare `text-muted` regression is fixed, and an axe pass over the affected screens is clean.
**Depends on**: Nothing (UI-only; independent of all other phases)
**Requirements**: A11Y-01, A11Y-02, A11Y-03
**Success Criteria** (what must be TRUE):
  1. Emergency-contact, change-password, and personal-information inputs auto-associate label/input (`useId` threaded through `Field`, no bare `<Label>`) — verifiable with a screen reader / axe label check.
  2. The tenant-toolbar input/select, the row-select checkboxes (tenant-grid, leases-table), and the clause-selector info tooltip button all expose an accessible name.
  3. `error-boundary.tsx` uses `text-muted-foreground` (not bare `text-muted`), and an axe pass over the affected settings/tenant screens reports zero violations.
**Plans**: TBD
**UI hint**: yes

### Phase 8: SEO Recovery
**Goal**: The decayed organic-search assets from the v1.0 blog rebuild are reclaimed — top deleted ranked posts serve at their original slugs, the `/pricing` rich-result error is resolved, and the empty category pages stop bleeding crawl signal.
**Depends on**: Nothing (content-pipeline dependency differs from the code-only phases; sequenced last)
**Requirements**: SEO-01, SEO-02, SEO-03
**Success Criteria** (what must be TRUE):
  1. The highest-impression deleted ranked blog posts are republished (content via the n8n pipeline) at their original slugs, and each republished slug's `src/lib/seo/blog-redirects.ts` entry is removed so the post serves instead of 301-redirecting — pinned by the existing collision-guard test.
  2. The `/pricing` Product/Offer JSON-LD validates clean in the Google rich-results test — the "Merchant listings: 1 invalid item" error is gone.
  3. The `financial-management` and `maintenance` blog category pages no longer surface as empty/noindex content gaps — each seeded with ≥1 published post or handled so they don't bleed crawl signal.
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Security-CI Hardening | v4.0 | 4/4 | Shipped (PR #783) | 2026-06-04 |
| 2. Typed RPC Boundaries | v4.0 | 4/4 | Shipped (PR #785) | 2026-06-05 |
| 3. Stats RPC Consolidation | v4.0 | 3/3 | Executed (awaiting PR) | - |
| 4. Cron Stagger & Index Cleanup | v4.0 | 1/1 | Planned | - |
| 5. Cross-Owner RLS Coverage | v4.0 | 3/3 | Complete   | 2026-06-06 |
| 6. Auth & Dollar-Hook Unit Tests | v4.0 | 0/? | Not started | - |
| 7. Accessibility Labels | v4.0 | 0/? | Not started | - |
| 8. SEO Recovery | v4.0 | 0/? | Not started | - |

---
*Last updated: 2026-06-06 — Phase 4 (Cron Stagger & Index Cleanup) planned: 1 plan, Wave 1 (PERF-01 + PERF-04). One DB-ops migration: 3 schedule-only `cron.alter_job` reschedules + 1 `DROP INDEX`, applied via Supabase MCP at a [BLOCKING] checkpoint + filename-reconcile; no `db:types`. v4.0 Hardening & Hygiene roadmap (8 phases, 21/21 requirements mapped). v3.0 (3 phases, 12/12), v2.0 (7 phases, 34/34), v1.0 (15 phases, 56/56) archived above.*
