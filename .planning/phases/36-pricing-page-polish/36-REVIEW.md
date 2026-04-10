---
phase: 36
reviewed: 2026-04-09T18:42:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/app/pricing/cancel/page.tsx
  - src/app/pricing/complete/page.tsx
  - src/app/pricing/success/page.tsx
  - src/app/pricing/success/success-client.tsx
  - src/components/pricing/pricing-comparison-table.tsx
  - src/config/social-proof.ts
findings:
  critical: 0
  warning: 4
  info: 2
  total: 6
status: issues_found
---

# Phase 36: Code Review Report

**Reviewed:** 2026-04-09T18:42:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Six files reviewed for pricing page polish phase. The cancel, success, and comparison table components are well-structured. The `complete/page.tsx` has three structural issues: missing `PageLayout` wrapper, missing SEO metadata with `noindex`, and a Stripe dashboard link exposed to end users. The comparison table has an accessibility gap with icons that convey meaning but lack screen reader text. No zero-tolerance violations found. No security vulnerabilities.

## Warnings

### WR-01: complete/page.tsx missing PageLayout wrapper and SEO metadata

**File:** `src/app/pricing/complete/page.tsx:1-216`
**Issue:** This is the only checkout page that lacks a Server Component wrapper with `PageLayout` and `createPageMetadata`. Both `cancel/page.tsx` and `success/page.tsx` follow the pattern of a Server Component exporting metadata with `noindex: true` and wrapping client content in `<PageLayout>`. The complete page is a bare `'use client'` component with no navbar, no footer, and no metadata -- it renders a standalone `min-h-screen` div. This is inconsistent with the phase goal ("migrate to PageLayout, add noindex on checkout pages").

**Fix:** Split into a Server Component page wrapper and a client component, matching the success page pattern:

```tsx
// src/app/pricing/complete/page.tsx (Server Component)
import type { Metadata } from 'next'
import { PageLayout } from '#components/layout/page-layout'
import { createPageMetadata } from '#lib/seo/page-metadata'
import { CompleteClient } from './complete-client'

export const metadata: Metadata = createPageMetadata({
  title: 'Payment Status',
  description: 'View your TenantFlow payment status.',
  path: '/pricing/complete',
  noindex: true
})

export default function CheckoutCompletePage() {
  return (
    <PageLayout>
      <CompleteClient />
    </PageLayout>
  )
}
```

Then rename current `page.tsx` to `complete-client.tsx`, remove the `min-h-screen` and `bg-linear-to-br` wrappers (PageLayout handles that), and export as named `CompleteClient`.

### WR-02: Stripe dashboard link exposed to end users

**File:** `src/app/pricing/complete/page.tsx:181`
**Issue:** The "View details" link sends users to `https://dashboard.stripe.com/payments/{payment_intent_id}`. The Stripe dashboard requires authentication -- end users will hit a login wall or 404. This link is only useful for account admins/owners with Stripe dashboard access. Exposing payment intent IDs in user-facing UI is unnecessary information leakage.

**Fix:** Remove the Stripe dashboard link. If a receipt link is needed, use the Stripe receipt URL from the session data, or link to the customer portal instead:

```tsx
// Remove this block entirely (lines 179-189):
{sessionData?.payment_intent_id && (
  <a href={`https://dashboard.stripe.com/payments/...`} ...>
    View details
  </a>
)}
```

### WR-03: Comparison table icons lack accessible text

**File:** `src/components/pricing/pricing-comparison-table.tsx:111-118`
**Issue:** The `Check` and `Minus` icons in `FeatureCell` convey semantic meaning (feature included vs. not included) but have no `aria-label` or `sr-only` text. Screen readers will skip them entirely, making the comparison table unusable for assistive technology users. Per project accessibility rules, all meaningful icons need accessible labels.

**Fix:**
```tsx
if (typeof value === 'boolean') {
  return value ? (
    <Check
      className={cn('size-5 mx-auto', highlight ? 'text-primary' : 'text-success')}
      aria-hidden="true"
    />
    // Wrap with sr-only span:
    // <span className="sr-only">Included</span>
  ) : (
    <Minus className="size-5 text-muted-foreground/50 mx-auto" aria-hidden="true" />
    // <span className="sr-only">Not included</span>
  )
}
```

Better pattern -- wrap icon + sr-only text together:
```tsx
return value ? (
  <span className="flex-center">
    <Check
      className={cn('size-5', highlight ? 'text-primary' : 'text-success')}
      aria-hidden="true"
    />
    <span className="sr-only">Included</span>
  </span>
) : (
  <span className="flex-center">
    <Minus className="size-5 text-muted-foreground/50" aria-hidden="true" />
    <span className="sr-only">Not included</span>
  </span>
)
```

### WR-04: complete/page.tsx loading state lacks PageLayout

**File:** `src/app/pricing/complete/page.tsx:78-94`
**Issue:** The loading state (lines 78-94) returns a completely different layout from the loaded state -- a bare `min-h-screen flex-center` div with no navigation or footer. Users see a flash of layoutless content, then the full page. Even after WR-01 is fixed (adding PageLayout wrapper), the early return on line 78 bypasses the main component tree and renders without the consistent container spacing used in lines 96-214.

**Fix:** After splitting into Server/Client components per WR-01, the loading state should use the same container pattern as the loaded state:

```tsx
if (loading) {
  return (
    <div className="mx-auto max-w-2xl px-6 section-content lg:px-8">
      <CardLayout title="Checking payment status..." className="w-full text-center">
        <div className="flex-col-center space-y-4">
          <LoadingDots size="lg" variant="primary" />
          <p className="text-muted-foreground">Checking payment status...</p>
        </div>
      </CardLayout>
    </div>
  )
}
```

## Info

### IN-01: Redundant status text rendered twice

**File:** `src/app/pricing/complete/page.tsx:103,118-119`
**Issue:** The status text (`text`) is passed as `CardLayout` description on line 103 and also rendered as an `<h2>` inside the card on lines 118-119. This means "Payment succeeded" or "Error retrieving payment status" appears twice on the page.

**Fix:** Remove the `<h2>` on line 118 since CardLayout already renders the description:
```tsx
// Remove lines 116-121:
{/* Status Text */}
<h2 id="status-text" className="typography-h3 text-foreground mb-8">
  {text}
</h2>
```

### IN-02: Stale id attributes in complete/page.tsx

**File:** `src/app/pricing/complete/page.tsx:106,109,117,124,132,144,192`
**Issue:** Multiple elements have `id` attributes (`payment-status`, `status-icon`, `status-text`, `details-table`, `intent-id`, `intent-status`, `session-status`, `payment-intent-status`, `retry-button`, `view-details`) that appear to be remnants of a vanilla JS implementation. These ids serve no purpose in a React component -- they are not referenced by any CSS, ARIA attributes, or test selectors in this file.

**Fix:** Remove the unused `id` attributes to reduce DOM noise. If they are needed for E2E tests, convert to `data-testid` instead.

---

_Reviewed: 2026-04-09T18:42:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
