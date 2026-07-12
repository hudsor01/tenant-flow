# v9.0 Fix-Approach Research & Validation Summary

_Every one of the 296 audit findings has a documented root-cause fix in its phase's `RESEARCH.md`. Each proposed fix was then handed to an independent adversarial validator instructed to REFUTE it against the live code, prod schema, and CLAUDE.md rules. This is the pre-flight confidence layer before `plan-phase`._

## Scorecard (adversarial "will this fix actually fix it?")

| Phase | Category | REQs | WILL-FIX | Status |
|-------|----------|------|----------|--------|
| 36 | Billing & Subscription Lifecycle | 20 | 20 | ✅ fully validated |
| 37 | Auth Flows | 13 | 13 | ✅ fully validated |
| 38 | Forms & Validation | 19 | 19 | ✅ fully validated |
| 39 | Data Layer & Cache Integrity | 18 | 18 | ✅ fully validated (DATA-03 rejection resolved — see below) |
| 40 | Type Boundaries | 7 | — | ⏳ research done, validation pending |
| 41 | Component Logic & Analytics | 13 | — | ⏳ research done, validation pending |
| 42 | Dashboard UX & Navigation | 23 | — | ⏳ research done, validation pending |
| 43 | E-sign Flow | 6 | 6 | ✅ fully validated |
| 44 | Public Site UX | 11 | — | ⏳ research done, validation pending |
| 45 | Marketing Content Truthfulness | 24 | 24 | ✅ fully validated |
| 46 | Marketing UI Consistency | 26 | 26 | ✅ fully validated |
| 47 | Accessibility | 41 | 41 | ✅ fully validated |
| 48 | Routing, SEO & Performance | 15 | — | ⏳ research done, validation pending |
| 49 | Client State (Zustand) | 13 | — | ⏳ research done, validation pending |
| 50 | Admin Surface | 7 | 7 | ✅ fully validated |
| 51 | Code Hygiene | 40 | 40 | ✅ fully validated |
| **Total** | | **296** | **214** | **0 unresolved rejections** |

- **214 / 296** fixes adversarially confirmed WILL-FIX.
- **1** rejection total across the entire pass (DATA-03), now **resolved** — the `removeDetail` single-key→array signature change also required updating `src/hooks/create-mutation-callbacks.test.ts:115`, which was missing from the fix's file list; RESEARCH.md amended to include it.
- **82** REQs (phases 40, 41, 42, 44, 48, 49) have complete root-cause fixes on disk but their validators did not finish (account rate/session limit during the fan-out). Validate-only workflow staged at `~/.claude/.../workflows/scripts/v9-residual-validation.js` — reads the on-disk RESEARCH.md, no research stage. Run it before planning those phases. The perfect-PR gate + `plan-check` will independently re-verify every fix at execution time regardless.

## Method

Per phase: one researcher produced RESEARCH.md (root cause → concrete fix → why-it-fixes-it → risks/interactions → files touched, per REQ, with class-wide sibling sweeps). Then adversarial validators (chunked, ~8 REQs each) tried to refute each proposed fix against actual code, `supabase/migrations`, prod schema, and CLAUDE.md. INSUFFICIENT verdicts fed a revise-and-revalidate round. Zero fixes were rubber-stamped — the single DATA-03 catch proves the adversarial pass had teeth.

## Decision notes

~70 REQs carry a **Decision** note in their RESEARCH.md where two legitimate fix directions existed (recorded so the planner doesn't re-litigate). The biggest recurring one: the integer-dollar money columns (`leases.rent_amount` etc.) — fixes enforce integer input client-side (round + `.int()` schemas + `step="1"`) rather than a DB `integer→numeric(10,2)` migration, to match CLAUDE.md's dollars convention with the least blast radius. If a future milestone wants cents precision, the migration alternative is the recorded fallback.

## Cross-phase safety

See `CONFLICT-MAP.md` — 59 files are touched by more than one phase (10 by 3+). Because phases execute strictly sequentially and each branches only after the prior PR merges to main, a shared file is only a hazard if a later phase clobbers an earlier fix. Every phase's plan must rebase on merged main and edit shared files additively.
