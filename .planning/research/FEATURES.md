# Feature Landscape

**Domain:** Code Consolidation & UI Polish for Production SaaS (Next.js 16 / React 19 / TailwindCSS 4)
**Researched:** 2026-03-07
**Overall Confidence:** HIGH

## Codebase Baseline

Before defining features, the current state sets the scope:

| Category | Count | Notes |
|----------|-------|-------|
| API hooks | 53 files | `src/hooks/api/` -- query + mutation hooks |
| Query key factories | 15 files | `src/hooks/api/query-keys/` -- all use `queryOptions()` |
| UI hooks | 19 files | `src/hooks/` -- data-table, form-progress, upload, etc. |
| Component directories | 69 | Across shadcn/ui, domain, shared, layout, landing |
| Component files (non-test) | ~350 `.tsx` | 83 in `ui/`, remainder domain-specific |
| Test files | 102 | Unit + component tests |
| Shared type files | 25 | `src/shared/types/` with TYPES.md lookup |
| Page groups | 6 | Marketing, Blog, Auth, Owner Dashboard, Tenant Portal, Billing |
| Pages (total) | 120+ | `page.tsx` + `layout.tsx` across all route groups |
| Design tokens | CSS variables + TS constants | `globals.css` + `design-system.ts` (dual source of truth) |
| Over-limit files | 12+ components, 2 hooks | Exceed 300-line component / hook project rule |

## Table Stakes

Features the development team expects from a consolidation milestone. Missing any of these means the milestone failed to deliver its core value.

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| Dead code detection and removal | Codebases at 450+ files accumulate unused exports, orphaned files, and stale dependencies. Every unused artifact increases build time, confuses contributors, and inflates bundle. This is the single highest-ROI activity. | Low | Knip (new dev dep). No codebase deps. |
| Hook deduplication audit | 53 API hooks is high for a single-product app. Likely overlaps exist (e.g., `use-emergency-contact` vs `use-profile-emergency-mutations`, multiple `use-tenant-*` hooks that share resolution logic via `resolveTenantId()`). Audit identifies merge candidates and eliminates thin wrappers. | Medium | Existing `queryOptions()` factories. Must preserve cache key contracts. |
| Oversized file remediation | 12+ non-test component files exceed 300 lines (project rule). Key offenders: `contact-form.tsx` (452), `selection-step.tsx` (434), `inspection-detail.client.tsx` (417), `maintenance-view.client.tsx` (394). Hooks: `use-data-table.ts` (316), `use-tenant-mutations.ts` (314). | Medium | Component splitting requires understanding render boundaries. Must not break test imports. |
| Design token consolidation | Two sources of truth exist and they conflict: CSS variables in `globals.css` define a fluid 5-level hierarchy (Display/Title/Body/Small/Caption with `clamp()` values), while `design-system.ts` defines a Roboto-based scale (display-2xl/heading-xl/body-lg with fixed pixel values). Components likely use neither consistently, defaulting to raw Tailwind utilities (`text-lg`, `text-2xl`). | Medium | `globals.css` is the runtime authority. `design-system.ts` feeds OG images and email templates. Must reconcile into one canonical system. |
| Shared type cleanup | 25 type files with TYPES.md as the lookup document. Types accumulated across 10 phases. Must verify no duplicates crept in, no unused exports exist, and the `sections/` subdirectory is properly organized. | Low | `TYPES.md` must stay in sync. Zero tolerance rule: no duplicate types. |
| Consistent loading/error states | Shared components exist (`ErrorPage`, `NotFoundPage`, `Empty`, `ChartLoadingSkeleton`, `BlogLoadingSkeleton`) but domain components may implement ad-hoc loading or error patterns instead of using them. Inconsistency here feels unpolished. | Medium | Must audit all Suspense boundaries, `loading.tsx` files, and inline skeleton usage across 6 page groups. |
| Status badge normalization | Status badges appear across properties (active/inactive), leases (active/expired/pending), maintenance (open/in-progress/resolved), payments (pending/processing/succeeded/failed/canceled), and tenants (active/invited). Each domain likely implements its own color mapping. | Low | `status-types.ts` in constants. Existing `Badge` component in `ui/`. |
| Cross-page UI consistency audit | 6 page groups built across 10 phases. Spacing, card styles, heading hierarchy, empty states, loading states, and CTA treatment likely vary between marketing, auth, blog, owner dashboard, tenant portal, and billing. Systematic audit catches drift. | High | Browser automation for visual verification. Requires checking all 6 page groups against design tokens. |
| Unused dependency removal | `package.json` accumulates deps over 10 phases. Dead deps increase install time, enlarge `node_modules`, and expand attack surface. | Low | Knip output drives this. Must verify no dynamic imports or config-only usage before removing. |
| Query key factory completeness check | 15 factory files exist, all using `queryOptions()`. Must verify no `useQuery`/`useMutation` call uses a raw string literal array (`queryKey: ['something']`) instead of a factory. | Low | Grep for string literal query keys across all hooks. |

## Differentiators

Features that elevate the milestone beyond basic cleanup. Not strictly required, but deliver outsized value.

| Feature | Value Proposition | Complexity | Dependencies |
|---------|-------------------|------------|--------------|
| Knip CI integration | Adding `npx knip` as a CI check prevents future dead code accumulation permanently. One-time 15-minute setup, ongoing value on every PR. Catches unused exports before they merge. | Low | Knip configured. GitHub Actions workflow. |
| Typography usage normalization | `globals.css` defines CSS custom properties (`--text-display-hero`, `--text-title-1`, etc.) with fluid `clamp()` scaling. Most components likely ignore these, using raw Tailwind sizes (`text-lg`, `text-2xl`). A single pass converting raw sizes to the custom property system gives true cross-breakpoint consistency. | High | Must audit every component for typography usage. Low-risk per-change but very high surface area (~350 files). |
| Button/CTA consistency pass | Marketing pages, dashboard, tenant portal, and auth pages each have CTAs. Size, padding, border-radius, and color treatment likely vary. Normalizing to the shadcn `Button` variants with consistent sizing creates professional polish visible to every user. | Medium | `button.tsx` shadcn component. `design-system.ts` presets define sizes (xs through xl). |
| Mutation invalidation audit | All mutations must invalidate related query keys including `ownerDashboardKeys.all` to keep the dashboard stats current. Missing invalidation causes stale counters -- one of the more insidious UI bugs. Systematic verification catches gaps. | Medium | All mutation hooks in `src/hooks/api/`. Query key factories. Must review `onSuccess` callbacks. |
| Shared mapper function audit | Project rule: typed mapper functions at RPC boundaries, not `as unknown as`. 24 documented acceptable assertions exist. Audit verifies no new assertions crept in during v1.1 blog work and existing mappers follow consistent patterns. | Low | Grep for `as unknown as` across `src/`. Compare count to documented 24. |
| Accessibility regression check | v1.0 delivered full accessibility (skip-to-content, aria-labels, error boundaries, mobile keyboard). v1.1 blog additions may have missed patterns. Quick audit against established rules prevents a11y regressions on public-facing pages. | Medium | Existing a11y rules in CLAUDE.md. Can use `axe-core` in browser automation or manual checks. |
| `design-system.ts` scope reduction | This 350-line file defines typography, spacing, colors, component sizes, animations, breakpoints, z-index, and component presets -- much of which duplicates what TailwindCSS 4 and `globals.css` already provide. Reducing it to only the values that cannot be expressed in CSS (OG image hex colors, email template values) eliminates the dual-source-of-truth problem. | Medium | Must verify what actually imports from this file. If only OG images and email templates use it, most exports are dead code. |
| Mobile responsiveness spot check | 120+ pages across 6 groups. Marketing pages are likely responsive (public-facing). Dashboard data tables, multi-step forms, and chart pages may have mobile issues. Tenant portal is mobile-critical (tenants pay rent on phones). A targeted spot check on high-value flows catches the worst issues. | Medium | Browser automation at mobile viewport on 10-15 representative pages, not all 120+. |

## Anti-Features

Features to explicitly NOT build during this milestone. Including any of these dilutes focus and introduces scope creep.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Component library extraction | Extracting shadcn/ui + custom components into a separate package adds build complexity, versioning overhead, and monorepo tooling for a single-product app. Zero benefit at this scale. | Keep components in `src/components/ui/`. Improve consistency in-place. |
| Storybook / visual regression testing | High setup cost (Storybook config, Chromatic or Percy integration, CI pipeline changes). This milestone is about consolidation, not adding new tooling infrastructure. | Use browser automation for one-time visual audit. Consider Storybook in a future milestone if the design system scope grows. |
| MSW component test layer | Explicitly listed as out of scope in PROJECT.md. Component-level mocking is a separate concern from code consolidation. | Defer to future milestone. Current 1,415 unit tests + 17 E2E journeys cover critical paths. |
| Test data factories (@faker-js/faker) | Explicitly listed as out of scope in PROJECT.md. Adds dependency and patterns orthogonal to consolidation goals. | Defer to future milestone. |
| Dark mode implementation | Design tokens reference a `dark` variant in CSS but dark mode is not currently active. Adding dark mode requires reviewing every color usage across 350+ components -- that is a full milestone, not a consolidation task. | Document dark mode readiness findings during audit. Defer implementation to a dedicated milestone. |
| Redesigning existing page layouts | Consolidation means making existing designs consistent, not inventing new ones. The temptation to "improve while auditing" is the primary scope-creep vector for polish milestones. | Note layout improvement opportunities in audit findings. Address in separate work. |
| Creating wrapper components around shadcn/ui | Abstractions like `AppButton` wrapping `Button` add indirection without value. shadcn components are already owned copy-pasted code, not installed dependencies. | Modify shadcn components directly when variant adjustments are needed. |
| Migrating state management | Zustand + TanStack Query + TanStack Form is the established stack from v1.0. Consolidation means using them correctly, not replacing them. | Audit for misuse (e.g., Zustand storing server state that belongs in TanStack Query). Fix misuse, do not migrate. |
| Automated visual regression CI | Percy/Chromatic/Playwright visual comparisons carry ongoing hosting cost and maintenance burden. Not justified for a one-time polish pass. | Manual browser automation audit produces a findings list. Fix issues directly. |
| Feature-based directory restructuring | Reorganizing from technical grouping (`hooks/`, `components/`) to feature-based (`features/properties/`, `features/leases/`) is a massive git history disruption with zero user-facing value. The current structure works. | Keep current structure. Fix inconsistencies within it. |
| Rewriting working components for "cleanliness" | Components that function correctly, pass tests, and meet accessibility requirements should not be rewritten just because they are not "modern enough" or do not use the latest pattern. | Only touch components that violate project rules (300-line limit, duplicate types, inline styles) or have demonstrable bugs. |

## Feature Dependencies

```
Dead code detection (Knip setup + run)
  |
  +---> Unused dependency removal (Knip output feeds this)
  |
  +---> Hook deduplication audit (dead hooks removed first, cleaner picture)
  |       |
  |       +---> Oversized file remediation (deduplicated hooks may resolve some overages)
  |
  +---> Shared type cleanup (dead types removed first)
  |
  +---> design-system.ts scope reduction (dead exports identified by Knip)

Design token consolidation (reconcile globals.css + design-system.ts)
  |
  +---> Typography usage normalization (tokens must be canonical first)
  |
  +---> Button/CTA consistency pass (uses finalized token values)
  |
  +---> Cross-page UI consistency audit (measure against settled tokens)
          |
          +---> Loading/error state consistency (issues discovered during audit)
          |
          +---> Status badge normalization (issues discovered during audit)
          |
          +---> Mobile responsiveness spot check (runs in parallel with desktop audit)

Query key factory completeness check ---> independent, can run anytime
Mutation invalidation audit -----------> independent, can run anytime
Mapper function audit -----------------> independent, can run anytime
Accessibility regression check ---------> independent, best run last as a quality gate
Knip CI integration -------------------> depends on Knip setup being complete
```

## MVP Recommendation

The minimum viable consolidation milestone, ordered by dependency chain and ROI:

**Phase 1: Automated Cleanup (highest ROI, lowest risk)**
1. Dead code detection and removal via Knip
2. Unused dependency removal
3. Shared type cleanup (verify TYPES.md, remove unused exports)
4. `design-system.ts` scope reduction

**Phase 2: Code Consolidation (medium ROI, medium risk)**
5. Hook deduplication audit and execution
6. Oversized file remediation (components + hooks exceeding 300-line limit)
7. Query key factory completeness check
8. Mutation invalidation audit

**Phase 3: Design Consistency (high visibility, medium effort)**
9. Design token consolidation (reconcile the two systems)
10. Status badge normalization
11. Button/CTA consistency pass

**Phase 4: Cross-Page Audit (high effort, high polish impact)**
12. Cross-page-group UI consistency audit (systematic browser-driven review)
13. Loading/error state consistency (apply shared components everywhere)
14. Accessibility regression check

**Phase 5: Lock In Gains (prevent regression)**
15. Knip CI integration

**Defer to future milestones:**
- Full typography normalization (high surface area, 350+ files -- better done incrementally)
- Full mobile responsiveness audit (high effort, merits its own focused milestone)
- Dark mode implementation (requires reviewing every color usage)
- Storybook / visual regression CI

## Sources

- [Knip - Dead code detection for JS/TS](https://knip.dev/)
- [ts-prune deprecated in favor of Knip](https://github.com/nadeesha/ts-prune)
- [How I Cleaned Up Our Codebase With Knip](https://dev.to/rkhaslarov/how-i-cleaned-up-our-codebase-with-knip-and-why-you-should-too-41mg)
- [Effective TypeScript - Knip recommendation](https://effectivetypescript.com/2023/07/29/knip/)
- [TanStack Query v5 queryOptions pattern](https://tanstack.com/query/v5/docs/react/guides/query-options)
- [shadcn/ui - Foundation for design systems](https://ui.shadcn.com/)
- [Vercel Academy - Compound Components and Advanced Composition](https://vercel.com/academy/shadcn-ui/compound-components-and-advanced-composition)
- [SaaS Design System Guide - F1Studioz](https://f1studioz.com/blog/saas-design-system-guide/)
- [UI Audit Guide - DevSquad](https://devsquad.com/blog/ui-audit)
- [Design System Audit - DOOR3](https://www.door3.com/blog/design-system-audit)
- [React.dev - Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [SaaS Design Trends 2026 - JetBase](https://jetbase.io/blog/saas-design-trends-best-practices)
- [Vercel - React Best Practices](https://vercel.com/blog/introducing-react-best-practices)
- [SaaS UX Audit Guide - Scenic West](https://www.scenicwest.co/free-ux-audit-guide-and-checklist-b2b-saas)
- [How to Conduct a UI Audit - DevSquad](https://devsquad.com/blog/ui-audit)
