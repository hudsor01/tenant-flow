# Phase 1: Foundation & Dedup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-22
**Phase:** 01-foundation-dedup (v2.0 Dashboard Command Center)
**Areas discussed:** Chart-bug visible change, UI-SPEC depth, formatDashboardCurrency rename, Shared data transform extraction

---

## Chart-bug visible change

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 1 fixes everything | Drop all `*100` / `/100` in Phase 1. Chart values jump 100× to actual dollars at merge (visible change). | ✓ |
| Phase 1 fixes KPI only, Phase 4 fixes chart | Surgical — KPI round-trip cancelled by dropping `*100` + `/100` in `formatDashboardCurrency`; leave chart `/100` until Phase 4 deletes the file. Chart stays wrong for 3 more phases. | |
| Adjust criterion #1 | Functionally identical to option 1 but reword Phase 1 SC #1 to make the visible change intentional. | |

**User's choice:** Phase 1 fixes everything
**Notes:** Carries the v1.0 "perfect by all measures" honesty principle into v2.0. Leaving a known bug visible for 3 phases conflicts with the milestone's honesty bar. Documented in D-02 as a reworded success criterion ("KPI tiles render the same dollar values as before; chart values correct themselves to actual dollars 100× larger than the pre-fix display").

---

## UI-SPEC depth

| Option | Description | Selected |
|--------|-------------|----------|
| Rules-only | UI-SPEC enumerates aesthetic + tokens + dark-mode + breakpoints + motion budget + status-color usage + density. No concrete layouts. Phases 3/4/5 each get phase-specific UI-SPECs that inherit. | ✓ |
| Rules + concrete designs | UI-SPEC includes section-level layouts (KPI grid template, chart sizes, DataTable density). Front-loads design into Phase 1. | |

**User's choice:** Rules-only
**Notes:** Inherit-and-extend model matches v1.0 phase-specific UI-SPEC discipline (per-phase decisions made in per-phase docs). Keeps Phase 1 strictly foundation; Phases 3/4/5 make their own design calls within the constraints.

---

## formatDashboardCurrency rename

| Option | Description | Selected |
|--------|-------------|----------|
| Delete + replace with formatCurrency | `formatCurrency` already exists at `src/lib/utils/currency.ts:26` and is used 10+ places across `(owner)/analytics`, `(owner)/reports`, `components/financials`. Dashboard is the lone holdout. Replace 4 callers. | ✓ |
| Keep formatDashboardCurrency, drop /100 only | Surgical fix; leaves the duplicate-utility CLAUDE.md violation for future cleanup. | |

**User's choice:** Delete + replace
**Notes:** Discovered the existing `formatCurrency` during codebase scout — was not in the parked plan. Closing the duplicate-utility violation in the same PR as the bug fix avoids accumulating "documented imperfection" debt the way v1.0 did before its round-3 cleanup. CLAUDE.md "no duplicate utilities" rule made the choice obvious once both helpers were on the table.

---

## Shared data transform extraction

| Option | Description | Selected |
|--------|-------------|----------|
| `src/components/dashboard/dashboard-data.ts` | New file alongside `dashboard-types.ts`. Pure transform; types stay separate. | ✓ |
| Inside use-owner-dashboard hook | Co-locate transform with the React Query hook. Caller-friendly but harder to unit-test. | |
| `src/lib/dashboard/transforms.ts` | New library-tier module; matches `src/lib/utils/currency.ts` convention. Adds a new `src/lib/dashboard/` namespace for one file. | |

**User's choice:** `src/components/dashboard/dashboard-data.ts`
**Notes:** Clean separation between type defs (`dashboard-types.ts`) and transform logic (`dashboard-data.ts`); both files stay small and unit-testable in isolation. The hook wires the transform via `select:` per D-12.

---

## Claude's Discretion

- Exact filename for the new transform file inside the agreed location — `dashboard-data.ts` per D-10, but if the executor finds a more idiomatic project naming (e.g., `.transforms.ts` suffix used elsewhere), prefer the convention.
- Wording of the UI-SPEC section headings — D-04 + D-05 enumerate the topics; executor picks the structure.
- Whether to keep `dashboard-filters.tsx` after deleting `-compact.tsx` — depends on consumer grep result per D-14.
- Test file location for the regression-pin test of `transformDashboardData` — Phase 7's responsibility; Phase 1 writes the transform but does NOT necessarily ship its test.

## Deferred Ideas

- Phase 2 RPC migration for per-property `open_maintenance`
- `collection_rate` compute-or-drop decision (Phase 2 discuss)
- Replacement of `dashboard.tsx` itself with `dashboard-view.tsx` (Phase 3)
- Test for `transformDashboardData` (Phase 7 verification)
- Section-level visual designs (Phase 3/4/5 UI-SPECs)
