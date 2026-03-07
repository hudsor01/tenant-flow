import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('FOR ALL policy audit — no FOR ALL policies on public/storage', () => {
  let client: SupabaseClient

  beforeAll(async () => {
    const { ownerA } = getTestCredentials()
    client = await createTestClient(ownerA.email, ownerA.password)
  })

  afterAll(async () => {
    await client.auth.signOut()
  })

  it('no FOR ALL policies exist for service_role on public or storage schemas', async () => {
    // Use an RPC to query pg_policies (system catalog)
    const { data, error } = await client.rpc('audit_for_all_policies', {
      p_role: 'service_role',
    })

    expect(error).toBeNull()

    const policies = Array.isArray(data) ? data : []

    // rent_payments_service_role is intentional — webhook handler writes via service_role
    const unexpected = policies.filter(
      (p: { tablename: string; policyname: string }) =>
        p.policyname !== 'rent_payments_service_role',
    )

    if (unexpected.length > 0) {
      const details = unexpected
        .map(
          (p: { schemaname: string; tablename: string; policyname: string }) =>
            `${p.schemaname}.${p.tablename}: "${p.policyname}"`,
        )
        .join(', ')
      throw new Error(
        `Found ${unexpected.length} service_role FOR ALL policies: ${details}`,
      )
    }

    expect(unexpected).toHaveLength(0)
  })

  it('no FOR ALL policies exist for authenticated on public or storage schemas', async () => {
    const { data, error } = await client.rpc('audit_for_all_policies', {
      p_role: 'authenticated',
    })

    expect(error).toBeNull()

    const policies = Array.isArray(data) ? data : []
    if (policies.length > 0) {
      const details = policies
        .map(
          (p: { schemaname: string; tablename: string; policyname: string }) =>
            `${p.schemaname}.${p.tablename}: "${p.policyname}"`,
        )
        .join(', ')
      throw new Error(
        `Found ${policies.length} authenticated FOR ALL policies: ${details}`,
      )
    }

    expect(policies).toHaveLength(0)
  })
})
