import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('GDPR Anonymization — account deletion cascade', () => {
  let clientA: SupabaseClient
  let ownerAId: string

  beforeAll(async () => {
    const { ownerA } = getTestCredentials()
    clientA = await createTestClient(ownerA.email, ownerA.password)

    const {
      data: { user },
    } = await clientA.auth.getUser()
    ownerAId = user!.id
  })

  afterAll(async () => {
    // Safety restore: ensure deletion_requested_at is null for ownerA
    // Use cancel_account_deletion RPC (SECURITY DEFINER, works regardless of RLS)
    await clientA.rpc('cancel_account_deletion')
    await clientA.auth.signOut()
  })

  // DB-04: GDPR anonymization cascade

  it('request_account_deletion sets deletion_requested_at on caller', async () => {
    // Request deletion
    const { error: reqError } = await clientA.rpc('request_account_deletion')
    expect(reqError).toBeNull()

    // Verify deletion_requested_at was set
    const { data, error: queryError } = await clientA
      .from('users')
      .select('deletion_requested_at')
      .eq('id', ownerAId)
      .single()

    expect(queryError).toBeNull()
    expect(data).not.toBeNull()
    expect(data!.deletion_requested_at).not.toBeNull()

    // Restore state immediately
    await clientA.rpc('cancel_account_deletion')
  })

  it('cancel_account_deletion clears deletion_requested_at', async () => {
    // First request deletion so there is something to cancel
    const { error: reqError } = await clientA.rpc('request_account_deletion')
    expect(reqError).toBeNull()

    // Verify it was set
    const { data: setBefore } = await clientA
      .from('users')
      .select('deletion_requested_at')
      .eq('id', ownerAId)
      .single()
    expect(setBefore!.deletion_requested_at).not.toBeNull()

    // Cancel deletion
    const { error: cancelError } = await clientA.rpc('cancel_account_deletion')
    expect(cancelError).toBeNull()

    // Verify deletion_requested_at is now null
    const { data: cleared } = await clientA
      .from('users')
      .select('deletion_requested_at')
      .eq('id', ownerAId)
      .single()
    expect(cleared).not.toBeNull()
    expect(cleared!.deletion_requested_at).toBeNull()
  })

  it('anonymize_deleted_user is service_role-only (rejects authenticated callers)', async () => {
    // Authenticated owners must NEVER be able to trigger anonymization directly —
    // the cron job runs as service_role. Any path from authenticated → anonymize
    // is a GDPR/privacy escalation.
    const fakeUserId = '00000000-0000-0000-0000-000000000000'
    const { error } = await clientA.rpc('anonymize_deleted_user', {
      p_user_id: fakeUserId,
    })

    expect(error).not.toBeNull()
    expect(error!.message).toContain('permission denied')

    const { error: colError } = await clientA
      .from('users')
      .select('deletion_requested_at')
      .eq('id', ownerAId)
      .single()
    expect(colError).toBeNull()
  })

})
