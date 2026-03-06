import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('GDPR Anonymization — account deletion cascade', () => {
  let clientA: SupabaseClient

  beforeAll(async () => {
    const { ownerA } = getTestCredentials()
    clientA = await createTestClient(ownerA.email, ownerA.password)
  })

  afterAll(async () => {
    await clientA.auth.signOut()
  })

  // DB-04: GDPR anonymization cascade
  it.todo('request_account_deletion sets deletion_requested_at on caller')
  it.todo('cancel_account_deletion clears deletion_requested_at')
  it.todo('anonymize_deleted_user replaces tenant PII with [deleted]')
  it.todo('anonymize_deleted_user preserves payment amounts and dates')
  it.todo('anonymize_deleted_user blocks owner deletion with active leases')
})
