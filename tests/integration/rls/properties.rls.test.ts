import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Properties RLS — cross-tenant isolation', () => {
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
    // Clean up test-inserted rows (hard delete)
    for (const id of testInsertedIds) {
      await clientA.from('properties').delete().eq('id', id)
      await clientB.from('properties').delete().eq('id', id)
    }
    await clientA.auth.signOut()
    await clientB.auth.signOut()
  })

  // ---------------------------------------------------------------------------
  // SELECT isolation (existing tests)
  // ---------------------------------------------------------------------------

  it('owner A can only read their own properties', async () => {
    const { data, error } = await clientA
      .from('properties')
      .select('id, owner_user_id')
      .neq('status', 'inactive')
    expect(error).toBeNull()
    expect(data).not.toBeNull()
    data!.forEach((row) => {
      expect(row.owner_user_id).toBe(ownerAId)
    })
  })

  it('owner B can only read their own properties', async () => {
    const { data, error } = await clientB
      .from('properties')
      .select('id, owner_user_id')
      .neq('status', 'inactive')
    expect(error).toBeNull()
    expect(data).not.toBeNull()
    data!.forEach((row) => {
      expect(row.owner_user_id).toBe(ownerBId)
    })
  })

  it('owner A results contain no rows from owner B', async () => {
    const { data: dataA } = await clientA
      .from('properties')
      .select('id, owner_user_id')
      .neq('status', 'inactive')
    const { data: dataB } = await clientB
      .from('properties')
      .select('id, owner_user_id')
      .neq('status', 'inactive')

    const ownerAIds = new Set((dataA ?? []).map((r) => r.id as string))
    const ownerBIds = new Set((dataB ?? []).map((r) => r.id as string))

    ownerBIds.forEach((id) => {
      expect(ownerAIds.has(id)).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // INSERT isolation
  // ---------------------------------------------------------------------------

  it('owner A can insert a property with their own owner_user_id', async () => {
    const { data, error } = await clientA
      .from('properties')
      .insert({
        owner_user_id: ownerAId,
        name: 'RLS Test Property A',
        address_line1: '999 Test Street',
        city: 'Testville',
        state: 'TX',
        postal_code: '00000',
        property_type: 'single_family',
        country: 'US',
      })
      .select('id')
      .single()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    testInsertedIds.push(data!.id)
  })

  it('owner B cannot insert a property with owner A owner_user_id', async () => {
    const { data, error } = await clientB
      .from('properties')
      .insert({
        owner_user_id: ownerAId,
        name: 'RLS Hijack Property',
        address_line1: '666 Hijack Ave',
        city: 'Hacktown',
        state: 'CA',
        postal_code: '99999',
        property_type: 'apartment',
        country: 'US',
      })
      .select('id')
      .single()

    // RLS WITH CHECK blocks this — owner B's auth.uid() != ownerAId
    expect(error).not.toBeNull()
    expect(data).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // UPDATE isolation
  // ---------------------------------------------------------------------------

  it('owner A can update their own property', async () => {
    const { data: properties } = await clientA
      .from('properties')
      .select('id, name')
      .neq('status', 'inactive')
      .limit(1)
      .single()

    expect(properties).not.toBeNull()

    const originalName = properties!.name
    const { error } = await clientA
      .from('properties')
      .update({ name: 'RLS Update Test Property' })
      .eq('id', properties!.id)

    expect(error).toBeNull()

    // Restore original name
    await clientA
      .from('properties')
      .update({ name: originalName })
      .eq('id', properties!.id)
  })

  it('owner B cannot update owner A property', async () => {
    const { data: properties } = await clientA
      .from('properties')
      .select('id')
      .neq('status', 'inactive')
      .limit(1)
      .single()

    expect(properties).not.toBeNull()

    // Owner B tries to update owner A's property — RLS blocks
    const { data, error } = await clientB
      .from('properties')
      .update({ name: 'RLS Hijack Update' })
      .eq('id', properties!.id)
      .select('id')

    // RLS USING clause prevents owner B from seeing/updating the row
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  // ---------------------------------------------------------------------------
  // DELETE isolation
  // ---------------------------------------------------------------------------

  it('owner A can delete their own test property', async () => {
    // Insert a property to delete
    const { data: inserted } = await clientA
      .from('properties')
      .insert({
        owner_user_id: ownerAId,
        name: 'RLS Delete Test Property',
        address_line1: '888 Delete Lane',
        city: 'Testville',
        state: 'TX',
        postal_code: '00000',
        property_type: 'single_family',
        country: 'US',
      })
      .select('id')
      .single()

    expect(inserted).not.toBeNull()

    const { error } = await clientA
      .from('properties')
      .delete()
      .eq('id', inserted!.id)

    expect(error).toBeNull()
  })

  it('owner B cannot delete owner A property', async () => {
    const { data: properties } = await clientA
      .from('properties')
      .select('id')
      .neq('status', 'inactive')
      .limit(1)
      .single()

    expect(properties).not.toBeNull()

    // Owner B tries to delete owner A's property — RLS blocks
    const { data, error } = await clientB
      .from('properties')
      .delete()
      .eq('id', properties!.id)
      .select('id')

    // RLS USING clause prevents owner B from seeing/deleting the row
    expect(error).toBeNull()
    expect(data).toEqual([])

    // Verify the row still exists for owner A
    const { data: stillExists } = await clientA
      .from('properties')
      .select('id')
      .eq('id', properties!.id)
      .single()

    expect(stillExists).not.toBeNull()
  })
})
