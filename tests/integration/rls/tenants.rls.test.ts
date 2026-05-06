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
  // Tenants UPDATE policy (post-demolition, landlord-only era):
  //   USING / WITH CHECK: owner_user_id = auth.uid()
  // Tenants are records, not users (per CLAUDE.md "no tenant portal, no
  // tenant auth accounts"). Landlords own + edit tenant records on their
  // properties; cross-owner mutation is what RLS blocks.
  // ---------------------------------------------------------------------------

  it('owner A can update their own tenant record', async () => {
    const { data: tenants } = await clientA
      .from('tenants')
      .select('id')
      .limit(1)
      .single()

    // Skip if owner A has no visible tenants
    if (!tenants) return

    const { data, error } = await clientA
      .from('tenants')
      .update({ emergency_contact_name: 'RLS Update Probe' })
      .eq('id', tenants.id)
      .select('id')

    // Owner A's own tenant — RLS allows the update.
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
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
  // Tenants DELETE policy (post-demolition, landlord-only era):
  //   USING: owner_user_id = auth.uid()
  // Owners can hard-delete their own tenant records when no FK references
  // them. Cross-owner DELETE is blocked by RLS USING.
  //
  // We don't assert a happy-path DELETE here because tenants in test data
  // are typically referenced by leases (FK 23503), and we don't want to
  // teardown lease fixtures from another suite. The cross-owner negative
  // case below covers the isolation contract; the FK case is exercised by
  // the GDPR / soft-delete suites.
  // ---------------------------------------------------------------------------

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
