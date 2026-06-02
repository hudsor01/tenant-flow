# Phase 6: Polish & A11y - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-31
**Phase:** 6-Polish & A11y
**Areas discussed:** Table breakpoint, Verification rigor, Polish scope, Reduced-motion depth

---

## Table breakpoint

| Option | Description | Selected |
|--------|-------------|----------|
| Keep grid <1024, table ≥1024 | Preserve #765 `FORCE_GRID_QUERY`; 7-col table + lg-only controls need desktop width; meets 375px criterion; zero regression | ✓ (Claude, delegated) |
| Show table at ≥768px (tablet) | Denser on tablet, but 7 columns cramp at 768px and column-visibility control is lg-only | |

**User's choice:** "you canonically decide" → Claude locked **grid <1024 / table ≥1024**.
**Notes:** User delegated the call. Locked to the safer, zero-regression option that matches the surface as shipped + live-verified post-#765.

---

## Verification rigor

| Option | Description | Selected |
|--------|-------------|----------|
| Manual sweep + axe-core in E2E | Manual dark-mode + keyboard audit PLUS automated axe-core a11y assertion in /dashboard E2E; skip screenshot diffs | ✓ |
| Manual audit only | What the UI-SPEC literally says; defer all automation to Phase 7 | |
| Manual + axe + dark-mode screenshot regression | Fullest; adds Playwright light/dark screenshot diffs (flaky, high-maintenance) | |

**User's choice:** Manual sweep + axe-core in E2E.
**Notes:** Pulls a slice of POLISH-09 (E2E) forward for regression-proofing. Screenshot diffs deliberately excluded as flaky. CONTEXT notes axe is CSP-blocked on prod — run against local/preview build via `@axe-core/playwright`.

---

## Polish scope

| Option | Description | Selected |
|--------|-------------|----------|
| Whole /dashboard subtree | v2.0 regions + older surfaces (expiring-leases-widget, Quick Actions, page chrome) on the same route | ✓ |
| Strictly v2.0-added regions | Only Phases 3/4/5 output | |

**User's choice:** Whole /dashboard subtree.
**Notes:** Aligns with success criteria #1 ("zero bg-white in the dashboard subtree") + #2 ("Tab through /dashboard"), which are route-wide by wording. Bounded to the /dashboard route.

---

## Reduced-motion depth

| Option | Description | Selected |
|--------|-------------|----------|
| Fix shared NumberTicker + audit all | useReducedMotion() inside ui/number-ticker.tsx (snap to final value); audit BlurFade + chart isAnimationActive | ✓ |
| Guard only at dashboard call-sites | Leave ui/number-ticker.tsx alone; rely on KpiNumberTicker wrapper + per-chart guards | |

**User's choice:** Fix shared NumberTicker + audit all.
**Notes:** A CSS prefers-reduced-motion guard can't stop NumberTicker's rAF loop (confirmed reading the component in the 2026-05-31 audit), so the fix must be in JS at the source. Blast-radius discipline: grep all consumers + add a reduced-motion unit test.

## Claude's Discretion

- **Table breakpoint (D-01)** — user said "you canonically decide"; locked to grid<1024 / table≥1024.
- **POLISH-07 mechanism** — whether a route-scoped `loading.tsx` is needed depends on whether the `"use client"` dashboard page involves Suspense streaming; left to researcher/planner. The binding rule (never co-render skeleton + empty) is fixed.
- **Status-badge mapping (D-05)** — UI-SPEC-mandated migration of `lease-status-badge.tsx` to canonical `status-*` utilities; mapping active→success / expiring→warning / vacant→muted captured as Claude's design call.

## Deferred Ideas

None — discussion stayed within phase scope.
