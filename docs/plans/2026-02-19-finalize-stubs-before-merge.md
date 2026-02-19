# Finalize Stubs Before Merge — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate all production stubs identified in the codebase audit so the feature/property-image-upload-on-create branch is ready to merge.

**Architecture:** Fixes span four layers — SQL migrations (security/access), NestJS backend services (financial logic, email), Next.js frontend (billing page wiring, maintenance delete, UI text), and test cleanup. Tasks are ordered so migrations come first (everything else depends on stable DB), then backend, then frontend, then cleanup.

**Tech Stack:** PostgreSQL/Supabase migrations, NestJS (TypeScript), Next.js 16 App Router, TanStack Query, Zod, Vitest/Jest

---

## Group A — Database / Security Migrations

### Task 1: Implement `check_user_feature_access` with real tier logic

The function is called by `SubscriptionGuard` on every request and currently returns `true` for everything, bypassing the paywall entirely.

**Files:**
- Create: `supabase/migrations/20260219100000_implement_check_user_feature_access.sql`
- Modify: `supabase/schemas/public.sql` (update function definition to match)

**Step 1: Write the migration**

```sql
-- supabase/migrations/20260219100000_implement_check_user_feature_access.sql
-- Purpose: Replace the check_user_feature_access stub with real plan-tier logic.
-- The function is called by the backend SubscriptionGuard. Previously it returned
-- true unconditionally, bypassing the paywall for all features.
--
-- Feature → minimum plan tier mapping:
--   basic_properties   → any (FREETRIAL, STARTER, GROWTH, TENANTFLOW_MAX)
--   api_access         → GROWTH or TENANTFLOW_MAX
--   white_label        → TENANTFLOW_MAX only
--   (unknown features) → true (permissive default, avoid accidental lockouts)

create or replace function public.check_user_feature_access(
  p_user_id text,
  p_feature text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stripe_customer_id text;
  v_price_id           text;
  v_plan_tier          text;
begin
  -- Resolve Stripe subscription to a plan tier (same logic as get_user_plan_limits)
  if exists (select 1 from pg_namespace where nspname = 'stripe')
     and to_regclass('stripe.customers') is not null
     and to_regclass('stripe.subscriptions') is not null
  then
    select id into v_stripe_customer_id
    from stripe.customers
    where (metadata->>'user_id')::uuid = p_user_id::uuid
    limit 1;

    if v_stripe_customer_id is not null then
      select si.price into v_price_id
      from stripe.subscriptions s
      join stripe.subscription_items si on si.subscription = s.id
      where s.customer = v_stripe_customer_id
        and s.status in ('active', 'trialing')
      order by s.created desc
      limit 1;
    end if;
  end if;

  v_plan_tier := case v_price_id
    when 'price_1RtWFcP3WCR53Sdo5Li5xHiC' then 'FREETRIAL'
    when 'price_1RtWFcP3WCR53SdoCxiVldhb' then 'STARTER'
    when 'price_1RtWFdP3WCR53SdoArRRXYrL' then 'STARTER'
    when 'price_1SPGCNP3WCR53SdorjDpiSy5' then 'GROWTH'
    when 'price_1SPGCRP3WCR53SdonqLUTJgK' then 'GROWTH'
    when 'price_1SPGCjP3WCR53SdoIpidDn0T' then 'TENANTFLOW_MAX'
    when 'price_1SPGCoP3WCR53SdoID50geIC' then 'TENANTFLOW_MAX'
    else 'STARTER' -- no subscription → free/starter level access
  end;

  return case p_feature
    when 'basic_properties' then true  -- available on all plans
    when 'maintenance'      then true  -- available on all plans
    when 'financial_reports' then true -- available on all plans
    when 'api_access'       then v_plan_tier in ('GROWTH', 'TENANTFLOW_MAX')
    when 'white_label'      then v_plan_tier = 'TENANTFLOW_MAX'
    else true  -- unknown feature: permissive (avoid accidental lockouts)
  end;
end;
$$;

comment on function public.check_user_feature_access(text, text) is
  'Returns true if the user''s Stripe plan tier grants access to the named feature.
   Features: basic_properties, maintenance, financial_reports (all tiers);
   api_access (GROWTH+); white_label (TENANTFLOW_MAX only).
   Unknown features return true (permissive default).';

grant execute on function public.check_user_feature_access(text, text) to service_role;
```

**Step 2: Run migration against local Supabase**

```bash
cd /Users/richard/Developer/tenant-flow
npx supabase db push --local
```

Expected: migration applies cleanly.

**Step 3: Update schema dump**

Find the old `check_user_feature_access` function definition in `supabase/schemas/public.sql` (around line 39) and replace the entire `CREATE FUNCTION public.check_user_feature_access` block with the new implementation from the migration above (same body, same RETURNS/LANGUAGE/SECURITY DEFINER/SET search_path).

**Step 4: Commit**

```bash
git add supabase/migrations/20260219100000_implement_check_user_feature_access.sql supabase/schemas/public.sql
git commit -m "fix(db): implement check_user_feature_access with real Stripe plan tier logic"
```

---

### Task 2: Fix `active_entitlements` RLS — scope by user

**Files:**
- Create: `supabase/migrations/20260219100001_fix_active_entitlements_rls.sql`

**Step 1: Write the migration**

```sql
-- supabase/migrations/20260219100001_fix_active_entitlements_rls.sql
-- Purpose: Replace the broken USING (true) policy on stripe.active_entitlements.
-- Previously any authenticated user could read all other users' entitlements.
-- Fix: join to stripe.customers to scope reads to the current user only.
--
-- Note: stripe schema RLS uses email-based matching because Stripe's customer
-- metadata stores user_id as text, but active_entitlements is joined via customer_id.

-- Drop the insecure stub policy
drop policy if exists "active_entitlements_select_own" on stripe.active_entitlements;

-- Recreate with proper user scoping
create policy "Users can only read their own active entitlements"
on stripe.active_entitlements
for select
to authenticated
using (
  customer_id in (
    select id
    from stripe.customers
    where (metadata->>'user_id')::uuid = (select auth.uid())
  )
);

comment on policy "Users can only read their own active entitlements"
  on stripe.active_entitlements is
  'Scopes active_entitlements reads to the Stripe customer(s) linked to the
   currently authenticated user via stripe.customers.metadata->>user_id.';
```

**Step 2: Apply and verify**

```bash
npx supabase db push --local
```

**Step 3: Commit**

```bash
git add supabase/migrations/20260219100001_fix_active_entitlements_rls.sql
git commit -m "fix(db): scope active_entitlements RLS to authenticated user's customer records"
```

---

## Group B — Backend Service Fixes

### Task 3: Remove fabricated mortgage interest from tax documents

`tax-documents.service.ts` computes `mortgageInterest = totalExpenses * 0.3` and deducts it from `taxableIncome`. This produces invented tax deductions shown to users.

**Files:**
- Modify: `apps/backend/src/modules/financial/tax-documents.service.ts`

**Step 1: Find the mortgage interest calculation**

Look at lines 78–92 of `tax-documents.service.ts`. The pattern is:

```typescript
const mortgageInterest = totalExpenses * 0.3
const taxableIncome = netOperatingIncome - totalDepreciation - mortgageInterest
```

**Step 2: Replace with zero / not-tracked**

```typescript
// Mortgage interest tracking requires mortgage data to be entered by the user.
// Until mortgage tracking is added to the schema, this is not deducted.
const mortgageInterest = 0
const taxableIncome = netOperatingIncome - totalDepreciation
```

Also update the returned object — `mortgageInterest` stays in the response (set to 0) so the frontend doesn't break.

**Step 3: Verify the test**

```bash
cd /Users/richard/Developer/tenant-flow/apps/backend && npx jest "tax-documents" --forceExit
```

If no test file exists, skip. The change is purely removing a multiplication — no logic to test beyond the type check passing.

**Step 4: Commit**

```bash
git add apps/backend/src/modules/financial/tax-documents.service.ts
git commit -m "fix(financial): remove fabricated mortgage interest from taxable income calculation"
```

---

### Task 4: Remove fabricated line-item breakdowns from income statement

The income statement multiplies totals by fixed percentages to produce subcategory lines (rental income 95%, utilities 15%, etc.). The `expenses` table has no `category` column so real breakdown is impossible without a schema change. Fix: remove the percentage-derived breakdown, surface only real totals.

**Files:**
- Modify: `apps/backend/src/modules/financial/income-statement.service.ts`
- Modify: `packages/shared/src/types/financial-statements.ts` (check if breakdown fields are optional)

**Step 1: Read the full income statement service**

Read `apps/backend/src/modules/financial/income-statement.service.ts` in full.

**Step 2: Find and remove the percentage estimations**

The block looks like:
```typescript
const rentalIncome = totalRevenue * 0.95
const lateFeesIncome = totalRevenue * 0.03
const otherIncome = totalRevenue * 0.02
const propertyManagement = operatingExpenses * 0.1
const utilities = operatingExpenses * 0.15
const insurance = operatingExpenses * 0.1
const propertyTax = operatingExpenses * 0.2
const mortgage = operatingExpenses * 0.3
```

Replace with: use `totalRevenue` as `rentalIncome`, set all expense subcategories to `0`, set `otherIncome` and `lateFeesIncome` to `0`. Keep the structure intact so the API response shape doesn't change. Add comments explaining why.

```typescript
// Revenue: show total as rental income. Subcategory breakdown requires
// expense categorization which is not yet tracked in the database.
const rentalIncome = totalRevenue
const lateFeesIncome = 0
const otherIncome = 0

// Expenses: show total as 'other'. Subcategory breakdown requires
// expense categorization which is not yet tracked in the database.
const propertyManagement = 0
const utilities = 0
const insurance = 0
const propertyTax = 0
const mortgage = 0
const otherExpenses = operatingExpenses
```

**Step 3: Typecheck**

```bash
pnpm --filter @repo/backend typecheck
```

Fix any type errors if the `IncomeStatementData` type requires non-zero values.

**Step 4: Commit**

```bash
git add apps/backend/src/modules/financial/income-statement.service.ts
git commit -m "fix(financial): replace fabricated income statement percentage breakdowns with real totals"
```

---

### Task 5: Document balance sheet estimates

The balance sheet uses `0.06` cap rate and `0.15` depreciation — rough estimates that are better than nothing but should be labelled.

**Files:**
- Modify: `apps/backend/src/modules/financial/balance-sheet.service.ts`

**Step 1: Find the cap rate block (around line 71)**

```typescript
const assumedCapRate = 0.06
const estimatedPropertyValue = totalNOI > 0 ? totalNOI / assumedCapRate : 0
const accumulatedDepreciation = estimatedPropertyValue * 0.15
```

**Step 2: Replace depreciation with 27.5-year schedule to match TaxDocumentsService**

```typescript
const assumedCapRate = 0.06 // industry standard; replace with stored appraisal value when available
const estimatedPropertyValue = totalNOI > 0 ? totalNOI / assumedCapRate : 0
// Use straight-line residential depreciation (27.5 years, same as TaxDocumentsService)
const annualDepreciationRate = 1 / 27.5
const accumulatedDepreciation = estimatedPropertyValue * annualDepreciationRate
```

**Step 3: Commit**

```bash
git add apps/backend/src/modules/financial/balance-sheet.service.ts
git commit -m "fix(financial): align balance sheet depreciation with 27.5-year residential schedule"
```

---

### Task 6: Throw on placeholder email in lease-subscription service

**Files:**
- Modify: `apps/backend/src/modules/leases/lease-subscription.service.ts`

**Step 1: Find the fallback (around line 194)**

```typescript
email: user?.email || `tenant-${tenant.id}@placeholder.local`,
```

**Step 2: Replace with a throw**

```typescript
if (!user?.email) {
  throw new BadRequestException(
    `Tenant ${tenant.id} has no email address. Cannot create Stripe customer.`
  )
}
const email = user.email
```

Then use `email` instead of the inline fallback in the `createCustomerParams` object.

**Step 3: Verify the import** — `BadRequestException` should already be imported. Check the import block at the top of the file.

**Step 4: Run tests**

```bash
cd /Users/richard/Developer/tenant-flow/apps/backend && npx jest "lease-subscription" --forceExit
```

**Step 5: Commit**

```bash
git add apps/backend/src/modules/leases/lease-subscription.service.ts
git commit -m "fix(leases): throw BadRequestException instead of using placeholder.local email fallback"
```

---

### Task 7: Implement Resend bounce and spam complaint handlers

**Files:**
- Modify: `apps/backend/src/modules/email/resend-webhook.controller.ts`

The two high-priority cases are `email.bounced` and `email.complained`. Delivered/opened/clicked can remain as log-only stubs for now.

**Step 1: Read the webhook controller fully**

Read `apps/backend/src/modules/email/resend-webhook.controller.ts` to understand the full class structure, constructor, and what services are injected.

**Step 2: Implement bounce handling**

In the `case 'email.bounced':` block, after the existing `this.logger.warn(...)`:

```typescript
case 'email.bounced':
  this.logger.warn('Email bounced', {
    emailId: processedEvent.emailId,
    recipient: processedEvent.recipient,
    metadata: processedEvent.metadata
  })
  // Record the bounce so this address is suppressed from future sends
  await this.recordEmailSuppression(processedEvent.recipient, 'bounced')
  break
```

**Step 3: Implement spam complaint handling**

```typescript
case 'email.complained':
  this.logger.warn('Email marked as spam', {
    emailId: processedEvent.emailId,
    recipient: processedEvent.recipient
  })
  await this.recordEmailSuppression(processedEvent.recipient, 'complained')
  break
```

**Step 4: Add the `recordEmailSuppression` private method**

Check if the class has a Supabase service injected. If so, add:

```typescript
private async recordEmailSuppression(
  email: string,
  reason: 'bounced' | 'complained'
): Promise<void> {
  try {
    const adminClient = this.supabaseService.getAdminClient()
    const { error } = await adminClient
      .from('email_suppressions')
      .upsert({ email, reason, suppressed_at: new Date().toISOString() }, { onConflict: 'email' })
    if (error) {
      this.logger.error('Failed to record email suppression', { email, reason, error })
    }
  } catch (err) {
    this.logger.error('Unexpected error recording email suppression', { email, reason, err })
  }
}
```

**Step 5: Create the email_suppressions migration**

```bash
# Check if the table already exists
grep -r "email_suppressions" /Users/richard/Developer/tenant-flow/supabase/migrations/
```

If it does NOT exist, create:

`supabase/migrations/20260219100002_create_email_suppressions.sql`

```sql
-- Purpose: Track email addresses that have bounced or complained.
-- Used by the Resend webhook handler to suppress future sends.
create table public.email_suppressions (
  email          text primary key,
  reason         text not null,
  suppressed_at  timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint email_suppressions_reason_check
    check (reason in ('bounced', 'complained'))
);

-- Only the service role (backend) reads/writes this table
alter table public.email_suppressions enable row level security;

create policy "Service role can manage email suppressions"
on public.email_suppressions
for all
to service_role
using (true)
with check (true);

comment on table public.email_suppressions is
  'Email addresses suppressed from future sends due to bounces or spam complaints.';
```

Apply: `npx supabase db push --local`

**Step 6: Typecheck**

```bash
pnpm --filter @repo/backend typecheck
```

**Step 7: Commit**

```bash
git add apps/backend/src/modules/email/resend-webhook.controller.ts \
        supabase/migrations/20260219100002_create_email_suppressions.sql
git commit -m "fix(email): implement bounce and spam complaint suppression in Resend webhook"
```

---

## Group C — Frontend Fixes

### Task 8: Wire billing plans page to real subscription API

The page has `CURRENT_PLAN_ID = null` hardcoded. It needs to call `useSubscriptionStatus()` and `useSubscriptions()` (already exist in `use-billing.ts`) to detect the current plan.

The plans page also uses `process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID` etc. which are NOT in the validated env schema. These env vars need to be added to `env.ts`.

**Files:**
- Modify: `apps/frontend/src/app/(owner)/billing/plans/page.tsx`
- Modify: `apps/frontend/src/env.ts`

**Step 1: Add price ID env vars to env.ts**

In `env.ts`, in the client schema section, add:

```typescript
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID: z.string().optional(),
NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID: z.string().optional(),
NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID: z.string().optional(),
```

In the `runtimeEnv` section, add:

```typescript
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID,
NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID,
```

**Step 2: Wire subscription status into the page**

In `billing/plans/page.tsx`, replace the hardcoded `CURRENT_PLAN_ID` with a real hook call:

At the top of the file, add the import:
```typescript
import { useSubscriptionStatus } from '#hooks/api/use-billing'
```

Remove this line:
```typescript
const CURRENT_PLAN_ID: string | null = null // null means no subscription
```

Inside `BillingPlansPage()`, add:
```typescript
const { data: subscriptionStatus, isLoading: subscriptionLoading } = useSubscriptionStatus()
const hasSubscription = subscriptionStatus?.subscriptionStatus === 'active' ||
                        subscriptionStatus?.subscriptionStatus === 'trialing'
```

The page already uses `currentPlan` and `hasSubscription` — trace through the existing logic. The `currentPlan` is currently derived from `CURRENT_PLAN_ID`. Replace that derivation:

```typescript
// Derive current plan from subscription status
// The billing page checkout flow uses price IDs; we match by priceId to identify current plan
const currentSubscriptionPriceId = null // TODO: extend SubscriptionStatusResponse to include price_id
const currentPlan = hasSubscription
  ? (PLANS.find(p => p.priceId === currentSubscriptionPriceId) ?? PLANS[0])
  : null
```

Note: `SubscriptionStatusResponse` does not currently include the price_id. Add it to the shared type.

**Step 3: Extend SubscriptionStatusResponse**

In `packages/shared/src/types/api-contracts.ts`, update:

```typescript
export interface SubscriptionStatusResponse {
  subscriptionStatus: 'active' | 'trialing' | 'cancelled' | 'past_due' | null
  stripeCustomerId: string | null
  stripePriceId: string | null  // add this
  planTier: string | null        // add this: FREETRIAL | STARTER | GROWTH | TENANTFLOW_MAX
}
```

**Step 4: Update the backend subscription-status endpoint**

Find `GET /api/v1/stripe/subscription-status` in `apps/backend/src/modules/billing/stripe.controller.ts` (or wherever it lives). Add `stripePriceId` and `planTier` to the response by calling `get_user_plan_limits` or querying Stripe.

Read the controller file first to understand its current structure, then add the two new fields.

**Step 5: Wire currentPlan from price ID**

Back in `billing/plans/page.tsx`:

```typescript
const currentPlan = hasSubscription && subscriptionStatus?.stripePriceId
  ? PLANS.find(p => p.priceId === subscriptionStatus.stripePriceId) ?? null
  : null
```

**Step 6: Handle loading state**

Add a loading guard near the top of the returned JSX:

```typescript
if (subscriptionLoading) {
  return <div className="container max-w-7xl py-8"><Skeleton className="h-96" /></div>
}
```

**Step 7: Typecheck and test**

```bash
pnpm typecheck
```

**Step 8: Commit**

```bash
git add apps/frontend/src/app/(owner)/billing/plans/page.tsx \
        apps/frontend/src/env.ts \
        packages/shared/src/types/api-contracts.ts \
        apps/backend/src/modules/billing/stripe.controller.ts
git commit -m "fix(billing): wire plans page to real subscription API, add price ID to subscription status response"
```

---

### Task 9: Wire maintenance delete button to existing backend endpoint

The backend already has `DELETE /api/v1/maintenance/:id` implemented. The frontend just needs to call it.

**Files:**
- Modify: `apps/frontend/src/components/maintenance/detail/maintenance-details.client.tsx`
- Modify: `apps/frontend/src/hooks/api/use-maintenance.ts` (add delete mutation)

**Step 1: Add delete mutation to use-maintenance.ts**

Read `apps/frontend/src/hooks/api/use-maintenance.ts` to understand existing patterns. Then add:

```typescript
export function useDeleteMaintenanceRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/v1/maintenance/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() })
    },
    onError: (error) => handleMutationError(error, 'Delete maintenance request'),
  })
}
```

**Step 2: Wire it in maintenance-details.client.tsx**

At the top of the component, add:

```typescript
import { useDeleteMaintenanceRequest } from '#hooks/api/use-maintenance'
import { useRouter } from 'next/navigation'
```

Inside the component:

```typescript
const router = useRouter()
const deleteMutation = useDeleteMaintenanceRequest()
```

Replace the toast stub:

```typescript
// BEFORE:
onClick={() => toast.info('Delete functionality coming soon')}

// AFTER:
onClick={async () => {
  if (!confirm('Are you sure you want to delete this maintenance request? This cannot be undone.')) return
  await deleteMutation.mutateAsync(request.id)
  router.push('/maintenance')
}}
disabled={deleteMutation.isPending}
```

**Step 3: Run tests**

```bash
pnpm --filter @repo/frontend test:unit -- --run src/components/maintenance
```

**Step 4: Commit**

```bash
git add apps/frontend/src/hooks/api/use-maintenance.ts \
        apps/frontend/src/components/maintenance/detail/maintenance-details.client.tsx
git commit -m "fix(maintenance): wire delete button to existing DELETE /maintenance/:id endpoint"
```

---

### Task 10: Fix "Signed on loading..." literal text in tenant lease page

**Files:**
- Modify: `apps/frontend/src/app/(tenant)/tenant/lease/page.tsx`

**Step 1: Read the surrounding context**

Read `apps/frontend/src/app/(tenant)/tenant/lease/page.tsx` lines 170–200 to understand what lease data is available in scope.

**Step 2: Replace the hardcoded string**

Find line 191:
```tsx
<p className="text-muted">Signed on loading...</p>
```

Replace with the actual lease signed date (check what field holds the signed date — typically `lease.start_date` or `lease.signed_at` from the lease object in scope):

```tsx
<p className="text-muted">
  {lease?.start_date
    ? `Signed on ${formatDate(lease.start_date)}`
    : 'Not yet signed'}
</p>
```

If `formatDate` isn't imported, import it from `#lib/formatters/date`.

**Step 3: Commit**

```bash
git add apps/frontend/src/app/(tenant)/tenant/lease/page.tsx
git commit -m "fix(tenant): replace 'Signed on loading...' literal with actual lease start date"
```

---

### Task 11: Remove "Export" and "Bulk Assign" stub buttons from maintenance list

These buttons do nothing (toast "coming soon"). Per YAGNI, remove them until the feature is implemented.

**Files:**
- Modify: `apps/frontend/src/components/maintenance/maintenance-view.client.tsx`

**Step 1: Remove the export button and handler**

Delete the `handleExport` callback and the button that calls it.

**Step 2: Remove the bulk assign button**

Delete the "Assign Vendor / Bulk assign" button block (around line 310).

**Step 3: Remove unused imports**

After removing buttons, remove any Lucide icons or functions that are now unused (`UserCheck`, etc.).

**Step 4: Typecheck**

```bash
pnpm --filter @repo/frontend typecheck
```

**Step 5: Commit**

```bash
git add apps/frontend/src/components/maintenance/maintenance-view.client.tsx
git commit -m "fix(maintenance): remove export and bulk-assign stub buttons (not yet implemented)"
```

---

### Task 12: Remove "Photo upload" stub from maintenance photos card

The entire `PhotosCard` is a stub. Per YAGNI, replace it with a minimal not-yet-supported state rather than a fake upload button.

**Files:**
- Modify: `apps/frontend/src/components/maintenance/detail/photos-card.tsx`

**Step 1: Replace the upload button with a plain empty state**

```tsx
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#components/ui/card'
import { Image as ImageIcon } from 'lucide-react'

export function PhotosCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Photos</CardTitle>
        <CardDescription>Photo documentation for this request</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="size-8 mx-auto mb-2 opacity-50" />
          <p>Photo upload is not yet available</p>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 2: Commit**

```bash
git add apps/frontend/src/components/maintenance/detail/photos-card.tsx
git commit -m "fix(maintenance): replace photo upload stub button with honest empty state"
```

---

## Group D — Cleanup

### Task 13: Delete vacuous autopay badge test files

**Files:**
- Delete: `apps/frontend/src/app/(tenant)/tenant/__tests__/autopay-badge.test.tsx`
- Delete: `apps/frontend/src/app/(tenant)/tenant/__tests__/autopay-status-visibility.property.test.tsx`

**Step 1: Delete the files**

```bash
rm apps/frontend/src/app/(tenant)/tenant/__tests__/autopay-badge.test.tsx
rm apps/frontend/src/app/(tenant)/tenant/__tests__/autopay-status-visibility.property.test.tsx
```

**Step 2: Run frontend tests to confirm no regressions**

```bash
pnpm --filter @repo/frontend test:unit
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore(tests): delete vacuous autopay badge tests for unbuilt feature"
```

---

### Task 14: Remove dead feature flags from env.ts

`NEXT_PUBLIC_ENABLE_ANALYTICS` and `NEXT_PUBLIC_MAINTENANCE_MODE` are declared in `env.ts` but never consumed anywhere in component code.

**Files:**
- Modify: `apps/frontend/src/env.ts`

**Step 1: Confirm they are unused**

```bash
grep -r "ENABLE_ANALYTICS\|MAINTENANCE_MODE" /Users/richard/Developer/tenant-flow/apps/frontend/src/ --include="*.ts" --include="*.tsx" | grep -v env.ts
```

If no results: they are dead code. Proceed.

**Step 2: Remove from schema and runtimeEnv**

Delete the `NEXT_PUBLIC_ENABLE_ANALYTICS` and `NEXT_PUBLIC_MAINTENANCE_MODE` entries from both the Zod schema block and the `runtimeEnv` block in `env.ts`.

**Step 3: Typecheck**

```bash
pnpm --filter @repo/frontend typecheck
```

**Step 4: Commit**

```bash
git add apps/frontend/src/env.ts
git commit -m "chore: remove dead ENABLE_ANALYTICS and MAINTENANCE_MODE feature flags from env.ts"
```

---

### Task 15: Regenerate Supabase types to fix notification-settings controller

**Step 1: Regenerate types**

```bash
pnpm db:types
```

**Step 2: Check if notification_settings table is now in generated types**

```bash
grep -n "notification_settings" /Users/richard/Developer/tenant-flow/packages/shared/src/types/supabase.ts | head -5
```

**Step 3: If found, update the controller**

In `apps/backend/src/modules/notifications/notification-settings.controller.ts`:
- Replace the manual `NotificationSettingsRow` type with `Database['public']['Tables']['notification_settings']['Row']`
- Remove the `as unknown as SupabaseClient` cast
- Remove the TODO comment block

**Step 4: Typecheck and test**

```bash
pnpm typecheck
cd /Users/richard/Developer/tenant-flow/apps/backend && npx jest "notification" --forceExit
```

**Step 5: Commit**

```bash
git add packages/shared/src/types/supabase.ts \
        packages/shared/src/validation/generated-schemas.ts \
        apps/backend/src/modules/notifications/notification-settings.controller.ts
git commit -m "chore(types): regenerate Supabase types and remove manual NotificationSettingsRow definition"
```

---

## Final Step: Full validation and push

**Step 1: Run full validation suite**

```bash
cd /Users/richard/Developer/tenant-flow
pnpm validate:quick
```

Expected: all typecheck, lint, and unit tests pass.

**Step 2: Push to PR**

```bash
git push origin feature/property-image-upload-on-create
```

---

## What Was Explicitly Deferred (YAGNI)

These items require schema additions or full feature development. They are tracked in ISSUES.md but excluded from this branch:

| Item | Reason deferred |
|------|----------------|
| Income statement expense categories | `expenses` table has no `category` column; adding it is a separate milestone |
| Tax documents mortgage interest (real) | Requires mortgage tracking table; separate milestone |
| Maintenance photo upload | Requires storage bucket + photos table; separate feature branch |
| Maintenance export to CSV | Report generation feature; separate feature branch |
| Maintenance bulk vendor assign | Vendor management feature; separate feature branch |
| Cache TTL optimisation / SSE | Performance improvement; separate milestone |
| Financial service Zod DTO validation | SEC-003; separate hardening milestone |
