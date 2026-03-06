import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Activity RLS — cross-tenant isolation', () => {
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

  // DB-01: activity.user_id NOT NULL + ON DELETE CASCADE
  it.todo('owner A can only read their own activity records')
  it.todo('owner B cannot read owner A activity records')
  it.todo('activity.user_id rejects null values')
})
