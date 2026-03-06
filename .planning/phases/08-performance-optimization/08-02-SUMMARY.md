---
phase: 08-performance-optimization
plan: 02
subsystem: ui
tags: [recharts, react-markdown, dynamic-import, code-splitting, next-dynamic, loading-animation]

# Dependency graph
requires:
  - phase: 07-ux-accessibility
    provides: component structure for chart and blog pages
provides:
  - Recharts code-split behind next/dynamic on all consumer pages
  - react-markdown code-split behind next/dynamic on blog page
  - ChartLoadingSkeleton with CSS-only rising bars animation
  - BlogLoadingSkeleton with CSS-only text-reveal animation
  - markdown-content.tsx extracted for dynamic blog loading
affects: [08-performance-optimization]

# Tech tracking
tech-stack:
  added: []
  patterns: [next/dynamic with ssr false for heavy client libraries, CSS-only loading animations, leaf component extraction for dynamic import]

key-files:
  created:
    - src/components/shared/chart-loading-skeleton.tsx
    - src/components/shared/blog-loading-skeleton.tsx
    - src/app/blog/[slug]/markdown-content.tsx
  modified:
    - src/app/(owner)/analytics/financial/page.tsx
    - src/app/(owner)/analytics/overview/page.tsx
    - src/app/(owner)/analytics/property-performance/page.tsx
    - src/app/(owner)/reports/analytics/page.tsx
    - src/app/(owner)/reports/page.tsx
    - src/components/analytics/lease-insights-section.tsx
    - src/components/analytics/maintenance-insights-section.tsx
    - src/components/analytics/property-insights-section.tsx
    - src/components/dashboard/dashboard.tsx
    - src/app/blog/[slug]/page.tsx
    - src/components/dashboard/__tests__/owner-dashboard.test.tsx

key-decisions:
  - "CSS-only animations for loading skeletons (no JS animation libraries per user decision)"
  - "next/dynamic with ssr: false for all chart and markdown components (client-only rendering)"
  - "Leaf chart components keep static recharts imports; consumers use dynamic()"

patterns-established:
  - "Dynamic import pattern: heavy client libraries wrapped in next/dynamic at consumer level"
  - "Loading skeleton pattern: CSS @keyframes in inline style tag with role=status and sr-only text"

requirements-completed: [PERF-03, PERF-04]

# Metrics
duration: 3min
completed: 2026-03-06
---

# Phase 08 Plan 02: Dynamic Imports Summary

**Code-split Recharts (~200KB) and react-markdown (~80KB) behind next/dynamic with CSS-only loading animations**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-06T17:48:38Z
- **Completed:** 2026-03-06T17:51:38Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- ChartLoadingSkeleton with 5-bar rising animation using CSS @keyframes (brand colors via --primary)
- BlogLoadingSkeleton with 7-line text-reveal animation with staggered delays
- 11 chart consumer files converted to use next/dynamic with ssr: false
- Blog page extracted markdown rendering to markdown-content.tsx for dynamic import
- Recharts no longer in initial bundle on non-chart pages
- react-markdown no longer in initial bundle on non-blog pages

## Task Commits

Each task was committed atomically:

1. **Task 1: Create loading animations and dynamically import chart components** - `41bf2da` (feat)
2. **Task 2: Dynamically import react-markdown on blog page** - `1bf4774` (feat)

## Files Created/Modified
- `src/components/shared/chart-loading-skeleton.tsx` - CSS-only rising bars loading animation for chart dynamic imports
- `src/components/shared/blog-loading-skeleton.tsx` - CSS-only text-reveal loading animation for blog dynamic imports
- `src/app/blog/[slug]/markdown-content.tsx` - Extracted ReactMarkdown rendering with rehype/remark plugins
- `src/app/(owner)/analytics/financial/page.tsx` - Dynamic import for financial chart components
- `src/app/(owner)/analytics/overview/page.tsx` - Dynamic import for ChartAreaInteractive
- `src/app/(owner)/analytics/property-performance/page.tsx` - Dynamic import for property chart components
- `src/app/(owner)/reports/analytics/page.tsx` - Dynamic import for analytics report charts
- `src/app/(owner)/reports/page.tsx` - Dynamic import for 4 report section components
- `src/components/analytics/lease-insights-section.tsx` - Dynamic import for lease charts
- `src/components/analytics/maintenance-insights-section.tsx` - Dynamic import for maintenance charts
- `src/components/analytics/property-insights-section.tsx` - Dynamic import for property charts
- `src/components/dashboard/dashboard.tsx` - Dynamic import for RevenueOverviewChart
- `src/app/blog/[slug]/page.tsx` - Dynamic import for MarkdownContent
- `src/components/dashboard/__tests__/owner-dashboard.test.tsx` - Updated test for loading skeleton

## Decisions Made
- CSS-only animations for both loading skeletons (no JS animation libraries per user decision)
- next/dynamic with ssr: false for all chart and markdown components since they are client-only
- Leaf chart components retain static recharts imports; dynamic() applied at the consumer level
- ChartLoadingSkeleton uses inline @keyframes via style tag (no Tailwind custom config needed)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Chart and markdown bundles are now code-split, reducing initial JS on all non-chart/non-blog pages
- Loading skeletons available for any future dynamic import needs
- Pattern established for future heavy-library code splitting

## Self-Check: PASSED

- FOUND: src/components/shared/chart-loading-skeleton.tsx
- FOUND: src/components/shared/blog-loading-skeleton.tsx
- FOUND: src/app/blog/[slug]/markdown-content.tsx
- FOUND: commit 41bf2da (task 1)
- FOUND: commit 1bf4774 (task 2)

---
*Phase: 08-performance-optimization*
*Completed: 2026-03-06*
