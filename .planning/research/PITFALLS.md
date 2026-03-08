# Domain Pitfalls

**Domain:** Production code consolidation and UI polish (hooks, components, shared directory, design system)
**Researched:** 2026-03-07
**Confidence:** HIGH (verified against actual codebase dependency graph, test patterns, and existing conventions)

---

## Critical Pitfalls

Mistakes that cause test cascade failures, runtime regressions, or data loss requiring multi-file rework.

### Pitfall 1: Hook Consolidation Breaks vi.mock() Module Paths in 27 Test Files

**What goes wrong:** Renaming or merging hook files (e.g., consolidating `use-properties.ts` + `use-property-mutations.ts` or renaming `use-vendor.ts` to `use-vendors.ts`) breaks every test that mocks that module path. There are 27 test files that mock hook modules via `vi.mock('#hooks/api/use-...')`. Each mock uses the exact module specifier string. When the file moves, every mock string must be updated simultaneously -- TypeScript will not catch stale `vi.mock()` paths because mock paths are untyped strings.

**Why it happens:** Vitest `vi.mock()` takes a string module path, not a typed import. Renaming `use-properties.ts` to `use-property-queries.ts` causes no TypeScript error in test files, but the mock silently stops working. The real module gets imported instead, which either fails (no Supabase client in test) or returns `undefined`, causing cryptic "Cannot read properties of undefined" errors deep in component render.

**Consequences:**
- Test failures surface as runtime errors inside components ("cannot call mutateAsync of undefined"), not as import errors
- A single rename can break 5-10 test files simultaneously
- Pre-commit hook runs all 1,415 tests -- a cascade failure blocks commits until all mock paths are fixed
- If the developer fixes some mocks but misses others, CI catches the rest but the commit is already in progress

**Prevention:**
1. Before renaming any hook file, run `grep -r "vi.mock.*<old-filename>" src/` to find every test that mocks it
2. Rename the file AND update all mock paths in the same commit
3. Run `pnpm test:unit -- --run` before staging to verify all tests pass
4. Never rename and restructure in the same PR -- rename first (pure path change, no logic change), verify tests pass, then restructure the contents in a follow-up commit
5. Consider adding a test helper that validates mock paths resolve to real modules:
```typescript
// In test setup, warn on mocks that resolve to non-existent modules
afterEach(() => {
  // vitest does not provide this natively -- manual grep is the safety net
})
```

**Detection:** `pnpm test:unit` fails with "Cannot read properties of undefined (reading 'mutateAsync')" or similar -- means a mock path no longer matches a real module.

**Phase to address:** Every hook consolidation task. Establish the grep-before-rename rule before the first rename.

---

### Pitfall 2: Moving ownerDashboardKeys Breaks Cross-Domain Cache Invalidation

**What goes wrong:** `ownerDashboardKeys` is exported from `use-owner-dashboard.ts` and imported by 8 other hook files for cross-domain invalidation (property mutations, lease mutations, tenant mutations, maintenance mutations, unit mutations, vendor mutations, lease lifecycle mutations, and analytics-keys). Moving this export to a query-keys file or renaming it breaks every mutation's `onSuccess` handler, causing stale dashboard data after CRUD operations. The dashboard stops refreshing when users create/edit/delete entities.

**Why it happens:** The `ownerDashboardKeys` object is the central hub of the invalidation graph. Every mutation that affects dashboard data does `queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })`. This is by design -- it ensures the dashboard stats, activity feed, and charts refresh after any mutation across properties, leases, tenants, maintenance, units, and vendors. Moving the export changes the import path in 8+ files. Missing even one causes that domain's mutations to stop refreshing the dashboard.

**Specific dependency graph:**
```
use-owner-dashboard.ts (defines ownerDashboardKeys)
  <- use-property-mutations.ts (4 invalidation calls)
  <- use-lease-mutations.ts (4 invalidation calls)
  <- use-tenant-mutations.ts (3 invalidation calls)
  <- use-maintenance.ts (3 invalidation calls)
  <- use-unit.ts (3 invalidation calls)
  <- use-vendor.ts (3 invalidation calls)
  <- use-lease-lifecycle-mutations.ts (2 invalidation calls)
  <- use-dashboard-hooks.ts (reference for query)
  <- analytics-keys.ts (reference for nested keys)
```

**Consequences:**
- Dashboard shows stale data after mutations (user creates a property, dashboard count does not update)
- No test failure -- cache invalidation is a runtime behavior that unit tests do not cover (they mock mutations)
- Bug surfaces only in manual testing or E2E tests
- Users see incorrect stats, making the product feel broken

**Prevention:**
1. If consolidating `ownerDashboardKeys` into a separate query-keys file (which is architecturally correct), use the pattern from `tenantPortalKeys`: extract to a dedicated file (`owner-dashboard-keys.ts` in `query-keys/`), then re-export from `use-owner-dashboard.ts` for backward compatibility
2. Run a full import verification: `grep -r "ownerDashboardKeys" src/ | grep "from" | sort` -- every file must be updated
3. After moving, verify all 22 `invalidateQueries` calls still reference the correct key object
4. Add an E2E smoke test: create a property, verify dashboard count increments

**Detection:** Manual test: create a property in the owner dashboard, navigate to dashboard home. If stats do not update, invalidation chain is broken. Also: `grep -r "ownerDashboardKeys" src/ | grep "from" | sort` should show exactly one source file (the definition) and all others importing from it.

**Phase to address:** Hook consolidation phase. This is the single highest-risk refactor in the hooks audit.

---

### Pitfall 3: tenantPortalKeys Extraction Breaks Circular-Dependency-Free Architecture

**What goes wrong:** The tenant portal hooks were previously split specifically to avoid circular dependencies. `use-tenant-portal-keys.ts` exists because `use-tenant-dashboard.ts` imports from `use-tenant-lease.ts`, `use-tenant-payments.ts`, `use-tenant-maintenance.ts`, and `use-tenant-autopay.ts` -- all of which need `tenantPortalKeys` and `resolveTenantId()`. If any of those files imported from `use-tenant-dashboard.ts` (which composes them), a circular dependency would form. Reconsolidating these files "for simplicity" reintroduces the circular dependency.

**Why it happens:** Six files form a deliberate dependency tree:
```
use-tenant-portal-keys.ts  (keys + resolveTenantId)
  <- use-tenant-lease.ts
  <- use-tenant-payments.ts
  <- use-tenant-maintenance.ts
  <- use-tenant-autopay.ts
  <- use-tenant-settings.ts
  <- use-tenant-dashboard.ts (ALSO imports the 4 hooks above)
```
Merging `use-tenant-portal-keys.ts` back into `use-tenant-dashboard.ts` creates:
```
use-tenant-dashboard.ts (keys + composed hooks)
  imports from use-tenant-lease.ts
    which would need to import from use-tenant-dashboard.ts  // CIRCULAR
```

**Consequences:**
- Module resolution fails at build time or produces undefined exports
- Next.js build crashes with cryptic "cannot access before initialization" error
- Every tenant portal page breaks simultaneously

**Prevention:**
1. Document the dependency tree in a comment at the top of `use-tenant-portal-keys.ts` explaining why it is separate
2. During hook consolidation audit, mark `use-tenant-portal-keys.ts` as "intentionally separate -- do not merge"
3. If cleaning up file names, rename is safe; merging is not
4. Similar rule applies to `use-auth.ts` exporting `authKeys` and `useAuthCacheUtils` -- consumed by `use-auth-mutations.ts`

**Detection:** `pnpm typecheck` or `next build` crashes with circular dependency errors. In dev mode, undefined imports manifest as "useX is not a function" errors.

**Phase to address:** Hook consolidation phase. Document in the consolidation audit which files are intentionally separate.

---

### Pitfall 4: Changing shadcn CVA Variants Breaks 19 Components and 50 Test Files

**What goes wrong:** The project has 19 UI components using CVA (class-variance-authority) with customized variants beyond shadcn defaults. The button component alone has 7 custom variants (`premium`, `masculine`, `navbar`, `navbarGhost`, `lightboxNav`) and 5 custom sizes (`icon-sm`, `icon-lg`, `mobile-full`, `touch-friendly`, `navbar`). Changing CVA variant names, removing unused variants, or updating the base classes breaks every component and test that references them.

**Why it happens:** During UI polish, developers naturally want to "clean up" button variants -- removing `masculine` if unused, renaming `navbarGhost` to `ghost-navbar`, or standardizing sizes. Each change cascades through every component that uses that variant. Tests that assert on rendered class names (`expect(button).toHaveClass('bg-gradient-to-r')`) fail when classes change.

**Components with custom CVA variants (not vanilla shadcn):**
- `button.tsx` (7 custom variants, 5 custom sizes -- **highest risk**)
- `badge.tsx`, `alert.tsx`, `card.tsx`, `input.tsx` (custom variants)
- `stat.tsx`, `empty.tsx`, `field.tsx`, `item.tsx` (project-specific components)
- `loading-spinner.tsx`, `section-skeleton.tsx`, `skeleton.tsx` (custom sizes)
- Plus 6 more with minor customizations

**Consequences:**
- Class name assertions in tests fail (50 test files reference UI components)
- Visual regression: buttons/badges/cards render differently in production
- If the change is deployed without full visual review, users see broken layouts

**Prevention:**
1. Before modifying any CVA variant, run `grep -r "variant=\"<name>\"" src/` to find every usage
2. Never remove a variant without confirming zero usages (unused variants are harmless -- removing them is cosmetic)
3. If renaming a variant, do search-and-replace across ALL `.tsx` files in one commit
4. For test failures: update tests to assert on behavior (button click, disabled state), not on specific class strings
5. Create a UI component inventory before starting polish: for each customized component, list variant names and their consumers

**Detection:** `pnpm test:unit` fails with class name assertion mismatches. Visual regression requires manual or Playwright screenshot comparison.

**Phase to address:** UI polish phase. Inventory first, modify second.

---

### Pitfall 5: globals.css Design Token Changes Cascade to 1,702 Lines of Theme State

**What goes wrong:** The `globals.css` file is 1,702 lines with a comprehensive design token system: fluid typography scales (`clamp()` values), custom color palettes (`oklch()` values), semantic color mappings, animation durations, and dark mode overrides. Changing a single CSS custom property (e.g., `--text-title-2` from `clamp(1.25rem, 2.5vw, 1.5rem)` to a fixed `1.5rem`) affects every element using that token. There is no test coverage for CSS variable resolution.

**Why it happens:** The design system has three layers that can conflict:
1. **globals.css `@theme` block** -- defines CSS custom properties (canonical source)
2. **`design-system.ts` constants** -- TypeScript constants referencing `var(--color-*)` (used in non-Tailwind contexts like Satori OG images)
3. **Component-level Tailwind classes** -- some reference tokens directly, others use hardcoded values

During polish, a developer might update `--color-primary` in `globals.css` but forget to update `BRAND_COLORS_HEX.primary` in `design-system.ts`. OG images, email templates, and external integrations use the TypeScript constants, not the CSS variables. They diverge.

**Consequences:**
- Brand color inconsistency between web app (correct) and OG images/emails (stale hex values)
- Dark mode breaks if a color token is changed without updating the `.dark` variant
- Fluid typography changes affect responsive behavior at all breakpoints simultaneously
- No test catches CSS-level regressions

**Prevention:**
1. Treat `globals.css` `@theme` block as the single source of truth
2. After any color change in `globals.css`, verify `design-system.ts` BRAND_COLORS_HEX matches
3. After any typography change, test at mobile (375px), tablet (768px), and desktop (1440px) widths
4. Never change `clamp()` values without testing the min and max viewport sizes
5. For dark mode: every `:root` color token must have a corresponding `.dark` override -- check the count matches

**Detection:** Visual inspection at multiple viewport sizes. OG image mismatch: share a page URL in Slack/Discord, check the preview card colors against the live site.

**Phase to address:** UI polish phase. Audit `design-system.ts` BRAND_COLORS_HEX against `globals.css` before any token changes.

---

## Moderate Pitfalls

Mistakes that cause bugs, degraded UX, or unnecessary rework but are recoverable.

### Pitfall 6: Query Key Factory Consolidation Changes Key Structure, Invalidating User Caches

**What goes wrong:** Moving query functions between key factory files (e.g., moving a property performance query from `property-keys.ts` to `analytics-keys.ts`) changes the query key array structure. Active users with cached data see stale results because their existing cache entries have the old key shape, and the new key shape creates a new cache entry. The old data sits in memory but is never invalidated; the new query fetches fresh data but the component may still be reading from the old cache entry if it was prefetched.

**Why it happens:** `queryOptions()` factories embed the key structure: `['properties', id, 'performance']` vs `['analytics', 'property-performance', id]`. Moving a query between factories changes this key. TanStack Query uses key identity for cache lookup. The old key persists in the query cache until garbage collected (default: 5 minutes after last observer unmounts).

**Consequences:**
- Brief window where users see stale data (old cache hit) then fresh data (new query settles)
- Cross-module invalidation breaks: code doing `queryClient.invalidateQueries({ queryKey: ['properties'] })` no longer catches a query that moved to `['analytics', ...]`
- Mutations that invalidated the old key pattern stop working for the moved query

**Prevention:**
1. When moving queries between factories, keep the exact same `queryKey` array structure -- only change which file the `queryOptions()` lives in, not the key itself
2. If the key MUST change, grep for every `invalidateQueries` call that references the old key prefix and update them
3. Avoid moving queries between factories unless there is a clear organizational benefit -- the cost is high, the benefit is cosmetic
4. Prefer adding cross-references (importing keys from adjacent factories) over moving code

**Detection:** After consolidation, verify: `grep -r "invalidateQueries.*\['<old-prefix>'\]" src/` returns zero results for the moved query's old prefix. Manual test: trigger a mutation, verify the related query refetches.

**Phase to address:** Hook consolidation phase. Prefer "don't move keys" over "organize keys perfectly."

---

### Pitfall 7: Removing "Backward Compatibility" Re-exports Breaks Consumers

**What goes wrong:** Several hook files have explicit re-export lines marked "for backward compatibility" (e.g., `use-tenant-dashboard.ts` line 24: `export { tenantPortalKeys } from './use-tenant-portal-keys'`). During consolidation, these look like dead code or unnecessary indirection. Removing them breaks every consumer that imports from the re-exporting file instead of the source file. There are also wrapper functions marked "backward compatibility" in `use-tenant-autopay.ts` (lines 167, 201).

**Why it happens:** When hooks were previously split for the 300-line rule, re-exports were added so existing consumers did not need import path changes. The re-export file became the canonical import for some consumers. Removing the re-export forces every consumer to update their import path.

**Specific instances:**
- `use-tenant-dashboard.ts` re-exports `tenantPortalKeys` -- 4 components import from dashboard, not from portal-keys
- `use-tenant-autopay.ts` has wrapper functions for `useSetupAutopay` and `useCancelAutopay` -- consumers may call either the wrapper or the underlying function

**Consequences:**
- TypeScript import errors on build
- If the re-export was used in test mocks (`vi.mock('#hooks/api/use-tenant-dashboard', ...)`), the mock may not cover the actual import path used in production

**Prevention:**
1. Before removing any re-export, run `grep -r "from.*<re-exporting-file>" src/` to find all consumers
2. If consumers exist, update their imports to point to the source file first, verify tests pass, then remove the re-export
3. For backward-compat wrapper functions: verify no component calls the wrapper by name before removing
4. Never remove re-exports and change source logic in the same commit

**Detection:** `pnpm typecheck` fails with "Module has no exported member" errors.

**Phase to address:** Hook consolidation phase. Audit re-exports before removing.

---

### Pitfall 8: UI Polish Changes Break Mobile Responsive Layouts

**What goes wrong:** The app has extensive responsive design with `useMediaQuery` in 2 components, and mobile-specific patterns throughout (scroll-snap kanban boards, `mobile-full` button sizes, touch-friendly hit targets with `min-h-11`). UI polish that changes spacing, padding, or container widths on desktop can break mobile layouts. A common mistake: increasing card padding from `p-4` to `p-6` looks better on desktop but causes horizontal overflow on mobile (375px width).

**Why it happens:** Desktop-first development is the default mental model. The developer tests at their monitor resolution, sees the improvement, and commits. Mobile viewports are only checked when someone opens their phone or uses Chrome DevTools' responsive mode. The min-height constraint (`min-h-11` = 44px on all interactive elements for WCAG 2.5.8) means size changes have floor constraints.

**Specific risk areas:**
- `button.tsx` sizes all enforce `min-h-11` -- adding padding increases height beyond the floor, which is fine, but changing `min-h` or removing it breaks touch accessibility
- Kanban columns use `scroll-snap-type: x mandatory` on mobile, grid on desktop -- changing the container breakpoint switches the layout mode
- Data tables have 4-layer responsive adaptation (full table -> card view -> simplified card -> stacked) -- changing column widths or padding can break intermediate breakpoints
- The sidebar uses `data-collapsible="icon"` on mobile -- changing sidebar width tokens affects the icon-only collapsed state

**Consequences:**
- Horizontal scrolling on mobile (content wider than viewport)
- Touch targets smaller than 44px (WCAG 2.5.8 violation)
- Kanban board loses snap scrolling
- Sidebar covers content or leaves gap

**Prevention:**
1. Test every UI change at 375px (iPhone SE), 768px (iPad), and 1440px (desktop) minimum
2. Never change `min-h-11` on interactive elements without understanding the accessibility requirement
3. Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) for any spacing change -- never change base (mobile-first) values without checking
4. For Kanban changes: test the scroll-snap behavior on actual mobile or Chrome DevTools touch simulation
5. Add a Playwright screenshot test at 375px width for critical layouts (or use the browser automation audit phase to catch these)

**Detection:** Chrome DevTools responsive mode at 375px width. Horizontal scrollbar visible = overflow issue. Lighthouse accessibility audit flags touch targets under 44px.

**Phase to address:** UI polish phase. Mandate mobile viewport check for every visual change.

---

### Pitfall 9: Shared Directory Cleanup Removes Types Still Used by Edge Functions

**What goes wrong:** The shared types directory (`src/shared/types/`) has 22 type files. During cleanup, types that appear "unused" in the frontend might actually be used by Supabase Edge Functions (which import from a different path resolution). Removing a type from `api-contracts.ts` that is used in `supabase/functions/_shared/` breaks the Deno build without any TypeScript error in the Next.js project.

**Why it happens:** Edge Functions use Deno, not Node.js. They have a separate `deno.json` import map and resolve types differently. The `src/shared/types/` directory is the canonical type source for the frontend. Edge Functions may import types by copying or referencing these files directly. A "dead export" in the frontend codebase may have a consumer in `supabase/functions/`.

**Additionally:** The `backend-domain.ts` file in shared types may look like dead code from a previous NestJS era, but types within it could still be referenced by mapper functions, RPC contracts, or Edge Function handlers.

**Consequences:**
- Edge Function deploy fails with type errors
- Not caught by `pnpm typecheck` (which only covers the Next.js project)
- Deno test suite fails, but those tests only run locally

**Prevention:**
1. Before removing any export from `src/shared/types/`, search BOTH `src/` AND `supabase/` directories: `grep -r "TypeName" src/ supabase/`
2. Run `cd supabase/functions && deno check` after any type removal to verify Edge Functions still compile
3. Mark clearly dead files (like `health.ts` if no health endpoint exists) but verify with grep first
4. The `TYPES.md` lookup table lists every type and its location -- update it after removing types

**Detection:** `deno test` in `supabase/functions/tests/` fails with type import errors. `supabase functions deploy` fails on type resolution.

**Phase to address:** Shared directory cleanup phase. Always grep both source trees.

---

### Pitfall 10: Component Consolidation Changes Import Paths Used by 36 Direct Hook Consumers

**What goes wrong:** 76 component files import from `#hooks/api/`. Reorganizing hook files (even just renaming) requires updating every import in every consuming component. With 36 components directly using TanStack Query hooks (useQuery, useMutation), plus 76 importing any hook via the `#hooks` path alias, a single rename can require changes in 20+ files.

**Why it happens:** The `#hooks` path alias resolves to `src/hooks/`. Components import hooks by exact file name: `import { useProperties } from '#hooks/api/use-properties'`. There is no barrel file (correctly, per project rules -- no barrel files or re-exports). This means every consumer must know the exact file name.

**The cascade math:** Renaming `use-properties.ts` to `use-property-queries.ts` requires:
- Updating 12+ component imports
- Updating 3+ page-level imports
- Updating 2+ test file imports
- Updating 4+ other hook file imports (cross-references)
- Total: ~21 files for a single rename

**Consequences:**
- Massive diff for a cosmetic change (rename)
- High chance of missing one import (TypeScript catches it, but the fix iteration is slow)
- Git blame becomes less useful -- every file in the diff shows the rename as the last change

**Prevention:**
1. Only rename hook files when the current name is actively misleading or violates a convention
2. Use IDE "rename symbol" / "move file" refactoring that updates all imports automatically
3. Verify with `pnpm typecheck` after every rename before committing
4. Batch renames: if renaming multiple files, do them all in one commit to keep the diff contained
5. Prefer adding new exports to existing files over splitting into new files (when under the 300-line limit)

**Detection:** `pnpm typecheck` shows "Cannot find module" errors for every stale import path.

**Phase to address:** Hook consolidation phase. Minimize renames; prefer internal restructuring over file-level reorganization.

---

## Minor Pitfalls

### Pitfall 11: design-system.ts Constants Diverge from Tailwind Theme

**What goes wrong:** The `design-system.ts` file defines TypeScript constants for typography, spacing, colors, border radius, shadows, and animations. These constants parallel (but do not drive) the Tailwind `@theme` block in `globals.css`. During polish, a developer updates the Tailwind theme but not the TypeScript constants, or vice versa. The constants are used for OG images (Satori), email templates, and component presets that do not use Tailwind classes.

**Prevention:**
1. After any `globals.css` `@theme` change, check `design-system.ts` for the same token
2. Consider adding a unit test that validates `BRAND_COLORS_HEX.primary` matches the CSS custom property value (extractable from the CSS file via regex)
3. Document which constants are "source of truth" vs "derived" at the top of `design-system.ts`

**Detection:** Compare hex values in `design-system.ts` with CSS `oklch()` values in `globals.css` using a color converter. If they represent different colors, the constants have diverged.

**Phase to address:** UI polish phase. Low risk -- only affects OG images and emails.

---

### Pitfall 12: Removing Unused Hook Exports Breaks Future Consumption

**What goes wrong:** A hook file exports both a query hook and its underlying query key factory. The factory might not be consumed today but is available for prefetching, cache warming, or use in other hooks later. Removing "unused" exports based on current import count eliminates future extensibility.

**Prevention:**
1. Never remove a `queryOptions()` factory export that follows the established naming pattern -- it is the API surface for that domain
2. Only remove exports that are clearly duplicates or misspellings
3. TypeScript's `noUnusedLocals` catches unused local variables but NOT unused exports -- exports have no lint warning by default

**Detection:** A future developer tries to `import { leaseQueries } from '#hooks/api/query-keys/lease-keys'` and finds the export missing.

**Phase to address:** Hook consolidation phase. Conservative removal policy.

---

### Pitfall 13: Vendored tour.tsx (1,732 lines) Gets "Cleaned Up"

**What goes wrong:** The `tour.tsx` component is a vendored copy from Dice UI upstream, explicitly exempt from the 300-line rule per CLAUDE.md. During component consolidation, a developer sees the 1,732-line file, notes it violates the 300-line rule, and attempts to split it. This breaks the ability to update from upstream (diff becomes unmergeable) and may break the eslint-disable suppressions that are legitimate upstream patterns.

**Prevention:**
1. Mark `tour.tsx` clearly in any consolidation audit as "VENDORED -- DO NOT SPLIT OR MODIFY"
2. If updates are needed, pull from upstream Dice UI and replace the file wholesale
3. The existing `eslint-disable` comments are intentional upstream patterns, not cleanup targets

**Detection:** `tour.tsx` gets split into multiple files or has eslint-disable comments removed -- tour functionality breaks or lint errors appear.

**Phase to address:** Component audit phase. Mark as skip in the audit.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Hook file renames | 27 test files have hardcoded `vi.mock()` paths | Grep for all mock paths before renaming; update in same commit |
| ownerDashboardKeys movement | 8 hook files + 22 invalidation calls break | Extract to `query-keys/` file, keep re-export in original file |
| tenantPortalKeys consolidation | Circular dependency between 6 tenant hook files | Mark `use-tenant-portal-keys.ts` as intentionally separate |
| CVA variant changes | 19 UI components + 50 test files reference variant names | Grep for variant usage before changing; inventory variants first |
| globals.css token changes | 1,702 lines, no test coverage for CSS variables | Test at 375px/768px/1440px; verify dark mode parity |
| Query key restructuring | Cache invalidation chains break silently | Keep key arrays identical when moving between files |
| Re-export removal | Consumers importing from re-exporting file break | Grep for all imports from the re-exporting file first |
| Mobile-first spacing changes | Horizontal overflow at 375px, touch target violations | Check every change at mobile viewport; never remove `min-h-11` |
| Shared type removal | Edge Functions in Deno import separately | Grep both `src/` and `supabase/` before removing any type |
| Component import path changes | 76 component files reference `#hooks/api/` paths | Batch renames; use IDE refactoring; verify with typecheck |
| UI polish border-radius/shadow | Changes affect all instances of a design token | Scope changes to specific components with Tailwind utility classes, not global tokens |
| tour.tsx cleanup | Vendored 1,732-line file gets split | Mark as VENDORED -- DO NOT MODIFY in audit |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| vi.mock() + file renames | Mock path strings are not type-checked | Grep `vi.mock.*<filename>` before any rename |
| queryOptions() + file moves | Key array structure changes when file moves | Keep identical `queryKey` arrays; only change which file contains the factory |
| invalidateQueries() + key changes | Mutation onSuccess handlers reference old key prefix | Grep every `invalidateQueries` call for the moved key's prefix |
| CVA variants + Tailwind v4 | v4 uses `@theme` instead of `tailwind.config.ts` | Variant classes must reference CSS custom properties, not config values |
| shadcn updates + customizations | `npx shadcn@latest add <component>` overwrites customizations | Never run shadcn add on customized components; diff upstream changes manually |
| globals.css + design-system.ts | Two sources for the same design tokens | `globals.css` is authoritative; `design-system.ts` is a derived mirror for non-CSS contexts |
| useMediaQuery + responsive polish | Changing breakpoint values in CSS without updating JS hook | `BREAKPOINTS` in `design-system.ts` must match `@theme` breakpoints |
| Pre-commit hooks + large refactors | All 1,415 tests run on every commit | Batch related changes; avoid committing partial renames |
| Deno Edge Functions + shared types | Frontend type removal does not trigger Deno typecheck | Run `deno check` in supabase/functions after type changes |
| Next.js 16 + 'use client' boundaries | Moving a server component into a client component tree silently makes it client | Verify `'use client'` directives when restructuring component hierarchy |

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Rename hook files for aesthetics | Cleaner directory listing | 20+ file import updates per rename | Only when name is genuinely misleading |
| Remove all backward-compat re-exports | Cleaner code, fewer indirect imports | Breaking change for every consumer | Only after updating all consumers first |
| Merge tenant portal hooks into one file | Fewer files in `hooks/api/` | Reintroduces circular dependency | Never -- the split exists for a structural reason |
| Global CSS token changes for polish | Consistent design across app | Breaks OG images, emails, dark mode if mirrors not updated | Only with full audit of token consumers |
| Remove "unused" query key exports | Smaller API surface | Blocks future prefetching, SSR cache warming | Never remove queryOptions factories |
| Split vendored tour.tsx | Follows 300-line rule | Breaks upstream merge capability | Never -- exemption is documented |
| Change button variant names | Cleaner CVA definitions | Every consumer and test must update | Only for variants with zero usage |

---

## "Looks Done But Isn't" Checklist

- [ ] **vi.mock paths:** After any hook rename, `pnpm test:unit` passes (all 1,415 tests, not just the renamed file's tests)
- [ ] **Dashboard invalidation:** After ownerDashboardKeys changes, manually test: create a property -> dashboard stats update immediately
- [ ] **Tenant portal:** After any tenant hook changes, tenant dashboard loads without errors (lease + payments + maintenance + autopay all resolve)
- [ ] **Mobile responsiveness:** After any spacing/padding changes, check 375px viewport for horizontal overflow
- [ ] **Touch targets:** After any button/input size changes, all interactive elements still have `min-h-11` (44px minimum)
- [ ] **Dark mode:** After any color token changes, toggle dark mode -- no white backgrounds on dark, no invisible text
- [ ] **OG images:** After brand color changes, share a page URL and verify the preview card uses correct colors
- [ ] **Edge Functions:** After removing any shared type, run `cd supabase/functions && deno test --allow-all --no-check tests/`
- [ ] **Accessibility:** After any structural changes, verify skip-to-content link works, breadcrumb has `aria-label`, icon buttons have `aria-label`
- [ ] **Pre-commit:** Commit passes pre-commit hooks (typecheck + lint + unit tests + coverage + gitleaks + duplicate-types)
- [ ] **Query keys:** After any key factory file changes, verify cache invalidation works for the affected domain

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Broken vi.mock paths (27 test files) | MEDIUM | Grep for stale paths, update strings, run full test suite -- 30-60 min depending on how many tests broke |
| Dashboard invalidation broken | LOW-MEDIUM | Add back the invalidation import, verify with manual test -- 10 min per affected mutation file |
| Circular dependency in tenant hooks | HIGH | Revert the merge, re-extract the shared keys file -- may require reverting entire commit if interleaved with other changes |
| CVA variant rename cascade | MEDIUM | Search-and-replace across all .tsx files, update tests -- 30-60 min for thorough grep |
| CSS token regression | MEDIUM | Compare git diff of globals.css, identify the changed token, test at all viewports -- 30 min |
| Query key structure changed | HIGH | Map old keys to new keys, update all invalidation calls, clear user caches (or wait 5 min for GC) -- 1-2 hours |
| Removed shared type used by Edge Functions | LOW | Re-add the export, run deno check -- 5 min |
| Mobile layout broken by spacing change | LOW | Revert the Tailwind class change, use responsive prefix instead -- 10 min |
| Vendored tour.tsx split | HIGH | Restore from upstream Dice UI, re-apply any project-specific modifications -- 1-2 hours |

---

## Sources

- Codebase analysis: `src/hooks/api/` dependency graph (85 hook files, 16 query key factories, 170 invalidation calls across 32 files)
- Codebase analysis: `src/components/ui/` (19 CVA-customized components out of 65 total UI components)
- Codebase analysis: `vi.mock()` usage across 27 test files targeting hook modules
- Codebase analysis: `ownerDashboardKeys` imported by 8 hook files with 22 invalidation call sites
- Codebase analysis: `tenantPortalKeys` consumed by 6 hook files in an acyclic dependency tree
- Codebase analysis: `globals.css` (1,702 lines with `@theme` tokens, no dark mode test coverage)
- Codebase analysis: `design-system.ts` (548 lines of TypeScript token mirrors)
- Codebase analysis: `lefthook.yml` (parallel pre-commit: gitleaks + duplicate-types + lockfile + lint + typecheck + unit-tests with coverage)
- Codebase analysis: `components.json` (shadcn new-york style, 10 registered UI component registries)
- Project rule: CLAUDE.md "No barrel files / re-exports" and "Max 300 lines per component" with tour.tsx exemption

---
*Pitfalls research for: TenantFlow v1.2 Production Polish & Code Consolidation milestone*
*Researched: 2026-03-07*
