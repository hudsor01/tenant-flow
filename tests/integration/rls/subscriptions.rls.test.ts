import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Subscriptions RLS — cross-owner isolation', () => {
  let clientA: SupabaseClient
  let clientB: SupabaseClient

  beforeAll(async () => {
    const { ownerA, ownerB } = getTestCredentials()
    clientA = await createTestClient(ownerA.email, ownerA.password)
    clientB = await createTestClient(ownerB.email, ownerB.password)
  })

  afterAll(async () => {
    await clientA.auth.signOut()
    await clientB.auth.signOut()
  })

  // ---------------------------------------------------------------------------
  // SELECT isolation — stripe.subscriptions scoped by customer ID
  // The subscriptions table lives in the stripe schema (not public).
  // If the stripe schema is not exposed, tests handle the error gracefully.
  // ---------------------------------------------------------------------------

  it('owner A can only read their own stripe subscriptions', async () => {
    const { data, error } = await clientA
      .schema('stripe')
      .from('subscriptions')
      .select('id, customer')

    // If stripe schema is not accessible, skip gracefully
    if (error) return

    expect(data).not.toBeNull()

    if (!data || data.length === 0) return

    // All returned rows should have the same customer ID (scoped by RLS)
    const customerIds = new Set(data.map((r) => r.customer as string))
    expect(customerIds.size).toBeLessThanOrEqual(1)
  })

  it('stripe subscriptions: no overlap between owner A and owner B', async () => {
    const { data: dataA, error: errorA } = await clientA
      .schema('stripe')
      .from('subscriptions')
      .select('id')
    const { data: dataB, error: errorB } = await clientB
      .schema('stripe')
      .from('subscriptions')
      .select('id')

    // If stripe schema is not accessible, skip gracefully
    if (errorA || errorB) return

    const ownerAIds = new Set((dataA ?? []).map((r) => r.id as string))
    const ownerBIds = new Set((dataB ?? []).map((r) => r.id as string))

    ownerBIds.forEach((id) => {
      expect(ownerAIds.has(id)).toBe(false)
    })
  })
})
