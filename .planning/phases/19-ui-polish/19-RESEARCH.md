# Phase 19: UI Polish - Research

**Researched:** 2026-03-09
**Domain:** Frontend UI consistency, CVA variant consolidation, Tailwind CSS 4, responsive layout
**Confidence:** HIGH

## Summary

Phase 19 is a pure frontend refactoring phase focused on four discrete workstreams: (1) simplifying the marketing navbar by removing dead auth-state logic, (2) consolidating button CVA variants from 7 to 6 and sizes from 9 to 4, (3) consolidating card CVA variants from 18 to ~6 core, and (4) fixing responsive issues during the variant cleanup. No new libraries, no backend changes, no database migrations.

The codebase already uses CVA 0.7.1 + Tailwind CSS 4.2.1 + Next.js 16.1.6, all of which are current and stable. The `button.tsx` (78 lines) and `card.tsx` (128 lines) are well under the 300-line limit. The navbar is split across 4 sub-files per Phase 18. All changes are mechanical: delete unused CVA variants, find-and-replace consumers of removed variants with core variants + className overrides, and strip auth logic from the navbar tree.

**Primary recommendation:** Work in three sequential waves: (1) navbar simplification (isolated, no cross-cutting impact), (2) button + card variant consolidation (high consumer count, careful find-replace), (3) responsive fixes (touch-up pass on files already modified). Each wave should pass `pnpm typecheck && pnpm lint` before proceeding.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Keep the floating pill design for navbar -- refine blur, shadow, scroll behavior, and spacing
- Remove ALL auth-state switching logic (isAuthenticated, AUTH_NAV_ITEMS, useAuth in navbar) -- authenticated users are redirected by proxy middleware and never see marketing pages
- Guest-only nav links: Features, Pricing, About, Resources dropdown (Help, Blog, FAQ, Contact) -- current structure stays
- CTA button: "Get Started" -> /pricing -- keep current behavior
- Mobile (below md): navbar becomes full-width sticky top bar, not floating pill -- floating only on desktop/tablet
- Simplify navbar sub-components after removing auth logic
- Single border-radius: rounded-md on ALL buttons -- remove rounded-none from masculine, rounded-lg from navbar
- Remove niche variants: premium, masculine, navbar, navbarGhost, lightboxNav -- replace usages with core variants (default/secondary/ghost) + className where needed
- Trim sizes to essentials: keep default, sm, lg, icon -- remove xl, icon-sm, icon-lg, mobile-full, touch-friendly, navbar
- All CTAs use default primary (bg-primary) -- no special gradient or shadow treatment anywhere
- Cards switch from rounded-sm to rounded-md -- match button radius for visual harmony
- Aggressive variant consolidation: keep ~6 core variants (default, elevated, interactive, pricing, pricingPopular, stat) -- remove portalFeature/portalFeatureAccent/portalFeatureSecondary/billingInfo/sectionFeature/bento/showcase/testimonial/accordion/glass/glassStrong/glassPremium and replace with core variant + className
- Shadow strategy: shadow-sm at rest, shadow-md on hover for interactive cards -- no shadow-xl or shadow-2xl
- Same spacing/typography scale everywhere: p-6 for cards, gap-6 for sections, consistent heading sizes across marketing and app
- Fix responsive issues during variant cleanup (as files are touched), not as a separate pass
- Text overflow: truncate with ellipsis on mobile -- no layout breakage

### Claude's Discretion
- Mobile nav patterns per page group (marketing hamburger vs dashboard bottom bar vs tenant bottom bar) -- pick what fits each context
- Exact spacing values when normalizing across sections
- Which card usages need className overrides after variant removal vs which can use core variants as-is
- Whether any removed button/card variants need migration to a different core variant vs inline styles

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-01 | Redesign marketing navbar (visual design, navigation links, auth state handling) | Navbar component tree fully mapped: `navbar.tsx` (136 lines) + 3 sub-components + `types.ts`. AUTH_NAV_ITEMS, useAuth, NavbarDesktopAuth all identified for removal. Mobile below-md behavior change documented. |
| UI-02 | Audit and fix button/CTA consistency (variants, radius, spacing) across all page groups | Button has 7 variants (remove 5 niche) and 9 sizes (remove 5). 210 consumer files identified. Only `icon-sm` has 3 active usages in JSX. No active JSX usages of premium/masculine/navbar/navbarGhost/lightboxNav variants. |
| UI-03 | Audit and fix card and layout consistency (spacing, typography, shadows) across all page groups | Card has 18 variants (remove 12). 83 consumer files. 16 active `cardVariants()` function call usages for niche variants (portalFeature: 5, billingInfo: 3, pricingFeature: 2, pricingFeatureAccent: 2, premium: 1, elevated: 1, default: 2). CSS utilities in globals.css duplicate several card variants. |
| UI-04 | Fix mobile/responsive layout issues across all page groups | Responsive fixes integrated into variant cleanup as files are touched. Existing responsive test files provide verification patterns. Marketing navbar mobile behavior is the primary new responsive work. |
</phase_requirements>

## Standard Stack

### Core (already installed, no changes needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| class-variance-authority | 0.7.1 | Component variant definitions | Already used for button.tsx and card.tsx |
| tailwindcss | 4.2.1 | Utility-first CSS | Project's styling system |
| next | 16.1.6 | React framework | Project framework |
| react | 19.2.4 | UI library | Project UI library |

### Supporting (no new deps)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | (installed) | Icons | Sole icon library per CLAUDE.md |
| @radix-ui/react-slot | (installed) | Button asChild pattern | Already used in button.tsx |

### Alternatives Considered
None -- this phase requires zero new dependencies. All work is refactoring existing CVA definitions and component templates.

## Architecture Patterns

### Component Files Being Modified

```
src/
  components/
    layout/
      navbar.tsx                    # Remove auth logic, mobile responsive change
      navbar/
        navbar-desktop-auth.tsx     # DELETE entire file (dead code)
        navbar-desktop-nav.tsx      # Keep, simplify (no auth nav switching)
        navbar-mobile-menu.tsx      # Rewrite: remove auth, simplify
        types.ts                    # Remove AUTH_NAV_ITEMS export
    ui/
      button.tsx                    # Trim variants & sizes
      card.tsx                      # Trim variants, rounded-sm -> rounded-md
      bento-grid.tsx               # Update card styling to match consolidation
  sections/
    testimonials-section.tsx        # Uses card-standard CSS utility, not CVA variant
    stats-showcase.tsx              # Uses showcase-card CSS utility
    premium-cta.tsx                 # May use premium button variant
    features-section.tsx            # Uses bento-style layout
  pricing/
    portal-billing-info.tsx         # Uses cardVariants({ variant: 'billingInfo' }) x3
    portal-usage-stats.tsx          # Uses cardVariants({ variant: 'portalFeature' }) x5
    portal-feature-grid.tsx         # Uses cardVariants({ variant: 'pricingFeature' }) x2 + pricingFeatureAccent x2
    customer-portal.tsx             # Uses cardVariants({ variant: 'premium' }) x1
```

### Pattern 1: CVA Variant Removal Protocol

**What:** Systematic removal of niche CVA variants with consumer migration
**When to use:** Every variant removal in button.tsx and card.tsx

**Protocol:**
1. Identify all consumers of the variant being removed (grep for variant name)
2. For each consumer, determine replacement: core variant + className OR core variant alone
3. Update consumer file
4. Remove variant from CVA definition
5. Run `pnpm typecheck` to catch any missed references (CVA types are inferred)

```typescript
// BEFORE: Consumer using niche variant
<div className={cardVariants({ variant: 'billingInfo' })}>

// AFTER: Consumer using core variant + className override
<div className={cn(cardVariants({ variant: 'default' }), 'bg-background/70 p-4 border-primary/20')}>

// OR if the styling matches a core variant closely enough:
<div className={cardVariants({ variant: 'default' })}>
```

### Pattern 2: Navbar Auth Removal

**What:** Remove the entire auth-state branch from the navbar component tree
**When to use:** UI-01 navbar redesign

**Key files and changes:**
- `navbar.tsx`: Remove `useAuth`, `useSignOutMutation`, `AUTH_NAV_ITEMS` imports. Remove `isAuthenticated`/`isLoading`/`user` state. Remove `currentNavItems` conditional. Always use `DEFAULT_NAV_ITEMS`.
- `navbar-desktop-auth.tsx`: DELETE file entirely -- all its UI is auth-conditional
- `navbar-mobile-menu.tsx`: Remove `isAuthenticated`/`isLoading`/`user`/`onSignOut` props and all auth-conditional rendering
- `types.ts`: Remove `AUTH_NAV_ITEMS` export

**Replace desktop auth area with:**
```typescript
// Simple Sign In + CTA for guests (no auth state check)
<div className="hidden sm:flex items-center gap-3">
  <Link href="/login" className="...">Sign In</Link>
  <Button asChild><Link href="/pricing">Get Started</Link></Button>
</div>
```

### Pattern 3: Mobile Navbar Responsive Change

**What:** Below `md` breakpoint, navbar changes from floating pill to full-width sticky top bar
**When to use:** UI-01 + UI-04

```typescript
// Responsive navbar classes
<nav className={cn(
  'fixed z-50 transition-all duration-normal',
  // Desktop/tablet: floating pill (centered)
  'md:left-1/2 md:transform md:translate-x-[-50%] md:rounded-2xl md:px-6 md:py-3 md:w-auto',
  // Mobile: full-width sticky top
  'left-0 right-0 top-0 rounded-none px-4 py-2 w-full',
  // Scroll behavior
  isScrolled
    ? 'md:top-2 bg-card/95 backdrop-blur-2xl shadow-xl border border-border/40'
    : 'md:top-4 bg-card/80 backdrop-blur-xl shadow-lg border border-border/20'
)}>
```

### Anti-Patterns to Avoid
- **One-variant-at-a-time deletion:** Don't remove one variant, test, remove next. Batch all button variant removals together (they share no consumers). Same for card variants.
- **Forgetting CSS utility duplicates:** Some card variants (showcase, testimonial, accordion, billingInfo) also exist as CSS utilities in `globals.css`. When removing CVA variants, check if the CSS utility should also be cleaned up or kept for direct class usage.
- **Breaking 300-line rule during migration:** If adding className overrides inflates a consumer file beyond 300 lines, extract a styled wrapper or use a CSS utility instead.
- **Changing card-layout.tsx defaults:** `CardLayout` is a wrapper that uses `<Card>` with default variant. Don't change its behavior during consolidation -- it's used by 83 files.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Variant type checking after CVA removal | Manual prop validation | TypeScript inference from CVA | CVA's VariantProps auto-narrows to only defined variants -- removing a variant definition immediately causes TS errors at all invalid usage sites |
| Responsive navbar behavior | CSS media queries in globals.css | Tailwind responsive prefixes (md:, lg:) | Already the project pattern, stays in component |
| Card styling consistency | New wrapper components | `cn()` with core variant + className | Project already uses this pattern extensively |

**Key insight:** CVA + TypeScript provides automatic migration safety. After removing a variant from the definition, `pnpm typecheck` will catch every consumer still referencing it. This makes the migration mechanical rather than risky.

## Common Pitfalls

### Pitfall 1: Missing cardVariants() Function Call Usages
**What goes wrong:** Grep for `variant="showcase"` (JSX prop) finds nothing, but `cardVariants({ variant: 'showcase' })` (function call) is used in 3 files.
**Why it happens:** Some components use `cardVariants()` directly instead of `<Card variant="...">`, which has a different grep pattern.
**How to avoid:** Always grep for BOTH patterns: `variant="<name>"` AND `variant: '<name>'` AND the variant name as a bare string.
**Warning signs:** TypeScript errors appearing after variant removal that weren't caught by initial grep.

### Pitfall 2: CSS Utility / CVA Variant Duplication
**What goes wrong:** Remove a CVA card variant but the identical styling exists as a CSS utility in `globals.css`, creating confusion about which to use.
**Why it happens:** The codebase has both `cardVariants({ variant: 'testimonial' })` AND `testimonial-card` CSS utility with nearly identical styles.
**How to avoid:** When removing CVA variants, audit `globals.css` utilities and decide: keep CSS utility (if used directly), or remove both. Document the decision.
**Warning signs:** CSS utility names that match removed CVA variant names.

### Pitfall 3: Button Size icon-sm Has Active Consumers
**What goes wrong:** Removing `icon-sm` size breaks 3 files that actively use it.
**Why it happens:** Decision says "remove xl, icon-sm, icon-lg" but icon-sm has real consumers.
**How to avoid:** For each size removal, migrate consumers FIRST. `icon-sm` consumers (3 files) should use `size="icon"` with `className="h-8 w-8"` for the smaller size.
**Where used:**
  - `src/app/(owner)/payments/methods/payment-methods-list.client.tsx:143`
  - `src/app/(tenant)/tenant/payments/methods/tenant-payment-methods.client.tsx:146`
  - `src/components/tenants/tenant-table-row.tsx:105,113`

### Pitfall 4: Card Base Class rounded-sm -> rounded-md Affects ALL Cards
**What goes wrong:** Changing the CVA base class from `rounded-sm` to `rounded-md` applies to every card in the app (83 consumer files), not just marketing cards.
**Why it happens:** The base class in CVA applies to ALL variants including default.
**How to avoid:** This is the intended behavior (user decision: "match button radius for visual harmony"). But verify visually that dashboard cards, form cards, and dialog cards still look correct with the larger radius.
**Warning signs:** Cards inside tight layouts where the extra border radius causes visual clipping.

### Pitfall 5: Navbar Auth Removal May Break Tests
**What goes wrong:** Tests that mock `useAuth` or reference `NavbarDesktopAuth` will fail after removal.
**Why it happens:** Test files import from deleted files or mock hooks that are no longer called.
**How to avoid:** Grep for imports of removed files/hooks in test files. Update or remove tests that reference deleted auth components.
**Where to check:** `src/**/*.test.tsx` files that import from navbar components.

### Pitfall 6: Hero CTA Uses Inline Styles Instead of Button Component
**What goes wrong:** The hero section in `marketing-home.tsx` uses raw `<a>` tags with hand-written Tailwind classes that duplicate `buttonVariants()` output, rather than using the `<Button>` component.
**Why it happens:** It was likely written before button variants were consolidated.
**How to avoid:** During button consistency pass, convert these inline CTAs to use `<Button asChild><Link>...</Link></Button>`.
**Where:** `src/app/marketing-home.tsx` lines 43-69.

## Code Examples

### Button Variant Consolidation (before/after)

```typescript
// BEFORE (button.tsx - 7 variants, 9 sizes)
const buttonVariants = cva('...rounded-md...', {
  variants: {
    variant: {
      default: '...',
      destructive: '...',
      outline: '...',
      secondary: '...',
      ghost: '...',
      link: '...',
      premium: '...',      // REMOVE
      masculine: '...',    // REMOVE
      navbar: '...',       // REMOVE
      navbarGhost: '...',  // REMOVE
      lightboxNav: '...',  // REMOVE
    },
    size: {
      default: '...',
      sm: '...',
      lg: '...',
      xl: '...',             // REMOVE
      icon: '...',
      'icon-sm': '...',      // REMOVE (migrate 3 consumers)
      'icon-lg': '...',      // REMOVE
      'mobile-full': '...',  // REMOVE
      'touch-friendly': '...',// REMOVE
      navbar: '...',         // REMOVE
    },
  },
})

// AFTER (button.tsx - 6 variants, 4 sizes)
const buttonVariants = cva('...rounded-md...', {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      link: 'text-primary underline-offset-4 hover:underline',
    },
    size: {
      default: 'h-10 px-4 py-2 min-h-11',
      sm: 'h-9 rounded-md px-3 min-h-11',
      lg: 'h-11 rounded-md px-8 min-h-11',
      icon: 'h-10 w-10 min-h-11 min-w-11',
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
})
```

### Card Variant Consolidation (before/after)

```typescript
// AFTER (card.tsx - ~6 core variants)
const cardVariants = cva(
  'bg-card text-card-foreground flex flex-col rounded-md border',  // rounded-sm -> rounded-md
  {
    variants: {
      variant: {
        default: 'gap-6 py-6 shadow-sm',
        elevated: 'gap-6 py-6 shadow-md',
        interactive: 'gap-6 py-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer',
        pricing: 'h-full overflow-hidden border-border/60 bg-card/80 shadow-sm backdrop-blur transition-all ease-out hover:-translate-y-1 hover:shadow-md',
        pricingPopular: 'h-full overflow-hidden border-border/60 bg-card/80 shadow-sm backdrop-blur transition-all ease-out hover:-translate-y-1 hover:shadow-md ring-2 ring-primary/70',
        stat: 'group relative p-6 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-md hover:shadow-primary/5',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)
```

### Consumer Migration Examples

```typescript
// portal-usage-stats.tsx: portalFeature -> default + className
// BEFORE:
<div className={cardVariants({ variant: 'portalFeature' })}>

// AFTER:
<div className={cn(
  cardVariants({ variant: 'default' }),
  'text-center p-4 bg-background/50 border-muted/30 hover:bg-primary/5 transition-all'
)}>

// portal-billing-info.tsx: billingInfo -> default + className
// BEFORE:
<div className={cardVariants({ variant: 'billingInfo' })}>

// AFTER:
<div className={cn(
  cardVariants({ variant: 'default' }),
  'bg-background/70 p-4 border-primary/20'
)}>

// customer-portal.tsx: premium -> elevated
// BEFORE:
cardVariants({ variant: 'premium' })

// AFTER:
cardVariants({ variant: 'elevated' })
// (elevated has shadow-md which matches premium's shadow-lg intent, just toned down per decision)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Many niche CVA variants per use case | Few core variants + className composition | Phase 19 decision | Reduces variant count from 18 to 6 for cards, 7 to 6 for buttons |
| Auth-aware marketing navbar | Guest-only marketing navbar | Phase 19 decision (proxy handles auth routing) | Removes useAuth, signOut, AUTH_NAV_ITEMS from navbar tree |
| rounded-sm on cards | rounded-md on cards | Phase 19 decision | Visual harmony with rounded-md buttons |
| shadow-xl/2xl on hover | shadow-md max on hover | Phase 19 decision | Subtler, more consistent elevation system |

## Consumer Impact Matrix

### Button Variant Consumers (removal targets)

| Variant | JSX `variant=` usages | `buttonVariants()` usages | Total | Migration |
|---------|----------------------|--------------------------|-------|-----------|
| premium | 0 | 0 | 0 | Safe delete |
| masculine | 0 | 0 | 0 | Safe delete |
| navbar | 0 | 0 | 0 | Safe delete |
| navbarGhost | 0 | 0 | 0 | Safe delete |
| lightboxNav | 0 | 0 | 0 | Safe delete |

### Button Size Consumers (removal targets)

| Size | JSX `size=` usages | Migration |
|------|-------------------|-----------|
| xl | 0 (only LoadingSpinner, different component) | Safe delete |
| icon-sm | 3 files, 4 usages | Migrate to `size="icon" className="h-8 w-8 min-h-8 min-w-8"` |
| icon-lg | 0 | Safe delete |
| mobile-full | 0 | Safe delete |
| touch-friendly | 0 | Safe delete |
| navbar | 0 | Safe delete |

### Card Variant Consumers (removal targets)

| Variant | `cardVariants()` usages | `<Card variant=...>` usages | Files | Migration Target |
|---------|------------------------|----------------------------|-------|-----------------|
| portalFeature | 5 | 0 | 1 (portal-usage-stats) | default + className |
| portalFeatureAccent | 0 | 0 | 0 | Safe delete |
| portalFeatureSecondary | 0 | 0 | 0 | Safe delete |
| pricingFeature | 2 | 0 | 1 (portal-feature-grid) | default + className |
| pricingFeatureAccent | 2 | 0 | 1 (portal-feature-grid) | default + className |
| billingInfo | 3 | 0 | 1 (portal-billing-info) | default + className |
| premium | 1 | 0 | 1 (customer-portal) | elevated |
| showcase | 0 | 0 | 0 | Safe delete (CSS utility `showcase-card` exists separately) |
| testimonial | 0 | 0 | 0 | Safe delete (CSS utility `testimonial-card` exists separately) |
| accordion | 0 | 0 | 0 | Safe delete (CSS utility `accordion-item` exists separately) |
| sectionFeature | 0 | 0 | 0 | Safe delete |
| bento | 0 | 0 | 0 | Safe delete (bento-grid.tsx uses raw classes) |
| glass | 0 | 0 | 0 | Safe delete |
| glassStrong | 0 | 0 | 0 | Safe delete |
| glassPremium | 0 | 0 | 0 | Safe delete |

## CSS Utility Audit

These `globals.css` utilities overlap with removed CVA variants:

| CSS Utility | Used In | Action |
|-------------|---------|--------|
| `card-standard` | 5+ files (sections, skeletons) | KEEP -- independent CSS utility pattern |
| `card-elevated` | some files | KEEP |
| `card-glass` | some files | KEEP (CSS-only usage, not CVA) |
| `showcase-card` | 1 file (stats-showcase) | KEEP -- used directly, not via CVA |
| `testimonial-card` | 1 file | KEEP -- used directly |
| `accordion-item` | accordion component | KEEP -- used directly |
| `billing-info-card` | may be unused | CHECK and remove if unused |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0 with jsdom |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test:unit` |
| Full suite command | `pnpm test:unit -- --coverage` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | Navbar renders without auth components | unit | `pnpm test:unit -- --run src/components/layout/__tests__/navbar.test.tsx` | Check at implementation |
| UI-02 | Button has exactly 6 variants and 4 sizes | unit | `pnpm test:unit -- --run src/components/ui/__tests__/button-variants.test.tsx` | Wave 0 |
| UI-03 | Card has exactly 6 variants with rounded-md | unit | `pnpm test:unit -- --run src/components/ui/__tests__/card-variants.test.tsx` | Wave 0 |
| UI-04 | No responsive breakage at mobile/tablet/desktop | unit | `pnpm test:unit -- --run src/components/ui/__tests__/responsive-design.test.tsx` | Exists |

### Sampling Rate
- **Per task commit:** `pnpm typecheck && pnpm lint`
- **Per wave merge:** `pnpm test:unit`
- **Phase gate:** `pnpm test:unit -- --coverage` (80% threshold)

### Wave 0 Gaps
- [ ] `src/components/ui/__tests__/button-variants.test.tsx` -- verify only expected variants exist after consolidation
- [ ] `src/components/ui/__tests__/card-variants.test.tsx` -- verify only expected variants exist and rounded-md base class
- [ ] Existing `responsive-design.test.tsx` and `design-consistency.test.tsx` may need updates after variant removal

## Open Questions

1. **CSS utility cleanup scope**
   - What we know: Several CSS utilities in globals.css duplicate removed CVA variants (showcase-card, testimonial-card, accordion-item, billing-info-card)
   - What's unclear: Whether these CSS utilities are used directly in templates (bypassing the CVA card system) or are truly orphaned
   - Recommendation: Grep for each CSS utility class name in templates. Keep if used directly, remove if orphaned. The showcase-card and testimonial-card utilities ARE used directly (confirmed in stats-showcase.tsx and sections).

2. **Proxy does NOT actually redirect authenticated users from marketing pages**
   - What we know: `proxy.ts` marks `/` as a PUBLIC_ROUTE that skips auth checks entirely. Authenticated users CAN visit marketing pages.
   - What's unclear: Whether the user wants to add a redirect or is comfortable with the current behavior
   - Recommendation: Follow the user's stated intent (remove auth logic from navbar). If an authenticated user somehow reaches the marketing page, they see a guest navbar -- this is acceptable given the proxy already routes them to their dashboard/tenant portal on login.

3. **Mobile nav bottom bar padding**
   - What we know: Tenant shell has `safe-area-inset-bottom` on mobile nav. Owner mobile nav does not.
   - What's unclear: Whether owner mobile nav should also get safe-area padding during this cleanup
   - Recommendation: Add safe-area padding to owner mobile nav if the file is touched during responsive fixes (Claude's discretion).

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of all files listed in Architecture Patterns section
- `button.tsx` (78 lines), `card.tsx` (128 lines), `navbar.tsx` (136 lines) -- read in full
- `globals.css` CSS utility definitions -- verified at lines 1363-1513
- Consumer grep results across 210 button consumer files and 83 card consumer files
- `proxy.ts` (115 lines) -- read in full for auth routing verification

### Secondary (MEDIUM confidence)
- CVA 0.7.1 API: TypeScript inference from variant definitions (verified via existing codebase usage patterns)
- Tailwind CSS 4.2.1 responsive prefixes and utility syntax (verified via existing codebase patterns)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all versions verified in package.json
- Architecture: HIGH -- all files read, all consumers mapped via grep
- Pitfalls: HIGH -- based on direct code analysis, not hypothetical concerns
- Consumer impact matrix: HIGH -- comprehensive grep of every variant across entire src/ directory

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- no moving targets, pure refactoring phase)
