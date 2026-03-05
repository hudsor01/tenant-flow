---
phase: 03-auth-middleware
plan: 01
subsystem: auth
tags: [middleware, supabase-ssr, nextjs, route-protection, rbac, cookies]

requires: []
provides:
  - "Root middleware.ts with Supabase auth token refresh on every request"
  - "updateSession utility using @supabase/ssr getAll/setAll cookie pattern"
  - "Role-based route enforcement (OWNER, TENANT, PENDING, ADMIN)"
  - "Public route bypass with configurable route list"
  - "Cookie preservation on middleware redirects (Pitfall 2)"
affects: [03-auth-middleware, session-management, route-protection]

tech-stack:
  added: []
  patterns:
    - "updateSession pattern for Supabase middleware auth"
    - "redirectWithCookies helper to prevent session loss on redirects"
    - "#middleware tsconfig path alias for root middleware imports"

key-files:
  created:
    - middleware.ts
  modified:
    - tsconfig.json
    - src/lib/supabase/middleware.ts
    - src/lib/supabase/__tests__/middleware.test.ts
    - src/lib/supabase/__tests__/middleware-routing.test.ts

key-decisions:
  - "Used #middleware tsconfig path alias for test imports of root middleware.ts"
  - "Separated routing tests into dedicated file (middleware-routing.test.ts) to avoid mock conflicts with updateSession tests"
  - "ADMIN users treated as OWNER for routing (access /dashboard, blocked from /tenant)"

patterns-established:
  - "redirectWithCookies: always copy supabaseResponse cookies to redirect responses"
  - "isPublicRoute: exact match or prefix match with trailing slash"

requirements-completed: [AUTH-01, AUTH-02]

duration: 22min
completed: 2026-03-04
---

# Phase 3 Plan 1: Auth Middleware Summary

**Next.js middleware with Supabase token refresh, role-based routing (OWNER/TENANT/PENDING/ADMIN), and cookie-preserving redirects**

## Performance

- **Duration:** 22 min
- **Started:** 2026-03-05T04:33:40Z
- **Completed:** 2026-03-05T04:55:45Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Root middleware.ts executing on all non-static, non-API requests with Supabase auth refresh
- Role-based enforcement: TENANT -> /tenant, OWNER -> /dashboard, PENDING -> /auth/select-role
- Cookie sync maintained on all redirects preventing session loss
- 17 unit tests passing (4 updateSession + 13 routing)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create updateSession utility with cookie-sync tests** - `0b5d331ea` (feat)
2. **Task 2: Create root middleware with role-based routing** - `f6948256a` (feat)

## Files Created/Modified
- `middleware.ts` - Root Next.js middleware with route protection and role enforcement
- `tsconfig.json` - Added #middleware path alias and middleware.ts to include
- `src/lib/supabase/middleware.ts` - updateSession utility with getAll/setAll cookie pattern
- `src/lib/supabase/__tests__/middleware.test.ts` - 4 updateSession unit tests
- `src/lib/supabase/__tests__/middleware-routing.test.ts` - 13 routing unit tests

## Decisions Made
- Used #middleware tsconfig path alias for importing root middleware.ts in tests (standard URL doesn't have paths to root)
- Separated routing tests into dedicated file to avoid vi.mock conflicts between updateSession tests (which mock @supabase/ssr) and routing tests (which mock updateSession itself)
- ADMIN users treated as OWNER for routing purposes: can access /dashboard, redirected away from /tenant
- API routes excluded from middleware via matcher pattern to prevent redirect interference with Edge Function calls

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing lint error in post-checkout page**
- **Found during:** Task 1 (pre-commit hook)
- **Issue:** `@tanstack/query/no-unstable-deps` lint rule flagged useMutation results passed directly to useEffect/useCallback deps
- **Fix:** Linter auto-destructured mutation results (mutate, isPending, etc.)
- **Files modified:** src/app/auth/post-checkout/page.tsx
- **Committed in:** 0b5d331ea (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix was necessary to pass lint pre-commit hook. No scope creep.

## Issues Encountered
- Previous plan executions (03-03, 03-04) had already created updateSession utility and routing tests. Task 1 and Task 2 focused on ensuring the root middleware.ts and tsconfig integration were complete.
- Vitest path alias resolution requires `#` prefix (project convention), not `@/` prefix

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Middleware foundation complete for all Phase 3 route protection requirements
- Public route list and role enforcement ready for further AUTH requirements
- Token refresh active on every matched request

---
*Phase: 03-auth-middleware*
*Completed: 2026-03-04*
