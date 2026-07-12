# v9.0 Cross-Phase File-Conflict Map

_Generated from the "Files touched" lists in every phase's RESEARCH.md. This is the guardrail for the "no phase overwrites another's fixes" discipline._

Phases execute **strictly sequentially** (36 → 51); a phase branches only after the prior phase's PR is **merged to main**. Therefore a shared file is only a hazard if an **earlier** phase's fix to that file is later **reverted or clobbered** by a **later** phase editing the same lines. For every shared file below, the later phase's plan MUST `git pull` main first (which already contains the earlier fix) and edit **additively** — never regenerate the file from the audit snapshot.

## Shared files (59)

| File | Phases | Rule |
|------|--------|------|
| `src/app/(owner)/financials/expenses/_components/expense-table.tsx` | 40, 41, 42, 47 | Phase 47 rebases on merged Phase 40 work; edit additively |
| `src/app/robots.ts` | 36, 37, 44, 48 | Phase 48 rebases on merged Phase 36 work; edit additively |
| `src/hooks/api/query-keys/property-keys.ts` | 39, 40, 48, 51 | Phase 51 rebases on merged Phase 39 work; edit additively |
| `src/app/help/page.tsx` | 44, 45, 46 | Phase 46 rebases on merged Phase 44 work; edit additively |
| `src/app/resources/page.tsx` | 44, 45, 46 | Phase 46 rebases on merged Phase 44 work; edit additively |
| `src/components/leases/table/lease-utils.ts` | 41, 43, 51 | Phase 51 rebases on merged Phase 41 work; edit additively |
| `src/components/units/unit-form-fields.tsx` | 38, 42, 51 | Phase 51 rebases on merged Phase 38 work; edit additively |
| `src/hooks/api/query-keys/lease-mutation-options.ts` | 38, 43, 51 | Phase 51 rebases on merged Phase 38 work; edit additively |
| `src/proxy.ts` | 36, 37, 48 | Phase 48 rebases on merged Phase 36 work; edit additively |
| `src/types/core.ts` | 36, 44, 51 | Phase 51 rebases on merged Phase 36 work; edit additively |
| `src/app/(admin)/admin/blog/page.tsx` | 39, 50 | Phase 50 rebases on merged Phase 39 work; edit additively |
| `src/app/(owner)/analytics/financial/page.tsx` | 41, 42 | Phase 42 rebases on merged Phase 41 work; edit additively |
| `src/app/(owner)/financials/expenses/page.tsx` | 40, 41 | Phase 41 rebases on merged Phase 40 work; edit additively |
| `src/app/auth/layout.tsx` | 44, 48 | Phase 48 rebases on merged Phase 44 work; edit additively |
| `src/app/blog/[slug]/blog-post-page.tsx` | 44, 48 | Phase 48 rebases on merged Phase 44 work; edit additively |
| `src/app/blog/page.tsx` | 44, 46 | Phase 46 rebases on merged Phase 44 work; edit additively |
| `src/app/features/features-client.tsx` | 45, 46 | Phase 46 rebases on merged Phase 45 work; edit additively |
| `src/app/pricing/pricing-content.tsx` | 45, 46 | Phase 46 rebases on merged Phase 45 work; edit additively |
| `src/app/resources/landlord-tax-deduction-tracker/tax-deduction-data.ts` | 45, 46 | Phase 46 rebases on merged Phase 45 work; edit additively |
| `src/app/resources/security-deposit-reference-card/page.tsx` | 45, 46 | Phase 46 rebases on merged Phase 45 work; edit additively |
| `src/components/admin/gate-conversion-table.tsx` | 48, 50 | Phase 50 rebases on merged Phase 48 work; edit additively |
| `src/components/blog/newsletter-signup.tsx` | 45, 47 | Phase 47 rebases on merged Phase 45 work; edit additively |
| `src/components/contact/contact-form.tsx` | 38, 51 | Phase 51 rebases on merged Phase 38 work; edit additively |
| `src/components/inspections/inspection-list.client.tsx` | 42, 48 | Phase 48 rebases on merged Phase 42 work; edit additively |
| `src/components/landing/feature-backgrounds.tsx` | 46, 47 | Phase 47 rebases on merged Phase 46 work; edit additively |
| `src/components/leases/detail/lease-detail-utils.ts` | 43, 51 | Phase 51 rebases on merged Phase 43 work; edit additively |
| `src/components/leases/lease-action-buttons.tsx` | 43, 47 | Phase 47 rebases on merged Phase 43 work; edit additively |
| `src/components/leases/wizard/lease-creation-wizard.tsx` | 38, 51 | Phase 51 rebases on merged Phase 38 work; edit additively |
| `src/components/maintenance/detail/maintenance-header-card.tsx` | 47, 51 | Phase 51 rebases on merged Phase 47 work; edit additively |
| `src/components/maintenance/maintenance-form-fields.tsx` | 38, 42 | Phase 42 rebases on merged Phase 38 work; edit additively |
| `src/components/pricing/pricing-card-standard.tsx` | 44, 46 | Phase 46 rebases on merged Phase 44 work; edit additively |
| `src/components/pricing/pricing-comparison-table.tsx` | 45, 46 | Phase 46 rebases on merged Phase 45 work; edit additively |
| `src/components/sections/hero-dashboard-mockup.tsx` | 46, 47 | Phase 47 rebases on merged Phase 46 work; edit additively |
| `src/components/settings/general-settings.tsx` | 37, 51 | Phase 51 rebases on merged Phase 37 work; edit additively |
| `src/components/settings/owner-emergency-contact-section.tsx` | 38, 42 | Phase 42 rebases on merged Phase 38 work; edit additively |
| `src/components/tenants/tenant-detail-sheet.tsx` | 47, 51 | Phase 51 rebases on merged Phase 47 work; edit additively |
| `src/components/tenants/tenants.tsx` | 42, 49 | Phase 49 rebases on merged Phase 42 work; edit additively |
| `src/config/pricing.ts` | 45, 46 | Phase 46 rebases on merged Phase 45 work; edit additively |
| `src/hooks/api/__tests__/use-properties.test.tsx` | 39, 48 | Phase 48 rebases on merged Phase 39 work; edit additively |
| `src/hooks/api/query-keys/blog-keys.ts` | 39, 50 | Phase 50 rebases on merged Phase 39 work; edit additively |
| `src/hooks/api/query-keys/expense-keys.ts` | 39, 40 | Phase 40 rebases on merged Phase 39 work; edit additively |
| `src/hooks/api/query-keys/inspection-keys.ts` | 39, 48 | Phase 48 rebases on merged Phase 39 work; edit additively |
| `src/hooks/api/query-keys/lease-keys.ts` | 39, 51 | Phase 51 rebases on merged Phase 39 work; edit additively |
| `src/hooks/api/query-keys/maintenance-keys.ts` | 39, 51 | Phase 51 rebases on merged Phase 39 work; edit additively |
| `src/hooks/api/query-keys/report-keys.ts` | 39, 40 | Phase 40 rebases on merged Phase 39 work; edit additively |
| `src/hooks/api/query-keys/unit-keys.ts` | 39, 51 | Phase 51 rebases on merged Phase 39 work; edit additively |
| `src/hooks/api/use-properties.ts` | 39, 48 | Phase 48 rebases on merged Phase 39 work; edit additively |
| `src/hooks/use-maintenance-form.ts` | 38, 51 | Phase 51 rebases on merged Phase 38 work; edit additively |
| `src/lib/supabase/__tests__/middleware-routing.test.ts` | 36, 37 | Phase 37 rebases on merged Phase 36 work; edit additively |
| `src/lib/validation/lease-wizard.schemas.ts` | 38, 51 | Phase 51 rebases on merged Phase 38 work; edit additively |
| `src/lib/validation/leases.ts` | 38, 51 | Phase 51 rebases on merged Phase 38 work; edit additively |
| `src/lib/validation/properties.ts` | 38, 51 | Phase 51 rebases on merged Phase 38 work; edit additively |
| `src/lib/validation/units.ts` | 38, 51 | Phase 51 rebases on merged Phase 38 work; edit additively |
| `src/stores/preferences-store.ts` | 49, 51 | Phase 51 rebases on merged Phase 49 work; edit additively |
| `src/stores/properties-store.ts` | 49, 51 | Phase 51 rebases on merged Phase 49 work; edit additively |
| `src/types/api-contracts.ts` | 36, 51 | Phase 51 rebases on merged Phase 36 work; edit additively |
| `src/types/relations.ts` | 48, 51 | Phase 51 rebases on merged Phase 48 work; edit additively |
| `src/types/stripe.ts` | 36, 51 | Phase 51 rebases on merged Phase 36 work; edit additively |
| `supabase/functions/stripe-checkout/index.ts` | 36, 37 | Phase 37 rebases on merged Phase 36 work; edit additively |

## Notable multi-phase files

- **`src/app/(owner)/financials/expenses/_components/expense-table.tsx`** — touched by phases 40 (Type Boundaries), 41 (Component Logic & Analytics), 42 (Dashboard UX & Navigation), 47 (Accessibility). Each later phase must preserve the earlier edits.
- **`src/app/robots.ts`** — touched by phases 36 (Billing & Subscription Lifecycle), 37 (Auth Flows), 44 (Public Site UX), 48 (Routing, SEO & Performance). Each later phase must preserve the earlier edits.
- **`src/hooks/api/query-keys/property-keys.ts`** — touched by phases 39 (Data Layer & Cache Integrity), 40 (Type Boundaries), 48 (Routing, SEO & Performance), 51 (Code Hygiene). Each later phase must preserve the earlier edits.
- **`src/app/help/page.tsx`** — touched by phases 44 (Public Site UX), 45 (Marketing Content Truthfulness), 46 (Marketing UI Consistency). Each later phase must preserve the earlier edits.
- **`src/app/resources/page.tsx`** — touched by phases 44 (Public Site UX), 45 (Marketing Content Truthfulness), 46 (Marketing UI Consistency). Each later phase must preserve the earlier edits.
- **`src/components/leases/table/lease-utils.ts`** — touched by phases 41 (Component Logic & Analytics), 43 (E-sign Flow), 51 (Code Hygiene). Each later phase must preserve the earlier edits.
- **`src/components/units/unit-form-fields.tsx`** — touched by phases 38 (Forms & Validation), 42 (Dashboard UX & Navigation), 51 (Code Hygiene). Each later phase must preserve the earlier edits.
- **`src/hooks/api/query-keys/lease-mutation-options.ts`** — touched by phases 38 (Forms & Validation), 43 (E-sign Flow), 51 (Code Hygiene). Each later phase must preserve the earlier edits.
- **`src/proxy.ts`** — touched by phases 36 (Billing & Subscription Lifecycle), 37 (Auth Flows), 48 (Routing, SEO & Performance). Each later phase must preserve the earlier edits.
- **`src/types/core.ts`** — touched by phases 36 (Billing & Subscription Lifecycle), 44 (Public Site UX), 51 (Code Hygiene). Each later phase must preserve the earlier edits.

## Per-phase file footprint

- **Phase 36 Billing & Subscription Lifecycle** (20 source files)
- **Phase 37 Auth Flows** (14 source files)
- **Phase 38 Forms & Validation** (29 source files)
- **Phase 39 Data Layer & Cache Integrity** (22 source files)
- **Phase 40 Type Boundaries** (12 source files)
- **Phase 41 Component Logic & Analytics** (14 source files)
- **Phase 42 Dashboard UX & Navigation** (21 source files)
- **Phase 43 E-sign Flow** (17 source files)
- **Phase 44 Public Site UX** (19 source files)
- **Phase 45 Marketing Content Truthfulness** (17 source files)
- **Phase 46 Marketing UI Consistency** (34 source files)
- **Phase 47 Accessibility** (36 source files)
- **Phase 48 Routing, SEO & Performance** (32 source files)
- **Phase 49 Client State (Zustand)** (18 source files)
- **Phase 50 Admin Surface** (7 source files)
- **Phase 51 Code Hygiene** (49 source files)
