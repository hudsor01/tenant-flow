import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Rent Payments RLS — cross-owner isolation', () => {
  let clientA: SupabaseClient
  let clientB: SupabaseClient
  let ownerAId: string
  let ownerBId: string

  beforeAll(async () => {
    const { ownerA, ownerB } = getTestCredentials()
    clientA = await createTestClient(ownerA.email, ownerA.password)
    clientB = await createTestClient(ownerB.email, ownerB.password)

    const {
      data: { user: userA },
    } = await clientA.auth.getUser()
    const {
      data: { user: userB },
    } = await clientB.auth.getUser()
    ownerAId = userA!.id
    ownerBId = userB!.id
  })

  afterAll(async () => {
    await clientA.auth.signOut()
    await clientB.auth.signOut()
  })

  // ---------------------------------------------------------------------------
  // SELECT isolation — rent_payments access via lease -> property -> owner chain
  // ---------------------------------------------------------------------------

  it('owner A can only read rent_payments for leases they own', async () => {
    const { data, error } = await clientA
      .from('rent_payments')
      .select('id, lease_id')

    expect(error).toBeNull()
    expect(data).not.toBeNull()

    // If owner A has rent_payments, verify each belongs to a lease they own
    if (!data || data.length === 0) return

    // Get all lease IDs visible to owner A to verify chain
    const { data: ownerALeases } = await clientA
      .from('leases')
      .select('id')
    const ownerALeaseIds = new Set((ownerALeases ?? []).map((l) => l.id as string))

    data.forEach((row) => {
      expect(ownerALeaseIds.has(row.lease_id as string)).toBe(true)
    })
  })

  it('owner B can only read rent_payments for leases they own', async () => {
    const { data, error } = await clientB
      .from('rent_payments')
      .select('id, lease_id')

    expect(error).toBeNull()
    expect(data).not.toBeNull()

    if (!data || data.length === 0) return

    const { data: ownerBLeases } = await clientB
      .from('leases')
      .select('id')
    const ownerBLeaseIds = new Set((ownerBLeases ?? []).map((l) => l.id as string))

    data.forEach((row) => {
      expect(ownerBLeaseIds.has(row.lease_id as string)).toBe(true)
    })
  })

  it('owner A results contain no rows from owner B', async () => {
    const { data: dataA } = await clientA
      .from('rent_payments')
      .select('id')
    const { data: dataB } = await clientB
      .from('rent_payments')
      .select('id')

    const ownerAIds = new Set((dataA ?? []).map((r) => r.id as string))
    const ownerBIds = new Set((dataB ?? []).map((r) => r.id as string))

    // Cross-owner isolation: no overlap between owner A and owner B payment IDs
    ownerBIds.forEach((id) => {
      expect(ownerAIds.has(id)).toBe(false)
    })
  })
})
