# Phase 15: v1.0 Milestone Cleanup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 15-v1-0-milestone-cleanup-close-all-audit-gaps-doc-drift-tracea
**Areas discussed:** Retro-VERIFICATION depth, Worker-pool flakiness scope, Plan granularity, /blog nav regression-test approach

---

## Retro-VERIFICATION.md depth (Phases 4/5/6/14)

| Option | Description | Selected |
|--------|-------------|----------|
| Standard (Phase 7-13 template) | Observable Truths + Required Artifacts + Key Link Verification tables; cross-ref shipped PR + regression tests; honest retroactive labelling | ✓ |
| Minimal (1-line cross-ref) | Bare frontmatter + 1-line "shipped via #N, see test X". Fast but loses audit value. | |
| Reconstructed (full pseudo-verification) | Full re-verification done now: re-grep, re-run, document every REQ-ID with evidence. Slowest. | |

**User's choice:** Standard
**Notes:** Standard is the right honesty bar — captures the audit value the original execution should have produced, without pretending it happened at execution time. `retroactive: true` + `shipped_pr: <N>` frontmatter fields make the truth machine-discoverable.

---

## Vitest worker-pool flakiness scope

| Option | Description | Selected |
|--------|-------------|----------|
| Investigate + fix in Phase 15 | Diagnostic 3-5 runs, tune pool/poolOptions, 3-consecutive zero-flake gate. Higher cost; real fix. | ✓ |
| Investigate-only; defer fix | Root-cause + forensic note, but no config change. Tracked v1.1 issue. Faster. | |
| Accept + document; no investigation | Treat as environmental, log it, move on. Lowest confidence. | |

**User's choice:** Investigate + fix
**Notes:** "Everything no matter severity, canonically" — flakiness counts. The 3-consecutive zero-flake gate is the success bar; if pool tuning can't hit it, downgrade gracefully with diagnostic data captured (D-11 fallback).

---

## Plan granularity

| Option | Description | Selected |
|--------|-------------|----------|
| 5 plans, one per cleanup item | Maximally parallel; zero file-modified overlap; matches Phase 14's per-finding split. | ✓ |
| 3 bundled plans | Doc cleanup + deps/tests + cross-cutting. Fewer plans, bigger each. | |
| Monolithic plan | Single PLAN covering all 5 items sequentially. Simplest; loses parallelization. | |

**User's choice:** 5 plans, one per cleanup item
**Notes:** Wave-1-parallel layout: 15-01 (planning-dir only) + 15-02 (REQUIREMENTS.md) + 15-03 (package.json + lockfile + drift-test) + 15-04 (vitest.config.ts) + 15-05 (nav test files) have zero `files_modified` overlap, so all 5 ship in parallel.

---

## /blog nav suppression regression-test approach

| Option | Description | Selected |
|--------|-------------|----------|
| Source-text scan | readFileSync DEFAULT_NAV_ITEMS + assert no /blog href + assert deferral comment present. Fast, consistent with Phase 11 drift pattern. | |
| Render test (jsdom) | Mount navbar, assert no rendered link has /blog href. Closer to production behavior. | |
| Both | Source-scan + render. Belt-and-suspenders; doubles coverage. | ✓ |

**User's choice:** Both
**Notes:** User explicitly changed from "Source-text scan (Recommended)" to "Both" — belt-and-suspenders consistent with Phase 10's layered source-scan + render assertions on critical regressions. Two test files: `nav-blog-suppression-source.test.ts` + `nav-blog-suppression-render.test.tsx`.

---

## Claude's Discretion

- Exact wording of retro-VERIFICATION Observable Truths and Required Artifacts (so long as each truth cites live code + a regression test + the shipped PR).
- Exact `maxThreads` / `minThreads` values for the vitest pool config — depends on diagnostic data; Claude picks based on what produces 3-run green.
- Whether to split the unit project into sub-projects (D-10 step 3 escape hatch) — only if D-10 steps 1-2 prove insufficient.
- Whether to add an integration test for the Stripe dep removal beyond the package.json drift guard — likely unnecessary per the integration checker's confirmation that the dep is dead-code.

## Deferred Ideas

- Dashboard redesign milestone (v2.0 "Dashboard Command Center") — full plan parked at `/Users/richard/.claude/plans/i-want-to-enhance-hazy-island.md`. Belongs in `/gsd-new-milestone` AFTER Phase 15 + `/gsd-complete-milestone v1.0`.
- Lifting `/blog` nav suppression — content-cohort milestone, future. Plan 15-05's regression test will need updating when that cohort lands.
- Vitest project split (D-10 step 3 escape hatch) — only enacted if pool tuning fails; if so, worth its own discuss/plan rather than smuggling into Plan 15-04.
- General `package.json` audit for other dead deps — separate future cleanup phase.
