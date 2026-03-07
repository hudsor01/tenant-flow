import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Payment Methods RLS — cross-owner isolation', () => {
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
  // SELECT isolation — payment_methods scoped by tenant_id via get_current_tenant_id()
  // Owner users typically return empty results (no tenant_id), which is correct RLS behavior.
  // ---------------------------------------------------------------------------

  it('owner A only sees payment_methods scoped to their identity', async () => {
    const { data, error } = await clientA
      .from('payment_methods')
      .select('id, tenant_id')

    expect(error).toBeNull()
    expect(data).not.toBeNull()

    // Owner users have no tenant_id so this typically returns empty.
    // If any rows exist, they must belong to this user's tenant identity.
    if (!data || data.length === 0) return

    // All returned rows should have the same tenant_id (scoped by RLS)
    const tenantIds = new Set(data.map((r) => r.tenant_id as string))
    expect(tenantIds.size).toBeLessThanOrEqual(1)
  })

  it('owner B only sees payment_methods scoped to their identity', async () => {
    const { data, error } = await clientB
      .from('payment_methods')
      .select('id, tenant_id')

    expect(error).toBeNull()
    expect(data).not.toBeNull()

    if (!data || data.length === 0) return

    const tenantIds = new Set(data.map((r) => r.tenant_id as string))
    expect(tenantIds.size).toBeLessThanOrEqual(1)
  })

  it('owner A results contain no rows from owner B', async () => {
    const { data: dataA } = await clientA
      .from('payment_methods')
      .select('id')
    const { data: dataB } = await clientB
      .from('payment_methods')
      .select('id')

    const ownerAIds = new Set((dataA ?? []).map((r) => r.id as string))
    const ownerBIds = new Set((dataB ?? []).map((r) => r.id as string))

    // Cross-owner isolation: no overlap
    ownerBIds.forEach((id) => {
      expect(ownerAIds.has(id)).toBe(false)
    })
  })
})
