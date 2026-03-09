# Roadmap: TenantFlow

## Overview

TenantFlow is a multi-tenant property management SaaS platform for property owners and managers. The roadmap follows milestone-grouped phases with continuous numbering across all versions.

## Milestones

- v1.0 **Production Hardening** -- Phases 1-10 (shipped 2026-03-07) | [archive](milestones/v1.0-ROADMAP.md)
- v1.1 **Blog Redesign & CI** -- Phases 11-15 (shipped 2026-03-08) | [archive](milestones/v1.1-ROADMAP.md)
- v1.2 **Production Polish & Code Consolidation** -- Phases 16-20 (in progress)

## Phases

<details>
<summary>v1.0 Production Hardening (Phases 1-10) -- SHIPPED 2026-03-07</summary>

- [x] Phase 1: RPC & Database Security (2/2 plans) -- completed 2026-03-04
- [x] Phase 2: Financial Fixes (7/7 plans) -- completed 2026-03-05
- [x] Phase 3: Auth & Middleware (6/6 plans) -- completed 2026-03-05
- [x] Phase 4: Edge Function Hardening (4/4 plans) -- completed 2026-03-05
- [x] Phase 5: Code Quality & Type Safety (10/10 plans) -- completed 2026-03-06
- [x] Phase 6: Database Schema & Migrations (7/7 plans) -- completed 2026-03-06
- [x] Phase 7: UX & Accessibility (6/6 plans) -- completed 2026-03-06
- [x] Phase 8: Performance Optimization (7/7 plans) -- completed 2026-03-06
- [x] Phase 9: Testing & CI Pipeline (9/9 plans) -- completed 2026-03-06
- [x] Phase 10: Audit Cleanup (2/2 plans) -- completed 2026-03-07

</details>

<details>
<summary>v1.1 Blog Redesign & CI (Phases 11-15) -- SHIPPED 2026-03-08</summary>

- [x] Phase 11: Blog Data Layer (2/2 plans) -- completed 2026-03-07
- [x] Phase 12: Blog Components & CSS (2/2 plans) -- completed 2026-03-07
- [x] Phase 13: Newsletter Backend (1/1 plans) -- completed 2026-03-07
- [x] Phase 14: Blog Pages (2/2 plans) -- completed 2026-03-08
- [x] Phase 15: CI Optimization (1/1 plans) -- completed 2026-03-08

</details>

### v1.2 Production Polish & Code Consolidation (In Progress)

- [x] **Phase 16: Shared Cleanup & Dead Code** - Flatten src/shared/ into top-level directories, delete design-system.ts, run Knip audit, delete TYPES.md, update CLAUDE.md
- [x] **Phase 17: Hooks Consolidation** - Deduplicate and modernize API hooks, expand useSuspenseQuery, split oversized hook files, migrate react-hook-form to TanStack Form, add mutationOptions() factories
- [x] **Phase 18: Components Consolidation** - Split oversized components, enable React Compiler, remove manual memoization
- [x] **Phase 19: UI Polish** - Redesign marketing navbar, enforce button/card/layout consistency across all page groups
- [ ] **Phase 20: Browser Audit** - Systematic browser automation verification of all pages at desktop and mobile viewports

## Phase Details

### Phase 16: Shared Cleanup & Dead Code
**Goal**: The codebase has zero dead exports, zero unused dependencies, and a single source of truth for shared types and design tokens
**Depends on**: Nothing (first phase of v1.2)
**Requirements**: CLEAN-01, CLEAN-03, CLEAN-04, CLEAN-05, MOD-03
**Plans:** 3 plans
Plans:
- [x] 16-01-PLAN.md -- Migrate design-system.ts consumers to Tailwind/CSS and delete design-system.ts
- [x] 16-02-PLAN.md -- Flatten src/shared/ into top-level directories, rewrite all imports
- [x] 16-03-PLAN.md -- Knip dead code audit, delete TYPES.md, update CLAUDE.md
**Success Criteria** (what must be TRUE):
  1. Knip runs clean with zero findings on the entire codebase (src/ and supabase/)
  2. TYPES.md is deleted; src/types/ directory is self-documenting
  3. src/shared/ directory does not exist; all contents merged into src/types/, src/lib/, src/config/
  4. globals.css is the sole source of truth for design tokens; design-system.ts is deleted entirely

### Phase 17: Hooks Consolidation
**Goal**: API hooks are deduplicated, modernized for TanStack Query v5 patterns, all oversized hook files are split under the 300-line limit, all forms migrated to TanStack Form, and mutationOptions() factories added
**Depends on**: Phase 16
**Requirements**: MOD-02, MOD-04, MOD-05
**Plans:** 6/6 plans executed
Plans:
- [x] 17-01-PLAN.md -- Split 7 oversized hook/query-key files under 300 lines and remove react-hook-form
- [x] 17-02-PLAN.md -- Create mutationOptions() factories for core owner domains (properties, tenants, leases, maintenance, units, vendors)
- [x] 17-03-PLAN.md -- Create mutationOptions() factories for secondary domains in query-key files
- [x] 17-04-PLAN.md -- Convert Suspense-wrapped components from useQuery to useSuspenseQuery
- [x] 17-05-PLAN.md -- Refactor 25 secondary mutation hooks to spread mutationOptions factories
- [x] 17-06-PLAN.md -- Audit and delete dead hooks, resolve overlapping hook functionality
**Success Criteria** (what must be TRUE):
  1. All components inside Suspense boundaries use useSuspenseQuery with typed data (never undefined) instead of useQuery
  2. No duplicate or overlapping hook functionality exists across the 85 hook files
  3. All hook files are under 300 lines (the 2+ oversized hooks identified in CLEAN-02 are split as part of this consolidation)
  4. ownerDashboardKeys cross-domain invalidation graph (8 files, 22 call sites) is intact and correct after any restructuring
  5. All 17 react-hook-form files migrated to TanStack Form; react-hook-form removed from dependencies
  6. mutationOptions() factories exist for all mutation hooks, mirroring queryOptions() pattern

### Phase 18: Components Consolidation
**Goal**: All oversized components are split under 300 lines, dead components are removed, and React Compiler auto-memoizes in place of manual useMemo/useCallback
**Depends on**: Phase 17
**Requirements**: CLEAN-02, MOD-01
**Plans:** 6/6 plans complete
Plans:
- [x] 18-01-PLAN.md -- Split 6 oversized UI primitive files (stepper group, chart, file-upload, dialog)
- [x] 18-02-PLAN.md -- Split 9 large feature components (app-shell, contact-form, wizard, forms, dialogs)
- [x] 18-03-PLAN.md -- Split 8 medium feature components and clean up 11 borderline files
- [x] 18-04-PLAN.md -- Split 18 oversized page files (login mandatory, dashboard, tenant pages)
- [x] 18-05-PLAN.md -- Enable React Compiler via babel-plugin-react-compiler
- [x] 18-06-PLAN.md -- Remove all manual useMemo/useCallback/React.memo from 88 source files
**Success Criteria** (what must be TRUE):
  1. Zero component files exceed the 300-line limit (20+ files split, excluding vendored tour.tsx)
  2. React Compiler is enabled via babel-plugin-react-compiler and all existing unit/component tests pass
  3. Manual useMemo and useCallback calls are removed from components where React Compiler handles memoization (progressive removal, verified per-component)
  4. pnpm typecheck and pnpm lint pass clean after all file splits and moves

### Phase 19: UI Polish
**Goal**: The public-facing UI has a consistent, polished look across marketing, auth, blog, dashboard, tenant portal, and billing pages
**Depends on**: Phase 18
**Requirements**: UI-01, UI-02, UI-03, UI-04
**Plans:** 3 plans
Plans:
- [x] 19-01-PLAN.md -- Simplify marketing navbar: remove auth logic, add responsive mobile behavior
- [x] 19-02-PLAN.md -- Consolidate button variants (11 to 6) and sizes (9 to 4), convert hero inline CTAs
- [x] 19-03-PLAN.md -- Consolidate card variants (18 to 6), change rounded-sm to rounded-md, migrate consumers
**Success Criteria** (what must be TRUE):
  1. Marketing navbar is redesigned with correct navigation links, responsive behavior, and proper auth state handling (logged in vs logged out)
  2. All buttons and CTAs use consistent variants, border-radius, and spacing across every page group
  3. All cards and layout containers use consistent spacing, typography, and shadow styles across every page group
  4. All pages render correctly at mobile (375px), tablet (768px), and desktop (1440px) viewports with no overflow, clipping, or layout breakage

### Phase 20: Browser Audit
**Goal**: Every user-facing page is verified working through systematic browser automation, confirming interactions and visual consistency at all viewport sizes
**Depends on**: Phase 19
**Requirements**: VER-01, VER-02
**Plans:** 6 plans
Plans:
- [ ] 20-01-PLAN.md -- Audit 19 marketing pages at 3 viewports (public, no auth)
- [ ] 20-02-PLAN.md -- Audit 3 blog routes at 3 viewports (public, data-driven)
- [ ] 20-03-PLAN.md -- Audit 7 auth pages at 3 viewports (mixed access)
- [ ] 20-04-PLAN.md -- Audit 18 tenant portal pages at 3 viewports (tenant auth)
- [ ] 20-05-PLAN.md -- Audit 27 owner dashboard core pages at 3 viewports (owner auth)
- [ ] 20-06-PLAN.md -- Audit 32 owner dashboard secondary pages at 3 viewports (owner auth)
**Success Criteria** (what must be TRUE):
  1. Every page in all 5 page groups (marketing, blog, auth, tenant portal, owner dashboard) loads without errors and all interactive elements respond correctly
  2. All pages pass visual consistency checks at 375px, 768px, and 1440px viewports with no responsive layout regressions
  3. Any issues found during the audit are logged, fixed, and re-verified before the milestone ships

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 16. Shared Cleanup & Dead Code | 3/3 | Complete | 2026-03-08 |
| 17. Hooks Consolidation | 6/6 | Complete | 2026-03-08 |
| 18. Components Consolidation | 6/6 | Complete    | 2026-03-09 |
| 19. UI Polish | 3/3 | Complete | 2026-03-09 |
| 20. Browser Audit | 0/6 | Not started | - |
