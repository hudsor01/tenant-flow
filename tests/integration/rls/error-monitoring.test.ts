import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Error monitoring RPCs — access control', () => {
  let clientA: SupabaseClient

  beforeAll(async () => {
    const { ownerA } = getTestCredentials()
    clientA = await createTestClient(ownerA.email, ownerA.password)
  })

  afterAll(async () => {
    await clientA.auth.signOut()
  })

  it('rejects get_error_summary for non-admin user', async () => {
    const { data, error } = await clientA.rpc('get_error_summary', {
      hours_back: 24,
    })

    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/access denied|admin only/i)
  })

  it('rejects get_common_errors for non-admin user', async () => {
    const { data, error } = await clientA.rpc('get_common_errors', {
      hours_back: 24,
      limit_count: 10,
    })

    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/access denied|admin only/i)
  })

  it('rejects get_error_prone_users for non-admin user', async () => {
    const { data, error } = await clientA.rpc('get_error_prone_users', {
      hours_back: 24,
      min_errors: 1,
    })

    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/access denied|admin only/i)
  })

  it('rate-limits log_user_error after 10 calls in 1 minute', async () => {
    let rateLimitHit = false

    // Attempt 20 rapid-fire error logs
    for (let i = 0; i < 20; i++) {
      const { error } = await clientA.rpc('log_user_error', {
        p_error_type: 'application',
        p_error_message: `Rate limit test error ${i}`,
        p_context: { test: 'rate-limit' },
      })

      if (error && /rate limit/i.test(error.message)) {
        rateLimitHit = true
        break
      }
    }

    expect(rateLimitHit).toBe(true)
  })
})
