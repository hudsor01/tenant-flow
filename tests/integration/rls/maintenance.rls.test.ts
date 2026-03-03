import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Maintenance Requests RLS — cross-tenant isolation', () => {
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

  it('owner A can only read their own maintenance requests', async () => {
    const { data, error } = await clientA
      .from('maintenance_requests')
      .select('id, owner_user_id')
    expect(error).toBeNull()
    expect(data).not.toBeNull()
    data!.forEach((row) => {
      expect(row.owner_user_id).toBe(ownerAId)
    })
  })

  it('owner B can only read their own maintenance requests', async () => {
    const { data, error } = await clientB
      .from('maintenance_requests')
      .select('id, owner_user_id')
    expect(error).toBeNull()
    expect(data).not.toBeNull()
    data!.forEach((row) => {
      expect(row.owner_user_id).toBe(ownerBId)
    })
  })

  it('owner A results contain no rows from owner B', async () => {
    const { data: dataA } = await clientA
      .from('maintenance_requests')
      .select('id, owner_user_id')
    const { data: dataB } = await clientB
      .from('maintenance_requests')
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

  it('owner A can update their own maintenance request', async () => {
    const { data: requests } = await clientA
      .from('maintenance_requests')
      .select('id, description')
      .limit(1)
      .single()

    // Skip if no test data
    if (!requests) return

    const original = requests.description
    const { error } = await clientA
      .from('maintenance_requests')
      .update({ description: 'RLS update test' })
      .eq('id', requests.id)

    expect(error).toBeNull()

    // Restore original
    await clientA
      .from('maintenance_requests')
      .update({ description: original })
      .eq('id', requests.id)
  })

  it('owner B cannot update owner A maintenance request', async () => {
    const { data: requests } = await clientA
      .from('maintenance_requests')
      .select('id')
      .limit(1)
      .single()

    // Skip if no test data
    if (!requests) return

    // Owner B tries to update owner A's request — RLS blocks
    const { data, error } = await clientB
      .from('maintenance_requests')
      .update({ description: 'RLS hijack update' })
      .eq('id', requests.id)
      .select('id')

    // RLS USING clause prevents owner B from seeing/updating the row
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  // ---------------------------------------------------------------------------
  // DELETE isolation
  // ---------------------------------------------------------------------------

  it('owner B cannot delete owner A maintenance request', async () => {
    const { data: requests } = await clientA
      .from('maintenance_requests')
      .select('id')
      .limit(1)
      .single()

    // Skip if no test data
    if (!requests) return

    // Owner B tries to delete owner A's request — RLS blocks
    const { data, error } = await clientB
      .from('maintenance_requests')
      .delete()
      .eq('id', requests.id)
      .select('id')

    // RLS USING clause prevents owner B from seeing/deleting the row
    expect(error).toBeNull()
    expect(data).toEqual([])

    // Verify still exists for owner A
    const { data: stillExists } = await clientA
      .from('maintenance_requests')
      .select('id')
      .eq('id', requests.id)
      .single()

    expect(stillExists).not.toBeNull()
  })

  // ---------------------------------------------------------------------------
  // INSERT isolation
  // Note: Maintenance request INSERT policy requires tenant_id = get_current_tenant_id()
  // (tenant-only insert). Owner-to-owner cross-tenant test: owner B cannot
  // insert a maintenance request referencing owner A's unit/tenant.
  // ---------------------------------------------------------------------------

  it('owner B cannot insert a maintenance request for owner A unit', async () => {
    // Get owner A's unit and tenant for FK
    const { data: unitA } = await clientA
      .from('units')
      .select('id')
      .neq('status', 'inactive')
      .limit(1)
      .single()

    const { data: tenantA } = await clientA
      .from('tenants')
      .select('id')
      .limit(1)
      .single()

    // Skip if no test data available
    if (!unitA || !tenantA) return

    const { data, error } = await clientB
      .from('maintenance_requests')
      .insert({
        owner_user_id: ownerBId,
        unit_id: unitA.id,
        tenant_id: tenantA.id,
        description: 'RLS hijack maintenance request',
      })
      .select('id')
      .single()

    // RLS should block: maintenance_requests INSERT requires tenant_id = get_current_tenant_id()
    // Owner B is not a tenant, so get_current_tenant_id() returns null
    expect(error).not.toBeNull()
    expect(data).toBeNull()
  })
})
