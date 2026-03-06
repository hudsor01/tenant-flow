import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Tenant Invitations RLS — cross-owner isolation', () => {
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
  // SELECT isolation — tenant_invitations scoped by property_owner_id
  // via get_current_property_owner_id()
  // ---------------------------------------------------------------------------

  it('owner A can only read their own tenant_invitations', async () => {
    const { data, error } = await clientA
      .from('tenant_invitations')
      .select('id, property_owner_id')

    expect(error).toBeNull()
    expect(data).not.toBeNull()

    if (!data || data.length === 0) return

    // All returned rows should have the same property_owner_id
    const ownerIds = new Set(data.map((r) => r.property_owner_id as string))
    expect(ownerIds.size).toBeLessThanOrEqual(1)
  })

  it('owner B can only read their own tenant_invitations', async () => {
    const { data, error } = await clientB
      .from('tenant_invitations')
      .select('id, property_owner_id')

    expect(error).toBeNull()
    expect(data).not.toBeNull()

    if (!data || data.length === 0) return

    const ownerIds = new Set(data.map((r) => r.property_owner_id as string))
    expect(ownerIds.size).toBeLessThanOrEqual(1)
  })

  it('owner A results contain no rows from owner B', async () => {
    const { data: dataA } = await clientA
      .from('tenant_invitations')
      .select('id')
    const { data: dataB } = await clientB
      .from('tenant_invitations')
      .select('id')

    const ownerAIds = new Set((dataA ?? []).map((r) => r.id as string))
    const ownerBIds = new Set((dataB ?? []).map((r) => r.id as string))

    // Cross-owner isolation: no overlap
    ownerBIds.forEach((id) => {
      expect(ownerAIds.has(id)).toBe(false)
    })
  })
})
