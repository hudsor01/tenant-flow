// Shared deterministic test fixture for autopay integration tests.
// Creates a complete owner -> property -> unit -> tenant -> lease -> rent_due graph
// using the service-role client. Cleanup is FK-safe and idempotent.
//
// Used by:
//   tests/autopay-success.test.ts          (TEST-01)
//   tests/autopay-decline-retry.test.ts    (TEST-02)
//   tests/autopay-final-attempt.test.ts    (TEST-03)
//   tests/autopay-webhook-idempotency.test.ts (TEST-04)
//
// Conventions:
//   - All emails use the `tenantflow.test` non-routable domain so leaked rows
//     are visually obvious in dev/staging Supabase.
//   - Fresh UUIDs per fixture eliminate cross-test interference.
//   - Cleanup runs in reverse FK order; missing rows are tolerated silently
//     (the test may have failed before all rows were inserted).

import { type SupabaseClient } from 'npm:@supabase/supabase-js@2'

export interface AutopayFixtureOptions {
  initialAttempts?: number
  amount?: number
  responsibilityPercentage?: number
  stripeCustomerId?: string
  paymentMethodId?: string
}

export interface AutopayFixture {
  ownerUserId: string
  tenantUserId: string
  tenantId: string
  propertyId: string
  unitId: string
  leaseId: string
  rentDueId: string
  stripeCustomerId: string
  paymentMethodId: string
  fullAmount: number
  tenantAmount: number
  responsibilityPercentage: number
}

interface InsertContext {
  table: string
  row: Record<string, unknown>
}

async function insertOrThrow(
  supabase: SupabaseClient,
  ctx: InsertContext,
): Promise<void> {
  const { error } = await supabase.from(ctx.table).insert(ctx.row)
  if (error) {
    throw new Error(
      `[FIXTURE] Insert failed at ${ctx.table}: ${error.message}`,
    )
  }
}

async function deleteSilently(
  supabase: SupabaseClient,
  table: string,
  column: string,
  value: string,
): Promise<void> {
  const { error } = await supabase.from(table).delete().eq(column, value)
  if (error) {
    console.error(`[FIXTURE_CLEANUP] ${table} delete failed: ${error.message}`)
  }
}

export async function createAutopayFixture(
  supabase: SupabaseClient,
  options: AutopayFixtureOptions = {},
): Promise<AutopayFixture> {
  const ownerUserId = crypto.randomUUID()
  const tenantUserId = crypto.randomUUID()
  const propertyId = crypto.randomUUID()
  const unitId = crypto.randomUUID()
  const tenantId = crypto.randomUUID()
  const leaseId = crypto.randomUUID()
  const rentDueId = crypto.randomUUID()
  const today = new Date().toISOString().split('T')[0]
  const endDate = new Date(Date.now() + 365 * 86400 * 1000)
    .toISOString()
    .split('T')[0]

  const fullAmount = options.amount ?? 1200.0
  const responsibilityPercentage = options.responsibilityPercentage ?? 100
  const tenantAmount = Number(
    ((fullAmount * responsibilityPercentage) / 100).toFixed(2),
  )
  const stripeCustomerId = options.stripeCustomerId ?? 'cus_test_fixture'
  const paymentMethodId = options.paymentMethodId ?? 'pm_card_visa'
  const randomSuffix = ownerUserId.slice(0, 8)

  const fixture: AutopayFixture = {
    ownerUserId,
    tenantUserId,
    tenantId,
    propertyId,
    unitId,
    leaseId,
    rentDueId,
    stripeCustomerId,
    paymentMethodId,
    fullAmount,
    tenantAmount,
    responsibilityPercentage,
  }

  // 1. Owner user
  await insertOrThrow(supabase, {
    table: 'users',
    row: {
      id: ownerUserId,
      email: `autopay-owner-${randomSuffix}@tenantflow.test`,
      user_type: 'OWNER',
      full_name: 'Autopay Test Owner',
    },
  })

  // 2. Tenant user
  await insertOrThrow(supabase, {
    table: 'users',
    row: {
      id: tenantUserId,
      email: `autopay-tenant-${randomSuffix}@tenantflow.test`,
      user_type: 'TENANT',
      full_name: 'Autopay Test Tenant',
    },
  })

  // 3. Property
  await insertOrThrow(supabase, {
    table: 'properties',
    row: {
      id: propertyId,
      owner_user_id: ownerUserId,
      name: 'Autopay Fixture Property',
      address_line1: '1 Test St',
      city: 'Testville',
      state: 'CA',
      postal_code: '90000',
      property_type: 'single_family',
      status: 'active',
    },
  })

  // 4. Unit
  await insertOrThrow(supabase, {
    table: 'units',
    row: {
      id: unitId,
      property_id: propertyId,
      owner_user_id: ownerUserId,
      unit_number: '1',
      rent_amount: fullAmount,
    },
  })

  // 5. Tenant record
  await insertOrThrow(supabase, {
    table: 'tenants',
    row: {
      id: tenantId,
      user_id: tenantUserId,
      stripe_customer_id: stripeCustomerId,
    },
  })

  // 6. Stripe connected account (required for destination charge)
  await insertOrThrow(supabase, {
    table: 'stripe_connected_accounts',
    row: {
      user_id: ownerUserId,
      stripe_account_id: `acct_test_fixture_${randomSuffix}`,
      business_type: 'individual',
      charges_enabled: true,
      default_platform_fee_percent: 5,
    },
  })

  // 7. Lease
  await insertOrThrow(supabase, {
    table: 'leases',
    row: {
      id: leaseId,
      owner_user_id: ownerUserId,
      unit_id: unitId,
      primary_tenant_id: tenantId,
      auto_pay_enabled: true,
      autopay_payment_method_id: paymentMethodId,
      lease_status: 'active',
      rent_amount: fullAmount,
      security_deposit: fullAmount,
      payment_day: 1,
      start_date: today,
      end_date: endDate,
    },
  })

  // 8. Lease tenant link with responsibility percentage
  await insertOrThrow(supabase, {
    table: 'lease_tenants',
    row: {
      lease_id: leaseId,
      tenant_id: tenantId,
      responsibility_percentage: responsibilityPercentage,
      is_primary: true,
    },
  })

  // 9. Rent due record
  await insertOrThrow(supabase, {
    table: 'rent_due',
    row: {
      id: rentDueId,
      lease_id: leaseId,
      unit_id: unitId,
      amount: fullAmount,
      due_date: today,
      status: 'pending',
      autopay_attempts: options.initialAttempts ?? 0,
    },
  })

  return fixture
}

export async function cleanupAutopayFixture(
  supabase: SupabaseClient,
  fixture: AutopayFixture,
): Promise<void> {
  // Reverse FK order. Notifications and rent_payments may have been written
  // by the Edge Function or webhook handler; clean them up first.
  await deleteSilently(supabase, 'notifications', 'entity_id', fixture.rentDueId)
  await deleteSilently(supabase, 'rent_payments', 'rent_due_id', fixture.rentDueId)
  await deleteSilently(supabase, 'rent_due', 'id', fixture.rentDueId)
  await deleteSilently(supabase, 'lease_tenants', 'lease_id', fixture.leaseId)
  await deleteSilently(supabase, 'leases', 'id', fixture.leaseId)
  await deleteSilently(supabase, 'tenants', 'id', fixture.tenantId)
  await deleteSilently(supabase, 'stripe_connected_accounts', 'user_id', fixture.ownerUserId)
  await deleteSilently(supabase, 'units', 'id', fixture.unitId)
  await deleteSilently(supabase, 'properties', 'id', fixture.propertyId)
  await deleteSilently(supabase, 'users', 'id', fixture.tenantUserId)
  await deleteSilently(supabase, 'users', 'id', fixture.ownerUserId)
}

export function buildAutopayBody(
  fixture: AutopayFixture,
): Record<string, unknown> {
  return {
    tenant_id: fixture.tenantId,
    lease_id: fixture.leaseId,
    rent_due_id: fixture.rentDueId,
    amount: fixture.tenantAmount,
    stripe_customer_id: fixture.stripeCustomerId,
    autopay_payment_method_id: fixture.paymentMethodId,
    owner_user_id: fixture.ownerUserId,
    unit_id: fixture.unitId,
  }
}
