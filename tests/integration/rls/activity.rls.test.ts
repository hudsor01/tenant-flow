import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Activity RLS — cross-tenant isolation', () => {
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
  // DB-01: activity.user_id NOT NULL + ON DELETE CASCADE
  // ---------------------------------------------------------------------------

  it('owner A can only read their own activity records', async () => {
    const { data, error } = await clientA
      .from('activity')
      .select('id, user_id')

    expect(error).toBeNull()
    expect(data).not.toBeNull()

    // Skip assertion on rows if no activity data exists for this user
    if (!data || data.length === 0) return

    data.forEach((row) => {
      expect(row.user_id).toBe(ownerAId)
    })
  })

  it('owner B cannot read owner A activity records', async () => {
    const { data: dataA } = await clientA
      .from('activity')
      .select('id')
    const { data: dataB } = await clientB
      .from('activity')
      .select('id')

    const ownerAIds = new Set((dataA ?? []).map((r) => r.id as string))
    const ownerBIds = new Set((dataB ?? []).map((r) => r.id as string))

    // Cross-tenant isolation: no overlap between owner A and owner B activity IDs
    ownerBIds.forEach((id) => {
      expect(ownerAIds.has(id)).toBe(false)
    })
  })

  it('activity.user_id rejects null values', async () => {
    // Attempt to insert an activity row with user_id = null
    // The NOT NULL constraint on user_id must cause this to fail at the DB level
    const { data, error } = await clientA
      .from('activity')
      .insert({
        user_id: null as unknown as string,
        activity_type: 'test',
        entity_type: 'test',
        entity_id: crypto.randomUUID(),
        description: 'null constraint test',
      })
      .select('id')
      .single()

    expect(error).not.toBeNull()
    expect(data).toBeNull()
  })
})
