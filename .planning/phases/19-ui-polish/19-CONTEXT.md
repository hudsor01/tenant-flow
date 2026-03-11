# Phase 19: UI Polish - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the public-facing UI consistent and polished across marketing, auth, blog, dashboard, tenant portal, and billing pages. Redesign the marketing navbar, enforce consistent button/card/layout styling, and fix responsive issues encountered during the cleanup.

</domain>

<decisions>
## Implementation Decisions

### Navbar redesign
- Keep the floating pill design — refine blur, shadow, scroll behavior, and spacing
- Remove ALL auth-state switching logic (isAuthenticated, AUTH_NAV_ITEMS, useAuth in navbar) — authenticated users are redirected by proxy middleware and never see marketing pages
- Guest-only nav links: Features, Pricing, About, Resources dropdown (Help, Blog, FAQ, Contact) — current structure stays
- CTA button: "Get Started" → /pricing — keep current behavior
- Mobile (below md): navbar becomes full-width sticky top bar, not floating pill — floating only on desktop/tablet
- Simplify navbar sub-components after removing auth logic

### Button & CTA cleanup
- Single border-radius: rounded-md on ALL buttons — remove rounded-none from masculine, rounded-lg from navbar
- Remove niche variants: premium, masculine, navbar, navbarGhost, lightboxNav — replace usages with core variants (default/secondary/ghost) + className where needed
- Trim sizes to essentials: keep default, sm, lg, icon — remove xl, icon-sm, icon-lg, mobile-full, touch-friendly, navbar
- All CTAs use default primary (bg-primary) — no special gradient or shadow treatment anywhere

### Card & layout consistency
- Cards switch from rounded-sm to rounded-md — match button radius for visual harmony
- Aggressive variant consolidation: keep ~6 core variants (default, elevated, interactive, pricing, pricingPopular, stat) — remove portalFeature/portalFeatureAccent/portalFeatureSecondary/billingInfo/sectionFeature/bento/showcase/testimonial/accordion/glass/glassStrong/glassPremium and replace with core variant + className
- Shadow strategy: shadow-sm at rest, shadow-md on hover for interactive cards — no shadow-xl or shadow-2xl
- Same spacing/typography scale everywhere: p-6 for cards, gap-6 for sections, consistent heading sizes across marketing and app

### Responsive polish
- Fix responsive issues during variant cleanup (as files are touched), not as a separate pass
- Text overflow: truncate with ellipsis on mobile — no layout breakage
- Phase 20 browser audit will do systematic verification after

### Claude's Discretion
- Mobile nav patterns per page group (marketing hamburger vs dashboard bottom bar vs tenant bottom bar) — pick what fits each context
- Exact spacing values when normalizing across sections
- Which card usages need className overrides after variant removal vs which can use core variants as-is
- Whether any removed button/card variants need migration to a different core variant vs inline styles

</decisions>

<specifics>
## Specific Ideas

- "When logged in, they should not see this homepage — if logged in they should see their dashboard environment, not any of these marketing pages" — authenticated users never reach marketing pages, so navbar auth logic is dead code
- Consistency is the priority — same radius, same shadows, same spacing everywhere rather than per-section flair

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/layout/navbar.tsx` + 4 sub-files (navbar-desktop-nav, navbar-desktop-auth, navbar-mobile-menu, types.ts) — already well-split from Phase 18
- `src/components/ui/button.tsx` — CVA-based with buttonVariants export, used across entire app
- `src/components/ui/card.tsx` — CVA-based with cardVariants export, 18 variants currently
- `src/components/ui/card-layout.tsx` — wrapper component used for dashboard/tenant sections
- `src/components/layout/page-layout.tsx` — marketing page layout with Navbar + Footer + GridPattern
- `src/components/layout/footer.tsx` — marketing footer

### Established Patterns
- CVA (class-variance-authority) for all component variants — established pattern for button and card
- `cn()` utility for className merging throughout
- Components under 300 lines (Phase 18 guarantee)
- `'use client'` only when needed

### Integration Points
- `src/components/layout/navbar/types.ts` — NavItem type, DEFAULT_NAV_ITEMS, AUTH_NAV_ITEMS constants
- `src/components/layout/navbar/navbar-desktop-auth.tsx` — auth-specific UI to remove
- Button consumers: every page in the app (hundreds of usages)
- Card consumers: marketing sections, dashboard pages, tenant pages, pricing pages
- `src/components/ui/mobile-nav.tsx` — owner dashboard mobile nav (Sheet-based bottom bar)
- `src/components/shell/tenant-shell.tsx` — tenant portal bottom nav

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-ui-polish*
*Context gathered: 2026-03-09*
