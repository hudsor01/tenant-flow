# Phase 66.2 deferred items

Out-of-scope discoveries logged by executors. Each entry names the plan that found it.

## 66.2-36: onboarding tour step 1 footer below the fold at 1280x720

- **Found during:** 66.2-36 Task 3, tour T4 (1280x720, rail expanded), local `next dev` against owner A's populated dashboard.
- **Observed:** step 1 ("Welcome to TenantFlow", target `[data-testid='dashboard-stats']`, side bottom) is placed under the KPI grid at about y 590. Its footer (Skip tour / Next step) renders below the 720px viewport. The step is `fixed`, so scrolling cannot bring the footer into view, and Playwright's pointer click on "Next step" fails with "element is outside of the viewport". Keyboard activation (focus + Enter) still advances the tour. At 1280x720 with the rail collapsed, and at 375 and 900, the footer is reachable.
- **Why out of scope:** step 1 and the tour's floating placement (`src/components/ui/tour.tsx`, `owner-onboarding-tour.tsx` step 1) are not wave-6 changes; 66.2-35 changed step 5 only. The rail keeps its pre-migration 224px width (UI-SPEC S-2 "today's values"). Whether step 1 overflowed before wave 6 was not measured.
- **Spec handling:** `openTourAtStep5` advances steps with focus + Enter, as a keyboard user would. No assertion was loosened.

## 66.2-36: a palette navigation from /dashboard can be replaced by the data tables' URL write

- **Found during:** 66.2-36 Task 4, production build (`next start`, :3050), spec M2 close path 5 (palette selection of Properties right after `page.goto("/dashboard")` and hydration).
- **Observed:** in 2 of the 16 production-build runs that reached this step, clicking the palette option "Properties" closed the palette and the sheet, but the page never reached /properties: Playwright's navigation log after the click shows exactly two navigations, both to `/dashboard?page=1&perPage=10`, and none to /properties. `useClientDataTable` (`src/hooks/use-client-data-table.ts`) keeps `page`/`perPage` in the URL through nuqs (`history: "replace"`, `shallow: true`).
- **Not measured:** which data change triggers the write, or whether Next's router abandons the pending `router.push` because of the replace. The hypothesis is that the write lands while the push is in flight.
- **Why out of scope:** the dashboard data tables and the palette's `router.push` are not wave-6 changes.
- **Spec handling:** close path 5 waits for the dashboard content and `networkidle` after `page.goto("/dashboard")` before it opens the palette (20 of 20 repeats, then 6 of 6 in a 3x whole-spec repeat, passed after the gate). The navigation assertion is unchanged.
