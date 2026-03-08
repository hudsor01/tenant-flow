# Project Research Summary

**Project:** TenantFlow v1.2 Production Polish & Code Consolidation
**Domain:** Code consolidation, hook/component audit, and design system enforcement for production SaaS
**Researched:** 2026-03-08
**Confidence:** HIGH

## Executive Summary

TenantFlow v1.2 is a pure consolidation milestone. No new features, no new runtime dependencies, no architecture changes. The codebase has grown to 450+ component files, 85 API hooks, and 25 shared type files across 10 development phases and two milestones (v1.0, v1.1). The result is the expected accumulation of dead code, oversized files (20+ exceeding the 300-line project rule), inconsistent design system usage, and organizational debt in the hooks layer. Research confirms the recommended approach: bottom-up cleanup (shared types first, hooks second, components third), followed by design system enforcement, capped by a full-app visual audit.

The stack requires one new dev dependency (`babel-plugin-react-compiler`) and zero runtime changes. The primary code-level improvements are adopting `mutationOptions()` factories to match the established `queryOptions()` pattern (54 mutation hooks), enabling the React Compiler to eliminate 353 manual `useMemo`/`useCallback` calls, and running a dead code sweep with Knip. The design system already exists in `globals.css` (1,702 lines of CSS custom properties and semantic utilities) but is inconsistently applied -- components use raw Tailwind utilities where semantic utilities are defined. A parallel `design-system.ts` (548 lines) duplicates tokens for OG images and emails. The reconciliation is straightforward: `globals.css` is the source of truth, `design-system.ts` is reduced to non-CSS contexts only.

The primary risks are in the hooks layer, not the UI. Moving `ownerDashboardKeys` (imported by 8 hook files with 22 cache invalidation call sites) or merging the tenant portal key file (which exists specifically to prevent circular dependencies among 6 files) can break runtime behavior without any test failure -- cache invalidation is not covered by unit tests. Every hook rename also risks breaking 27 test files that use hardcoded `vi.mock()` path strings. The mitigation is consistent: grep before renaming, update all consumers in the same commit, verify with `pnpm test:unit` before staging.

## Key Findings

### Recommended Stack

No framework or library changes. The codebase is already on Next.js 16.1.6, React 19.2.4, TailwindCSS 4.2.1, and TanStack Query 5.90.21 -- all current. The work is about using existing APIs that the codebase has not yet adopted.

**Core changes:**

- `babel-plugin-react-compiler` (new dev dep): Enables React Compiler in Next.js 16, auto-memoizes components, allows progressive removal of 353 manual `useMemo`/`useCallback` calls across 90 files
- `mutationOptions()` (already available in TQ 5.90.21): Factory pattern for mutations to mirror the `queryOptions()` pattern already used for all 15 query-key files -- applies to 54 mutation hooks
- `useSuspenseQuery` expansion (already available): Currently used in 5 dashboard calls only, can expand to any component inside a Suspense boundary for typed `data: T` (never undefined)
- Knip (new dev dep): Dead code detection for unused exports, orphaned files, and stale dependencies -- drives the cleanup phase

**Explicitly not adopted:** RSC prefetching (architecture change too large), Storybook (setup cost unjustified for one-time audit), `use cache` directive (experimental, not relevant), TanStack Router (already on Next.js App Router), Zod schema sharing between client and Deno Edge Functions (runtime mismatch not worth bridging).

### Expected Features

**Must have (table stakes):**

- Dead code detection and removal (highest ROI single activity)
- Hook deduplication audit (53 API hooks, likely overlaps)
- Oversized file remediation (20+ files exceeding 300-line rule)
- Design token consolidation (two conflicting sources of truth)
- Shared type cleanup (verify TYPES.md, remove unused exports)
- Consistent loading/error states across all 6 page groups
- Status badge normalization across 5 status domains
- Cross-page UI consistency audit (6 page groups built across 10 phases)
- Unused dependency removal
- Query key factory completeness check

**Should have (differentiators):**

- Knip CI integration (prevents future dead code accumulation permanently)
- Mutation invalidation audit (stale dashboard counters from missing invalidation)
- `design-system.ts` scope reduction (eliminate dual source of truth)
- Accessibility regression check on v1.1 blog additions
- Button/CTA consistency pass across marketing, dashboard, and auth pages

**Defer (future milestones):**

- Full typography normalization (350+ file surface area -- better done incrementally)
- Full mobile responsiveness audit (merits its own focused milestone)
- Dark mode implementation (requires reviewing every color usage)
- Storybook / visual regression CI
- MSW component test layer
- Test data factories

### Architecture Approach

The architecture does not change. This is a refactoring milestone operating within the existing component boundary model. The dependency direction is clear: shared types at the bottom, hooks in the middle, components at the top. Cleanup must proceed bottom-up to avoid double-rework.

**Major layers being consolidated:**

1. `src/shared/` (50 files) -- types, validation, constants, utils. Foundation layer, cleaned first. TYPES.md must be updated.
2. `src/hooks/api/` (85 files) -- 15 query-key factories (all `queryOptions()`), 1 mutation-keys file (key-only, upgrade to `mutationOptions()`), 40+ domain hooks. Cleaned second.
3. `src/components/` (450 files across 69 dirs) -- 85 shadcn/ui primitives, 6 shared components, 60+ domain component directories. Cleaned third.
4. Design system (`globals.css` + `design-system.ts`) -- enforced after structural cleanup is complete.

**Key patterns to preserve (not refactor):**

- `queryOptions()` factory pattern in all 15 key files
- Tenant portal key separation (`use-tenant-portal-keys.ts` exists to prevent circular deps among 6 files)
- `ownerDashboardKeys` cross-domain invalidation graph (8 hook files, 22 call sites)
- Domain-based component directory structure
- `.client.tsx` suffix convention for client components (26 files)
- Vendored `tour.tsx` (1,732 lines, exempt from 300-line rule)

### Critical Pitfalls

1. **Hook renames break vi.mock() paths in 27 test files** -- mock path strings are untyped; a single rename can cascade-fail 5-10 test files with cryptic "Cannot read properties of undefined" errors. Prevention: grep for all mock paths before renaming, update in the same commit, run full test suite before staging.

2. **Moving ownerDashboardKeys breaks cache invalidation silently** -- 8 hook files import this for cross-domain invalidation. No test covers this behavior. A stale dashboard after mutations is invisible to automated tests. Prevention: if moving to a query-keys file, keep a re-export in the original file for backward compatibility. Manual test: create entity, verify dashboard updates.

3. **Tenant portal key merge reintroduces circular dependency** -- 6 files form a deliberate acyclic dependency tree. Merging `use-tenant-portal-keys.ts` back into `use-tenant-dashboard.ts` causes "cannot access before initialization" build crashes. Prevention: mark as "intentionally separate -- do not merge" in audit.

4. **CVA variant changes cascade through 19 components and 50 test files** -- button.tsx alone has 7 custom variants and 5 custom sizes. Removing or renaming variants triggers test failures and visual regressions. Prevention: inventory all variant consumers before modifying, never remove a variant with non-zero usages.

5. **Shared type removal breaks Edge Functions** -- `pnpm typecheck` only covers the Next.js project, not the Deno Edge Functions. A type that appears "unused" in `src/` may be imported by `supabase/functions/`. Prevention: grep both `src/` and `supabase/` before removing any type export.

## Implications for Roadmap

Based on research, the milestone should have 5 phases following the dependency chain identified in ARCHITECTURE.md. The ordering is driven by the bottom-up dependency direction (shared -> hooks -> components -> design system -> visual audit) and the risk analysis from PITFALLS.md.

### Phase 1: Automated Cleanup & Shared Foundation

**Rationale:** Everything depends on `src/shared/`. Dead code removal via Knip must happen first because it provides a clean baseline for all subsequent audits. Shared type cleanup must precede hook cleanup because hooks import from shared types -- you need to know which types are alive before judging which hooks are dead.
**Delivers:** Clean shared directory, dead code removed, unused dependencies eliminated, TYPES.md updated, `design-system.ts` scoped to non-CSS contexts only.
**Addresses:** Dead code detection, unused dependency removal, shared type cleanup, `design-system.ts` scope reduction, query key completeness check.
**Avoids:** Pitfall 9 (shared type removal breaking Edge Functions -- grep both `src/` and `supabase/`), Pitfall 12 (removing future-extensible queryOptions exports -- conservative removal policy).

### Phase 2: Hook Consolidation

**Rationale:** Hooks sit between shared types and components in the dependency tree. They must be cleaned after shared is stable but before components, because component refactoring may require hook API changes. This is the highest-risk phase due to the ownerDashboardKeys and tenantPortalKeys pitfalls.
**Delivers:** Deduplicated hooks, oversized hooks split (`use-tenant-mutations.ts` at 314 lines), dead hooks removed, `mutationOptions()` factories created alongside existing `queryOptions()` factories, mutation invalidation audit complete.
**Addresses:** Hook deduplication, oversized file remediation (hooks), mutation invalidation audit, `mutationOptions()` adoption.
**Avoids:** Pitfall 1 (vi.mock paths -- grep before rename), Pitfall 2 (ownerDashboardKeys -- extract with re-export), Pitfall 3 (tenantPortalKeys -- do not merge), Pitfall 6 (key structure changes -- keep key arrays identical), Pitfall 7 (backward-compat re-exports -- verify consumers before removing).

### Phase 3: Component Consolidation & React Compiler

**Rationale:** Components are at the top of the dependency tree. Clean them after hooks are stable. React Compiler enablement belongs here because it directly reduces component boilerplate (353 `useMemo`/`useCallback` calls). Splitting oversized components is the main structural work.
**Delivers:** 20+ oversized components split to under 300 lines, dead components removed, React Compiler enabled, manual memoization progressively removed, shared component patterns extracted (status badges, loading states).
**Addresses:** Oversized file remediation (components), consistent loading/error states, status badge normalization, React Compiler adoption.
**Avoids:** Pitfall 4 (CVA variant changes -- inventory consumers first), Pitfall 10 (import path changes -- batch renames, IDE refactoring), Pitfall 13 (tour.tsx -- mark as VENDORED, do not split).

### Phase 4: Design System Enforcement

**Rationale:** CSS class changes are cosmetic and must happen after structural work. Modifying classes on files that are about to be split or deleted is wasted effort. This phase converts raw Tailwind utilities to semantic design system utilities across all 6 page groups.
**Delivers:** Consistent typography, spacing, card styles, and button variants across marketing, auth, blog, owner dashboard, tenant portal, and billing pages. `globals.css` tokens enforced as the single source of truth.
**Addresses:** Design token consolidation, button/CTA consistency, cross-page UI consistency.
**Avoids:** Pitfall 5 (globals.css cascading changes -- test at 375px/768px/1440px), Pitfall 8 (mobile responsive breakage -- check every change at mobile viewport), Pitfall 11 (design-system.ts divergence -- verify hex values match after any color change).

### Phase 5: Full-App Visual Audit & Regression Lock-In

**Rationale:** The visual audit is the quality gate. It must run after all structural and CSS changes are in place. Knip CI integration locks in the dead code prevention permanently. Accessibility regression check validates that v1.1 blog additions follow established patterns.
**Delivers:** Visual verification of all user-facing pages, Knip integrated into CI to prevent future dead code accumulation, accessibility regressions caught and fixed.
**Addresses:** Cross-page UI consistency audit, Knip CI integration, accessibility regression check, mobile responsiveness spot check.
**Avoids:** Pitfall 8 (mobile layout breakage -- systematic viewport testing catches issues the prior phase may have introduced).

### Phase Ordering Rationale

- **Bottom-up dependency direction** is mandatory: shared -> hooks -> components. Cleaning in the wrong order means double-rework when upstream changes cascade down.
- **Structural before cosmetic**: splitting files and removing dead code before applying CSS changes avoids wasted effort on files that will be deleted or restructured.
- **Highest-risk phase (hooks) runs second**, not first, because it benefits from a clean shared layer as input. But it runs before components because components depend on hook APIs.
- **Visual audit is last** because it validates the cumulative result of all prior phases.
- **Knip CI integration is last** because it depends on Knip being fully configured and tested during Phase 1.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 2 (Hook Consolidation):** The ownerDashboardKeys dependency graph (8 files, 22 invalidation calls) and tenantPortalKeys circular dependency prevention need careful mapping before any plan is written. The `mutationOptions()` adoption pattern needs per-domain decisions about what goes in the factory vs what stays in the hook. Recommend `/gsd:research-phase`.
- **Phase 4 (Design System Enforcement):** The reconciliation between `globals.css` (oklch colors, clamp typography) and `design-system.ts` (hex colors, fixed pixel sizes) needs a concrete mapping. Research should audit which components actually import from `design-system.ts` to determine the reduction scope. Recommend `/gsd:research-phase`.

Phases with standard patterns (skip research):

- **Phase 1 (Automated Cleanup):** Knip setup is well-documented, shared type audit is a grep exercise. Standard patterns.
- **Phase 3 (Component Consolidation):** Component splitting follows established patterns from v1.0. React Compiler enablement is a single config change with documented Next.js 16 support.
- **Phase 5 (Visual Audit):** Browser-driven verification, no technical unknowns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new runtime deps. React Compiler stable in Next.js 16. TQ v5 APIs verified in installed version (5.90.21). |
| Features | HIGH | Feature list derived from direct codebase metrics (file counts, line counts, rule violations). No speculative features. |
| Architecture | HIGH | All integration points verified against live codebase. Dependency direction confirmed by actual import graph analysis. |
| Pitfalls | HIGH | 27 test mock files counted. 22 invalidation sites mapped. Dual design system verified. All sourced from codebase analysis. |

**Overall confidence:** HIGH

### Gaps to Address

- **Knip configuration scope:** STACK.md deferred Knip but FEATURES.md correctly identifies it as the primary dead code detection tool. The configuration (entry points, plugins, dynamic import handling) needs to be resolved during Phase 1 planning.
- **`design-system.ts` actual consumers:** Research identifies the file as 548 lines with overlap against `globals.css`, but the exact list of importers needs verification during Phase 4 planning. If only OG images and emails import it, most exports are dead code.
- **`useSuspenseQuery` expansion candidates:** STACK.md rates this MEDIUM confidence because each component needs individual evaluation of Suspense compatibility (no `enabled` option, no `placeholderData`). This is a per-component decision during Phase 2.
- **React Compiler edge cases:** The 353 `useMemo`/`useCallback` calls include some that pass stable references to third-party libraries. Each removal needs case-by-case verification during Phase 3 execution.

## Sources

### Primary (HIGH confidence)

- [TanStack Query mutationOptions reference](https://tanstack.com/query/v5/docs/framework/react/reference/mutationOptions)
- [TanStack Query useSuspenseQuery reference](https://tanstack.com/query/v5/docs/react/reference/useSuspenseQuery)
- [TanStack Query ESLint Plugin](https://tanstack.com/query/v5/docs/eslint/eslint-plugin-query)
- [TanStack Query Advanced SSR / Prefetching](https://tanstack.com/query/v5/docs/react/guides/advanced-ssr)
- [Next.js 16 reactCompiler config](https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler)
- [React Compiler installation](https://react.dev/learn/react-compiler/installation)
- [Knip - Dead code detection for JS/TS](https://knip.dev/)

### Secondary (MEDIUM confidence)

- [Effective TypeScript - Knip recommendation](https://effectivetypescript.com/2023/07/29/knip/)
- [SaaS Design System Guide - F1Studioz](https://f1studioz.com/blog/saas-design-system-guide/)
- [UI Audit Guide - DevSquad](https://devsquad.com/blog/ui-audit)
- [Vercel - React Best Practices](https://vercel.com/blog/introducing-react-best-practices)
- [shadcn/ui Documentation](https://ui.shadcn.com/)

### Codebase Analysis (HIGH confidence)

- `src/hooks/api/` -- 85 files, 15 query-key factories, 1 mutation-keys file, 40+ domain hooks
- `src/components/` -- 450 files across 69 directories, 20+ exceeding 300-line rule
- `src/shared/types/` -- 25 files, TYPES.md lookup table
- `globals.css` -- 1,702 lines (CSS custom properties, @utility definitions, oklch color system)
- `design-system.ts` -- 548 lines (parallel TypeScript token system)
- `vi.mock()` usage -- 27 test files with hardcoded hook module paths
- `ownerDashboardKeys` -- imported by 8 hook files, 22 invalidation call sites
- `tenantPortalKeys` -- consumed by 6 hook files in acyclic dependency tree
- CVA-customized components -- 19 out of 65 UI components

---
*Research completed: 2026-03-08*
*Ready for roadmap: yes*
