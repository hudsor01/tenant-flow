import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Lease RPCs — authorization checks', () => {
  let clientA: SupabaseClient
  let clientB: SupabaseClient
  let ownerAId: string
  let ownerBId: string
  let leaseA: { id: string } | null = null
  let leaseB: { id: string } | null = null

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

    // Find a lease owned by each owner
    const { data: leasesA } = await clientA
      .from('leases')
      .select('id, owner_user_id')
      .eq('owner_user_id', ownerAId)
      .limit(1)
    leaseA = leasesA && leasesA.length > 0 ? { id: leasesA[0].id } : null

    const { data: leasesB } = await clientB
      .from('leases')
      .select('id, owner_user_id')
      .eq('owner_user_id', ownerBId)
      .limit(1)
    leaseB = leasesB && leasesB.length > 0 ? { id: leasesB[0].id } : null
  })

  afterAll(async () => {
    await clientA.auth.signOut()
    await clientB.auth.signOut()
  })

  /**
   * Helper: asserts that an RPC call was denied with an access denied message.
   * Works whether the denial comes as a PostgREST error or a returned result row.
   */
  function expectAccessDenied(
    data: unknown,
    error: { message: string } | null,
    pattern: RegExp,
  ) {
    if (error) {
      expect(error.message).toMatch(pattern)
      return
    }
    // Function returns TABLE rows -- extract first result
    const result = Array.isArray(data) ? data[0] : data
    expect(result).toBeDefined()
    expect(result.success).toBe(false)
    expect(result.error_message).toBeDefined()
    expect(result.error_message).toMatch(pattern)
  }

  it('rejects activate_lease_with_pending_subscription when caller is not lease owner', async () => {
    if (!leaseB) {
      console.warn('Skipping: no lease found for Owner B')
      return
    }

    // Owner A tries to activate Owner B's lease
    const { data, error } = await clientA.rpc(
      'activate_lease_with_pending_subscription',
      { p_lease_id: leaseB.id },
    )

    expectAccessDenied(data, error, /access denied|not the lease owner/i)
  })

  it('rejects sign_lease_and_check_activation as owner when caller is not lease owner', async () => {
    if (!leaseB) {
      console.warn('Skipping: no lease found for Owner B')
      return
    }

    const { data, error } = await clientA.rpc(
      'sign_lease_and_check_activation',
      {
        p_lease_id: leaseB.id,
        p_signer_type: 'owner',
        p_signature_ip: '127.0.0.1',
        p_signed_at: new Date().toISOString(),
      },
    )

    expectAccessDenied(data, error, /access denied|not the lease owner/i)
  })

  it('rejects sign_lease_and_check_activation as tenant when caller is not a tenant on the lease', async () => {
    if (!leaseB) {
      console.warn('Skipping: no lease found for Owner B')
      return
    }

    const { data, error } = await clientA.rpc(
      'sign_lease_and_check_activation',
      {
        p_lease_id: leaseB.id,
        p_signer_type: 'tenant',
        p_signature_ip: '127.0.0.1',
        p_signed_at: new Date().toISOString(),
      },
    )

    expectAccessDenied(data, error, /access denied|not a tenant/i)
  })

  it('allows owner to call activate_lease on their own lease (no access denied)', async () => {
    if (!leaseA) {
      console.warn('Skipping: no lease found for Owner A')
      return
    }

    // Owner A activates their own lease -- may fail for business reasons but NOT access denied
    const { data, error } = await clientA.rpc(
      'activate_lease_with_pending_subscription',
      { p_lease_id: leaseA.id },
    )

    if (error) {
      expect(error.message).not.toMatch(/access denied|not the lease owner/i)
    } else {
      const result = Array.isArray(data) ? data[0] : data
      if (result && !result.success && result.error_message) {
        expect(result.error_message).not.toMatch(
          /access denied|not the lease owner/i,
        )
      }
    }
  })
})
