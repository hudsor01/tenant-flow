# Phase 2: Financial Fixes - Research

**Researched:** 2026-03-04
**Domain:** Stripe payments, webhook processing, autopay, financial data integrity
**Confidence:** HIGH

## Summary

Phase 2 addresses 22 payment requirements (PAY-01 through PAY-22) plus DOC-01. The core issues fall into five clusters: (1) amount consistency and formatting (cents vs dollars), (2) webhook idempotency and state management, (3) autopay correctness including shared leases and retry logic, (4) payment method management safety, and (5) platform subscription visibility. All changes touch three Edge Functions (`stripe-webhooks`, `stripe-rent-checkout`, `stripe-autopay-charge`), multiple database migrations, and several frontend hooks.

The codebase already has solid foundations: `rent_due.amount` stores dollars, `lease_tenants.responsibility_percentage` exists with default 100, `stripe_webhook_events` provides idempotency tracking, and the `process_autopay_charges` pg_cron function handles daily autopay. The primary work is fixing correctness bugs (webhook deleting idempotency records on failure, `rent_due.status` never updated to `paid`, empty string metadata fallbacks) and adding missing features (retry tracking columns, shared lease portion calculation, subscription status UI).

**Primary recommendation:** Group work into 3-4 waves: (1) database migrations and RPCs, (2) Edge Function fixes, (3) frontend hooks and UI, (4) Stripe SDK upgrade. The SDK upgrade should be last since it carries the most risk and the other fixes are independently valuable.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
1. **Amount Storage Convention**: Dollars with `numeric(10,2)` as canonical storage. Convert to cents at Stripe API boundary only (inside Edge Functions).
2. **rent_due.amount Semantics**: Base rent only. Late fees, credits, adjustments tracked separately.
3. **Owner Receipt Email Content**: Full breakdown -- base rent, platform fee, Stripe fee, net payout.
4. **Currency Formatting**: Single `formatCurrency(amountInDollars)` formatter everywhere. No cents input variant.
5. **Payment Method Deletion Policy**: Cannot delete last remaining method. Deleting autopay method auto-disables autopay.
6. **setDefaultPaymentMethod Atomicity**: Atomic SQL RPC (`set_default_payment_method(p_payment_method_id uuid)`).
7. **Checkout Redirect URLs**: Stripe `{CHECKOUT_SESSION_ID}` template pattern. Success page verifies server-side.
8. **Autopay Retry Strategy**: 3 retries over 7 days (day 1, day 3, day 7). pg_cron drives schedule. Tracking columns on rent_due.
9. **Autopay Failure Notifications**: Email tenant on each attempt (include attempt number). Owner only on final failure.
10. **Shared Lease Handling**: Per-tenant independent payments via `lease_tenants.responsibility_percentage`. No new tables.
11. **Platform Subscription Failure Handling**: Banner + email + soft feature lock after 7-day grace. Query `stripe.subscriptions` via PostgREST.
12. **Billing Hooks -- Use stripe Schema**: Query `stripe.*` tables via PostgREST with existing RLS. Fix stale sync first.
13. **Stripe Schema Sync Fix**: Diagnose and fix stale sync (down since 2025-12-11). Backfill missing data.
14. **Webhook Idempotency (PAY-15)**: Stop deleting records on failure. Mark `status: 'failed'` with `error_message`. Reprocess on retry.
15. **Metadata Validation (PAY-10)**: Validate `tenant_id`, `lease_id`, `unit_id`, `rent_due_id` before processing. Sentry on failure.
16. **rent_due.status Update (PAY-02)**: Atomic RPC: upsert rent_payments AND update rent_due.status in one transaction. Partial payments: mark paid only when all portions paid.
17. **onboarding_completed_at Fix (PAY-11)**: Only set once. Backfill migration for existing owners.
18. **Per-Tenant Rent Portions Data Model**: Compute dynamically. Add CHECK constraint on responsibility_percentage.
19. **Stripe API Version Alignment**: Upgrade Edge Functions from stripe@14 to stripe@20.x, pin `apiVersion: '2026-02-25.clover'`.
20. **Payment Method Management UX**: Last method guard, atomic set-default RPC, auto-promote on delete, detach from Stripe.

### Claude's Discretion
None explicitly listed -- all major decisions are locked.

### Deferred Ideas (OUT OF SCOPE)
- Late fee calculation engine (Phase 6 or future milestone)
- Per-tenant rent_due records (over-engineering -- compute dynamically instead)
- Stripe Connect Express to Standard upgrade (future milestone)
- Payment method type expansion beyond card/ACH (future milestone)
- Real-time payment status via Stripe webhooks to Supabase Realtime (Phase 8 performance)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PAY-01 | Consistent cents/dollars convention documented and enforced | Amount storage decision (dollars + numeric(10,2)), formatCurrency consolidation |
| PAY-02 | rent_due.status updated to 'paid' in webhook after successful payment | Atomic RPC pattern: upsert rent_payments + update rent_due.status |
| PAY-03 | Tenant can enable/disable autopay with RLS policy | Need tenant UPDATE policy on leases for autopay columns only |
| PAY-04 | stripe-checkout-status Edge Function created or hooks corrected | Currently hooks call nonexistent function; redirect to stripe-checkout-session |
| PAY-05 | Payment display uses correct amount units | formatCurrency(amountInDollars) -- eliminate formatCents dual-path |
| PAY-06 | rent_payments.amount changed to numeric(10,2) | Migration: ALTER COLUMN on rent_due.amount and rent_payments.amount |
| PAY-07 | Payment method deletion calls stripe.paymentMethods.detach() | New RPC or Edge Function for safe delete with Stripe API call |
| PAY-08 | Idempotency key on autopay paymentIntents.create | Use `idempotencyKey: rent_due_id-tenant_id` on Stripe API call |
| PAY-09 | Platform subscription webhook handling | useSubscriptionStatus reads stripe.subscriptions, banner/lock UI |
| PAY-10 | Webhook validates metadata (no empty string fallback) | Guard clause before processing, Sentry error on missing fields |
| PAY-11 | onboarding_completed_at preserved when already set | Conditional update + backfill migration |
| PAY-12 | Plan limit enforcement from frontend | get_user_plan_limits/check_user_feature_access RPCs exist (Phase 1 auth-guarded) |
| PAY-13 | Autopay retry mechanism | New columns on rent_due, modified pg_cron query, retry scheduling |
| PAY-14 | Autopay handles shared leases correctly | Join lease_tenants for responsibility_percentage, charge proportional amount |
| PAY-15 | Webhook failure does not delete idempotency record | Add status/error_message columns to stripe_webhook_events, stop DELETE |
| PAY-16 | setDefaultPaymentMethod uses transaction | New RPC: set_default_payment_method(p_payment_method_id uuid) |
| PAY-17 | Stripe API version consistent | Upgrade deno.json from stripe@14 to stripe@20, pin apiVersion |
| PAY-18 | Owner payment receipt includes fee breakdown | OwnerNotification template already receives data; add fee fields |
| PAY-19 | useSubscriptionStatus checks actual subscription status | Rewrite to query stripe.subscriptions instead of users.stripe_customer_id |
| PAY-20 | Billing hooks implemented or UI disabled | Wire useInvoices/useFailedPaymentAttempts to stripe.* tables |
| PAY-21 | Success/cancel redirect URLs include session_id | Update stripe-rent-checkout success_url with {CHECKOUT_SESSION_ID} |
| PAY-22 | rent_due service_role write policies verified | Re-create dropped rent_due_service_role policy |
| DOC-01 | CLAUDE.md updated after phase | Update CLAUDE.md with new patterns/conventions |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe (Deno) | 20.x (npm:stripe@20) | Stripe API in Edge Functions | Aligns with Next.js version, current API version |
| stripe (Node) | 20.3.1 | Stripe API in Next.js | Already installed in package.json |
| @supabase/supabase-js | 2.97.0 (Next.js), 2.49.4 (Deno) | Database + auth | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | existing | Toast notifications | Payment method UX feedback |
| @tanstack/react-query | existing | Server state | All billing/payment hooks |
| pg_cron | existing | Scheduled autopay | Daily charge processing + retry |
| pg_net | existing | HTTP from Postgres | Edge Function invocation from pg_cron |

### Alternatives Considered
None -- all decisions are locked. No new libraries needed.

**Installation:**
```bash
# Stripe SDK is already at 20.3.1 in package.json
# Deno import map update in supabase/functions/deno.json:
# "stripe": "npm:stripe@20"  (was "npm:stripe@14.25.0")
```

## Architecture Patterns

### Files Requiring Changes
```
supabase/
  functions/
    stripe-webhooks/index.ts        # PAY-02, PAY-10, PAY-11, PAY-15, PAY-18, PAY-22
    stripe-rent-checkout/index.ts   # PAY-14, PAY-21
    stripe-autopay-charge/index.ts  # PAY-08, PAY-13, PAY-14
    deno.json                       # PAY-17 (Stripe SDK upgrade)
  migrations/
    YYYYMMDD_financial_fixes_*.sql  # Multiple migrations
src/
  hooks/api/
    use-payment-methods.ts          # PAY-07, PAY-16
    use-billing.ts                  # PAY-09, PAY-19, PAY-20
    use-payments.ts                 # PAY-04
    use-tenant-portal.ts            # PAY-03
  components/payments/
    payment-utils.ts                # PAY-05, PAY-06
  app/(tenant)/tenant/payments/
    methods/tenant-payment-methods.client.tsx  # PAY-07 UI
  lib/formatters/
    currency.ts                     # PAY-05 (deprecate formatCents)
```

### Pattern 1: Atomic RPC for Multi-Table Writes
**What:** Single SECURITY DEFINER RPC that performs multiple writes in one transaction
**When to use:** rent_due.status update + rent_payments upsert (PAY-02), set_default_payment_method (PAY-16)
**Example:**
```sql
-- Source: Project pattern from Phase 1
create or replace function public.record_rent_payment(
  p_stripe_payment_intent_id text,
  p_rent_due_id uuid,
  p_tenant_id uuid,
  p_lease_id uuid,
  p_amount numeric(10,2),
  p_gross_amount numeric(10,2),
  p_platform_fee_amount numeric(10,2),
  p_stripe_fee_amount numeric(10,2),
  p_net_amount numeric(10,2),
  p_currency text,
  p_period_start text,
  p_period_end text,
  p_due_date text,
  p_checkout_session_id text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- Upsert rent_payments
  insert into rent_payments (
    stripe_payment_intent_id, amount, gross_amount, platform_fee_amount,
    stripe_fee_amount, net_amount, currency, status, tenant_id, lease_id,
    application_fee_amount, payment_method_type, period_start, period_end,
    due_date, paid_date, rent_due_id, checkout_session_id
  ) values (
    p_stripe_payment_intent_id, p_amount, p_gross_amount, p_platform_fee_amount,
    p_stripe_fee_amount, p_net_amount, p_currency, 'succeeded', p_tenant_id, p_lease_id,
    p_platform_fee_amount, 'stripe', p_period_start, p_period_end,
    p_due_date, current_date, p_rent_due_id, p_checkout_session_id
  )
  on conflict (stripe_payment_intent_id) do update set
    status = 'succeeded',
    paid_date = current_date,
    gross_amount = excluded.gross_amount,
    platform_fee_amount = excluded.platform_fee_amount,
    stripe_fee_amount = excluded.stripe_fee_amount,
    net_amount = excluded.net_amount;

  -- Update rent_due.status to 'paid' only when all tenant portions are paid
  -- For single tenant (100%): immediate. For shared: check sum >= rent_due.amount
  if p_rent_due_id is not null then
    update rent_due
    set status = 'paid', updated_at = now()
    where id = p_rent_due_id
      and status != 'paid'
      and (
        select coalesce(sum(rp.amount), 0)
        from rent_payments rp
        where rp.rent_due_id = p_rent_due_id
          and rp.status = 'succeeded'
      ) >= amount;
  end if;
end;
$$;
```

### Pattern 2: Tenant Column-Restricted UPDATE Policy
**What:** RLS policy allowing tenants to update only specific columns on a table they don't own
**When to use:** PAY-03 -- tenant needs to toggle autopay on leases they're part of
**Example:**
```sql
-- Tenant can update autopay columns on leases they belong to
-- Note: RLS cannot restrict columns directly. Use an RPC instead.
create or replace function public.toggle_autopay(
  p_lease_id uuid,
  p_enabled boolean,
  p_payment_method_id text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tenant_id uuid;
begin
  -- Verify caller is a tenant on this lease
  select t.id into v_tenant_id
  from tenants t
  join lease_tenants lt on lt.tenant_id = t.id
  where t.user_id = (select auth.uid())
    and lt.lease_id = p_lease_id;

  if v_tenant_id is null then
    raise exception 'Not authorized to modify autopay for this lease';
  end if;

  update leases
  set auto_pay_enabled = p_enabled,
      autopay_payment_method_id = case
        when p_enabled then p_payment_method_id
        else null
      end
  where id = p_lease_id;
end;
$$;
```

### Pattern 3: Webhook Idempotency with Status Tracking
**What:** Insert-with-status pattern for webhook event deduplication
**When to use:** PAY-15 -- webhook processing with failure recovery
**Example:**
```typescript
// In stripe-webhooks/index.ts
// Insert with 'processing' status instead of bare insert
const { error: idempotencyError } = await supabase
  .from('stripe_webhook_events')
  .insert({
    id: event.id,
    event_type: event.type,
    livemode: event.livemode,
    data: event.data as unknown as Record<string, unknown>,
    status: 'processing',  // NEW
  })

if (idempotencyError) {
  if (idempotencyError.code === '23505') {
    // Check if previous attempt failed -- allow reprocessing
    const { data: existing } = await supabase
      .from('stripe_webhook_events')
      .select('status')
      .eq('id', event.id)
      .single()

    if (existing?.status === 'failed') {
      // Update status back to processing for retry
      await supabase
        .from('stripe_webhook_events')
        .update({ status: 'processing', error_message: null })
        .eq('id', event.id)
      // Continue to processEvent
    } else {
      // Already succeeded or currently processing
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }
}

try {
  await processEvent(supabase, stripe, event)
  // Mark as succeeded
  await supabase
    .from('stripe_webhook_events')
    .update({ status: 'succeeded' })
    .eq('id', event.id)
} catch (err) {
  // Mark as failed -- do NOT delete
  await supabase
    .from('stripe_webhook_events')
    .update({
      status: 'failed',
      error_message: err instanceof Error ? err.message : 'Unknown error',
    })
    .eq('id', event.id)
  return new Response(
    JSON.stringify({ error: 'Processing failed' }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  )
}
```

### Anti-Patterns to Avoid
- **Deleting idempotency records on failure:** Current code does this (line 79 of stripe-webhooks). Creates a window where replayed webhooks can corrupt state.
- **Two-step default payment method update:** Current `useSetDefaultPaymentMethod` clears all then sets one. Race condition window where no method is default.
- **Empty string fallback for metadata:** Current webhook uses `metadata['tenant_id'] ?? ''`. Must validate and reject instead.
- **Checking `stripe_customer_id` existence for subscription status:** Current `useSubscriptionStatus` does this. Must check actual subscription status from `stripe.subscriptions`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Idempotency key generation | Custom UUID scheme | `${rent_due_id}_${tenant_id}` as Stripe idempotencyKey | Stripe deduplicates server-side for 24h |
| Multi-table atomic writes | Sequential PostgREST calls | SECURITY DEFINER RPC with transaction | Race conditions, partial failures |
| Currency formatting | Multiple format functions | Single `formatCurrency(dollars)` | Consistency across all views |
| Retry scheduling | Application-level timer | pg_cron + tracking columns on rent_due | Survives restarts, auditable |
| Payment method default swap | Client-side clear-then-set | Single SQL RPC | Atomic, no race window |

**Key insight:** Financial operations require transactional guarantees. PostgREST calls are individual transactions. Anything requiring atomicity across multiple tables MUST use an RPC.

## Common Pitfalls

### Pitfall 1: Amount Unit Mismatch
**What goes wrong:** Tenant gets charged 100x the rent amount (dollars treated as cents) or sees $0.01 instead of $1.00
**Why it happens:** Mixed conventions between Stripe (cents) and DB (dollars). `formatCents` function divides by 100 when data is already in dollars.
**How to avoid:** `rent_due.amount` and `rent_payments.amount` are always dollars. Multiply by 100 ONLY at Stripe API boundary (`Math.round(amount * 100)`). Use `formatCurrency(amountInDollars)` everywhere.
**Warning signs:** Any `/ 100` in display code or `* 100` outside Edge Functions.

### Pitfall 2: Dropped service_role Policies
**What goes wrong:** Webhook handler (using service_role key) cannot write to `rent_due` or `rent_payments` tables
**Why it happens:** Migration `20251230191000_simplify_rls_policies.sql` dropped `rent_due_service_role` and `rent_payments_service_role` policies. Service role bypasses RLS by default, but if `ALTER TABLE ... FORCE ROW LEVEL SECURITY` was set, writes would fail.
**How to avoid:** Verify that `rent_due` and `rent_payments` tables do NOT have `FORCE ROW LEVEL SECURITY` set. If they do, re-create service_role policies. Service role should bypass RLS by default in Supabase.
**Warning signs:** Webhook handler returning 500 with "new row violates row-level security policy" errors.

### Pitfall 3: Shared Lease Double-Charging
**What goes wrong:** Each tenant on a shared lease gets charged the FULL rent amount instead of their portion
**Why it happens:** Current `process_autopay_charges` joins `lease_tenants` and fires one charge per tenant, but passes the full `rent_due.amount`. The Edge Function uses whatever amount it receives.
**How to avoid:** The pg_cron function must compute `rd.amount * lt.responsibility_percentage / 100` and pass the proportional amount. The Edge Function must also independently verify the portion.
**Warning signs:** Total charges for a shared lease exceeding `rent_due.amount`.

### Pitfall 4: Stripe SDK Major Version Breaking Changes
**What goes wrong:** Webhook signature verification fails, PaymentIntent creation breaks, or types change
**Why it happens:** Upgrading from stripe@14 to stripe@20 spans multiple major versions with breaking API changes
**How to avoid:** Test webhook signature verification first (`constructEventAsync`). Check if `apiVersion` parameter format changed. The new Stripe versioning uses `YYYY-MM-DD.codename` format.
**Warning signs:** 400 errors from Stripe, TypeScript compilation errors in Edge Functions.

### Pitfall 5: pg_cron Retry Query Missing Failed Records
**What goes wrong:** Failed autopay charges never get retried
**Why it happens:** Current pg_cron query filters `WHERE rd.due_date = current_date`. Failed charges from previous days are never reconsidered.
**How to avoid:** Add retry tracking columns (`autopay_attempts`, `autopay_next_retry_at`) and modify the query to include `WHERE autopay_next_retry_at <= now() AND autopay_attempts < 3 AND status != 'paid'`.
**Warning signs:** Tenants reporting "autopay didn't charge me" days after due date.

## Code Examples

### Database Migration: Amount Type Change + Autopay Retry Columns
```sql
-- Migration: financial_fixes_schema_changes

-- 1. Change rent_due.amount from integer to numeric(10,2)
-- Existing data is already in dollars (no transformation needed)
alter table public.rent_due
  alter column amount type numeric(10,2);

-- 2. Change rent_payments amount columns to numeric(10,2)
alter table public.rent_payments
  alter column amount type numeric(10,2),
  alter column gross_amount type numeric(10,2),
  alter column platform_fee_amount type numeric(10,2),
  alter column stripe_fee_amount type numeric(10,2),
  alter column net_amount type numeric(10,2),
  alter column application_fee_amount type numeric(10,2),
  alter column late_fee_amount type numeric(10,2);

-- 3. Autopay retry tracking columns on rent_due
alter table public.rent_due
  add column if not exists autopay_attempts integer default 0,
  add column if not exists autopay_last_attempt_at timestamptz,
  add column if not exists autopay_next_retry_at timestamptz;

-- 4. Webhook idempotency status tracking
alter table public.stripe_webhook_events
  add column if not exists status text default 'processing',
  add column if not exists error_message text;

-- Add CHECK constraint for status values
alter table public.stripe_webhook_events
  add constraint stripe_webhook_events_status_check
    check (status in ('processing', 'succeeded', 'failed'));

-- 5. responsibility_percentage range constraint
alter table public.lease_tenants
  add constraint lease_tenants_responsibility_percentage_range
    check (responsibility_percentage >= 1 and responsibility_percentage <= 100);

-- 6. Re-create rent_due and rent_payments service_role policies if needed
-- (Only if FORCE ROW LEVEL SECURITY is set -- verify first)
-- Service role bypasses RLS by default in Supabase, but check PAY-22
```

### Edge Function: Metadata Validation Guard
```typescript
// In stripe-webhooks processEvent, payment_intent.succeeded handler
const metadata = pi.metadata ?? {}
const tenantId = metadata['tenant_id']
const leaseId = metadata['lease_id']
const rentDueId = metadata['rent_due_id']
const unitId = metadata['unit_id']

// PAY-10: Validate required metadata
if (!tenantId || !leaseId) {
  console.error('[WEBHOOK] Missing required metadata', {
    event_id: event.id,
    tenant_id: tenantId ?? 'MISSING',
    lease_id: leaseId ?? 'MISSING',
    rent_due_id: rentDueId ?? 'MISSING',
  })
  // Skip processing but don't throw -- this is a data issue, not transient
  return
}
```

### Autopay: Per-Tenant Portion Calculation
```typescript
// In stripe-autopay-charge, after parsing request body
// Look up tenant's responsibility percentage
const { data: leaseTenant } = await supabase
  .from('lease_tenants')
  .select('responsibility_percentage')
  .eq('lease_id', lease_id)
  .eq('tenant_id', tenant_id)
  .single()

const percentage = leaseTenant?.responsibility_percentage ?? 100
const tenantAmount = Number(
  (amount * percentage / 100).toFixed(2)
)
const amountCents = Math.round(tenantAmount * 100)
```

### Frontend: formatCurrency Consolidation
```typescript
// src/components/payments/payment-utils.ts
// Already correct -- takes dollars, returns formatted string
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

// src/lib/formatters/currency.ts
// formatCents should be deprecated or removed
// All callers should use formatCurrency(amountInDollars) instead
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| stripe@14 + apiVersion '2024-06-20' | stripe@20 + apiVersion '2026-02-25.clover' | 2026 | New API version naming scheme (YYYY-MM-DD.codename) |
| Webhook idempotency via insert + delete on fail | Insert with status column tracking | Best practice | Prevents corrupt intermediate state |
| Single rent amount for all tenants | Per-tenant proportional amounts | Industry standard | Matches Buildium, Apartments.com patterns |

**Deprecated/outdated:**
- `formatCents()` function: Should be removed. All amounts are in dollars.
- `stripe-checkout-status` Edge Function name: Never existed. Hooks reference it but it should use `stripe-checkout-session`.
- `useSubscriptionStatus` checking `stripe_customer_id` existence: Must check actual `stripe.subscriptions` table.

## Open Questions

1. **Stripe Sync Engine Status**
   - What we know: Stripe sync has been stale since 2025-12-11. The `stripe.*` schema has 28 tables with webhook infrastructure.
   - What's unclear: What mechanism syncs data (Stripe's official extension? Custom webhook handlers?). Why it stopped.
   - Recommendation: Investigate the `stripe.migrations` table and webhook setup before implementing PAY-09/PAY-19/PAY-20. This may need to be a prerequisite task.

2. **FORCE ROW LEVEL SECURITY on rent_due/rent_payments**
   - What we know: Service role policies were dropped in migration `20251230191000`. Service role bypasses RLS by default.
   - What's unclear: Whether `ALTER TABLE ... FORCE ROW LEVEL SECURITY` was set on these tables (which would block service_role writes).
   - Recommendation: Check live database before writing migration. If FORCE is set, re-create service_role policies.

3. **Stripe SDK v14 to v20 Breaking Changes**
   - What we know: Major version upgrades typically have breaking changes. The new API version uses a different naming scheme.
   - What's unclear: Specific breaking changes affecting `constructEventAsync`, `paymentIntents.create`, `charges.retrieve`.
   - Recommendation: Review Stripe changelog for v15, v16, v17, v18, v19, v20 migration guides. Test webhook signature verification first.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (3 projects: unit, component, integration) |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test:unit -- --run` |
| Full suite command | `pnpm validate:quick` (types + lint + unit tests) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PAY-01 | Amount units consistent (dollars) | unit | `pnpm test:unit -- --run src/components/payments/payment-utils.test.ts` | Needs check |
| PAY-02 | rent_due.status updated to paid | integration | `pnpm test:rls` (RLS tests) | No -- Wave 0 |
| PAY-05 | formatCurrency takes dollars only | unit | `pnpm test:unit -- --run src/lib/formatters/__tests__/formatters.test.ts` | Yes |
| PAY-06 | numeric(10,2) column types | manual-only | Migration verification | N/A |
| PAY-08 | Idempotency key on autopay | unit | Edge Function unit test | No -- Wave 0 |
| PAY-10 | Metadata validation rejects empty | unit | Edge Function unit test | No -- Wave 0 |
| PAY-14 | Shared lease portion calculation | unit | `pnpm test:unit -- --run src/**/*autopay*.test.ts` | No -- Wave 0 |
| PAY-16 | Atomic set-default RPC | integration | RLS test | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test:unit -- --run`
- **Per wave merge:** `pnpm validate:quick`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Edge Function test infrastructure -- currently no test files for stripe-webhooks, stripe-rent-checkout, stripe-autopay-charge (TEST-04 is Phase 9, but basic validation tests could be added)
- [ ] RLS tests for `rent_payments`, `payment_methods` tables (TEST-07 is Phase 9)
- [ ] Unit test for `formatCurrency` confirming dollar input assumption
- [ ] Unit test for responsibility_percentage portion calculation helper

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `supabase/functions/stripe-webhooks/index.ts` (691 lines) -- current webhook handler
- Codebase analysis: `supabase/functions/stripe-rent-checkout/index.ts` (368 lines) -- checkout flow
- Codebase analysis: `supabase/functions/stripe-autopay-charge/index.ts` (266 lines) -- autopay flow
- Codebase analysis: `supabase/functions/deno.json` -- confirms stripe@14.25.0 in Deno
- Codebase analysis: `supabase/migrations/20260227160000_autopay_schema_and_cron.sql` -- pg_cron autopay function
- Codebase analysis: `src/shared/types/supabase.ts` -- DB schema types (rent_due, rent_payments, lease_tenants, stripe_webhook_events)
- Codebase analysis: `src/hooks/api/use-billing.ts` -- current stub hooks
- Codebase analysis: `src/hooks/api/use-payment-methods.ts` -- current race condition in setDefault
- Codebase analysis: `supabase/migrations/20251230191000_simplify_rls_policies.sql` -- confirms service_role policy drops

### Secondary (MEDIUM confidence)
- Project CONTEXT.md decisions -- 20 locked decisions from user discussion
- Project REQUIREMENTS.md -- 22 PAY requirements + DOC-01
- Memory: Stripe SDK version mismatch noted in API Route Optimization review

### Tertiary (LOW confidence)
- Stripe SDK v14 to v20 migration path -- needs changelog verification before implementation
- Stripe sync engine mechanism -- needs investigation against live database

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries are already in the project, versions confirmed from codebase
- Architecture: HIGH -- patterns derived from existing codebase and Phase 1 conventions
- Pitfalls: HIGH -- identified from direct code review of current bugs (line numbers cited)
- Stripe SDK upgrade: MEDIUM -- major version jump needs changelog review

**Research date:** 2026-03-04
**Valid until:** 2026-03-18 (14 days -- Stripe versions may update)
