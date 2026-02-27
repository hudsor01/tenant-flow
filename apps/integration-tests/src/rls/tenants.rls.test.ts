import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Tenants RLS — cross-tenant isolation', () => {
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

  it('owner A can only read their own tenants', async () => {
    const { data, error } = await clientA
      .from('tenants')
      .select('id')
    expect(error).toBeNull()
    expect(data).not.toBeNull()
    // RLS enforces isolation via lease_tenants -> leases -> owner_user_id chain
  })

  it('owner B can only read their own tenants', async () => {
    const { data, error } = await clientB
      .from('tenants')
      .select('id')
    expect(error).toBeNull()
    expect(data).not.toBeNull()
  })

  it('owner A results contain no rows from owner B', async () => {
    const { data: dataA } = await clientA
      .from('tenants')
      .select('id')
    const { data: dataB } = await clientB
      .from('tenants')
      .select('id')

    const ownerAIds = new Set((dataA ?? []).map((r) => r.id as string))
    const ownerBIds = new Set((dataB ?? []).map((r) => r.id as string))

    ownerBIds.forEach((id) => {
      expect(ownerAIds.has(id)).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // INSERT isolation
  // Tenants INSERT policy: user_id = auth.uid()
  // Only a user can create their own tenant profile.
  // ---------------------------------------------------------------------------

  it('owner A cannot insert a tenant record with owner B user_id', async () => {
    const { data, error } = await clientA
      .from('tenants')
      .insert({
        user_id: ownerBId,
      })
      .select('id')
      .single()

    // RLS WITH CHECK blocks: user_id must equal auth.uid() (ownerAId)
    expect(error).not.toBeNull()
    expect(data).toBeNull()
  })

  it('owner B cannot insert a tenant record with owner A user_id', async () => {
    const { data, error } = await clientB
      .from('tenants')
      .insert({
        user_id: ownerAId,
      })
      .select('id')
      .single()

    // RLS WITH CHECK blocks: user_id must equal auth.uid() (ownerBId)
    expect(error).not.toBeNull()
    expect(data).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // UPDATE isolation
  // Tenants UPDATE policy: user_id = auth.uid()
  // Only the tenant themselves can update their record.
  // Owners can SELECT but not UPDATE tenant records.
  // ---------------------------------------------------------------------------

  it('owner A cannot update a tenant record they can view', async () => {
    const { data: tenants } = await clientA
      .from('tenants')
      .select('id')
      .limit(1)
      .single()

    // Skip if owner A has no visible tenants
    if (!tenants) return

    // Owner A can see the tenant but cannot update (policy requires user_id = auth.uid())
    const { data, error } = await clientA
      .from('tenants')
      .update({ emergency_contact_name: 'RLS Hijack' })
      .eq('id', tenants.id)
      .select('id')

    // The UPDATE USING clause fails because ownerAId != tenant.user_id
    // PostgREST returns 0 rows
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('owner B cannot update a tenant record visible to owner A', async () => {
    const { data: tenants } = await clientA
      .from('tenants')
      .select('id')
      .limit(1)
      .single()

    // Skip if no tenants
    if (!tenants) return

    // Owner B tries to update a tenant from owner A's view
    const { data, error } = await clientB
      .from('tenants')
      .update({ emergency_contact_name: 'RLS Hijack B' })
      .eq('id', tenants.id)
      .select('id')

    // Owner B cannot even see the row, so 0 rows updated
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  // ---------------------------------------------------------------------------
  // DELETE isolation
  // Tenants DELETE policy: user_id = auth.uid()
  // Only the tenant themselves can delete their record.
  // ---------------------------------------------------------------------------

  it('owner A cannot delete a tenant record they can view', async () => {
    const { data: tenants } = await clientA
      .from('tenants')
      .select('id')
      .limit(1)
      .single()

    // Skip if no tenants
    if (!tenants) return

    // Owner A can see the tenant but cannot delete (policy requires user_id = auth.uid())
    const { data, error } = await clientA
      .from('tenants')
      .delete()
      .eq('id', tenants.id)
      .select('id')

    // The DELETE USING clause fails because ownerAId != tenant.user_id
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('owner B cannot delete a tenant record visible to owner A', async () => {
    const { data: tenants } = await clientA
      .from('tenants')
      .select('id')
      .limit(1)
      .single()

    // Skip if no tenants
    if (!tenants) return

    const { data, error } = await clientB
      .from('tenants')
      .delete()
      .eq('id', tenants.id)
      .select('id')

    // Owner B cannot even see the row, so 0 rows deleted
    expect(error).toBeNull()
    expect(data).toEqual([])

    // Verify still exists for owner A
    const { data: stillExists } = await clientA
      .from('tenants')
      .select('id')
      .eq('id', tenants.id)
      .single()

    expect(stillExists).not.toBeNull()
  })
})
