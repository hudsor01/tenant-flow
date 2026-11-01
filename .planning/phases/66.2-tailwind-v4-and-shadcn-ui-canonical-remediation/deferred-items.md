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

## 66.2-38: dashboard layout defects in the CP-4 review captures (owner follow-up, before 66.2-39)

- **Found during:** 66.2-38 Task 1, reading the 66.2-37 evidence pack captures (`screens/review/CP-4/after/`, the `final-sidebar` set: owner A, local `next start`, reduced motion).
- **Observed:**
  - Collapsed desktop rail (`collapsed`, new state, VD-29): the dashboard KPI values wrap. At 1024 the four-column KPI row puts "$" and "7,500" on two lines in the Revenue card; at 1280 the row becomes six columns and both "$" / "7,500" and "33" / "%" (Occupancy) wrap. Evidence: `collapsed-vs-rail-expanded-light-1280.png`, `collapsed-vs-rail-expanded-dark-1024.png`. With the rail expanded the values fit (`sidebar_rail-expanded-light-1024.png`, three columns).
  - Expanded rail at 1024 (`sidebar_rail-expanded-light-1024.png`): the Quick Actions "Add Property" card overflows its column by about 10px at the right, and the quick-actions dock overlaps the occupancy donut.
- **Not measured:** whether these exist before wave 6 at an equivalent content width (the expanded-rail overflow and the dock overlap may predate 66.2; the collapsed wrap needs the collapse, which only wave 6 added).
- **Owner decision (2026-11-01, CP-4 "Keep + fix layout"):** keep desktop collapse (`cp4-default`) and fix these if this phase caused them, as a separate step after 66.2-38 and before 66.2-39. Recorded as `followUp` on the CP-4 entry of `66.2-38-CP-DECISIONS.json`, not as a fallback.

## 66.2-38: the onboarding "Getting Started" dialog flashes on /dashboard

- **Found during:** 66.2-38 Task 1, the CP-5 frame strip (local `next start` :3062 on the HEAD build, owner A, 1280x800, `reducedMotion: no-preference`, tour progress seeded "completed" in localStorage, `user_tour_progress` intercepted locally).
- **Observed:** a MutationObserver init script recorded, on every /dashboard load during sign-in navigation (real-time timeline), a `role="dialog"` titled "Getting Started" ("Let's get you set up", `src/components/onboarding/onboarding-step-welcome.tsx`) that mounts and is removed 214-234 ms later (final run: light 622->856, 276->492; dark 329->543, 278->503 ms after navigation start; earlier runs up to 255 ms). With the animation timeline frozen, the dialog's exit animation holds it on screen fully opaque at its start.
- **Not measured:** what opens and then closes the dialog, and whether a reduced-motion user sees it.
- **Why out of scope:** `git diff 754c91802 HEAD -- src/components/onboarding` is empty; this phase did not change the onboarding flow. Not a CP-1..CP-5 surface.
