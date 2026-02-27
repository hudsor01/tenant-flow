import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Inspections RLS — cross-tenant isolation', () => {
  let clientA: SupabaseClient
  let clientB: SupabaseClient
  let ownerAId: string
  let ownerBId: string

  // Track IDs inserted by tests so afterAll can clean them up
  const testInsertedIds: string[] = []

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
    // Clean up test-inserted rows
    for (const id of testInsertedIds) {
      await clientA.from('inspections').delete().eq('id', id)
      await clientB.from('inspections').delete().eq('id', id)
    }
    await clientA.auth.signOut()
    await clientB.auth.signOut()
  })

  // ---------------------------------------------------------------------------
  // SELECT isolation (existing tests)
  // ---------------------------------------------------------------------------

  it('owner A can only read their own inspections', async () => {
    const { data, error } = await clientA
      .from('inspections')
      .select('id, owner_user_id')
    expect(error).toBeNull()
    expect(data).not.toBeNull()
    data!.forEach((row) => {
      expect(row.owner_user_id).toBe(ownerAId)
    })
  })

  it('owner B can only read their own inspections', async () => {
    const { data, error } = await clientB
      .from('inspections')
      .select('id, owner_user_id')
    expect(error).toBeNull()
    expect(data).not.toBeNull()
    data!.forEach((row) => {
      expect(row.owner_user_id).toBe(ownerBId)
    })
  })

  it('owner A results contain no rows from owner B', async () => {
    const { data: dataA } = await clientA
      .from('inspections')
      .select('id, owner_user_id')
    const { data: dataB } = await clientB
      .from('inspections')
      .select('id, owner_user_id')

    const ownerAIds = new Set((dataA ?? []).map((r) => r.id as string))
    const ownerBIds = new Set((dataB ?? []).map((r) => r.id as string))

    ownerBIds.forEach((id) => {
      expect(ownerAIds.has(id)).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // INSERT isolation
  // Inspections INSERT policy: auth.uid() = owner_user_id
  // ---------------------------------------------------------------------------

  it('owner A can insert an inspection for their own property', async () => {
    // Get owner A's lease and property for FK
    const { data: leaseA } = await clientA
      .from('leases')
      .select('id, unit_id')
      .neq('lease_status', 'inactive')
      .limit(1)
      .single()

    // Skip if no lease data
    if (!leaseA) return

    // Get the property_id from the unit
    const { data: unitA } = await clientA
      .from('units')
      .select('id, property_id')
      .eq('id', leaseA.unit_id)
      .single()

    if (!unitA) return

    const { data, error } = await clientA
      .from('inspections')
      .insert({
        owner_user_id: ownerAId,
        lease_id: leaseA.id,
        property_id: unitA.property_id,
        unit_id: unitA.id,
        inspection_type: 'move_in',
        status: 'scheduled',
      })
      .select('id')
      .single()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    testInsertedIds.push(data!.id)
  })

  it('owner B cannot insert an inspection with owner A owner_user_id', async () => {
    // Get owner A's lease and property for FK
    const { data: leaseA } = await clientA
      .from('leases')
      .select('id, unit_id')
      .neq('lease_status', 'inactive')
      .limit(1)
      .single()

    // Skip if no lease data
    if (!leaseA) return

    const { data: unitA } = await clientA
      .from('units')
      .select('id, property_id')
      .eq('id', leaseA.unit_id)
      .single()

    if (!unitA) return

    const { data, error } = await clientB
      .from('inspections')
      .insert({
        owner_user_id: ownerAId,
        lease_id: leaseA.id,
        property_id: unitA.property_id,
        unit_id: unitA.id,
        inspection_type: 'move_in',
        status: 'scheduled',
      })
      .select('id')
      .single()

    // RLS WITH CHECK blocks: auth.uid() != ownerAId for client B
    expect(error).not.toBeNull()
    expect(data).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // UPDATE isolation
  // ---------------------------------------------------------------------------

  it('owner A can update their own inspection', async () => {
    const { data: inspections } = await clientA
      .from('inspections')
      .select('id, owner_notes')
      .limit(1)
      .single()

    // Skip if no inspections
    if (!inspections) return

    const original = inspections.owner_notes
    const { error } = await clientA
      .from('inspections')
      .update({ owner_notes: 'RLS update test' })
      .eq('id', inspections.id)

    expect(error).toBeNull()

    // Restore original
    await clientA
      .from('inspections')
      .update({ owner_notes: original })
      .eq('id', inspections.id)
  })

  it('owner B cannot update owner A inspection', async () => {
    const { data: inspections } = await clientA
      .from('inspections')
      .select('id')
      .limit(1)
      .single()

    // Skip if no inspections
    if (!inspections) return

    const { data, error } = await clientB
      .from('inspections')
      .update({ owner_notes: 'RLS hijack' })
      .eq('id', inspections.id)
      .select('id')

    // RLS USING clause prevents owner B from seeing/updating the row
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  // ---------------------------------------------------------------------------
  // DELETE isolation
  // ---------------------------------------------------------------------------

  it('owner A can delete their own test inspection', async () => {
    // Use a test-inserted inspection if available, otherwise insert one
    const { data: leaseA } = await clientA
      .from('leases')
      .select('id, unit_id')
      .neq('lease_status', 'inactive')
      .limit(1)
      .single()

    // Skip if no lease
    if (!leaseA) return

    const { data: unitA } = await clientA
      .from('units')
      .select('id, property_id')
      .eq('id', leaseA.unit_id)
      .single()

    if (!unitA) return

    const { data: inserted } = await clientA
      .from('inspections')
      .insert({
        owner_user_id: ownerAId,
        lease_id: leaseA.id,
        property_id: unitA.property_id,
        unit_id: unitA.id,
        inspection_type: 'move_out',
        status: 'scheduled',
      })
      .select('id')
      .single()

    if (!inserted) return

    const { error } = await clientA
      .from('inspections')
      .delete()
      .eq('id', inserted.id)

    expect(error).toBeNull()
  })

  it('owner B cannot delete owner A inspection', async () => {
    const { data: inspections } = await clientA
      .from('inspections')
      .select('id')
      .limit(1)
      .single()

    // Skip if no inspections
    if (!inspections) return

    const { data, error } = await clientB
      .from('inspections')
      .delete()
      .eq('id', inspections.id)
      .select('id')

    // RLS USING clause prevents owner B from seeing/deleting the row
    expect(error).toBeNull()
    expect(data).toEqual([])

    // Verify still exists for owner A
    const { data: stillExists } = await clientA
      .from('inspections')
      .select('id')
      .eq('id', inspections.id)
      .single()

    expect(stillExists).not.toBeNull()
  })
})
