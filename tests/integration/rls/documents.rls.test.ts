import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Documents RLS — owner_user_id isolation', () => {
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

  // DB-02: documents.owner_user_id + direct RLS
  it.todo('owner can read their own documents via owner_user_id')
  it.todo('owner cannot read another owner documents')
  it.todo('owner can insert documents with their own owner_user_id')
  it.todo('owner cannot insert documents with another owner_user_id')
  it.todo('tenant can read documents for leases they belong to')
})
