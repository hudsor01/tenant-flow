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

- [ ] **Phase 16: Shared Cleanup & Dead Code** - Flatten src/shared/ into top-level directories, delete design-system.ts, run Knip audit, delete TYPES.md, update CLAUDE.md
- [ ] **Phase 17: Hooks Consolidation** - Deduplicate and modernize API hooks, expand useSuspenseQuery, split oversized hook files
- [ ] **Phase 18: Components Consolidation** - Split oversized components, enable React Compiler, remove manual memoization
- [ ] **Phase 19: UI Polish** - Redesign marketing navbar, enforce button/card/layout consistency across all page groups
- [ ] **Phase 20: Browser Audit** - Systematic browser automation verification of all pages at desktop and mobile viewports

## Phase Details

### Phase 16: Shared Cleanup & Dead Code
**Goal**: The codebase has zero dead exports, zero unused dependencies, and a single source of truth for shared types and design tokens
**Depends on**: Nothing (first phase of v1.2)
**Requirements**: CLEAN-01, CLEAN-03, CLEAN-04, CLEAN-05, MOD-03
**Plans:** 3 plans
Plans:
- [ ] 16-01-PLAN.md -- Migrate design-system.ts consumers to Tailwind/CSS and delete design-system.ts
- [ ] 16-02-PLAN.md -- Flatten src/shared/ into top-level directories, rewrite all imports
- [ ] 16-03-PLAN.md -- Knip dead code audit, delete TYPES.md, update CLAUDE.md
**Success Criteria** (what must be TRUE):
  1. Knip runs clean with zero findings on the entire codebase (src/ and supabase/)
  2. TYPES.md is deleted; src/types/ directory is self-documenting
  3. src/shared/ directory does not exist; all contents merged into src/types/, src/lib/, src/config/
  4. globals.css is the sole source of truth for design tokens; design-system.ts is deleted entirely

### Phase 17: Hooks Consolidation
**Goal**: API hooks are deduplicated, modernized for TanStack Query v5 patterns, and all oversized hook files are split under the 300-line limit
**Depends on**: Phase 16
**Requirements**: MOD-02
**Success Criteria** (what must be TRUE):
  1. All components inside Suspense boundaries use useSuspenseQuery with typed data (never undefined) instead of useQuery
  2. No duplicate or overlapping hook functionality exists across the 85 hook files
  3. All hook files are under 300 lines (the 2+ oversized hooks identified in CLEAN-02 are split as part of this consolidation)
  4. ownerDashboardKeys cross-domain invalidation graph (8 files, 22 call sites) is intact and correct after any restructuring
**Plans**: TBD

### Phase 18: Components Consolidation
**Goal**: All oversized components are split under 300 lines, dead components are removed, and React Compiler auto-memoizes in place of manual useMemo/useCallback
**Depends on**: Phase 17
**Requirements**: CLEAN-02, MOD-01
**Success Criteria** (what must be TRUE):
  1. Zero component files exceed the 300-line limit (20+ files split, excluding vendored tour.tsx)
  2. React Compiler is enabled via babel-plugin-react-compiler and all existing unit/component tests pass
  3. Manual useMemo and useCallback calls are removed from components where React Compiler handles memoization (progressive removal, verified per-component)
  4. pnpm typecheck and pnpm lint pass clean after all file splits and moves
**Plans**: TBD

### Phase 19: UI Polish
**Goal**: The public-facing UI has a consistent, polished look across marketing, auth, blog, dashboard, tenant portal, and billing pages
**Depends on**: Phase 18
**Requirements**: UI-01, UI-02, UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. Marketing navbar is redesigned with correct navigation links, responsive behavior, and proper auth state handling (logged in vs logged out)
  2. All buttons and CTAs use consistent variants, border-radius, and spacing across every page group
  3. All cards and layout containers use consistent spacing, typography, and shadow styles across every page group
  4. All pages render correctly at mobile (375px), tablet (768px), and desktop (1440px) viewports with no overflow, clipping, or layout breakage
**Plans**: TBD

### Phase 20: Browser Audit
**Goal**: Every user-facing page is verified working through systematic browser automation, confirming interactions and visual consistency at all viewport sizes
**Depends on**: Phase 19
**Requirements**: VER-01, VER-02
**Success Criteria** (what must be TRUE):
  1. Every page in all 5 page groups (marketing, blog, auth, tenant portal, owner dashboard) loads without errors and all interactive elements respond correctly
  2. All pages pass visual consistency checks at 375px, 768px, and 1440px viewports with no responsive layout regressions
  3. Any issues found during the audit are logged, fixed, and re-verified before the milestone ships
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 16. Shared Cleanup & Dead Code | 0/3 | Not started | - |
| 17. Hooks Consolidation | 0/TBD | Not started | - |
| 18. Components Consolidation | 0/TBD | Not started | - |
| 19. UI Polish | 0/TBD | Not started | - |
| 20. Browser Audit | 0/TBD | Not started | - |
