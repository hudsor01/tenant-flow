import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Lease RPCs — authorization checks', () => {
  let clientA: SupabaseClient
  let clientB: SupabaseClient
  let leaseB: { id: string } | null = null

  beforeAll(async () => {
    const { ownerA, ownerB } = getTestCredentials()
    clientA = await createTestClient(ownerA.email, ownerA.password)
    clientB = await createTestClient(ownerB.email, ownerB.password)

    const {
      data: { user: userB },
    } = await clientB.auth.getUser()
    const ownerBId = userB!.id

    // Find a lease owned by Owner B that Owner A will attempt to operate on.
    // Owner A's own lease isn't needed any more — the happy-path test for
    // activate_lease_with_pending_subscription was removed when that
    // function was dropped (20260506000854).
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

  // activate_lease_with_pending_subscription was dropped in
  // 20260506000854_drop_lease_rpc_regressions — it was dead code referencing
  // tenant-rent subscription columns that were removed when the tenant-rent
  // flow was demolished (CLAUDE.md "no rent payment facilitation"). The
  // happy-path "allows owner to call activate_lease" test was removed in the
  // same migration commit.

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

})
