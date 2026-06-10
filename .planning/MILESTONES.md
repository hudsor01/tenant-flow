# Milestones

## v5.0 AI Blog Content Engine (Shipped: 2026-06-10)

**Phases:** 6 (9-14) | **Plans:** 14 | **Requirements:** 9/9 (BLOG-01..09)
**Timeline:** 2026-06-07 → 2026-06-10 | **Git range:** `339d9e4bb..81a08d82b` (54 commits)
**PRs:** #792 (foundation + Phases 9-11) · #796 (Phase 12) · #797 (Phase 13) · #798 (Phase 14)
**Archive:** [`milestones/v5.0-ROADMAP.md`](milestones/v5.0-ROADMAP.md) · [`milestones/v5.0-REQUIREMENTS.md`](milestones/v5.0-REQUIREMENTS.md)

### Delivered

A local-LLM (LM Studio on the M5 Pro) + RAG n8n pipeline that drafts brand-positive, judge-gated, E-E-A-T-credible blog posts into `n8n-blog-ingest` as `status='in-review'` drafts for human approval at `/admin/blog`, executes the SEO-01 ghost-slug reclaim, and self-schedules with pre-POST dedup + `BLOG-GEN-FAIL` alerts + cost guards. Flow: local Mistral-Small-3.2-24B + RAG (pgvector) → 9 gates → LLM-as-judge (fail-closed) → in-review → approve → published → SEO reclaim → scheduled. Every phase passed multi-cycle adversarial perfect-PR review; cycle-2 of the Phase-12 review caught and fixed a **live prod incident** (an RLS policy referencing `is_admin()` raised 42501 on every anonymous `blogs` read, breaking `/blog`/sitemap/feed).

### Key Accomplishments
- **Local-LLM RAG generation** (Phases 9-11): native n8n → LM Studio (`mistral-small-3.2-24b`, Apache 2.0) + qwen3-embedding → pgvector; `generate-blog-draft.ts` produces 9-gate-passing drafts; first 1,410-word draft MCP-verified.
- **Quality guardrails** (Phase 12): Mistral LLM-as-judge gate (4-dim, fail-closed — never POSTs a rejected draft) + `/admin/blog` approve/reject (RLS + defense-in-depth `is_admin` re-check) + E-E-A-T Organization byline.
- **SEO-01 reclaim** (Phase 13): `--slug` regenerate-at-exact-ghost-URL + drift-guarded top-10 `RECLAIM_QUEUE` + a safe idempotent `reclaim-finalize` codemod. Closed the carried-over v4.0 SEO-01 item.
- **Sustainability** (Phase 14): pre-POST slug dedup (clean-skip) + greppable `BLOG-GEN-FAIL` + `EVERGREEN_TOPICS` + documented few-posts/week cadence, Error-Trigger alerts, and runaway/cost guards.

---

## v3.0 Security Hardening (Shipped: 2026-06-02)

**Phases:** 3 (1-3) | **Plans:** 5 | **Requirements:** 12/12 satisfied
**Timeline:** 2026-06-02 (single session) | **Git range:** PR #776 → PR #778
**Merge commit:** [`94d36e9e5`](https://github.com/hudsor01/tenant-flow/commit/94d36e9e5) (PR #778)
**Archive:** [`milestones/v3.0-ROADMAP.md`](milestones/v3.0-ROADMAP.md) · [`milestones/v3.0-REQUIREMENTS.md`](milestones/v3.0-REQUIREMENTS.md)
**Steady-state doc:** [`anon-exec-audit/STEADY-STATE.md`](anon-exec-audit/STEADY-STATE.md)

### Delivered

Drove the Supabase Security Advisor on prod (`bshjmbshupiibfiewpxb`) to a documented, test-pinned steady state. Systematically classified and resolved the remaining authenticated SECURITY DEFINER + RLS-no-policy findings with **zero RLS regressions**: `authenticated_security_definer_function_executable` **46 → 44** (the 44 remaining are the provably-intentional KEEP set), `rls_enabled_no_policy` **10 → 0**, and the `pg_graphql_authenticated_table_exposed` (lint 0027) leak on 5 infra tables closed. 12/12 requirements (SDEF-01..03, TIGHTEN-01..03, RLSNP-01..03, SECTEST-01..03). `auth_leaked_password_protection` intentionally out of scope (paid feature).

### Key Accomplishments

**Phase 1 — authenticated SECURITY DEFINER classification + tightening (PR #776, migration `20260602202339`):**
- Function-by-function classification of all 46 flagged functions against the LIVE schema (`.rpc()` reachability + policy/trigger/cron + internal-caller graph): **43 KEEP / 2 TIGHTEN / 1 REVIEW** (`CYCLE-2.md`). SDEF-03 confirmed all 7 analytics RPCs internally `is_admin()`/owner-gated.
- Tightened 3: revoked `authenticated` EXECUTE on `get_lead_paint_compliance_report()` + `assert_can_create_lease(uuid,uuid)` (both orphaned — the live `bulk_import_create_lease` validates inline, no longer calls assert), and added an `is_admin()` body gate to `audit_for_all_policies` (grant kept → stays advisor-flagged by design). Caught live that the grants were DIRECT, not PUBLIC-inherited — so `REVOKE FROM authenticated` was the load-bearing statement (a `REVOKE FROM PUBLIC` would have silently no-op'd).

**Phase 2 — RLS-no-policy resolution (PR #777, migration `20260602230717`):**
- An A1 live-introspection gate (the live state contradicted the repo migrations) confirmed all 10 `rls_enabled_no_policy` tables RLS-on with 0 policies; added the canonical `service_role_only FOR ALL TO service_role` policy to all 10 (clears lint 0008 + documents intent via `COMMENT ON TABLE`) and revoked the 5 vestigial Tier-A `authenticated` grants (closes the pg_graphql introspection leak). No deny-all re-introduced (`20260527151342` stays removed). `rls_enabled_no_policy` 10 → 0.

**Phase 3 — documented steady state + verification (PR #778):**
- Re-ran the live advisor confirming the steady state (44 / 0 / 1); wrote `STEADY-STATE.md` consolidating the v3.0 end-state + the in-CI-gate (`rls-security` suite) vs out-of-band-advisor framing; verified the `security-definer-advisor-state` memory accurate.

### Discipline Outcomes

- **Perfect-PR merge gate** (two consecutive zero-finding deep review cycles) held on every phase: Phase 1 → cycle-1 (1P1+1P2+2nit) → cycle-2 (1P2+nit) → cycles 3+4 zero; Phase 2 → plan-check 2 cycles + code-review cycles 1+2 zero; Phase 3 → cycles 1+2 zero. Reviewers verified findings against LIVE prod (impersonated-role deny probes, ACL grids, the 41-name KEEP-list diff).
- **Inline execution of prod DDL** (rather than via subagent) was load-bearing: the live-ACL check in Phase 1 (direct-vs-PUBLIC grant) and the A1 gate in Phase 2 (live-vs-repo policy state) each caught a discrepancy a literal plan-application would have silently mishandled.
- **CI gates honest:** every PR ran `checks` + `e2e-smoke` + `rls-security`. The new deny pins (`rls-no-policy-lockdown.rls.test.ts`) + the extended `anon-rpc-grants` run green against the tightened prod. Phase 1 also fixed 3 pre-existing flaky v2.0 dashboard E2E tests (Status-locator strict-mode + empty-state-flash race + sort assumption) to keep the branch green (perfect-PR-covers-pre-existing).
- **Advisor delta arithmetic** was a real plan-checker catch: the migration was nearly shipped claiming 46→43; `audit_for_all_policies` keeps its grant (the advisor checks grants, not bodies) so the correct delta is 46→44.

### Lessons Carried Forward

- `REVOKE FROM PUBLIC` is load-bearing ONLY when the grant is PUBLIC-inherited; a DIRECT `authenticated` grant needs `REVOKE FROM authenticated`. Always introspect `aclexplode(proacl)` / `has_table_privilege` live before authoring a revoke.
- Repo migrations can drift from live prod policy/grant state — gate every grant/policy migration on a live introspection (`pg_policy` + `aclexplode`) and write idempotent DDL (`DROP POLICY IF EXISTS`).
- The integration harness is PostgREST-only (no service-role key by design): pin the DENY side via `.from()`/`.rpc()` probes; verify the service-role ALLOW side out-of-band via the advisor + MCP. Don't fake a service-role test (false-green).
- A `service_role_only` FOR ALL policy is lint/intent documentation, not enforcement (service_role has BYPASSRLS) — keep the in-migration comment honest about that.

### Naming-Collision Note

The git tag `v3.0` was already in use from a prior project-iteration milestone ("Backend Architecture Excellence", 2026-01-18) — the same disjoint legacy tag namespace (`v1.0`–`v4.0`) noted for the v1.0 + v2.0 GSD milestones. The complete-milestone workflow's pre-check correctly skips re-tagging. This v3.0 "Security Hardening" milestone is authoritative via `.planning/MILESTONES.md` + `.planning/milestones/v3.0-*.md` + the merge commit (`94d36e9e5`), not a re-tag.

---

## v2.0 Dashboard Command Center (Shipped: 2026-06-02)

**Phases:** 7 (1-7) | **Plans:** 24 | **Tasks:** 40 | **Requirements:** 34/34 satisfied
**Timeline:** 2026-05-22 → 2026-06-02 (11 days) | **Git range:** PR #744 → PR #773
**Merge commit:** [`3e1a4cc29`](https://github.com/hudsor01/tenant-flow/commit/3e1a4cc29) (PR #773)
**Archive:** [`milestones/v2.0-ROADMAP.md`](milestones/v2.0-ROADMAP.md) · [`milestones/v2.0-REQUIREMENTS.md`](milestones/v2.0-REQUIREMENTS.md)
**Known deferred items at close:** 2 (Phase-6 manual focus-ring UAT + verification sign-off — superseded by the automated WCAG 2.1 AA axe sweep that passed in CI; see STATE.md Deferred Items)

### Delivered

The authenticated owner dashboard at `/dashboard` became a restrained, professional B2B command center — KPI bento row above the fold, refreshed charts, a real DataTable with column controls + saved presets, and full keyboard / dark-mode / mobile / reduced-motion a11y — while killing the latent `*100`/`÷100` revenue round-trip so every dollar is handled correctly throughout the data path. 34/34 requirements (KPI-01..07, CHART-01..06, DT-01..09, POLISH-01..12) mapped with no orphans and no double-mapping.

### Key Accomplishments

**Foundation + honest data layer (Phases 1-2, PRs #744/#745):**

- Killed the `*100`/`÷100` revenue round-trip, extracted one shared `transformDashboardData` module, and dedup-deleted 7 stale dashboard files (owner-dashboard, duplicate dashboard-filters, second portfolio-toolbar, skeletons) — zero visible change, correct in-memory values (POLISH-01/02/03)
- Additive `get_dashboard_data_v2` migration for per-property `open_maintenance`; dropped the fabricated `collection_rate` `0` (TenantFlow facilitates no rent payments, so the data does not exist — never fabricate) with a dual-client (ownerA/ownerB) RLS owner-isolation test green against prod (POLISH-10/11)

**KPI row + charts (Phases 3-4, PRs #746/#748):**

- 6-tile KPI bento row (Revenue, Occupancy, Active Leases, Open Maintenance, Properties, Units) on `Stat` + `NumberTicker` + `StatTrend`, axis-less `KpiSparkline` on Revenue + Occupancy only, `@container` auto-fit grid (not the marketing `bento-grid.tsx`), `BlurFade` staggered reveals (KPI-01..07)
- Refreshed `RevenueAreaChart` (30d/6mo toggle, no residual `/100`) + brand-new `OccupancyDonutChart` (center label + legend sourced from `stats.units`), both `next/dynamic` `ssr:false` with shape-matching CSS-only skeletons; series colors source exclusively from `--color-chart-{1..5}` (CHART-01..06)

**Portfolio DataTable (Phase 5, PR #763):**

- Replaced the hand-rolled portfolio table with the vendored DiceUI / TanStack-table composition: `useClientDataTable` hook, 7-column model with `aria-sort` + keyboard sort, faceted status filter, column-visibility menu, always-on virtualization, grid/table toggle, full-snapshot saved presets (Zustand `persist`), and live filter/sort/page state in nuqs URL params; the 3 hand-rolled files (table/toolbar/pagination) deleted in the same atomic swap (DT-01..09)

**Polish, a11y + verification (Phases 6-7, PRs #767/#773):**

- Dark-mode token migration with theme-aware `--color-{success,warning,destructive}-text` companions verified ≥4.5:1 in both themes; internal reduced-motion guard on the shared `NumberTicker` rAF primitive (all 16 consumers snap to final value under `prefers-reduced-motion`); skeleton↔empty branch mutual-exclusion regression (POLISH-04/05/06/07/08)
- `/dashboard` E2E smoke under the CI `owner-axe` project (in-test `loginAsOwner`, no storageState): KPI numbers vs `get_dashboard_data_v2`, donut vs `stats.units`, DataTable sort / status filter / column visibility / preset save+restore / grid-table toggle — plus an automated axe-core WCAG 2.1 AA sweep + 375px zero-horizontal-scroll probe, and a final design-token drift sweep across every new dashboard file (POLISH-09/12)

### Discipline Outcomes

- **Perfect-PR merge gate** (two consecutive zero-finding deep review cycles) enforced on every shipped phase. Cycle counts: Phase 1 → 7 (6+7 zero), Phase 2 → 11 (+ post-merge fix), Phase 4 → 9 (8+9 zero), Phase 5 → 8 (final two independent reviewers both CLEAN), Phase 7 → review APPROVED with one P2 fixed + CI re-verified green.
- **Binding verification:** Phase 7 (the milestone's verification phase) ran the 7-test `/dashboard` smoke against live prod (synthetic owner with 5 active properties / 2 leases → populated path) in CI `e2e-smoke` and passed (201s). No separate `/gsd:audit-milestone` was run — Phase 7 IS the milestone audit.
- **CI gates:** branch protection on `main` requires `checks` / `e2e-smoke` / `rls-security`, all run on every PR and fail hard when secrets missing. The first Phase-6 CI axe run surfaced 4 real WCAG violations + a 623px→375px overflow, all fixed before merge.
- **Cross-cutting hard rule:** no `*100` / `/100` revenue arithmetic anywhere — repo-wide grep zero across the dashboard subtree, gate-enforced.

### Lessons Carried Forward

- The shared-primitive reduced-motion pattern: guard INSIDE the effect (not a component-top early-return) so the `ref` stays attached and the IntersectionObserver keeps firing — a top-level return would unmount the observed node and break the stuck-0 NumberTicker scroll behavior.
- Vivid brand tokens fail AA as foreground TEXT in one theme each (destructive in dark 3.29:1; success/warning/info in light 2.1–3.3:1) — use `-text` companions for text, keep vivid for icons (3:1). (Carried into the post-milestone app-wide token sweep, PRs #769/#770.)
- The CI `owner-axe` project (in-test `loginAsOwner` cookie injection) is the CI-runnable authed path; the `owner` storageState project does NOT run in CI. Authed dashboard E2E must target `owner-axe`.

### Naming-Collision Note

The git tag `v2.0` was already in use from a prior project-iteration milestone ("Stripe Integration Excellence", commit `b244f9c25`, 2026-01-17) — the same disjoint legacy tag namespace (`v1.0`–`v4.0`) noted for the v1.0 "Marketing Surface Honesty" milestone. The complete-milestone workflow's pre-check correctly skipped re-tagging to avoid a silent overwrite. This v2.0 "Dashboard Command Center" milestone is authoritative via `.planning/MILESTONES.md` + `.planning/milestones/v2.0-*.md` archive files + the merge commit (`3e1a4cc29`). A dedicated tag pointing at the actual merge commit would need a distinct name (e.g. `v2.0-dashboard`) or an explicit force-update; not done here, matching the v1.0 precedent.

---

## v1.0 Marketing Surface Honesty (Shipped: 2026-05-22)

**Phases:** 15 (1-15) | **Plans:** 33 | **Audit:** Round 3 — PERFECT BY ALL MEASURES
**Merge commit:** [`d13d7a265`](https://github.com/hudsor01/tenant-flow/commit/d13d7a265) (PR #743)
**Archive:** [`milestones/v1.0-ROADMAP.md`](milestones/v1.0-ROADMAP.md) · [`milestones/v1.0-REQUIREMENTS.md`](milestones/v1.0-REQUIREMENTS.md) · [`milestones/v1.0-MILESTONE-AUDIT.md`](milestones/v1.0-MILESTONE-AUDIT.md)

### Delivered

Every public claim on tenantflow.app maps to working code, and every visual aligns to canonical design tokens in `src/app/globals.css`. 56 audit findings from the external UI audit (2026-05-08) closed across 9 requirement categories: CRIT (block ad spend), CONS (visual/copy consistency), COPY (UX refinement), PRICE (pricing restructure), BLOG (blog rebuild + n8n), TOKEN (design-token alignment), TRUST (testimonials), SEO, PERF.

### Key Accomplishments

**Critical stop-bleed (Phases 1-3):**

- Bulk-unpublished 100 broken blog rows + BEFORE-INSERT trigger guard against re-publish (CRIT-01)
- Fixed homepage NumberTicker animation (5 / 7 / 500 / 14) with one-shot IntersectionObserver (CRIT-02)
- 375px mobile drawer using shadcn `Sheet` + 44×44 touch targets + 8-test Playwright spec (CRIT-04)
- 5 redirect aliases (`/signup` → `/pricing` + 4 legal long-form paths → canonical short paths) eliminating the `/signup` → `/login` loop (CRIT-05/06)

**Persona + Pricing (Phases 4-5):**

- Unified "landlord" persona across hero / About / meta / FAQ / blog with `marketing-copy-landlord-only.test.ts` 7-category banlist drift guard (CONS-01 + COPY-01..07)
- Pricing restructured to **Starter $19 / Growth $49 / Max $149** with `src/config/pricing.ts` single-source-of-truth, 8 consumer files reading via `#config/pricing`, Stripe products + prices repointed via MCP, 3-offer `Product` JSON-LD (PRICE-01..06)
- Fabricated "Join 500+" replaced with honest "Built for landlords with 1–15 rentals" segment framing (COPY-02)

**Blog rebuild + battle-test remediation (Phases 6, 14):**

- `/blog` index server-rendered, real-404 on unknown slug via `dynamicParams = false`, visible breadcrumbs, canonical URLs, dynamic OG images, n8n flow redesigned with 9-gate defense-in-depth Edge Function (BLOG-01..06)
- D-03 try/catch around Supabase fetch routes failures through Sentry instead of 5xx
- D-04 route-scoped `/blog/loading.tsx` resolves streaming/skeleton mutual exclusion

**Visual polish (Phases 7-10):**

- Most-Popular badge sits cleanly on Growth card; per-card "Save $X/year" annual savings backed by `calculateAnnualSavings(plan.price.monthly)` (CONS-05/09/10)
- Multi-Property Dashboard feature card uses `lucide-react` `LayoutDashboard` (was back-arrow); homepage `aria-current="page"` no longer mis-highlights "Compare"; Resources dropdown navigates to real URLs (CONS-02/03/11)
- Legal-page "Last Updated" dates honest + drift-guarded against sitemap constants; Trusted Integrations row consistent opacity; duplicate "Why Landlords Choose" table removed from homepage (CONS-04/13/14)
- Canonical "Contact Sales" CTA label site-wide + neutral `/compare/*` framing (no red ✗ for by-design omissions) + `/contact` "How did you hear" defaults to "Please select" + 2 real testimonials shipped with `length >= 2` regression pin (CONS-06/07/08, TRUST-01/03/04; TRUST-02 deferred — no fabricated badges)

**Tokens, SEO, performance (Phases 11-13):**

- `design-token-drift.test.ts` Vitest scanner over `src/components` + `src/app` for hex/rgb/`bg-white`/inline-ms (TOKEN-01/02/03); `/resources` neon-pink + decorative card backgrounds → canonical tokens
- Title-separator drift guard + per-page OG images + site-wide Organization + SoftwareApplication JSON-LD + visible breadcrumbs + footer sitemap link + site-wide `aria-current` audit (SEO-01..07)
- Marketing pages use static gen + ISR (`revalidate=3600` on /, /pricing, /features, /about, /compare/[competitor]) + sticky CTA on `/pricing`, `/faq`, `/features` + feature-flagged lead-capture modal (PERF-01..04)

**v1.0 cleanup (Phase 15):**

- Retroactive `VERIFICATION.md` for Phases 4/5/6/14 (`retroactive: true` + `shipped_pr` frontmatter)
- `REQUIREMENTS.md` traceability sweep: 35 Pending → 0, 24 body `[ ]` → 0, footer flipped to "Last updated: 2026-05-21"
- `@stripe/(react-)?stripe-js` dead-dep drift guard (8 tests across 4 dependency roots)
- Vitest worker-pool host-derived cap (`Math.max(2, Math.min(8, cpus().length - 1))`), 3-consecutive-run zero-flake gate met
- `/blog` nav suppression regression-pinned (source-scan + render tests; `DEFAULT_NAV_ITEMS` cannot silently re-introduce `/blog` until content cohort lands)

### Discipline Outcomes

- **Perfect-PR merge gate** (two consecutive zero-finding deep review cycles) enforced on every shipped phase. Phase 15 PR #743 took cycle 1 → fix pass → cycles 2+3 zero-finding.
- **Audit rounds:** Round 1 (tech_debt) → Phase 15 closure → Round 2 (passed with 7 documented imperfections) → Round 3 (PERFECT BY ALL MEASURES, zero imperfections).
- **CI gates:** 105,106 / 105,106 unit tests pass in ~16s; Biome lint clean (1198 files); TypeScript strict clean; lefthook (gitleaks + lockfile-verify + lint + typecheck + unit-tests + commitlint) green on every commit; branch protection enforced `checks` / `e2e-smoke` / `rls-security` required on `main`.
- **Nyquist coverage:** 15/15 phases COMPLIANT (`nyquist_compliant: true` + `wave_0_complete: true`).
- **Decision-coverage gate:** Passed-clean (16/16 trackable decisions covered; 7 [informational]-tagged cross-cutting decisions correctly filtered as non-trackable using the parser-recognized `**D-NN [informational]:**` format).

### Lessons Carried Forward to v2.0

- Sandbox-disabled `git commit` is the sanctioned workaround for the lockfile-verify lefthook hook failing under the command sandbox (NEVER `--no-verify` / `LEFTHOOK_EXCLUDE`).
- After every code-fixer sub-agent return, run `git status --short` + `git diff --stat` to verify what actually landed against what the agent reported (Phase 10 IN-01/IN-02 lesson).
- For TypeScript narrowing claims in tests, write an `@ts-expect-error` probe to verify empirically before asserting; remove the probe before commit (no commented-out code).
- When the user asks for X, work on X. Don't unilaterally decide tangential cleanup (in-flight milestone, audit gaps) must come first; surface the trade-off in one sentence and let the user choose.
- Mid-execution executor deviations: when a Write tool call lands a file at the main-repo path instead of the worktree path (common deviation under `isolation="worktree"`), recover by deleting the misplaced file + re-Writing to the worktree path; the orchestrator's post-merge `git status --short` check catches stragglers.

### Naming-Collision Note

The git tag `v1.0` was already in use from a prior project-iteration milestone ("Production Hardening", 10 phases / 60 plans / 131 findings — commit `24ca463...`). The complete-milestone workflow's pre-check correctly skipped re-tagging to avoid silent overwrite. This v1.0 "Marketing Surface Honesty" milestone is authoritative via `.planning/MILESTONES.md` + `.planning/milestones/v1.0-*.md` archive files + the merge commit (`d13d7a265`). If a new tag is desired pointing at the actual v1.0 merge commit, it would need to be a different name (e.g., `v1.0-marketing-honesty`) or an explicit force-update of the existing tag.
