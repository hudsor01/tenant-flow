# Tenant Portal Domain -- UI Review

**Audited:** 2026-03-18
**Baseline:** Abstract 6-pillar standards (no UI-SPEC)
**Screenshots:** Not captured (dev server on port 3000 but tenant portal requires auth)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Good contextual copy throughout; hardcoded "Tenant" fallback and a permanent skeleton bug on Payment History |
| 2. Visuals | 3/4 | Strong visual hierarchy with BorderBeam accents and stat cards; minor icon-button accessibility gaps |
| 3. Color | 3/4 | Semantic color tokens used consistently; one raw Tailwind color leak (`text-amber-600`) |
| 4. Typography | 3/4 | Consistent use of utility classes; minor heading level inconsistency across pages |
| 5. Spacing | 3/4 | Standard Tailwind scale used well; inline `style=` with CSS custom properties in dashboard bypasses Tailwind |
| 6. Experience Design | 3/4 | Excellent loading/error/empty coverage; permanent Skeleton on "Next Due" card is a UX bug |

**Overall: 18/24**

---

## Top 3 Priority Fixes

1. **Payment History "Next Due" card renders a permanent Skeleton** -- Users see a loading shimmer that never resolves because no data is fetched for this card. This erodes trust in the payments area. -- Replace the unconditional `<Skeleton>` in `payments/history/page.tsx:106` with actual next-due-date data from the `tenantPaymentQueries.amountDue()` query, or remove the card until data is available.

2. **Dashboard greeting always says "Welcome back, Tenant"** -- The hardcoded fallback `const tenantFirstName = 'Tenant'` in `tenant-portal-page.tsx:114` means every user sees a generic name instead of their actual first name. -- Resolve tenant first name from user metadata (`user.user_metadata.first_name`) or tenant settings, falling back to "there" (e.g., "Welcome back, there") rather than the ambiguous "Tenant".

3. **Raw Tailwind color `text-amber-600 dark:text-amber-400` in stats card** -- Using raw color tokens instead of semantic tokens (`text-warning`) breaks theme consistency and dark mode contract. -- In `tenant-stats-cards.tsx:197`, replace `text-amber-600 dark:text-amber-400` with `text-warning` to use the semantic token.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**Strengths:**
- Contextual CTAs: "Pay Now", "Submit Request", "Sign Lease", "Enable Autopay" are all action-specific
- Empty states have helpful guidance: "Submit a request if you need help with something" (maintenance/page.tsx:99)
- Onboarding page has clear progressive status messages: "Verifying your invitation...", "Activating your account...", "All set!" (onboarding/page.tsx:107-111)
- Payment flow has distinct states: paid, not available, no rent due, and late warning with penalty amount
- Autopay page includes "How Autopay Works" explainer with numbered steps (autopay/page.tsx:273-278)
- Error states provide actionable guidance: "Contact your property manager" (onboarding), "Please try refreshing the page" (payment methods)

**Issues:**
- `tenant-portal-page.tsx:114` -- Hardcoded `const tenantFirstName = 'Tenant'` with a comment "Fallback, could come from settings" -- this is user-facing and looks unfinished
- `payments/page.tsx:81` -- Payment description fallback is "Stripe payment intent" -- this is a technical term that should be "Monthly Rent" or "Rent Payment"
- `lease/page.tsx:202` -- "No documents available yet" always renders below the lease agreement row, creating contradictory messaging (shows a document row AND a "no documents" message simultaneously)
- `maintenance/page.tsx:153` -- Displays raw `request.unit_id` (a UUID) as the unit identifier instead of a human-readable unit number

### Pillar 2: Visuals (3/4)

**Strengths:**
- BorderBeam animation on payment-related cards creates clear focal point and urgency cues
- Stat cards use color-coded indicators (success/warning/destructive) for payment status
- NumberTicker animations on dashboard stats add polish
- BlurFade entrance animations create visual flow
- Kanban board uses scroll-snap on mobile, grid on desktop (tenant-maintenance-kanban.tsx:138-139)
- Mobile bottom nav with clear 4-item structure (Home, Payments, Maintenance, Settings)
- Inspection page has photo grid with overflow indicator (+N)

**Issues:**
- `documents/page.tsx:76-77` -- View button (Eye icon) has `aria-label` but no tooltip/visible label, making it discoverable only via screen reader
- `settings/page.tsx:86` -- Empty `<span className="size-8" />` next to "Settings" heading creates invisible spacer -- likely a removed icon leaving dead space
- Mobile bottom nav does not include Documents or Lease links -- tenants must use the sidebar hamburger menu for these, which may be a discoverability issue for mobile-heavy users
- Maintenance table on desktop shows `request.description` in the "Description" column but uses the full description text without truncation, while the `TenantMaintenanceCard` (mobile) truncates at 100 chars -- inconsistent behavior

### Pillar 3: Color (3/4)

**Strengths:**
- No hardcoded hex colors or `rgb()` values anywhere in tenant portal code
- Semantic tokens used consistently: `text-primary`, `text-destructive`, `text-warning`, `text-success`, `text-muted-foreground`
- Dark mode handled via semantic tokens with explicit dark variants where needed (e.g., `dark:text-warning` on signature alert)
- Status-to-color mapping is systematic: paid=success, overdue=destructive, due_today=warning, upcoming=muted

**Issues:**
- `tenant-stats-cards.tsx:197` -- `text-amber-600 dark:text-amber-400` uses raw Tailwind color instead of `text-warning` semantic token
- `tenant-maintenance-card.tsx:20-25` -- Priority color map uses uppercase keys (`URGENT`, `HIGH`) but the maintenance page passes lowercase values, creating a potential mismatch where the semantic colors may not apply

### Pillar 4: Typography (3/4)

**Sizes in use:** `typography-h1`, `typography-h2`, `typography-h3`, `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`
**Weights in use:** `font-medium`, `font-semibold`

**Strengths:**
- Consistent use of `typography-h1` utility for page headings across lease, maintenance, documents, payment history, profile pages
- Descriptions consistently use `text-muted-foreground` for visual subordination
- Two weights maximum (medium/semibold) keeps typographic rhythm clean
- `text-caption` utility class used for timestamps and metadata

**Issues:**
- Heading level inconsistency: Dashboard uses `<h2>` for "Welcome back" (tenant-portal.tsx:90), while all other pages use `<h1>` for their page title. Since the shell does not render a visible `<h1>`, the dashboard technically lacks a proper H1
- Payment methods page uses `typography-h3` for page heading (payments/methods/page.tsx:26), while maintenance list uses `typography-h1` -- inconsistent heading weight for same-level pages
- Autopay page heading uses `typography-h3` (autopay/page.tsx:111) instead of `typography-h1`, making it visually subordinate to sibling pages
- `inspections/[id]/page.tsx:159` uses inline `text-xl font-semibold` instead of a typography utility class

### Pillar 5: Spacing (3/4)

**Strengths:**
- Consistent `space-y-8` for page-level section spacing across most pages
- `space-y-6` for form field spacing within cards
- `gap-4` standard for grid layouts (stats cards, form grids)
- `p-4` / `p-6` used consistently for card padding
- Mobile bottom nav uses `safe-area-inset-bottom` for iPhone notch safety

**Issues:**
- `tenant-portal.tsx:103,121,179` -- Inline `style={{ gap: 'var(--layout-gap-group)' }}` bypasses Tailwind's spacing system. These CSS custom properties are not defined in a visible Tailwind config, making spacing values opaque
- `tenant-portal.tsx:158-161` -- Inline `style={{ minHeight: '2.75rem', padding: 'var(--touch-target-padding)' }}` on the Pay Now button violates the no-inline-styles rule from CLAUDE.md
- Arbitrary value `min-w-[720px]` used in 3 table containers (maintenance, payment history) -- while necessary for horizontal scroll, could be a shared constant
- `min-w-[280px]` in kanban columns (tenant-maintenance-kanban.tsx:77) -- another arbitrary value
- Settings page uses `mt-12` for large section gaps while other pages use `space-y-8` -- inconsistent vertical rhythm

### Pillar 6: Experience Design (3/4)

**Strengths:**
- **Loading states:** Present on all data pages -- Dashboard has full skeleton grid, lease page uses per-field Skeletons, maintenance page has Skeleton rows, payments has Skeleton blocks, autopay has Skeleton placeholder, documents has dedicated `LeaseDocumentsSkeleton`
- **Error states:** Error boundary at root (`error.tsx` using shared `ErrorPage`), documents page has inline error with retry button, maintenance page has destructive-styled error block, maintenance request detail uses `CardLayout` error prop, payment methods has `ErrorBoundary` with descriptive fallback
- **Empty states:** Maintenance uses dashed-border illustration pattern with guidance text, documents shows contextual "No documents available yet", payment history links to "Make Your First Payment" CTA
- **Not found:** Shared `NotFoundPage` used correctly, plus specific `not-found.tsx` in inspections
- **Disabled states:** Pay button disabled during checkout mutation with spinner + "Redirecting to Stripe...", submit button disabled during mutation with "Submitting...", autopay toggle disabled while mutating
- **Destructive action confirmation:** Emergency contact deletion uses `AlertDialog` with explicit "Remove Contact" confirmation
- **Onboarding flow:** Multi-state onboarding page (loading/activating/success/error) with auto-redirect and `aria-live="polite"`
- **Trust signals:** Stripe redirect disclosure ("You will be redirected to Stripe to complete your payment securely"), late fee transparency with exact amounts
- **Accessibility:** Skip-to-content link, Escape key handler + focus trap on mobile sidebar, breadcrumb `aria-label`, `aria-hidden` on decorative icons, `role="dialog"` + `aria-modal` on sidebar overlay

**Issues:**
- `payments/history/page.tsx:106` -- "Next Due" summary card always renders a `<Skeleton>` that never resolves to actual data. This is a permanent loading shimmer that confuses users into thinking data is still loading
- `lease/page.tsx:198-205` -- Lease documents section shows both a document row ("Lease Agreement") AND "No documents available yet" simultaneously -- contradictory UI states
- No confirmation dialog for disabling autopay -- the toggle just fires immediately, which is risky for a financial action
- `maintenance/new/page.tsx:129-155` -- Uses raw `<input>` and `<select>` HTML elements with `className="input"` instead of shadcn `Input`/`Select` components, creating visual inconsistency with the rest of the portal
- Tenant dashboard does not handle the "no active lease" edge case -- if `data?.lease` is null, the page still renders with "Your Property" and "$0.00" instead of showing a meaningful empty state
- `settings/page.tsx` is 291 lines, close to the 300-line component limit, and mixes profile editing, payment comparison, dialogs, and Stripe Connect -- could benefit from extraction

---

## Registry Safety

Registry audit: shadcn initialized but no UI-SPEC with third-party registry declarations. Skipped third-party block audit.

---

## Files Audited

**Shell & Layout:**
- `src/components/shell/tenant-shell.tsx`
- `src/components/shell/tenant-nav.tsx`
- `src/app/(tenant)/layout.tsx`
- `src/app/(tenant)/tenant/layout.tsx`

**Dashboard:**
- `src/app/(tenant)/tenant/page.tsx`
- `src/app/(tenant)/tenant/tenant-portal-page.tsx`
- `src/components/tenant-portal/tenant-portal.tsx`
- `src/components/tenant-portal/tenant-stats-cards.tsx`
- `src/components/tenant-portal/tenant-maintenance-kanban.tsx`

**Lease:**
- `src/app/(tenant)/tenant/lease/page.tsx`

**Maintenance:**
- `src/app/(tenant)/tenant/maintenance/page.tsx`
- `src/app/(tenant)/tenant/maintenance/new/page.tsx`
- `src/app/(tenant)/tenant/maintenance/request/[id]/page.tsx`
- `src/app/(tenant)/tenant/maintenance/request/[id]/tenant-maintenance-request-details.client.tsx`
- `src/components/maintenance/tenant-maintenance-card.tsx`

**Payments:**
- `src/app/(tenant)/tenant/payments/page.tsx`
- `src/app/(tenant)/tenant/payments/new/page.tsx`
- `src/app/(tenant)/tenant/payments/autopay/page.tsx`
- `src/app/(tenant)/tenant/payments/history/page.tsx`
- `src/app/(tenant)/tenant/payments/methods/page.tsx`

**Documents:**
- `src/app/(tenant)/tenant/documents/page.tsx`

**Inspections:**
- `src/app/(tenant)/tenant/inspections/[id]/page.tsx`

**Profile & Settings:**
- `src/app/(tenant)/tenant/profile/page.tsx`
- `src/app/(tenant)/tenant/settings/page.tsx`

**State Pages:**
- `src/app/(tenant)/tenant/error.tsx`
- `src/app/(tenant)/tenant/loading.tsx`
- `src/app/(tenant)/tenant/not-found.tsx`
- `src/app/(tenant)/tenant/onboarding/page.tsx`
- `src/app/(tenant)/tenant/tenant-loading-skeleton.tsx`
