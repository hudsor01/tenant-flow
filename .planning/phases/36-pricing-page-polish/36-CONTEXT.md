# Phase 36: Pricing Page Polish - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Clean up pricing page technical debt: HTML entity bugs, hardcoded social proof numbers, missing noindex metadata on checkout sub-pages, legacy styling in complete page, and mobile layout for the comparison table. SCHEMA-04 (dynamic priceValidUntil) is already satisfied by Phase 33's `createProductJsonLd` factory which the pricing page already consumes.

</domain>

<decisions>
## Implementation Decisions

### HTML Entity Cleanup (PRICE-01)
- **D-01:** Replace all `&apos;` occurrences with literal `'` in `pricing-content.tsx` (2 FAQ answers), `success/page.tsx` (What's next heading + cancelled copy), `cancel/page.tsx` (haven't been charged copy)

### Social Proof Centralization (PRICE-02)
- **D-02:** Add `customerRating: '4.9/5'` and `reviewCount: '2,500+'` to `src/config/social-proof.ts` SOCIAL_PROOF config
- **D-03:** Update `pricing-content.tsx` STATS array to reference `SOCIAL_PROOF.customerRating` and `SOCIAL_PROOF.reviewCount` — no hardcoded numbers remain anywhere in pricing pages

### Success/Cancel Layout Restructure (PRICE-03)
- **D-04:** Both pages migrate to `PageLayout + CardLayout` pattern — drop manual Navbar/Footer/HeroSection
- **D-05:** `success/page.tsx` server/client split: server `page.tsx` exports `noindex` metadata + renders `<SuccessClient />`; client component handles `useSearchParams` + TanStack Query verification
- **D-06:** `cancel/page.tsx` becomes full server component (no client code needed) with `noindex` metadata export
- **D-07:** Both pages use `createPageMetadata({ noindex: true, path: '/pricing/success' | '/pricing/cancel' })` for consistency with Phase 34 pattern
- **D-08:** Visual: centered CardLayout with status icon (Lucide CheckCircle for success, XCircle for cancel), title, description, and action buttons — simpler than current HeroSection+Card combo

### Complete Page Cleanup (PRICE-04)
- **D-09:** Swap all `text-(--color-text-secondary)` → `text-muted-foreground`, `bg-(--color-fill-secondary)` → `bg-muted`, `text-(--color-text-primary)` → `text-foreground`, `border-(--color-border)` → `border-border`, `text-(--color-primary)` → `text-primary` to use project semantic tokens
- **D-10:** Replace 3 inline SVG icon components (SuccessIcon, ErrorIcon, ExternalLinkIcon) with Lucide equivalents (CheckCircle, XCircle, ExternalLink) per zero-tolerance rule #7 (Lucide is sole icon library)
- **D-11:** Keep `complete/page.tsx` as `'use client'` — it needs `useSearchParams` and `useSessionStatus` hook. No metadata export needed (it's a post-checkout page, not public-facing).

### Comparison Table Mobile Layout (PRICE-05)
- **D-12:** Horizontal scroll pattern — wrap the entire comparison table in `overflow-x-auto` with `min-width` on inner grid (e.g., `min-w-[640px]`). Preserves all 4 columns side-by-side, simplest implementation, users expect table scroll on mobile.
- **D-13:** Add visual scroll hint (subtle gradient fade on right edge on mobile) so users know more content exists off-screen

### Pre-Satisfied Requirement
- **D-14:** SCHEMA-04 (dynamic `priceValidUntil`) is already complete — `createProductJsonLd` factory from Phase 33 computes it via `getOneYearFromNow()`, and `pricing/page.tsx` already consumes this factory. Verify via test inspection during plan, no code changes needed. Also delete unreferenced `public/structured-data.json` which still has stale `2025-12-31` hardcoded.

### Claude's Discretion
- Exact copy for success/cancel pages after layout simplification
- Specific Tailwind classes for the scroll-hint gradient on mobile comparison table
- Whether to split the comparison table into its own wave or combine with pricing page work
- Plan wave structure (mechanical cleanup can likely be one wave)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Pricing Page Files (Targets)
- `src/app/pricing/page.tsx` — Main pricing page (already uses createPageMetadata, createProductJsonLd, createFaqJsonLd, createBreadcrumbJsonLd)
- `src/app/pricing/pricing-content.tsx` — STATS + FAQS + PricingStatsGrid/PricingFaqSection/PricingCtaSection exports, has `&apos;` entities and hardcoded 4.9/2500
- `src/app/pricing/success/page.tsx` — Client component with Navbar+Footer+HeroSection, needs server/client split + noindex + PageLayout
- `src/app/pricing/cancel/page.tsx` — Server component with Navbar+Footer+HeroSection, needs PageLayout + noindex metadata export
- `src/app/pricing/complete/page.tsx` — Client component with CSS-var classes and 3 inline SVG icons, needs semantic token + Lucide migration
- `src/app/pricing/_components/pricing-section.tsx` — Wraps BentoPricingSection
- `src/components/pricing/pricing-comparison-table.tsx` — 4-col grid, no mobile breakpoint

### Shared Utilities (Phase 33 Output)
- `src/lib/seo/page-metadata.ts` — `createPageMetadata({ noindex: true })` for success/cancel noindex
- `src/lib/seo/product-schema.ts` — `createProductJsonLd` with dynamic `priceValidUntil` via `getOneYearFromNow()` (pre-satisfies SCHEMA-04)
- `src/lib/seo/product-schema.ts` — `getOneYearFromNow()` helper
- `src/components/seo/json-ld-script.tsx` — `JsonLdScript` component
- `src/components/layout/page-layout.tsx` — PageLayout wrapper (has navbar + footer + page-offset-navbar)
- `src/components/ui/card-layout.tsx` — CardLayout component

### Config Files
- `src/config/social-proof.ts` — SOCIAL_PROOF config to extend with customerRating + reviewCount

### Stale File to Delete
- `public/structured-data.json` — Unreferenced stale JSON with `priceValidUntil: '2025-12-31'` (grep confirms no code references it)

### Design System References
- `CLAUDE.md` — Zero-tolerance rule #7: Lucide Icons for UI (mandates SVG → Lucide migration in complete/page.tsx)
- `CLAUDE.md` — Accessibility Rules: `text-muted-foreground` for muted text, `bg-background` not `bg-white`
- `CLAUDE.md` — Marketing Page Layout: PageLayout wraps all marketing pages, never add `page-offset-navbar` to child content

### Prior Phase Context
- `.planning/phases/34-per-page-metadata/34-CONTEXT.md` — D-04: keyword-first/brand-trailing title format, D-08: migrate inline metadata to shared utilities pattern
- `.planning/phases/33-seo-utilities-foundation/33-02-SUMMARY.md` — `createProductJsonLd` factory with dynamic priceValidUntil

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `createPageMetadata({ noindex: true, ... })` — handles noindex metadata generation (for PRICE-03)
- `PageLayout` — already used by all other marketing pages, replaces manual Navbar+Footer
- `CardLayout` — existing ui component for centered card pattern
- `SOCIAL_PROOF` config — already extended pattern, just need 2 more fields
- Lucide icons `CheckCircle`, `XCircle`, `ExternalLink` — replace inline SVGs
- Tailwind semantic tokens: `text-muted-foreground`, `bg-muted`, `text-foreground`, `border-border`, `text-primary`

### Established Patterns
- Pricing page already uses shared SEO utilities (createProductJsonLd, createFaqJsonLd, createBreadcrumbJsonLd, createPageMetadata) — phase 36 extends this pattern to success/cancel
- Server/client split pattern from Phase 34 (D-01): `*-client.tsx` naming for client pieces
- PageLayout replaces Navbar+Footer everywhere else in marketing
- SOCIAL_PROOF config with `as const` pattern

### Integration Points
- `src/lib/seo/page-metadata.ts::createPageMetadata` accepts `noindex` flag
- `src/config/social-proof.ts` — extend the single `SOCIAL_PROOF` object
- No new dependencies needed — all tools already exist

### Pre-Satisfied Requirements (No-Op)
- SCHEMA-04: `createProductJsonLd` in `src/lib/seo/product-schema.ts:32` uses `getOneYearFromNow()` — dynamic. Pricing page already consumes it. Only action: verify during plan + delete stale `public/structured-data.json`.

</code_context>

<specifics>
## Specific Ideas

- Horizontal scroll on comparison table with min-width constraint — preserves 4-column comparison fidelity, standard mobile table pattern
- Scroll hint gradient fade on right edge (mobile only) so users know more content exists
- success/cancel should feel lighter after migration — remove HeroSection complexity, use simple centered CardLayout with icon + title + description + CTAs
- complete/page.tsx keeps its functional behavior (session status checking via TanStack Query) — only styling + icons change
- Delete `public/structured-data.json` as part of cleanup (stale, unreferenced)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 36-pricing-page-polish*
*Context gathered: 2026-04-09*
