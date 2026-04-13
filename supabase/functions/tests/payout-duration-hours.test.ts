// TEST-06: payout_events.duration_hours generated column + get_payout_timing_stats RPC test.
// Proves the duration_hours generated column computes
// (paid_at - first_charge_at) / 3600 correctly, and that the admin-only
// get_payout_timing_stats() RPC surfaces the aggregate to the owner dashboard
// so the "2-day payouts" promise has a measurable signal.
//
// Three Deno.test blocks:
//   1. Generated-column math (service_role only, no admin user needed)
//   2. Admin RPC returns our seeded duration (requires E2E_ADMIN_EMAIL/PASSWORD)
//   3. Non-admin callers get raise 'Unauthorized' (requires E2E_OWNER_EMAIL/PASSWORD)
//
// Tests skip cleanly when env vars are missing -- never silent false-positives.
//
// Run locally:
//   cd supabase/functions && deno test --allow-all --no-check \
//     tests/payout-duration-hours.test.ts

import { assert, assertEquals, assertExists } from 'jsr:@std/assert@1'
import 'jsr:@std/dotenv/load'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createPayoutFixture } from './_helpers/payout-fixtures.ts'

// Cast helper for RPC jsonb payload; PostgREST returns untyped json here.
function asStats(data: unknown): Record<string, unknown> {
  if (data && typeof data === 'object') {
    return data as Record<string, unknown>
  }
  throw new Error('RPC data was not an object')
}

function requireEnv(names: string[]): string[] {
  return names.filter((n) => !Deno.env.get(n))
}

Deno.test('payout-duration-hours: generated column equals (paid_at - first_charge_at) / 3600', async () => {
  const missing = requireEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])
  if (missing.length > 0) {
    console.log(`SKIP: missing ${missing.join(', ')}`)
    return
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const fixture = await createPayoutFixture(admin)

  try {
    // Deterministic 36-hour span: first_charge_at=2026-04-10T00:00:00Z,
    // paid_at=2026-04-11T12:00:00Z. Generated column must compute exactly 36.
    const firstChargeAt = new Date('2026-04-10T00:00:00Z').toISOString()
    const paidAt = new Date('2026-04-11T12:00:00Z').toISOString()
    const payoutId = `po_test_dur_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`

    const { error: insErr } = await admin.from('payout_events').insert({
      stripe_payout_id: payoutId,
      stripe_account_id: fixture.stripeAccountId,
      owner_user_id: fixture.ownerUserId,
      amount: 1500,
      currency: 'usd',
      status: 'paid',
      arrival_date: paidAt,
      paid_at: paidAt,
      first_charge_at: firstChargeAt,
      charge_count: 1,
    })
    assertEquals(insErr, null, `insert failed: ${insErr?.message}`)

    const { data: row, error } = await admin
      .from('payout_events')
      .select('duration_hours, paid_at, first_charge_at')
      .eq('stripe_payout_id', payoutId)
      .single<{
        duration_hours: number | string
        paid_at: string
        first_charge_at: string
      }>()
    assertEquals(error, null, `select failed: ${error?.message}`)
    assertExists(row)
    // numeric(10,2) — PostgREST may return as string or number; coerce.
    assertEquals(Number(row.duration_hours), 36)
  } finally {
    await fixture.cleanup()
  }
})

Deno.test('payout-duration-hours: get_payout_timing_stats() surfaces duration_hours to admin dashboard', async () => {
  const missing = requireEnv([
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'E2E_ADMIN_EMAIL',
    'E2E_ADMIN_PASSWORD',
  ])
  if (missing.length > 0) {
    console.log(`SKIP: missing ${missing.join(', ')}`)
    return
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const fixture = await createPayoutFixture(admin)

  try {
    // Seed a 36-hour payout attributed to this owner.
    const firstChargeAt = new Date('2026-04-10T00:00:00Z').toISOString()
    const paidAt = new Date('2026-04-11T12:00:00Z').toISOString()
    const payoutId = `po_test_rpc_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`

    const { error: insErr } = await admin.from('payout_events').insert({
      stripe_payout_id: payoutId,
      stripe_account_id: fixture.stripeAccountId,
      owner_user_id: fixture.ownerUserId,
      amount: 1500,
      currency: 'usd',
      status: 'paid',
      arrival_date: paidAt,
      paid_at: paidAt,
      first_charge_at: firstChargeAt,
      charge_count: 1,
    })
    assertEquals(insErr, null)

    // Sign in as the admin user to get a user-scoped JWT.
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: auth, error: signErr } = await anon.auth.signInWithPassword({
      email: Deno.env.get('E2E_ADMIN_EMAIL') ?? '',
      password: Deno.env.get('E2E_ADMIN_PASSWORD') ?? '',
    })
    assertEquals(signErr, null, `admin sign-in failed: ${signErr?.message}`)
    assertExists(auth.session)

    const adminUserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: `Bearer ${auth.session.access_token}` },
      },
    })

    const { data: stats, error: rpcErr } = await adminUserClient.rpc('get_payout_timing_stats')
    assertEquals(rpcErr, null, `RPC error: ${rpcErr?.message}`)
    assertExists(stats)

    const s = asStats(stats)
    assertEquals(s.window_days, 30)
    assertExists(
      s.max_hours,
      'max_hours should be non-null when at least one paid payout exists',
    )
    assert(
      Number(s.max_hours) >= 36,
      `max_hours should be >= 36, got ${String(s.max_hours)}`,
    )
    assert(
      Number(s.paid_count) >= 1,
      `paid_count should be >= 1, got ${String(s.paid_count)}`,
    )
  } finally {
    await fixture.cleanup()
  }
})

Deno.test('payout-duration-hours: get_payout_timing_stats() rejects non-admin callers', async () => {
  const missing = requireEnv([
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'E2E_OWNER_EMAIL',
    'E2E_OWNER_PASSWORD',
  ])
  if (missing.length > 0) {
    console.log(`SKIP: missing ${missing.join(', ')}`)
    return
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: auth, error: signErr } = await anon.auth.signInWithPassword({
    email: Deno.env.get('E2E_OWNER_EMAIL') ?? '',
    password: Deno.env.get('E2E_OWNER_PASSWORD') ?? '',
  })
  assertEquals(signErr, null, `owner sign-in failed: ${signErr?.message}`)
  assertExists(auth.session)

  const ownerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${auth.session.access_token}` },
    },
  })

  const { error } = await ownerClient.rpc('get_payout_timing_stats')
  assertExists(error, 'non-admin caller must be rejected with an error')
  const msg = String(error.message).toLowerCase()
  assert(
    msg.includes('unauthorized'),
    `expected error.message to contain "unauthorized", got: ${error.message}`,
  )
})
