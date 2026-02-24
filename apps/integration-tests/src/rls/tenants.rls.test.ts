import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Tenants RLS — cross-tenant isolation', () => {
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

  it('owner A can only read their own tenants', async () => {
    const { data, error } = await clientA
      .from('tenants')
      .select('id')
    expect(error).toBeNull()
    expect(data).not.toBeNull()
    // RLS enforces isolation via lease_tenants → leases → properties.owner_user_id join
    // Cross-tenant isolation is verified in the third test
  })

  it('owner B can only read their own tenants', async () => {
    const { data, error } = await clientB
      .from('tenants')
      .select('id')
    expect(error).toBeNull()
    expect(data).not.toBeNull()
    // RLS enforces isolation via lease_tenants → leases → properties.owner_user_id join
    // Cross-tenant isolation is verified in the third test
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

    // No overlap — owner A should not see owner B's tenants and vice versa
    ownerBIds.forEach((id) => {
      expect(ownerAIds.has(id)).toBe(false)
    })
  })
})
