import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Notification Settings RLS — cross-owner isolation', () => {
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
  // SELECT isolation — notification_settings scoped by user_id = auth.uid()
  // ---------------------------------------------------------------------------

  it('owner A can only read their own notification_settings', async () => {
    const { data, error } = await clientA
      .from('notification_settings')
      .select('id, user_id')

    expect(error).toBeNull()
    expect(data).not.toBeNull()

    if (!data || data.length === 0) return

    data.forEach((row) => {
      expect(row.user_id).toBe(ownerAId)
    })
  })

  it('owner B can only read their own notification_settings', async () => {
    const { data, error } = await clientB
      .from('notification_settings')
      .select('id, user_id')

    expect(error).toBeNull()
    expect(data).not.toBeNull()

    if (!data || data.length === 0) return

    data.forEach((row) => {
      expect(row.user_id).toBe(ownerBId)
    })
  })

  it('owner A results contain no rows from owner B', async () => {
    const { data: dataA } = await clientA
      .from('notification_settings')
      .select('id')
    const { data: dataB } = await clientB
      .from('notification_settings')
      .select('id')

    const ownerAIds = new Set((dataA ?? []).map((r) => r.id as string))
    const ownerBIds = new Set((dataB ?? []).map((r) => r.id as string))

    ownerBIds.forEach((id) => {
      expect(ownerAIds.has(id)).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // UPDATE isolation — owner B cannot modify owner A's settings
  // ---------------------------------------------------------------------------

  it('owner B cannot update owner A notification_settings', async () => {
    const { data: settingsA } = await clientA
      .from('notification_settings')
      .select('id')
      .limit(1)

    // Skip if owner A has no notification_settings
    if (!settingsA || settingsA.length === 0) return

    const targetId = settingsA[0]!.id as string

    // Owner B tries to update owner A's settings — RLS blocks
    const { data, error } = await clientB
      .from('notification_settings')
      .update({ email: false })
      .eq('id', targetId)
      .select('id')

    // RLS USING clause prevents owner B from seeing/updating the row
    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})
