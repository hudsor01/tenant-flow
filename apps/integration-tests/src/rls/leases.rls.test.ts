import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Leases RLS — cross-tenant isolation', () => {
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
  // SELECT isolation (existing tests)
  // ---------------------------------------------------------------------------

  it('owner A can only read their own leases', async () => {
    const { data, error } = await clientA
      .from('leases')
      .select('id, owner_user_id')
    expect(error).toBeNull()
    expect(data).not.toBeNull()
    data!.forEach((row) => {
      expect(row.owner_user_id).toBe(ownerAId)
    })
  })

  it('owner B can only read their own leases', async () => {
    const { data, error } = await clientB
      .from('leases')
      .select('id, owner_user_id')
    expect(error).toBeNull()
    expect(data).not.toBeNull()
    data!.forEach((row) => {
      expect(row.owner_user_id).toBe(ownerBId)
    })
  })

  it('owner A results contain no rows from owner B', async () => {
    const { data: dataA } = await clientA
      .from('leases')
      .select('id, owner_user_id')
    const { data: dataB } = await clientB
      .from('leases')
      .select('id, owner_user_id')

    const ownerAIds = new Set((dataA ?? []).map((r) => r.id as string))
    const ownerBIds = new Set((dataB ?? []).map((r) => r.id as string))

    ownerBIds.forEach((id) => {
      expect(ownerAIds.has(id)).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // UPDATE isolation
  // ---------------------------------------------------------------------------

  it('owner A can update their own lease', async () => {
    const { data: leaseList } = await clientA
      .from('leases')
      .select('id, grace_period_days')
      .limit(1)

    const lease = leaseList?.[0]
    if (!lease) return

    const original = lease.grace_period_days
    const { error } = await clientA
      .from('leases')
      .update({ grace_period_days: 99 })
      .eq('id', lease.id)

    expect(error).toBeNull()

    // Restore original
    await clientA
      .from('leases')
      .update({ grace_period_days: original })
      .eq('id', lease.id)
  })

  it('owner B cannot update owner A lease', async () => {
    const { data: leaseList } = await clientA
      .from('leases')
      .select('id')
      .limit(1)

    const lease = leaseList?.[0]
    if (!lease) return

    // Owner B tries to update owner A's lease — RLS blocks
    const { data, error } = await clientB
      .from('leases')
      .update({ grace_period_days: 1 })
      .eq('id', lease.id)
      .select('id')

    // RLS USING clause prevents owner B from seeing/updating the row
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  // ---------------------------------------------------------------------------
  // DELETE isolation
  // ---------------------------------------------------------------------------

  it('owner B cannot delete owner A lease', async () => {
    const { data: leaseList } = await clientA
      .from('leases')
      .select('id')
      .limit(1)

    const lease = leaseList?.[0]
    if (!lease) return

    // Owner B tries to delete owner A's lease — RLS blocks
    const { data, error } = await clientB
      .from('leases')
      .delete()
      .eq('id', lease.id)
      .select('id')

    // RLS USING clause prevents owner B from seeing/deleting the row
    expect(error).toBeNull()
    expect(data).toEqual([])

    // Verify still exists for owner A
    const { data: stillExists } = await clientA
      .from('leases')
      .select('id')
      .eq('id', lease.id)
      .single()

    expect(stillExists).not.toBeNull()
  })

  // ---------------------------------------------------------------------------
  // INSERT isolation
  // Lease INSERT has complex FK requirements (unit_id, primary_tenant_id).
  // Cross-tenant test: owner B cannot create a lease under owner A's unit.
  // ---------------------------------------------------------------------------

  it('owner B cannot insert a lease under owner A unit', async () => {
    // Get one of owner A's units and a tenant for FK
    const { data: unitList } = await clientA
      .from('units')
      .select('id')
      .limit(1)

    const { data: tenantList } = await clientA
      .from('tenants')
      .select('id')
      .limit(1)

    const unitA = unitList?.[0]
    const tenantA = tenantList?.[0]

    // Skip if no test data available
    if (!unitA || !tenantA) return

    const { data, error } = await clientB
      .from('leases')
      .insert({
        owner_user_id: ownerBId,
        unit_id: unitA.id,
        primary_tenant_id: tenantA.id,
        start_date: '2099-01-01',
        end_date: '2099-12-31',
        rent_amount: 1000,
        security_deposit: 500,
      })
      .select('id')
      .single()

    // RLS should block: owner B cannot create a lease under owner A's unit
    expect(error).not.toBeNull()
    expect(data).toBeNull()
  })
})
