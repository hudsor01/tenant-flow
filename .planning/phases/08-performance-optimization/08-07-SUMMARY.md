---
phase: 08-performance-optimization
plan: 07
subsystem: ui, docs
tags: [use-client, next-image, blob-urls, conventions, performance]

# Dependency graph
requires:
  - phase: 05-code-quality
    provides: "Initial 91 'use client' removals and hook organization"
  - phase: 08-performance-optimization
    provides: "Dynamic imports, virtualization, stats RPCs, shared tenant ID (plans 01-06)"
provides:
  - "CLAUDE.md updated with all Phase 8 performance conventions"
  - "5 additional 'use client' directives removed (412 -> 407)"
  - "file-upload-item blob URL justification documented"
affects: [all-phases, conventions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server component wrappers: remove 'use client' from components that only compose client children"
    - "Blob URL documentation: explicit biome-ignore comments for next/image incompatibility"

key-files:
  created: []
  modified:
    - CLAUDE.md
    - src/components/ui/file-upload/file-upload-item.tsx
    - src/components/shared/blog-loading-skeleton.tsx
    - src/components/shared/chart-loading-skeleton.tsx
    - src/app/pricing/cancel/page.tsx
    - src/app/pricing/_components/pricing-section.tsx
    - src/app/(tenant)/tenant/settings/stripe-connect-tab.tsx

key-decisions:
  - "file-upload-item keeps raw <img> for blob URLs -- next/image protocol restriction documented"
  - "5 'use client' removals (loading skeletons, pricing wrappers, stripe-connect-tab) -- safe server component promotions"
  - "Error boundary files (error.tsx, global-error.tsx) must stay client components per Next.js requirement"
  - "Chart leaf components keep 'use client' -- recharts requires browser APIs at render time"

patterns-established:
  - "CLAUDE.md Performance Conventions section: dynamic imports, VirtualizedList, consolidated RPCs, resolveTenantId, query bounds"

requirements-completed: [PERF-21, PERF-24, DOC-01]

# Metrics
duration: 27min
completed: 2026-03-06
---

# Phase 8 Plan 7: Use Client Audit and CLAUDE.md Conventions Summary

**Removed 5 'use client' directives (412 to 407), documented file-upload-item blob URL justification, and updated CLAUDE.md with all Phase 8 performance conventions**

## Performance

- **Duration:** 27 min
- **Started:** 2026-03-06T19:36:27Z
- **Completed:** 2026-03-06T20:04:10Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Audited all 412 'use client' files, identified and removed 5 that were safe server component promotions
- Documented blob: URL incompatibility with next/image in file-upload-item.tsx
- Added comprehensive Performance Conventions section to CLAUDE.md covering dynamic imports, virtualization, stats RPCs, shared tenant ID resolution, query bounds, and Edge Function parallelization

## Task Commits

Each task was committed atomically:

1. **Task 1: Audit 'use client' directives and optimize file-upload-item image** - `ca254f417` (feat)
2. **Task 2: Update CLAUDE.md with Phase 8 performance conventions** - `b62c314da` (docs)

## Files Created/Modified
- `CLAUDE.md` - Added Performance Conventions section, updated Query Key Factories, Hook Organization, Data Access Patterns, Edge Functions, and Common Gotchas
- `src/components/ui/file-upload/file-upload-item.tsx` - Improved biome-ignore comment documenting blob: URL restriction
- `src/components/shared/blog-loading-skeleton.tsx` - Removed 'use client' (pure CSS animation, no hooks/events)
- `src/components/shared/chart-loading-skeleton.tsx` - Removed 'use client' (pure CSS animation, no hooks/events)
- `src/app/pricing/cancel/page.tsx` - Removed 'use client' (static page composing client children)
- `src/app/pricing/_components/pricing-section.tsx` - Removed 'use client' (thin wrapper around client component)
- `src/app/(tenant)/tenant/settings/stripe-connect-tab.tsx` - Removed 'use client' (wrapper rendering client + static HTML)

## Decisions Made
- file-upload-item.tsx uses blob: URLs from URL.createObjectURL() which next/image cannot optimize -- kept raw `<img>` with explicit documentation
- Phase 5 removed 91 'use client' directives; this second pass found 5 more after careful verification that each component had no hooks, event handlers, browser APIs, or function props requiring client context
- Error boundary files (error.tsx, global-error.tsx) verified as requiring 'use client' per Next.js framework requirement
- Chart leaf components (recharts imports) verified as requiring 'use client' since recharts uses browser APIs at render time
- Marketing-home.tsx left as client component due to complex import tree (not a simple leaf removal)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing typecheck errors on branch (6 errors in connect-account-status.tsx, billing.ts, lease-template.ts, auth.ts, security.ts) -- all from prior phase plans, not caused by this plan's changes
- Shell history expansion (`!`) interfered with bash `grep -v` patterns -- resolved by writing script files

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 8 (Performance Optimization) is now fully complete (7/7 plans)
- CLAUDE.md reflects all performance conventions established across Phase 8
- Ready to proceed to Phase 9

---
*Phase: 08-performance-optimization*
*Completed: 2026-03-06*
