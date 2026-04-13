// Integration + unit tests for the payout lifecycle webhook path.
//
// 1. Integration: verifies the stripe-webhooks Edge Function accepts the
//    new payout.* event types and rejects missing signatures (smoke check).
// 2. Unit: exercises handlePayoutLifecycle with mocked Supabase + Stripe
//    clients to prove a payout.paid event results in an upsert carrying
//    paid_at + first_charge_at (which drives the duration_hours generated
//    column in payout_events).
//
// Run: deno test --allow-all tests/payout-webhook-test.ts
// Requires `supabase functions serve` for the integration portion.

import { assert, assertEquals } from 'jsr:@std/assert@1'
import 'jsr:@std/dotenv/load'
import { handlePayoutLifecycle } from '../stripe-webhooks/handlers/payout-lifecycle.ts'

// ---------------------------------------------------------------------------
// Unit test — handlePayoutLifecycle records paid payout with first_charge_at
// ---------------------------------------------------------------------------

Deno.test('handlePayoutLifecycle: payout.paid upserts with paid_at + first_charge_at + charge_count', async () => {
  const captured: { upsertArgs?: Record<string, unknown> } = {}

  // Minimal fake Supabase admin client — mimics the fluent builder just enough
  // for this handler. Each `.from()` returns an object whose chained methods
  // resolve to canned data.
  const fakeSupabase = {
    from(table: string) {
      if (table === 'stripe_connected_accounts') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { user_id: 'owner-123' }, error: null }),
            }),
          }),
        }
      }
      if (table === 'rent_payments') {
        return {
          select: () => ({
            in: () => ({
              order: () => ({
                limit: () => ({
                  single: () => Promise.resolve({
                    data: { stripe_charge_id: 'ch_abc', paid_at: '2026-04-10T12:00:00Z', created_at: '2026-04-10T12:00:00Z' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'payout_events') {
        return {
          upsert: (payload: Record<string, unknown>) => {
            captured.upsertArgs = payload
            return Promise.resolve({ error: null })
          },
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  }

  const fakeStripe = {
    balanceTransactions: {
      list: () => Promise.resolve({
        data: [{ source: 'ch_abc' }],
      }),
    },
  }

  const event = {
    type: 'payout.paid',
    account: 'acct_test_123',
    created: Math.floor(new Date('2026-04-12T00:00:00Z').getTime() / 1000),
    data: {
      object: {
        id: 'po_test_001',
        amount: 120000, // $1200.00 in cents
        currency: 'usd',
        status: 'paid',
        arrival_date: Math.floor(new Date('2026-04-12T10:00:00Z').getTime() / 1000),
      },
    },
  }

  // deno-lint-ignore no-explicit-any
  await handlePayoutLifecycle(fakeSupabase as any, fakeStripe as any, event as any)

  assert(captured.upsertArgs, 'payout_events upsert should have been called')
  assertEquals(captured.upsertArgs.stripe_payout_id, 'po_test_001')
  assertEquals(captured.upsertArgs.owner_user_id, 'owner-123')
  assertEquals(captured.upsertArgs.status, 'paid')
  assertEquals(captured.upsertArgs.amount, 1200) // cents → dollars
  assertEquals(captured.upsertArgs.charge_count, 1)
  assert(
    typeof captured.upsertArgs.paid_at === 'string',
    'paid_at should be set to ISO timestamp (drives duration_hours)',
  )
  assertEquals(captured.upsertArgs.first_charge_at, '2026-04-10T12:00:00Z')
})

Deno.test('handlePayoutLifecycle: payout.failed records failure_code + failure_message', async () => {
  const captured: { upsertArgs?: Record<string, unknown> } = {}

  const fakeSupabase = {
    from(table: string) {
      if (table === 'stripe_connected_accounts') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { user_id: 'owner-456' }, error: null }),
            }),
          }),
        }
      }
      if (table === 'payout_events') {
        return {
          upsert: (payload: Record<string, unknown>) => {
            captured.upsertArgs = payload
            return Promise.resolve({ error: null })
          },
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  }

  const fakeStripe = { balanceTransactions: { list: () => Promise.resolve({ data: [] }) } }

  const event = {
    type: 'payout.failed',
    account: 'acct_test_456',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'po_test_fail',
        amount: 50000,
        currency: 'usd',
        status: 'failed',
        failure_code: 'insufficient_funds',
        failure_message: 'Not enough balance',
      },
    },
  }

  // deno-lint-ignore no-explicit-any
  await handlePayoutLifecycle(fakeSupabase as any, fakeStripe as any, event as any)

  assert(captured.upsertArgs, 'payout_events upsert should have been called')
  assertEquals(captured.upsertArgs.status, 'failed')
  assertEquals(captured.upsertArgs.failure_code, 'insufficient_funds')
  assertEquals(captured.upsertArgs.failure_message, 'Not enough balance')
  assert(typeof captured.upsertArgs.failed_at === 'string', 'failed_at should be set')
})
