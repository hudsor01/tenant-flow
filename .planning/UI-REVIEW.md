# Full App UI Review — TenantFlow

**Audited:** 2026-03-18
**Baseline:** Abstract 6-pillar standards (no UI-SPEC)
**Scope:** 4 domains — Public & Auth, Owner Core, Owner Financial, Tenant Portal

---

## Overall Scores

| Domain | Copy | Visuals | Color | Type | Spacing | UX | Total |
|--------|------|---------|-------|------|---------|-----|-------|
| Public & Auth | 2 | 3 | 3 | 3 | 3 | 3 | **17/24** |
| Owner Core | 3 | 3 | 3 | 2 | 3 | 4 | **18/24** |
| Owner Financial | 3 | 3 | 3 | 3 | 3 | 3 | **18/24** |
| Tenant Portal | 3 | 3 | 3 | 3 | 3 | 3 | **18/24** |
| **Average** | **2.75** | **3** | **3** | **2.75** | **3** | **3.25** | **17.75/24** |

---

## Cross-Domain Priority Fixes (12 total)

### P0 — Credibility & Trust (3 fixes)

1. **Contradictory social proof numbers across marketing pages**
   - "10,000+" (homepage), "35,000+" (pricing), "2,847" (stats), "8,000+" (bento pricing)
   - ROI claims conflict: "30-day ROI" vs "60-day ROI" vs "90-day ROI"
   - Fix: Create `src/config/social-proof.ts` constant, reference everywhere
   - Files: `marketing-home.tsx:59`, `landing/hero-section.tsx:24`, `pricing/page.tsx:120`, `sections/premium-cta.tsx:41`, `sections/stats-showcase.tsx:13`, `pricing/bento-pricing-section.tsx:59`

2. **Payment History "Next Due" card renders permanent Skeleton**
   - `payments/history/page.tsx:106` never fetches data — infinite loading shimmer
   - Fix: Wire to `tenantPaymentQueries.amountDue()` or remove card until data exists

3. **Dashboard greeting hardcodes "Tenant" instead of actual name**
   - `tenant-portal-page.tsx:114`: `const tenantFirstName = 'Tenant'`
   - Fix: Resolve from `user.user_metadata.first_name`, fall back to "there"

### P1 — Typography Consistency (3 fixes)

4. **Inconsistent page heading styles across owner pages**
   - Dashboard: `text-2xl font-semibold`, Properties/Leases/Tenants: `text-2xl font-bold`, Maintenance: `typography-h1`, Units: `typography-h2`
   - Fix: Standardize all page headings to `typography-h1`
   - Files: dashboard.tsx, properties/page.tsx, leases/page.tsx, tenants/page.tsx, maintenance/page.tsx, units/page.tsx

5. **Analytics pages use raw `text-2xl font-semibold` instead of `typography-h1`**
   - Files: analytics/overview/page.tsx:117, financial/page.tsx:93, property-performance/page.tsx:89
   - Fix: Replace with `typography-h1`

6. **Tenant portal heading inconsistency**
   - Payment methods: `typography-h3`, Autopay: `typography-h3`, Maintenance: `typography-h1`
   - Fix: Standardize tenant page headings to `typography-h1`
   - Files: payments/methods/page.tsx:26, autopay/page.tsx:111

### P1 — Dark Mode & Color (2 fixes)

7. **Dark mode broken on pricing success/cancel pages**
   - `bg-primary` full-page background and `from-slate-50 to-white` gradient
   - Fix: Use `PageLayout` wrapper or `bg-background` tokens
   - Files: pricing/success/page.tsx:67, pricing/cancel/page.tsx:12, pricing/complete/page.tsx:137

8. **Raw Tailwind colors bypassing semantic tokens**
   - `text-amber-600 dark:text-amber-400` in maintenance stats and tenant stats
   - Fix: Replace with `text-warning` semantic token
   - Files: maintenance-view.client.tsx:148, tenant-stats-cards.tsx:197

### P1 — Component Consistency (2 fixes)

9. **Native HTML elements bypassing design system**
   - Native `<select>` at analytics/overview/page.tsx:121
   - Raw `<button>` elements across 8+ financials pages
   - Raw `<input>` and `<select>` in tenant maintenance/new/page.tsx:129-155
   - Fix: Replace with shadcn `Select`, `Button`, `Input` components

10. **Units page layout diverges from all other owner pages**
    - Uses `container py-8` instead of `p-6 lg:p-8`
    - Raw spinner instead of Skeleton loading
    - Plain div instead of `Empty` compound component
    - Fix: Align Units page to shared layout pattern

### P1 — Empty States & UX (2 fixes)

11. **Chart empty states use bare "No data" text**
    - 6 chart components show unhelpful "No data" paragraph
    - Fix: Use `Empty` compound component with icon + title + description
    - Files: analytics/financial/revenue-expense-chart.tsx:32, occupancy-charts.tsx:36, lease-charts.tsx:60, maintenance-charts.tsx:56, property-charts.tsx:65, financial-charts.tsx:50

12. **Accept-invite page layout bug**
    - Form header and signup form are unwrapped siblings in flex container
    - Fix: Wrap in shared container div matching login page pattern
    - File: accept-invite/page.tsx:176-203

---

## Minor Recommendations (by domain)

### Public & Auth
- Undefined `text-sm-foreground` class used 8 times in pricing pages
- Missing skip-to-content link on marketing pages (only in app shells)
- Search page is entirely static/non-functional
- FinalCta h2 missing explicit font size class
- Double `section-content` wrapping on pricing/cancel page
- Pricing FAQ raw `&apos;` entities in JS string (not JSX)

### Owner Core
- Property detail uses plain div instead of `NotFoundPage` for 404
- Hardcoded hex colors in export/print HTML templates
- Dashboard double-padding from `p-6` inside AppShell's `p-4 lg:p-6`
- Arbitrary SelectTrigger widths: `w-[130px]`, `w-[140px]`, `w-[150px]`, `w-[160px]`
- Quick actions dock hidden on mobile with no replacement
- Error copy varies between pages (some expose `error.message`)

### Owner Financial
- `window.location.reload()` used instead of TanStack Query refetch in analytics error states
- Balance sheet formats numbers with `Math.floor().toLocaleString()` instead of `formatCurrency`
- Analytics "Top Performing Properties" hardcoded to empty array (incomplete)
- Billing plans page uses `container max-w-7xl py-8` instead of `p-6 lg:p-8`

### Tenant Portal
- Payment description fallback shows "Stripe payment intent" (technical term)
- Lease documents shows both a document row AND "No documents" simultaneously
- No autopay disable confirmation dialog
- Settings page at 291 lines (approaching 300-line limit)
- Inline `style=` with CSS custom properties in dashboard bypasses Tailwind
- Maintenance shows raw UUID as unit identifier
- Empty `<span className="size-8" />` spacer in settings heading

---

## Typography Enhancement (Implemented)

During this audit, the typography system was enhanced:
- **Roboto** replaces Inter as `--font-sans` (body/UI text)
- **Playfair Display** added as `--font-display` (hero/marketing headlines)
- Level 1 display utilities (`typography-hero`, `typography-display-*`) now use Playfair Display
- `typography-display-sans-*` variants kept on Roboto for CTAs/features
- `font-display` Tailwind utility available for direct use

---

## Audit Complete

**Combined Score: 71/96 (74%)**
**Priority Fixes: 12**
**Minor Recommendations: 23**
