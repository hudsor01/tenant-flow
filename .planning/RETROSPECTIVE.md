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

## Cross-Milestone Trends

| Milestone | Phases | Plans | Shipped | Verdict |
|-----------|--------|-------|---------|---------|
| v1.0 Marketing Surface Honesty | 15 | 33 | 2026-05-22 | Audit Round 3: PERFECT BY ALL MEASURES |
| v2.0 Dashboard Command Center | 7 | 24 | 2026-06-02 | 34/34 requirements; Phase-7 E2E green in CI |

**Recurring strengths:**
- Perfect-PR merge gate (two consecutive zero-finding cycles) enforced every phase, both milestones.
- Drift-guard tests (design-token scanner, dead-dep guards, marketing-copy banlist) turn one-time fixes into permanent regressions-prevented.
- Honesty principle (no fabricated stats/metrics/testimonials) held across both milestones.

**Recurring frictions:**
- RPC/migration-boundary phases attract the most review cycles (v1.0 blog data layer; v2.0 Phase 2).
- Human-in-the-loop verification items tend to linger open until milestone close.
- The dual "CI" workflow naming repeatedly obscures which run actually executed E2E.
