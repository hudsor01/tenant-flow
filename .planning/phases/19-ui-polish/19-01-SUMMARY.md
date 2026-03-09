---
phase: 19-ui-polish
plan: 01
status: complete
started: "2026-03-09"
completed: "2026-03-09"
duration: 15min
tasks_completed: 2
files_changed: 5
commits:
  - hash: 68683b5b5
    message: "refactor(19-01): strip auth logic from marketing navbar"
  - hash: 76292b08a
    message: "feat(19-01): add responsive mobile navbar behavior"
---

# Plan 19-01 Summary: Simplify Marketing Navbar

## What Changed
- Deleted `navbar-desktop-auth.tsx` (dead code — proxy handles auth routing)
- Removed all auth imports/hooks/state from navbar tree: `useAuth`, `useSignOutMutation`, `isMounted`, `isAuthenticated`
- Removed `AUTH_NAV_ITEMS` constant from `types.ts`
- Replaced auth-conditional UI with guest-only Sign In link + Get Started CTA button
- Added responsive navbar behavior: full-width sticky top bar on mobile, floating pill on desktop/tablet
- Simplified `NavbarMobileMenu` props (removed auth/user/onSignOut)

## Files Modified
- `src/components/layout/navbar.tsx` — stripped auth logic, added responsive classes, guest-only CTA
- `src/components/layout/navbar/types.ts` — removed AUTH_NAV_ITEMS
- `src/components/layout/navbar/navbar-desktop-auth.tsx` — DELETED
- `src/components/layout/navbar/navbar-mobile-menu.tsx` — removed auth props and conditional rendering

## Verification
- `pnpm typecheck` — clean
- `pnpm lint` — clean
- `pnpm test:unit` — 1,412 tests passing
- Zero references to `useAuth`, `AUTH_NAV_ITEMS`, or `navbar-desktop-auth` in navbar tree
