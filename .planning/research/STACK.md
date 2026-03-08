# Technology Stack: Production Polish & Code Consolidation

**Project:** TenantFlow v1.2 Milestone
**Researched:** 2026-03-08
**Overall confidence:** HIGH

---

## Executive Summary

This milestone requires **one new dev dependency** (`babel-plugin-react-compiler`) and **zero runtime dependency changes**. The work is about using existing TanStack Query v5 APIs that the codebase has not yet adopted, enabling the React Compiler to eliminate 353 manual memoization calls, and introducing a `mutationOptions()` factory pattern to mirror the existing `queryOptions()` pattern for mutations. No framework migrations, no library swaps.

The codebase already uses TanStack Query v5 (5.90.21) with the `queryOptions()` factory pattern correctly. However, it does not use `mutationOptions()` (introduced in v5.59), does not leverage RSC prefetching via `queryClient.prefetchQuery()` in Server Components with `HydrationBoundary` (instead relying on client-side `usePrefetchQuery` hooks), and has 90 files with `useMemo`/`useCallback` calls that the React Compiler would auto-optimize.

The design system is well-established (1,702 lines of CSS tokens in `globals.css`, custom ESLint color-token enforcement) but lacks a formal component audit tool for spacing/radius/typography consistency. The existing ESLint `color-tokens/no-hex-colors` rule and TanStack Query plugin provide enforcement. No new tools needed -- the consolidation work is refactoring, not tooling.

---

## Recommended Stack

### TanStack Query v5 APIs to Adopt (Already Installed)

| API | Installed Version | Purpose | Current Status |
|-----|-------------------|---------|----------------|
| `mutationOptions()` | 5.90.21 (available since ~5.59) | Type-safe mutation option factories to parallel `queryOptions()` | **Not used.** Mutations use inline options in `useMutation()`. Adopt for all 54 mutation hooks. |
| `useSuspenseQuery` | 5.90.21 | Typed `data: T` (never undefined) for Suspense boundaries | **Partially used.** Only in `use-dashboard-hooks.ts` (5 calls). Expand to any component inside Suspense. |
| `usePrefetchQuery` (client) | 5.90.21 | Declarative prefetch during render, before a Suspense boundary | **Used in 5 files.** Already adopted correctly. No change needed. |
| RSC `prefetchQuery` pattern | 5.90.21 | Server-side prefetch in RSC with `dehydrate` + `HydrationBoundary` | **Not used.** Currently prefetching is client-only. Evaluate per-route but do NOT adopt broadly this milestone -- client prefetch pattern works fine. |
| `useMutationState` | 5.90.21 | Global mutation tracking | **Used** in `use-pending-mutations.ts`. Already adopted correctly. |
| `@tanstack/eslint-plugin-query` | 5.91.4 | `exhaustive-deps`, `no-rest-destructuring`, `stable-query-client` | **Installed, recommended rules enabled.** No change needed. |

### React Compiler (New Dev Dependency)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `babel-plugin-react-compiler` | latest (^1.0.0) | Auto-memoize components at build time | Eliminates 353 `useMemo`/`useCallback` calls across 90 files. React Compiler 1.0 is stable. Next.js 16 has built-in support via `reactCompiler: true` in `next.config.ts`. |

### Core Framework (No Changes)

| Technology | Installed Version | Purpose | Status |
|------------|-------------------|---------|--------|
| Next.js | 16.1.6 | App framework | No change |
| React | 19.2.4 | UI library | No change |
| TailwindCSS | 4.2.1 | Styling + design system tokens | No change |
| TanStack Query | 5.90.21 | Server state | No change, adopt more v5 APIs |
| TanStack Form | 1.28.3 | Form state | No change |
| Zustand | 5.0.11 | UI state | No change |
| shadcn/ui | 3.8.5 (CLI) | Component library | No change |
| Vitest | 4.0.18 | Testing | No change |

---

## Key Pattern Changes (Code-Level, No New Dependencies)

### 1. mutationOptions() Factory (HIGH confidence)

**What:** TanStack Query v5 added `mutationOptions()` as the mutation equivalent of `queryOptions()`. It provides type-safe, reusable mutation configurations.

**Why:** The codebase already centralizes query definitions in `src/hooks/api/query-keys/` using `queryOptions()`. Mutations are the opposite -- each mutation hook defines its options inline in `useMutation()`. This creates inconsistency and makes mutation options non-shareable (e.g., for `queryClient.setMutationDefaults()`).

**Current pattern (inline):**
```typescript
// src/hooks/api/use-property-mutations.ts
export function useCreatePropertyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: mutationKeys.properties.create,
    mutationFn: async (data: PropertyCreate): Promise<Property> => { ... },
    onSuccess: () => { ... },
    onError: (error: unknown) => handleMutationError(error, 'Create property')
  })
}
```

**Proposed pattern (factory):**
```typescript
// src/hooks/api/query-keys/property-keys.ts (colocated with query factories)
import { mutationOptions } from '@tanstack/react-query'

export const propertyMutations = {
  create: () => mutationOptions({
    mutationKey: mutationKeys.properties.create,
    mutationFn: async (data: PropertyCreate): Promise<Property> => { ... },
  }),
  // ...
}

// src/hooks/api/use-property-mutations.ts (thin wrapper)
export function useCreatePropertyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    ...propertyMutations.create(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
      queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
      toast.success('Property created successfully')
    },
    onError: (error: unknown) => handleMutationError(error, 'Create property')
  })
}
```

**Scope:** The `mutation-keys.ts` file already defines 60+ mutation keys across 17 domains. The `mutationOptions()` factories would colocate `mutationKey` + `mutationFn` together, while leaving `onSuccess`/`onError`/cache invalidation in the hook (since those depend on `useQueryClient()`).

**Source:** [TanStack Query mutationOptions reference](https://tanstack.com/query/v5/docs/framework/react/reference/mutationOptions)

### 2. React Compiler Adoption (HIGH confidence)

**What:** Enable React Compiler in `next.config.ts` to auto-memoize components. React Compiler 1.0 is stable and Next.js 16 has promoted `reactCompiler` from experimental to stable configuration.

**Why:** 353 manual `useMemo`/`useCallback` calls across 90 files. The React Compiler makes these unnecessary at build time. This is a consolidation milestone -- removing boilerplate is core scope.

**How to enable:**
```bash
pnpm add -D babel-plugin-react-compiler
```

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    optimizePackageImports: ['@tanstack/react-query', '@tanstack/react-form', '@tanstack/react-virtual'],
  },
  // ...
}
```

**Impact:**
- 353 `useMemo`/`useCallback` calls can be progressively removed
- Build times may increase slightly (Babel step), but Next.js only applies the compiler to files that need it
- No behavioral changes -- compiler produces equivalent memoization

**Risk mitigation:** Enable first, verify all tests pass, then progressively remove manual memoization. Do NOT remove all 353 calls in one pass -- remove domain by domain and verify.

**What NOT to remove:**
- `useMemo` in `query-provider.tsx` for `hydrateContent` -- this is acceptable to keep since the provider is a one-time render
- `useCallback` that is passed as a prop to third-party libraries expecting stable references -- verify each case

**Source:** [Next.js 16 reactCompiler config](https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler), [React Compiler 1.0 announcement](https://react.dev/learn/react-compiler/installation)

### 3. useSuspenseQuery Expansion (MEDIUM confidence)

**What:** Expand `useSuspenseQuery` usage from dashboard-only to any component rendered inside a Suspense boundary.

**Why:** `useSuspenseQuery` returns `data: T` (never `undefined`), eliminating null checks. Currently used in 5 places (all dashboard). List/detail pages that already have loading states via Suspense could benefit.

**When to use:**
- Component is wrapped in `<Suspense fallback={<Loading/>}>`
- Data is always required for rendering (no `enabled: false` conditional)
- Not used with `keepPreviousData`/`placeholderData` (these are incompatible with Suspense)

**When NOT to use:**
- Queries with `enabled` option (Suspense does not support conditional fetching)
- Queries that use `placeholderData` from cache (e.g., `useProperty` which populates from list cache)
- Dashboard queries that already work correctly with `useQuery`

**Source:** [TanStack Query useSuspenseQuery](https://tanstack.com/query/v5/docs/react/reference/useSuspenseQuery)

---

## What NOT to Adopt This Milestone

| Technology/Pattern | Why Not |
|--------------------|---------|
| RSC prefetching (`queryClient.prefetchQuery` in Server Components) | The app already uses client-side `usePrefetchQuery` for route-level prefetching. Migrating to RSC prefetching requires wrapping every page in `HydrationBoundary` + `dehydrate()` + creating a new `QueryClient` per request. This is a significant architecture change, not a consolidation task. Current client prefetch works correctly. Evaluate in a future milestone. |
| Next.js `use cache` directive | Experimental/canary feature. The codebase uses TanStack Query for all data caching already. `use cache` is designed for Server Component caching, which this app does not heavily use for dynamic data. Not relevant for this milestone's scope. |
| `useSuspenseQueries` (parallel suspense) | Only useful when multiple independent queries must all resolve before rendering. Current usage of `useQueries` (12 occurrences) works fine. Converting requires restructuring component hierarchies to use Suspense boundaries. Out of scope. |
| TanStack Router | Already using Next.js App Router. No reason to change. |
| Knip (dead code detection) | Tempting for the consolidation audit, but the TypeScript compiler (`noUnusedLocals`, `noUnusedParameters`) + ESLint already catch dead exports. A full Knip setup would require configuration time that does not justify the marginal benefit for this milestone. |
| Tailwind CSS IntelliSense custom rules | IDE tooling, not enforced in CI. The existing `color-tokens/no-hex-colors` ESLint rule is the enforcement mechanism. |
| Component catalog (Storybook/Ladle) | Would be useful long-term but is a significant setup cost (build pipeline, deployment, maintenance). Not in scope for a consolidation milestone. |
| Zod schema sharing between client and Edge Functions | Edge Functions use Deno runtime with different import semantics. The `src/shared/validation/` schemas already work for client-side. Edge Functions validate with inline Zod in Deno context. Bridging the two runtimes is not worth the complexity. |

---

## Design System Enforcement (No New Tools)

### Existing Enforcement

| Mechanism | What It Catches | Location |
|-----------|----------------|----------|
| `color-tokens/no-hex-colors` ESLint rule | Raw hex colors in TS/TSX | `color-tokens.eslint.js` |
| `@tanstack/eslint-plugin-query` recommended rules | Query key issues, rest destructuring, unstable client | `eslint.config.js` |
| TailwindCSS 4 `@theme` tokens | Typography, spacing, colors, animation durations | `globals.css` (1,702 lines) |
| TypeScript strict mode | Unused variables, unreachable code, strict null checks | `tsconfig.json` |
| shadcn/ui component library | Consistent UI primitives (67 components in `src/components/ui/`) | Component files |

### What the Consolidation Adds (Process, Not Tools)

The UI audit will identify:
1. **Inconsistent spacing** -- components using raw `p-4` vs design system tokens
2. **Inconsistent border radius** -- some cards use `rounded-lg`, others `rounded-xl`
3. **Typography violations** -- body text not using `--text-base` / `--text-sm` tokens
4. **Button variants** -- CTAs using inconsistent sizes/styles across pages

These are fixed by refactoring, not by adding new enforcement tools. The existing ESLint + Tailwind token system is sufficient for prevention after the audit.

---

## Installation

```bash
# One new dev dependency
pnpm add -D babel-plugin-react-compiler

# Config change (next.config.ts)
# Add: reactCompiler: true
```

---

## Existing Pattern Inventory (What to Consolidate)

### Query Key Factories (15 files, well-structured)

| File | Domain | Pattern | Status |
|------|--------|---------|--------|
| `analytics-keys.ts` | Analytics/revenue | `queryOptions()` | Good |
| `billing-keys.ts` | Billing/subscriptions | `queryOptions()` | Good |
| `blog-keys.ts` | Blog content | `queryOptions()` | Good |
| `dashboard-graphql-keys.ts` | pg_graphql dashboard | `queryOptions()` | Good |
| `financial-keys.ts` | Financial reports | `queryOptions()` | Good |
| `inspection-keys.ts` | Inspections | `queryOptions()` | Good |
| `lease-keys.ts` | Leases | `queryOptions()` | Good |
| `maintenance-keys.ts` | Maintenance | `queryOptions()` | Good |
| `payment-keys.ts` | Payments | `queryOptions()` | Good |
| `property-keys.ts` | Properties | `queryOptions()` | Good |
| `report-keys.ts` | Reports | `queryOptions()` | Good |
| `tenant-keys.ts` | Tenants | `queryOptions()` | Good |
| `tenant-mappers.ts` | Tenant type mappers | Helper functions | Good |
| `unit-keys.ts` | Units | `queryOptions()` | Good |
| `mutation-keys.ts` | All mutations | Key-only (no `mutationOptions`) | **Upgrade target** |

### Mutation Hooks (29 files, need mutationOptions consolidation)

| File | Mutations | Pattern | Action |
|------|-----------|---------|--------|
| `use-property-mutations.ts` | 5 mutations | Inline `useMutation()` | Extract `mutationFn` to `mutationOptions()` |
| `use-lease-mutations.ts` | 4 mutations | Inline | Extract |
| `use-lease-lifecycle-mutations.ts` | 3 mutations | Inline | Extract |
| `use-lease-signature-mutations.ts` | 3 mutations | Inline | Extract |
| `use-tenant-mutations.ts` | Multiple | Inline | Extract |
| `use-tenant-invite-mutations.ts` | 3 mutations | Inline | Extract |
| `use-payment-mutations.ts` | Multiple | Inline | Extract |
| `use-auth-mutations.ts` | Multiple | Inline | Extract |
| `use-billing-mutations.ts` | Multiple | Inline | Extract |
| `use-expense-mutations.ts` | Multiple | Inline | Extract |
| `use-inspection-mutations.ts` | Multiple | Inline | Extract |
| `use-inspection-photo-mutations.ts` | Multiple | Inline | Extract |
| `use-inspection-room-mutations.ts` | Multiple | Inline | Extract |
| `use-profile-mutations.ts` | Multiple | Inline | Extract |
| `use-profile-avatar-mutations.ts` | Multiple | Inline | Extract |
| `use-profile-emergency-mutations.ts` | Multiple | Inline | Extract |
| `use-report-mutations.ts` | Multiple | Inline | Extract |

### Utility Hooks (19 files, audit for dead code)

| File | Purpose | Notes |
|------|---------|-------|
| `use-as-ref.ts` | Ref wrapper | Vendored from Dice UI, used by `tour.tsx` |
| `use-callback-ref.ts` | Callback ref | Check if still used |
| `use-current-user.ts` | Auth user | Check overlap with `use-auth.ts` |
| `use-data-table.ts` | Table state | Core utility, keep |
| `use-debounced-callback.ts` | Debounce | Used in search, keep |
| `use-error-boundary.ts` | Error boundary state | Check usage |
| `use-form-progress.ts` | Multi-step form progress | Check usage |
| `use-intersection-observer.ts` | IO wrapper | May overlap with `react-intersection-observer` package |
| `use-isomorphic-layout-effect.ts` | SSR-safe useLayoutEffect | Check if React 19 made this unnecessary |
| `use-lazy-ref.ts` | Lazy initialization | Check usage |
| `use-lightbox-state.ts` | Image lightbox | Specific to property images |
| `use-maintenance-form.ts` | Form type helpers | Check if still needed |
| `use-media-query.ts` | Responsive breakpoints | Keep |
| `use-mobile-accessibility.ts` | Mobile a11y helpers | Keep |
| `use-navigation.ts` | Router helpers | Check overlap with Next.js router |
| `use-offline-data.ts` | Offline support | Check if used |
| `use-supabase-upload.ts` | File upload | Keep |
| `use-toast.ts` | Toast wrapper | Check if just re-exports sonner |
| `use-unsaved-changes.ts` | Dirty form warning | Keep |

---

## TanStack Query v5 Feature Checklist

Features the codebase already uses correctly (no action needed):

| Feature | Used | Where |
|---------|------|-------|
| `queryOptions()` factories | Yes | 14 key files |
| `usePrefetchQuery` | Yes | 5 files |
| `useSuspenseQuery` | Yes | `use-dashboard-hooks.ts` |
| `useMutationState` | Yes | `use-pending-mutations.ts` |
| `gcTime` (not `cacheTime`) | Yes | All query configs |
| `placeholderData` (not `keepPreviousData`) | Yes | `query-provider.tsx` default |
| `throwOnError: false` default | Yes | `query-provider.tsx` |
| Single object parameter | Yes | All hooks |
| `structuralSharing: true` | Yes | Default + explicit |
| `notifyOnChangeProps` | Yes | 7 occurrences in list hooks |
| Centralized cache config (`QUERY_CACHE_TIMES`) | Yes | `query-config.ts` |
| ESLint plugin with recommended rules | Yes | `eslint.config.js` |

Features to adopt this milestone:

| Feature | Action | Impact |
|---------|--------|--------|
| `mutationOptions()` | Create mutation factories alongside query factories | Type safety, reusability, consistency |
| React Compiler | Enable in `next.config.ts`, progressively remove manual memoization | ~353 fewer lines of boilerplate |
| `useSuspenseQuery` expansion | Audit components in Suspense boundaries, switch where appropriate | Fewer null checks |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Auto-memoization | React Compiler | Manual `useMemo`/`useCallback` | 353 manual calls is tech debt; compiler handles automatically |
| Mutation factories | `mutationOptions()` from TQ v5 | Keep inline `useMutation()` options | Inconsistent with query pattern; non-reusable |
| Dead code detection | TypeScript + ESLint (existing) | Knip | Existing tools sufficient for this scope |
| RSC data fetching | Keep client-side TQ prefetching | RSC `prefetchQuery` + `HydrationBoundary` | Architecture change too large for consolidation milestone |
| Component catalog | None (manual audit) | Storybook | Significant setup cost, not needed for one-time audit |

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| `mutationOptions()` API | HIGH | Verified in TanStack Query official docs; API exists in installed version (5.90.21) |
| React Compiler | HIGH | Stable in React Compiler 1.0 + Next.js 16 official support; `reactCompiler` config is no longer experimental |
| `useSuspenseQuery` patterns | MEDIUM | API is stable but expansion requires per-component evaluation of Suspense compatibility |
| Design system enforcement | HIGH | Existing ESLint rules + Tailwind tokens verified in codebase |
| RSC prefetching (deferred) | MEDIUM | Pattern is well-documented but integration with existing PersistQueryClient needs investigation |

---

## Sources

- [TanStack Query mutationOptions reference](https://tanstack.com/query/v5/docs/framework/react/reference/mutationOptions) -- HIGH confidence
- [TanStack Query useSuspenseQuery reference](https://tanstack.com/query/v5/docs/react/reference/useSuspenseQuery) -- HIGH confidence
- [TanStack Query ESLint Plugin](https://tanstack.com/query/v5/docs/eslint/eslint-plugin-query) -- HIGH confidence
- [TanStack Query Advanced SSR / Prefetching](https://tanstack.com/query/v5/docs/react/guides/advanced-ssr) -- HIGH confidence
- [TanStack Query Prefetching & Router Integration](https://tanstack.com/query/v5/docs/react/guides/prefetching) -- HIGH confidence
- [Next.js 16 release blog](https://nextjs.org/blog/next-16) -- HIGH confidence
- [Next.js 16 reactCompiler config](https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler) -- HIGH confidence
- [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16) -- HIGH confidence
- [Next.js 16 use cache directive](https://nextjs.org/docs/app/api-reference/directives/use-cache) -- HIGH confidence (evaluated, deferred)
- [React Compiler installation](https://react.dev/learn/react-compiler/installation) -- HIGH confidence
- Codebase verification: `package.json` (versions), `eslint.config.js` (plugin config), `query-config.ts` (cache times), `property-keys.ts` (query pattern), `use-property-mutations.ts` (mutation pattern), `use-dashboard-hooks.ts` (suspense usage), `query-provider.tsx` (client config), `globals.css` (design tokens) -- all read directly
