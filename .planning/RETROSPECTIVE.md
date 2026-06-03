# TenantFlow — Living Retrospective

Cross-milestone reflection. Newest milestone first; cross-milestone trends at the bottom.

## Milestone: v2.0 — Dashboard Command Center

**Shipped:** 2026-06-02
**Phases:** 7 | **Plans:** 24 | **Tasks:** 40 | **Requirements:** 34/34

### What Was Built

The authenticated owner dashboard at `/dashboard` was rebuilt into a restrained B2B command center: a 6-tile KPI bento row (`Stat` + `NumberTicker` + `StatTrend`, sparklines on Revenue + Occupancy), a refreshed `RevenueAreaChart` (30d/6mo toggle) + a new `OccupancyDonutChart`, and a vendored DiceUI/TanStack Portfolio DataTable (sort with `aria-sort` + keyboard, faceted filter, column visibility, virtualization, grid/table toggle, Zustand-`persist` saved presets, nuqs URL state). Phase 6 layered dark-mode token correctness, a `NumberTicker` reduced-motion guard, 375px zero-scroll, and skeleton↔empty mutual exclusion. Phase 7 locked it with an `/dashboard` E2E smoke + axe-core WCAG 2.1 AA under CI `owner-axe`. The cross-cutting win: the latent `*100`/`÷100` revenue round-trip was deleted so in-memory dollars are correct end-to-end, and the fabricated `collection_rate` `0` was dropped.

### What Worked

- **Foundation-first sequencing (1 → 2 → (3 ∥ 4) → 5 → 6 → 7).** Phases 1-2 were invisible plumbing (dedup + honest data layer) so every visible phase built on correct values. Phases 3 and 4 each *added* a region with no file overlap and could ship in parallel.
- **Perfect-PR gate held every phase.** Two consecutive zero-finding deep review cycles caught real regressions before merge (Phase 1: 7 cycles, Phase 2: 11, Phase 4: 9, Phase 5: 8). The discipline cost cycles but kept `main` green throughout.
- **Phase 7 as the binding audit.** Rather than a separate `/gsd:audit-milestone`, the verification phase ran a real 7-test smoke against live prod (populated synthetic owner) in CI — the milestone's truth was an actually-executed E2E, not a checklist.
- **Atomic swaps.** Phase 5's DataTable replacement (mount new + trim store + delete 3 hand-rolled files) and Phase 4's chart swap landed as single coherent commits, never leaving the dashboard half-migrated.

### What Was Inefficient

- **Phase 2 took 11 review cycles + a post-merge fix** — the most of any phase. RPC/migration boundary work (typed mappers, RLS test shape) surfaced findings serially rather than all at once; a deeper first-pass mapper review would have collapsed cycles.
- **Phase-6 manual a11y sign-offs never closed** — `06-HUMAN-UAT.md` + `06-VERIFICATION.md` stayed `human_needed`/`partial` because they require a human at a keyboard. Automated axe coverage substantially superseded them, but the artifacts lingered as open items into milestone close (acknowledged + deferred).
- **CI dual-run confusion.** The `ci-cd.yml` + `ci-cd-doc-only.yml` pair (both named "CI") made `gh pr checks` ambiguous on mixed src+docs PRs; real E2E had to be confirmed via the long-duration check-run entry.

### Patterns Established

- **Shared-primitive reduced-motion guard goes INSIDE the effect**, not as a component-top early-return — keeps the `ref`/IntersectionObserver attached so the scroll-triggered NumberTicker still fires. (Reused for all 16 consumers.)
- **`-text` token companions for foreground text, vivid brand tokens for icons.** Vivid `--color-{success,warning,destructive,info}` fail AA as text in one theme each; the `-text` companions (≥4.5:1 both themes) are the text path. Became an app-wide sweep post-milestone (PRs #769/#770).
- **Authed dashboard E2E targets the CI `owner-axe` project** (in-test `loginAsOwner` cookie injection), not the storageState `owner` project (which doesn't run in CI).

### Key Lessons

- An "invisible" bug that visually cancels itself (`*100` then `/100`) is still a correctness liability the moment any consumer reads the in-memory value — fix it at the source even when the display looks fine.
- Honesty over fabrication: a missing metric (`collection_rate`) is dropped, never zero-filled, when the underlying data does not exist.
- Manual human-UAT items will not close themselves; scope them as explicit deferred-with-rationale at milestone close when automated coverage makes them low-risk, rather than blocking the milestone on a keyboard session.

### Cost Observations

- Model mix: quality profile (Opus on heavy reasoning per `config.json model_profile: quality`).
- Mode: YOLO / autonomous, fine granularity (7 phases).
- Notable: per-phase deep code review + perfect-PR gate is the dominant token cost; it traded tokens for a consistently green `main` and zero post-merge rollbacks across the milestone.

---

## Milestone: v3.0 — Security Hardening

**Shipped:** 2026-06-02
**Phases:** 3 | **Plans:** 5 | **Requirements:** 12/12

### What Was Built

Drove the prod Supabase Security Advisor to a documented, test-pinned steady state: `authenticated_security_definer_function_executable` 46→44 (43 KEEP / 2 TIGHTEN / 1 REVIEW, classified function-by-function), `rls_enabled_no_policy` 10→0 (explicit `service_role_only` policies on 10 infra tables + 5 vestigial-grant revokes closing the pg_graphql leak), all with zero RLS regressions. Three phases (classify+tighten → RLS resolution → documented steady state), each an atomic perfect-PR PR.

### What Worked

- **Inline execution of prod DDL against the LIVE state** was the single highest-leverage decision. The Phase-1 ACL check revealed the `authenticated` grants were DIRECT, not PUBLIC-inherited — so the plan's `REVOKE FROM PUBLIC` would have silently no-op'd; the load-bearing statement was `REVOKE FROM authenticated`. The Phase-2 A1 gate revealed the live policy state contradicted the repo migrations. A literal subagent plan-application would have mishandled both. Advisor deltas (46→44, 10→0) confirmed each revoke actually took effect.
- **The plan-checker caught a real correctness bug** before any code shipped: the Phase-1 migration was about to claim advisor delta 46→43, but `audit_for_all_policies` keeps its grant (the advisor checks grants, not function bodies) so 46→44 is correct.
- **Out-of-band + in-CI verification split**: the PostgREST-only harness pins the DENY side (`.from()`/`.rpc()` → permission error), the advisor + MCP verify the service-role ALLOW side. Reviewers ran impersonated-role (`SET LOCAL ROLE authenticated`) probes to confirm 42501 — not faith in the diff.
- **Research front-loaded with the Supabase MCP + agent skills** (advisor, schema introspection, `rls-policies`/`sql-migration-rules`) shrank the raw "46+10" surface to ~2-3 actionable changes before any planning.

### What Was Inefficient

- **A pre-existing flaky-test tail surfaced mid-merge**: fixing the Phase-1 Status-locator strict-mode bug unmasked two more flaky v2.0 dashboard E2E tests (empty-state-flash race + a wrong sort assumption), each needing its own root-cause fix to get the branch green. Perfect-PR-covers-pre-existing is correct but means an unrelated flaky tail can gate a clean security PR.
- **Two planner agents created stray branches** (`plan/v3-phase2-...`) violating the branch invariant, needing a delete+rename consolidation each time.
- **The plan-checker over-flagged documentation-metadata** (Open-Questions `(RESOLVED)` suffix, VALIDATION frontmatter booleans) as BLOCKERs in Phase 2 — real fixes but low-severity churn.

### Patterns Established

- **`aclexplode(proacl)` / `has_table_privilege` BEFORE any revoke** — never assume the grant path (PUBLIC-inherited vs direct).
- **Live-introspection gate as task 1** of any grant/policy migration; idempotent DDL (`DROP POLICY IF EXISTS`) against the actual live state, not repo assumptions.
- **`service_role_only` FOR ALL policy = lint/intent doc, not enforcement** (BYPASSRLS) — comment honestly.
- **CYCLE-N audit-doc lineage** (`anon-exec-audit/CYCLE-1..3` + `STEADY-STATE.md`) as the durable security-posture record; the `security-definer-advisor-state` memory as the cross-session pointer.

### Key Lessons

- An advisor lint counts the *configuration* (grants), not the *behavior* (an internal `is_admin()` gate) — `audit_for_all_policies` stays flagged by design. Predict advisor deltas from grants, not from what the function does.
- "Already fail-closed" (RLS-on + 0 policies) is not the same as "documented + lint-clean" — an explicit policy + the right grant revokes convert an ambiguous INFO into an intentional, monitored state.

### Cost Observations

- Model mix: quality profile (Opus on planning/research/execution heavy reasoning; Sonnet on plan-checking).
- Single-session milestone (all 3 phases 2026-06-02). The dominant cost was the per-phase perfect-PR review cycles (2-4 each); they caught the 46→43 arithmetic bug and verified every claim against live prod, trading tokens for a provably-correct prod-security change.

---

## Cross-Milestone Trends

| Milestone | Phases | Plans | Shipped | Verdict |
|-----------|--------|-------|---------|---------|
| v1.0 Marketing Surface Honesty | 15 | 33 | 2026-05-22 | Audit Round 3: PERFECT BY ALL MEASURES |
| v2.0 Dashboard Command Center | 7 | 24 | 2026-06-02 | 34/34 requirements; Phase-7 E2E green in CI |
| v3.0 Security Hardening | 3 | 5 | 2026-06-02 | 12/12 requirements; advisor steady state 44/0/1; zero RLS regressions |

**Recurring strengths:**
- Perfect-PR merge gate (two consecutive zero-finding cycles) enforced every phase, all three milestones.
- Drift-guard / regression tests (design-token scanner, dead-dep guards, marketing-copy banlist, grant-state RLS pins) turn one-time fixes into permanent regressions-prevented.
- Honesty principle held across all three: no fabricated stats/metrics/testimonials (v1.0/v2.0); no faked service-role test or lint-theater overclaim (v3.0).
- Front-loading research with the right tooling (per-phase researchers v1/v2; Supabase MCP + skills v3) shrinks the actionable surface before planning.

**Recurring frictions:**
- RPC/migration-boundary phases attract the most review cycles (v1.0 blog data layer; v2.0 Phase 2; v3.0 prod-grant migrations — though here the live-introspection gates contained it).
- Human-in-the-loop verification items / pre-existing flaky tests tend to linger and surface at milestone or merge boundaries.
- The dual "CI" workflow naming repeatedly obscures which run actually executed E2E.
- Subagents occasionally create stray git branches against the branch invariant (v3.0 planners) — needs a consolidation step.
