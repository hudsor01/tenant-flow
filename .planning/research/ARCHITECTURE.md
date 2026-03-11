# Architecture Patterns

**Domain:** Hooks/components/shared consolidation and UI polish for existing property management SaaS
**Researched:** 2026-03-08
**Confidence:** HIGH -- all integration points verified against live codebase analysis

## Recommended Architecture

This consolidation milestone is a refactoring operation, not a feature build. The architecture stays the same -- what changes is the internal organization of three layers: (1) hooks (`src/hooks/api/` -- 85 files), (2) components (`src/components/` -- 450 files across 69 dirs), and (3) shared (`src/shared/` -- 50 files). Additionally, the existing design system in `globals.css` (1,702 lines) and `design-system.ts` (548 lines) gets enforced across all public-facing UI.

The guiding principle: **preserve every working pattern, consolidate the organizational debt, and enforce the design system that already exists but is inconsistently applied.**

```
                    CURRENT STATE                          TARGET STATE
                    -------------                          ------------

  Hooks Layer       85 files in src/hooks/api/             Same files, fewer dead exports,
  (query + mut)     15 query-key factories                 consistent patterns, dead hooks
                    1 mutation-keys.ts                     identified and removed
                    ~10 domain hook files > 250 lines      All hooks < 300 lines

  Components        450 files across 69 dirs               Same dirs, 20+ oversized files
  Layer             20 files > 300 lines (excl. tour.tsx)  split or consolidated
                    Inconsistent design system usage        Consistent typography/spacing
                    Mix of custom CSS + Tailwind utilities  Semantic utilities applied

  Shared Layer      50 files (types, validation,           Dead exports pruned,
                    constants, utils, config, templates)    TYPES.md updated,
                    TYPES.md as master lookup               design-system.ts aligned
                    design-system.ts (548 lines)           with globals.css tokens

  Design System     globals.css: 1,702 lines               Same tokens, enforced usage
                    ~100 custom @utility definitions        across marketing + auth + portal
                    5-level typography hierarchy            + dashboard pages
                    oklch color system (light + dark)
```

### Component Boundaries

The consolidation preserves the existing component boundary model. No new boundaries are created.

| Layer | Responsibility | Dependency Direction |
|-------|---------------|---------------------|
| `src/hooks/api/query-keys/` (15 files) | queryOptions() factories with queryFn embedded | Depends on: Supabase client, shared types |
| `src/hooks/api/use-*.ts` (40+ files) | Re-export hooks wrapping queryOptions/useMutation | Depends on: query-keys, mutation-keys, shared types |
| `src/hooks/api/mutation-keys.ts` | Centralized mutation key constants | No dependencies |
| `src/hooks/api/use-tenant-portal-keys.ts` | Shared tenant portal keys + resolveTenantId | Depends on: Supabase client, auth |
| `src/hooks/use-*.ts` (15 files) | Non-API utility hooks (navigation, toast, debounce, etc.) | Depends on: nothing or browser APIs |
| `src/components/ui/` (85+ files) | shadcn/ui base primitives | Depends on: Radix, cva, cn() |
| `src/components/shared/` (6 files) | Cross-domain shared components (skeletons, error pages) | Depends on: ui/ components |
| `src/components/<domain>/` (60+ dirs) | Domain-specific feature components | Depends on: hooks/api, ui/, shared types |
| `src/shared/types/` (25 files) | All shared TypeScript types, TYPES.md lookup | Depends on: supabase.ts (generated) |
| `src/shared/constants/` (4 files) | Design system tokens, status types, billing constants | No dependencies |
| `src/shared/validation/` (9 files) | Zod schemas for form/API validation | Depends on: shared types |
| `src/shared/utils/` (3 files) | Currency formatting, API error handling, optimistic locking | No dependencies |

### Data Flow

**Data flow does not change.** The existing pattern is:

```
Page Component (src/app/)
  -> useQuery(queryOptions()) from query-keys/*.ts
  -> Supabase PostgREST (RLS enforced)
  -> Data renders in domain components

Mutations:
  Page Component
  -> useMutation() from use-*-mutations.ts
  -> Supabase PostgREST or Edge Function
  -> queryClient.invalidateQueries() on success
  -> UI updates via TanStack Query cache
```

This pattern is sound. The consolidation does not touch data flow -- it touches file organization and CSS consistency.

## Build Order: Shared First, Hooks Second, Components Third

**This order is mandatory because of the dependency direction.**

### Phase 1: Shared Directory Cleanup (Foundation)

Everything depends on `src/shared/`. Clean it first so downstream work has a stable foundation.

**What to do:**
- Audit every export in shared types files for actual usage
- Remove dead exports from `core.ts`, `relations.ts`, `api-contracts.ts`, `analytics.ts`
- Update TYPES.md to match actual state (last updated 2026-02-20, now stale)
- Reconcile `design-system.ts` constants with `globals.css` tokens (they define overlapping systems -- `design-system.ts` has `TYPOGRAPHY_SCALE` with 20+ entries, while `globals.css` has its own 5-level `typography-*` utilities using CSS custom properties; the CSS version is the one actually used in components)
- Verify `@repo/shared/types/*` import alias still resolves correctly everywhere
- Check `src/shared/validation/` schemas against current form requirements

**Why first:** Types and constants are imported by every hook and component. Pruning dead exports here prevents false positives when auditing hooks and components. If a type is unused in shared but referenced in a hook, you need to know whether the hook itself is dead -- but you can only know that if the type audit is done first.

**Dependencies:** None (shared is the bottom of the dependency tree)

**Risk:** LOW -- removing dead exports is safe if verified unused across the entire `src/` tree. TypeScript strict mode catches any broken imports immediately.

### Phase 2: Hooks Consolidation (Data Layer)

Hooks sit between shared types and components. Clean them after shared is stable.

**What to do:**

1. **Identify dead hooks** -- hooks that export functions imported by zero components:
   - `use-emergency-contact.ts` (290 lines) -- only imported by 1 file (tenant profile page), but contains both queries AND mutations. Check if the queries are actually called.
   - `use-identity-verification.ts` (78 lines) -- only imported by 1 file (`identity-verification-card.tsx`). Feature may be incomplete.
   - `use-offline-data.ts` -- imported by only `property-form.mobile.tsx`. Check if that component exists/is used.
   - `dashboard-graphql-keys.ts` -- only imported by `use-dashboard-hooks.ts`. pg_graphql is available but check if this is active or aspirational.

2. **Split oversized hooks** (>300 line rule):
   - `use-tenant-mutations.ts` (314 lines) -- over limit, needs splitting by sub-domain (create/update vs invite vs status change)
   - `use-vendor.ts` (297 lines) -- close to limit, leave unless it grows
   - `use-tenant-payments.ts` (290 lines) -- close, leave
   - `use-emergency-contact.ts` (290 lines) -- close, but may be dead (see above)

3. **Verify query-key factory consistency**:
   - 15 factory files exist, all follow the queryOptions() pattern
   - `tenant-mappers.ts` in query-keys/ is not a query key file -- it is a mapper function file. Consider whether it belongs in query-keys/ or should move to a utils location. (LOW priority -- it works where it is)
   - `dashboard-graphql-keys.ts` uses pg_graphql queries. Verify these are active or dead code.

4. **Verify mutation-keys coverage**:
   - `mutation-keys.ts` (224 lines) defines keys for 20+ domains
   - Cross-check: every useMutation call should reference a mutationKey from this file
   - Missing domains in mutation-keys: `inspections`, `vendors` -- check if these mutations use inline keys

5. **Verify hook import patterns are consistent**:
   - All hooks create `createClient()` inside functions (not module-level) -- verified
   - All hooks import query-key factories from `./query-keys/` -- verified
   - All mutation hooks import from `./mutation-keys` -- verified

**Why second:** Hooks import from shared types. If you clean hooks first and a type is dead, you might incorrectly think the hook is live because the import resolves. Clean shared first, then you know exactly which types are alive.

**Dependencies:** Phase 1 (shared cleanup must be complete)

**Risk:** LOW-MEDIUM -- removing dead hooks is safe if verified. Splitting large hooks requires moving exports, which means updating all import sites. TypeScript will catch all of these.

### Phase 3: Components Consolidation (UI Layer)

Components are at the top of the dependency tree. Clean them last.

**What to do:**

1. **Split oversized components** (files >300 lines, excluding test files and tour.tsx which is vendored):

   | File | Lines | Action |
   |------|-------|--------|
   | `stepper-item.tsx` | 607 | Extract sub-components (step icon, step content, step connector) |
   | `app-shell.tsx` | 491 | Extract command palette, breadcrumbs, sidebar nav into separate files |
   | `contact-form.tsx` | 452 | Extract form sections (personal, message, submit) |
   | `selection-step.tsx` (lease wizard) | 434 | Extract selection list, filters, search into sub-files |
   | `chart.tsx` | 430 | This is a shadcn/ui file -- leave as-is (upstream pattern) |
   | `stepper.tsx` | 416 | Extract context, navigation, content areas |
   | `inspection-detail.client.tsx` | 417 | Extract sections (photos, rooms, timeline) |
   | `maintenance-view.client.tsx` | 394 | Extract tab panels |
   | `subscriptions-tab.tsx` | 379 | Extract subscription card, actions panel |
   | `maintenance-form.client.tsx` | 374 | Extract form sections |
   | `lease-creation-wizard.tsx` | 374 | Extract step components |
   | `two-factor-setup-dialog.tsx` | 369 | Extract QR code step, verify step |
   | `property-form.client.tsx` | 368 | Extract form sections (details, images, address) |
   | `file-upload.tsx` | 363 | This is a compound component -- leave if internally organized |
   | `tenant-detail-sheet.tsx` | 359 | Extract detail sections |
   | `balance-sheet.tsx` | 350 | Extract financial sections |
   | `connect-account-status.tsx` | 346 | Extract status panels |
   | `renew-lease-dialog.tsx` | 342 | Extract form, preview, confirmation |
   | `properties.tsx` | 341 | Extract toolbar, grid view, table view |

2. **Audit component directory structure** -- the current structure is domain-organized which is correct. No restructuring needed. Key directories:
   - `ui/` (85 files) -- shadcn/ui primitives. Do not reorganize.
   - `shared/` (6 files) -- skeletons, error pages. May need additions for newly-extracted shared patterns.
   - `<domain>/` -- property, lease, maintenance, tenant, etc. Each owns its domain components.

3. **Identify dead components** -- components that are not imported by any page or other component. Requires full import graph analysis.

4. **Extract repeated patterns into shared components** -- look for patterns duplicated across 3+ domain components:
   - Status badge rendering (each domain has its own status color mapping)
   - Empty state patterns (beyond the `Empty` compound component)
   - Detail page section headers
   - Filter/toolbar patterns

**Why third:** Components depend on hooks and shared types. If you refactor components first and then change a hook API, you refactor twice. Clean bottom-up: shared -> hooks -> components.

**Dependencies:** Phase 1 and Phase 2 (both must be complete)

**Risk:** MEDIUM -- splitting components requires careful prop threading and ensuring the split pieces are properly connected. Each split generates import changes. Test coverage (1,415 unit tests) provides safety net.

### Phase 4: Design System Enforcement (UI Polish)

This phase runs after the structural consolidation because it touches component markup/classes.

**What to do:**

1. **Audit typography consistency across all pages:**
   - Marketing pages (landing, features, pricing, contact, blog) should use `typography-display-*`, `typography-hero`, `typography-lead`
   - Dashboard pages should use `typography-h1` through `typography-h4`, `typography-stat-*`
   - Auth pages should use `typography-h2`, `typography-p`
   - Currently, some components use raw Tailwind (`text-5xl lg:text-7xl font-bold`) while the design system defines `typography-hero` for exactly this purpose

2. **Enforce card utilities:**
   - `card-standard`, `card-elevated`, `card-bordered`, `card-glass` are defined in globals.css but usage is inconsistent
   - Dashboard uses `dashboard-widget-card` and `stat-card-professional` utilities correctly
   - Marketing pages mix inline styles with semantic utilities

3. **Enforce status badge utilities:**
   - `status-badge`, `status-badge-success`, `status-badge-warning`, `status-badge-destructive` exist in globals.css
   - Each domain component may have its own status rendering -- consolidate to use these utilities

4. **Enforce spacing utilities:**
   - `section-spacing`, `section-spacing-compact`, `page-offset-navbar`, `page-container` are defined
   - Marketing pages should use these consistently instead of raw spacing values

5. **Verify button variant usage:**
   - Button has 10 variants (default, destructive, outline, secondary, ghost, link, premium, masculine, navbar, navbarGhost, lightboxNav)
   - `premium` and `masculine` variants: check if both are needed or if they serve different contexts
   - All CTA buttons should use consistent variants across marketing pages

6. **Reconcile design-system.ts with globals.css:**
   - `TYPOGRAPHY_SCALE` in design-system.ts defines a parallel type system (display-2xl, heading-xl, body-lg, etc.) with exact pixel sizes and font weights
   - `globals.css` defines the actual CSS utilities (typography-hero, typography-display-lg, etc.) using CSS custom properties
   - These are two systems describing the same thing. Resolution: `globals.css` is the source of truth (it is what Tailwind uses). `design-system.ts` should reference the CSS custom properties or be deprecated in favor of direct Tailwind utility usage
   - `COMPONENT_PRESETS` in design-system.ts (button, input, card presets) duplicate what cva variants in button.tsx and Tailwind utilities already provide
   - `SEMANTIC_COLORS` in design-system.ts reference CSS vars that are already available as Tailwind utilities (`bg-primary`, `text-foreground`, etc.)

**Why last:** Design system changes are cosmetic. They require the structural work (splitting, pruning) to be done first so you are not applying CSS fixes to files that are about to be split or deleted.

**Dependencies:** Phases 1-3 (structural consolidation must be complete)

**Risk:** LOW -- CSS class changes do not affect logic. Visual regression is the main risk, mitigated by the E2E test suite (17 journeys) and manual browser review.

### Phase 5: Full-App UI Audit (Browser Automation)

Verify all changes visually across every surface.

**What to do:** Walk through every user-facing page in browser automation, checking:
- Typography hierarchy consistency
- Spacing and alignment
- Card and container patterns
- Status indicator consistency
- Button variant usage
- Mobile responsiveness
- Dark mode (if applicable)

**Why last:** You need all structural and CSS changes in place before auditing visually.

**Dependencies:** Phase 4 (design system enforcement must be complete)

## Patterns to Follow

### Pattern 1: queryOptions() Factory (PRESERVE)
**What:** All query definitions use `queryOptions()` from TanStack Query, co-located with their `queryFn` in `src/hooks/api/query-keys/<domain>-keys.ts`.
**Why preserve:** This pattern ensures type-safe query keys, co-located cache configuration, and centralized queryFn definitions. It is the TanStack Query v5 recommended pattern.
**Status:** Fully implemented across all 15 factory files. No changes needed.

```typescript
// src/hooks/api/query-keys/property-keys.ts
export const propertyQueries = {
  all: () => queryOptions({
    queryKey: ['properties'],
    queryFn: async () => { /* Supabase query */ }
  }),
  detail: (id: string) => queryOptions({
    queryKey: ['properties', id],
    queryFn: async () => { /* Supabase query */ }
  }),
}
```

### Pattern 2: Mutation Key Constants (PRESERVE)
**What:** All mutation keys are centralized in `mutation-keys.ts` as readonly tuples.
**Why preserve:** Enables `useMutationState()` for global pending mutation tracking, consistent key naming, and centralized mutation key discovery.
**Status:** 224 lines, 20+ domains. Well-organized.

### Pattern 3: Tenant Portal Key Sharing (PRESERVE)
**What:** `use-tenant-portal-keys.ts` provides shared keys and `resolveTenantId()` for all tenant portal hooks.
**Why preserve:** Prevents circular dependencies between tenant portal hook files. The `tenantIdQuery()` caches tenant ID resolution for 10 minutes, preventing redundant DB calls.
**Status:** Working correctly. All tenant portal hooks use this pattern.

### Pattern 4: Custom Tailwind Utilities (PRESERVE + ENFORCE)
**What:** ~100 custom `@utility` definitions in globals.css providing semantic CSS classes (typography-*, status-*, card-*, interactive-*, etc.).
**Why preserve:** These encode the design system decisions. They are the "correct" way to apply visual styles in this codebase.
**What to enforce:** Many components still use raw Tailwind utilities where semantic utilities exist. The consolidation should migrate to semantic utilities where they apply.

### Pattern 5: Domain Component Organization (PRESERVE)
**What:** Components organized by domain (`leases/`, `maintenance/`, `properties/`, `tenants/`, etc.) with `__tests__/` subdirectories.
**Why preserve:** This matches the app route structure and makes feature work self-contained. Reshuffling component directories would break import paths across the entire app with zero architectural benefit.

### Pattern 6: Client/Server Component Split (PRESERVE)
**What:** `.client.tsx` suffix for explicitly client-side components (26 files). Server Components by default.
**Why preserve:** This is the Next.js 16 convention. The `'use client'` boundary is correctly placed. Do not move client boundaries.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Creating Barrel Files
**What:** Creating `index.ts` files that re-export from multiple files in a directory.
**Why bad:** Explicitly forbidden in CLAUDE.md. Barrel files prevent tree-shaking, create circular dependency risks, and obscure the actual import source.
**Instead:** Import directly from the defining file. This is already the codebase convention.

### Anti-Pattern 2: Moving Query Logic Out of Query-Key Files
**What:** Extracting queryFn out of queryOptions() factories into separate "service" files.
**Why bad:** Breaks the co-location pattern that makes query keys and their data fetching logic discoverable together. The current pattern where queryFn lives inside queryOptions() is correct.
**Instead:** Keep queryFn inside queryOptions(). If a queryFn is complex, extract helper functions within the same file.

### Anti-Pattern 3: Consolidating by Combining Unrelated Hooks
**What:** Merging multiple domain hooks into a single file to "reduce file count."
**Why bad:** Creates 500+ line files that violate the 300-line rule, mix unrelated domains, and make git blame useless.
**Instead:** Split by concern. Each hook file should cover one domain or one sub-domain. The current split (e.g., `use-lease.ts` for queries, `use-lease-mutations.ts` for mutations, `use-lease-lifecycle-mutations.ts` for lifecycle operations) is correct.

### Anti-Pattern 4: Replacing CSS Utilities with design-system.ts Constants
**What:** Using JavaScript constants from `design-system.ts` to generate inline styles instead of Tailwind utilities.
**Why bad:** `design-system.ts` defines constants that duplicate what CSS custom properties and Tailwind utilities already provide. Using them creates an indirection layer that does not compose with Tailwind's utility model.
**Instead:** Use the Tailwind utility classes defined in globals.css directly. The CSS custom properties (`--text-title-1`, `--color-primary`, etc.) are the source of truth. `design-system.ts` should be treated as documentation, not as a runtime dependency.

### Anti-Pattern 5: Restructuring Component Directories
**What:** Reorganizing component directories (e.g., moving from domain-based to feature-based, or creating a "common" directory).
**Why bad:** This is 450+ files. Restructuring directories means updating every import path, every test mock path, and every dynamic import. The current domain-based structure works and matches the app route structure.
**Instead:** Keep the current directory structure. Consolidation means splitting oversized files and removing dead code within the existing structure.

## New vs Modified Components

### New Components (Expected)

| Component | Purpose | Rationale |
|-----------|---------|-----------|
| None expected | This is a consolidation milestone | New features are out of scope |

The consolidation may create new *files* when splitting oversized components, but these are extractions from existing components, not new features.

### Modified Components (Expected)

| Category | Files | Type of Modification |
|----------|-------|---------------------|
| Oversized components | ~20 files >300 lines | Split into sub-components |
| Marketing pages | hero-section, bento-features, pricing cards, etc. | CSS class updates for design system consistency |
| Auth pages | login, accept-invite | CSS class updates |
| Dashboard components | owner-dashboard, stat cards | CSS class updates (already mostly correct) |
| Tenant portal components | 6 files | CSS class updates |
| Navbar | navbar.tsx + 3 sub-files | May need CTA consistency fixes |
| Blog components | 6 files (recently created) | Unlikely to need changes (already uses design system) |

### Preserved Components (Do Not Touch)

| Component | Lines | Reason |
|-----------|-------|--------|
| `tour.tsx` | 1,732 | Vendored Dice UI upstream copy -- exempt from 300-line rule |
| `chart.tsx` | 430 | shadcn/ui pattern -- upstream file structure |
| `file-upload/*.tsx` | 363+ (compound) | Well-organized compound component with proper internal file split |
| All `__tests__/*.test.tsx` | Various | Test files are not subject to the 300-line rule |

## Scalability Considerations

Not applicable for this consolidation milestone. The architectural scalability properties (RLS, PostgREST, query-key factories, domain-based component organization) are already in place and are being preserved, not changed.

## Key Integration Points

### Hook -> Query-Key Dependency Map

```
use-properties.ts       -> query-keys/property-keys.ts
use-property-mutations.ts -> query-keys/property-keys.ts, unit-keys.ts
use-lease.ts            -> query-keys/lease-keys.ts, maintenance-keys.ts
use-lease-mutations.ts  -> query-keys/lease-keys.ts, tenant-keys.ts, unit-keys.ts
use-lease-lifecycle-mutations.ts -> query-keys/lease-keys.ts, tenant-keys.ts, unit-keys.ts
use-tenant.ts           -> query-keys/tenant-keys.ts
use-tenant-mutations.ts -> query-keys/tenant-keys.ts, lease-keys.ts
use-maintenance.ts      -> query-keys/maintenance-keys.ts
use-analytics.ts        -> query-keys/analytics-keys.ts
use-owner-dashboard.ts  -> query-keys/analytics-keys.ts
use-billing.ts          -> query-keys/billing-keys.ts
use-reports.ts          -> query-keys/report-keys.ts
use-blogs.ts            -> query-keys/blog-keys.ts
use-inspections.ts      -> query-keys/inspection-keys.ts
use-dashboard-hooks.ts  -> query-keys/dashboard-graphql-keys.ts
```

Cross-domain invalidation (mutations that invalidate multiple query-key factories) is the primary source of complexity. These cross-references must be preserved exactly during any hook refactoring.

### Design System Token Chain

```
globals.css @theme block
  -> CSS custom properties (--text-title-1, --color-primary, etc.)
  -> @utility definitions (typography-h1, card-standard, etc.)
  -> Tailwind class usage in component JSX

design-system.ts (parallel system -- documentation only)
  -> TYPOGRAPHY_SCALE, SEMANTIC_COLORS, COMPONENT_PRESETS
  -> Imported by: ONLY OG image generation and email templates
  -> Should NOT be used for component styling
```

## Sources

- Live codebase analysis: `src/hooks/api/` (85 files), `src/components/` (450 files), `src/shared/` (50 files)
- `globals.css` (1,702 lines of CSS custom properties and @utility definitions)
- `design-system.ts` (548 lines of JS constants)
- `TYPES.md` (shared types master lookup, last updated 2026-02-20)
- `CLAUDE.md` (project conventions and rules)
- All confidence levels HIGH -- based on direct codebase analysis, not external sources
