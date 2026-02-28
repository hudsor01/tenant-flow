import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Vendors RLS — cross-tenant isolation', () => {
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
      await clientA.from('vendors').delete().eq('id', id)
      await clientB.from('vendors').delete().eq('id', id)
    }
    await clientA.auth.signOut()
    await clientB.auth.signOut()
  })

  // ---------------------------------------------------------------------------
  // SELECT isolation (existing tests)
  // ---------------------------------------------------------------------------

  it('owner A can only read their own vendors', async () => {
    const { data, error } = await clientA
      .from('vendors')
      .select('id, owner_user_id')
    expect(error).toBeNull()
    expect(data).not.toBeNull()
    data!.forEach((row) => {
      expect(row.owner_user_id).toBe(ownerAId)
    })
  })

  it('owner B can only read their own vendors', async () => {
    const { data, error } = await clientB
      .from('vendors')
      .select('id, owner_user_id')
    expect(error).toBeNull()
    expect(data).not.toBeNull()
    data!.forEach((row) => {
      expect(row.owner_user_id).toBe(ownerBId)
    })
  })

  it('owner A results contain no rows from owner B', async () => {
    const { data: dataA } = await clientA
      .from('vendors')
      .select('id, owner_user_id')
    const { data: dataB } = await clientB
      .from('vendors')
      .select('id, owner_user_id')

    const ownerAIds = new Set((dataA ?? []).map((r) => r.id as string))
    const ownerBIds = new Set((dataB ?? []).map((r) => r.id as string))

    ownerBIds.forEach((id) => {
      expect(ownerAIds.has(id)).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // INSERT isolation
  // ---------------------------------------------------------------------------

  it('owner A can insert a vendor with their own owner_user_id', async () => {
    const { data, error } = await clientA
      .from('vendors')
      .insert({
        owner_user_id: ownerAId,
        name: 'RLS Test Vendor A',
        trade: 'plumbing',
      })
      .select('id')
      .single()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    testInsertedIds.push(data!.id)
  })

  it('owner B cannot insert a vendor with owner A owner_user_id', async () => {
    const { data, error } = await clientB
      .from('vendors')
      .insert({
        owner_user_id: ownerAId,
        name: 'RLS Hijack Vendor',
        trade: 'electrical',
      })
      .select('id')
      .single()

    // RLS WITH CHECK blocks this — PostgREST returns an error
    expect(error).not.toBeNull()
    expect(data).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // UPDATE isolation
  // ---------------------------------------------------------------------------

  it('owner A can update their own vendor', async () => {
    // Get one of owner A's vendors
    const { data: vendors } = await clientA
      .from('vendors')
      .select('id, name')
      .limit(1)
      .single()

    expect(vendors).not.toBeNull()

    const originalName = vendors!.name
    const { error } = await clientA
      .from('vendors')
      .update({ name: 'RLS Update Test' })
      .eq('id', vendors!.id)

    expect(error).toBeNull()

    // Restore original name
    await clientA
      .from('vendors')
      .update({ name: originalName })
      .eq('id', vendors!.id)
  })

  it('owner B cannot update owner A vendor', async () => {
    // Get one of owner A's vendors
    const { data: vendors } = await clientA
      .from('vendors')
      .select('id, name')
      .limit(1)
      .single()

    expect(vendors).not.toBeNull()

    // Owner B tries to update owner A's vendor — RLS blocks
    const { data, error } = await clientB
      .from('vendors')
      .update({ name: 'RLS Hijack Update' })
      .eq('id', vendors!.id)
      .select('id')

    // RLS USING clause prevents owner B from seeing/updating the row
    // PostgREST returns 0 rows (empty array) since the row is invisible
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  // ---------------------------------------------------------------------------
  // DELETE isolation
  // ---------------------------------------------------------------------------

  it('owner A can delete their own test vendor', async () => {
    // Insert a vendor to delete
    const { data: inserted } = await clientA
      .from('vendors')
      .insert({
        owner_user_id: ownerAId,
        name: 'RLS Delete Test Vendor',
        trade: 'hvac',
      })
      .select('id')
      .single()

    expect(inserted).not.toBeNull()

    const { error } = await clientA
      .from('vendors')
      .delete()
      .eq('id', inserted!.id)

    expect(error).toBeNull()
  })

  it('owner B cannot delete owner A vendor', async () => {
    // Get one of owner A's vendors
    const { data: vendors } = await clientA
      .from('vendors')
      .select('id')
      .limit(1)
      .single()

    expect(vendors).not.toBeNull()

    // Owner B tries to delete owner A's vendor — RLS blocks
    const { data, error } = await clientB
      .from('vendors')
      .delete()
      .eq('id', vendors!.id)
      .select('id')

    // RLS USING clause prevents owner B from seeing/deleting the row
    expect(error).toBeNull()
    expect(data).toEqual([])

    // Verify the row still exists for owner A
    const { data: stillExists } = await clientA
      .from('vendors')
      .select('id')
      .eq('id', vendors!.id)
      .single()

    expect(stillExists).not.toBeNull()
  })
})
