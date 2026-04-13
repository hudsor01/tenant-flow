// Shared deterministic test fixture for payout lifecycle integration tests.
// Creates owner + stripe_connected_accounts rows needed for payout.* webhook
// delivery, plus helpers to sign webhook payloads with the local STRIPE_WEBHOOK_SECRET
// and POST them to the live stripe-webhooks Edge Function.
//
// Used by:
//   tests/payout-lifecycle-integration.test.ts (TEST-05)
//   tests/payout-idempotency.test.ts           (TEST-05)
//   tests/payout-duration-hours.test.ts        (TEST-06)
//
// Conventions:
//   - Owner emails use `test-payout-*@tenantflow.test` (non-routable)
//   - Connected account IDs use `acct_test_*` prefix
//   - Event IDs use `evt_test_payout_*` prefix (consumed by cleanup filter)
//   - Cleanup deletes in FK-safe reverse order inside a try/finally guard
//   - Fixture reads SUPABASE_URL + STRIPE_WEBHOOK_SECRET at call time; tests
//     are expected to skip-guard before invoking these helpers.

import Stripe from 'npm:stripe@20'
import { type SupabaseClient } from 'npm:@supabase/supabase-js@2'

export interface PayoutFixture {
  ownerUserId: string
  stripeAccountId: string
  createdAtIso: string
  cleanup: () => Promise<void>
}

export interface BuildPayoutPaidEventOpts {
  stripeAccountId: string
  payoutId?: string
  eventId?: string
  amountCents?: number
  arrivalDateUnix?: number
  createdUnix?: number
}

export interface SignedPayoutEvent {
  rawBody: string
  signatureHeader: string
  eventId: string
}

export interface PostSignedWebhookResult {
  status: number
  data: Record<string, unknown>
}

async function deleteSilently(
  supabase: SupabaseClient,
  table: string,
  column: string,
  value: string,
): Promise<void> {
  const { error } = await supabase.from(table).delete().eq(column, value)
  if (error) {
    console.error(
      `[PAYOUT_FIXTURE_CLEANUP] ${table}.${column}=${value} delete failed: ${error.message}`,
    )
  }
}

async function insertOrThrow(
  supabase: SupabaseClient,
  table: string,
  row: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from(table).insert(row)
  if (error) {
    throw new Error(`[PAYOUT_FIXTURE] Insert failed at ${table}: ${error.message}`)
  }
}

/**
 * Seed owner + stripe_connected_accounts rows needed for the payout.* webhook
 * handler to resolve owner_user_id. Returns a cleanup() closure that removes
 * every row created by this fixture (FK-safe order) plus any payout_events
 * and stripe_webhook_events rows that landed during the test.
 */
export async function createPayoutFixture(
  supabase: SupabaseClient,
): Promise<PayoutFixture> {
  const ownerUserId = crypto.randomUUID()
  const randomSuffix = ownerUserId.slice(0, 8)
  const stripeAccountId = `acct_test_payout_${randomSuffix}`
  const createdAtIso = new Date().toISOString()

  await insertOrThrow(supabase, 'users', {
    id: ownerUserId,
    email: `test-payout-${randomSuffix}@tenantflow.test`,
    user_type: 'OWNER',
    full_name: 'Payout Fixture Owner',
  })

  await insertOrThrow(supabase, 'stripe_connected_accounts', {
    user_id: ownerUserId,
    stripe_account_id: stripeAccountId,
    business_type: 'individual',
    charges_enabled: true,
    onboarding_completed_at: createdAtIso,
  })

  const cleanup = async (): Promise<void> => {
    // Reverse FK order:
    // 1. payout_events scoped to this owner
    await deleteSilently(supabase, 'payout_events', 'owner_user_id', ownerUserId)

    // 2. stripe_webhook_events created during this fixture window.
    //    Use the evt_test_payout_* prefix + createdAtIso window to scope the
    //    delete without touching unrelated webhook history.
    const { error: wheErr } = await supabase
      .from('stripe_webhook_events')
      .delete()
      .like('id', 'evt_test_payout_%')
      .gte('created_at', createdAtIso)
    if (wheErr) {
      console.error(
        `[PAYOUT_FIXTURE_CLEANUP] stripe_webhook_events delete failed: ${wheErr.message}`,
      )
    }

    // 3. stripe_connected_accounts (FK to users)
    await deleteSilently(
      supabase,
      'stripe_connected_accounts',
      'stripe_account_id',
      stripeAccountId,
    )

    // 4. Owner user
    await deleteSilently(supabase, 'users', 'id', ownerUserId)
  }

  return { ownerUserId, stripeAccountId, createdAtIso, cleanup }
}

/**
 * Build a minimal Stripe.Event shaped payload for `payout.paid` routed to the
 * given connected account. Defaults produce a well-formed event accepted by
 * Stripe.webhooks.constructEventAsync after signing.
 */
export function buildPayoutPaidEvent(
  opts: BuildPayoutPaidEventOpts,
): Record<string, unknown> {
  const nowUnix = Math.floor(Date.now() / 1000)
  const createdUnix = opts.createdUnix ?? nowUnix
  const arrivalDateUnix = opts.arrivalDateUnix ?? (nowUnix + 2 * 86400)
  const amountCents = opts.amountCents ?? 120000
  const payoutId = opts.payoutId ??
    `po_test_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`
  const eventId = opts.eventId ??
    `evt_test_payout_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`

  return {
    id: eventId,
    object: 'event',
    type: 'payout.paid',
    api_version: '2026-02-25.clover',
    created: createdUnix,
    livemode: false,
    account: opts.stripeAccountId,
    data: {
      object: {
        id: payoutId,
        object: 'payout',
        amount: amountCents,
        currency: 'usd',
        status: 'paid',
        arrival_date: arrivalDateUnix,
      },
    },
  }
}

/**
 * Build a minimal Stripe.Event shaped payload for `payout.failed` with a
 * failure_code + failure_message pair the handler records verbatim.
 */
export function buildPayoutFailedEvent(opts: {
  stripeAccountId: string
  payoutId?: string
  eventId?: string
  amountCents?: number
  failureCode?: string
  failureMessage?: string
  createdUnix?: number
}): Record<string, unknown> {
  const nowUnix = Math.floor(Date.now() / 1000)
  const createdUnix = opts.createdUnix ?? nowUnix
  const amountCents = opts.amountCents ?? 50000
  const payoutId = opts.payoutId ??
    `po_test_fail_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`
  const eventId = opts.eventId ??
    `evt_test_payout_fail_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`

  return {
    id: eventId,
    object: 'event',
    type: 'payout.failed',
    api_version: '2026-02-25.clover',
    created: createdUnix,
    livemode: false,
    account: opts.stripeAccountId,
    data: {
      object: {
        id: payoutId,
        object: 'payout',
        amount: amountCents,
        currency: 'usd',
        status: 'failed',
        failure_code: opts.failureCode ?? 'insufficient_funds',
        failure_message: opts.failureMessage ?? 'Not enough balance',
      },
    },
  }
}

/**
 * Serialize a payload exactly once and sign it with
 * Stripe.webhooks.generateTestHeaderString using STRIPE_WEBHOOK_SECRET from env.
 *
 * The caller MUST post the returned `rawBody` verbatim — re-serializing will
 * invalidate the signature (byte-for-byte mismatch triggers
 * constructEventAsync to reject).
 */
export function signPayoutEvent(
  payload: Record<string, unknown>,
): SignedPayoutEvent {
  const rawBody = JSON.stringify(payload)
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
  // Stripe client constructor arg is unused for signature generation; the SDK
  // only needs a non-empty string so the instance can be created.
  const stripeClient = new Stripe('sk_test_payout_signing_unused', {
    apiVersion: '2026-02-25.clover',
  })
  const signatureHeader = stripeClient.webhooks.generateTestHeaderString({
    payload: rawBody,
    secret,
  })
  const eventId = typeof payload.id === 'string' ? payload.id : ''
  return { rawBody, signatureHeader, eventId }
}

/**
 * POST a signed webhook payload to the locally-served stripe-webhooks Edge
 * Function. The request carries the anon key as Authorization (required for
 * Supabase gateway routing) and the stripe-signature header as the auth Stripe
 * actually verifies.
 */
export async function postSignedWebhook(
  rawBody: string,
  signatureHeader: string,
): Promise<PostSignedWebhookResult> {
  const url = `${Deno.env.get('SUPABASE_URL') ?? ''}/functions/v1/stripe-webhooks`
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': signatureHeader,
      Authorization: `Bearer ${anonKey}`,
    },
    body: rawBody,
  })
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  return { status: response.status, data }
}
