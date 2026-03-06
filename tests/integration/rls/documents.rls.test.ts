import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Documents RLS — owner_user_id isolation', () => {
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
    // Clean up test-inserted documents
    for (const id of testInsertedIds) {
      await clientA.from('documents').delete().eq('id', id)
    }
    await clientA.auth.signOut()
    await clientB.auth.signOut()
  })

  // ---------------------------------------------------------------------------
  // DB-02: documents.owner_user_id + direct RLS
  // ---------------------------------------------------------------------------

  it('owner can read their own documents via owner_user_id', async () => {
    const { data, error } = await clientA
      .from('documents')
      .select('id, owner_user_id')

    expect(error).toBeNull()
    expect(data).not.toBeNull()

    // Skip row-level assertion if no documents exist for this owner
    if (!data || data.length === 0) return

    data.forEach((row) => {
      expect(row.owner_user_id).toBe(ownerAId)
    })
  })

  it('owner cannot read another owner documents', async () => {
    const { data: dataA } = await clientA
      .from('documents')
      .select('id, owner_user_id')
    const { data: dataB } = await clientB
      .from('documents')
      .select('id, owner_user_id')

    const ownerADocIds = new Set((dataA ?? []).map((r) => r.id as string))
    const ownerBDocIds = new Set((dataB ?? []).map((r) => r.id as string))

    // Cross-owner isolation: no overlap between owner A and owner B document IDs
    ownerBDocIds.forEach((id) => {
      expect(ownerADocIds.has(id)).toBe(false)
    })
  })

  it('owner can insert documents with their own owner_user_id', async () => {
    // Need a valid entity_id — get one of owner A's leases
    const { data: leaseList } = await clientA
      .from('leases')
      .select('id')
      .limit(1)

    const lease = leaseList?.[0]
    if (!lease) return // Skip if no leases exist

    const { data, error } = await clientA
      .from('documents')
      .insert({
        owner_user_id: ownerAId,
        entity_type: 'lease',
        entity_id: lease.id,
        document_name: 'RLS Test Doc',
        document_type: 'other',
      })
      .select('id')
      .single()

    expect(error).toBeNull()
    expect(data).not.toBeNull()

    // Track for cleanup
    if (data) {
      testInsertedIds.push(data.id)
    }
  })

  it('owner cannot insert documents with another owner_user_id', async () => {
    // Get one of owner A's leases for a valid entity_id
    const { data: leaseList } = await clientA
      .from('leases')
      .select('id')
      .limit(1)

    const lease = leaseList?.[0]
    if (!lease) return // Skip if no leases exist

    // Client B tries to insert a document with owner A's owner_user_id
    // RLS WITH CHECK should block this (auth.uid() !== ownerAId for clientB)
    const { data, error } = await clientB
      .from('documents')
      .insert({
        owner_user_id: ownerAId,
        entity_type: 'lease',
        entity_id: lease.id,
        document_name: 'RLS Impersonation Test',
        document_type: 'other',
      })
      .select('id')
      .single()

    expect(error).not.toBeNull()
    expect(data).toBeNull()
  })

  it.skip('tenant can read documents for leases they belong to (requires E2E_TENANT_EMAIL/E2E_TENANT_PASSWORD env vars)', async () => {
    // This test requires tenant credentials to verify the tenant leg of the
    // documents SELECT policy: entity_id IN (SELECT lt.lease_id FROM lease_tenants lt
    // JOIN tenants t ON t.id = lt.tenant_id WHERE t.user_id = (SELECT auth.uid()))
    //
    // When tenant env vars are available:
    // 1. Create tenant client
    // 2. Query documents visible to tenant
    // 3. Verify tenant can see lease-type documents for their leases
    // 4. Verify owner_user_id on those documents is NOT the tenant's user_id
    //    (proving access is via lease relationship, not ownership)
  })
})
