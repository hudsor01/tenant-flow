/**
 * RLS integration test — Phase 44 / ANALYTICS-02 admin-only
 * get_deliverability_stats RPC.
 *
 * Requires E2E_OWNER_EMAIL + E2E_ADMIN_EMAIL + SUPABASE_SERVICE_ROLE_KEY env
 * vars. Without them, the describe block SKIPS cleanly (never a silent
 * false-positive).
 *
 * Asserts:
 *   1. non-admin (owner) caller gets error matching /unauthorized/i
 *   2. admin caller receives non-empty aggregate rows with expected shape
 *   3. bounce_rate and complaint_rate match hand-computed values from seed
 *   4. p_days=0 and p_days=366 both reject with /p_days/ or /between/ error
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  createTestClient,
  getAdminTestCredentials,
  getTestCredentials,
} from '../setup/supabase-client'

const adminCreds = getAdminTestCredentials()
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']

// Skip cleanly if admin creds or service-role key missing. Both are required:
// admin creds to test the positive path; service-role key to seed the
// email_deliverability rows the RPC aggregates.
const skipReason = !adminCreds
  ? 'Admin creds missing — set E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD'
  : !SUPABASE_URL || !SERVICE_ROLE_KEY
    ? 'Service-role env missing — set SUPABASE_SERVICE_ROLE_KEY'
    : null

describe.skipIf(skipReason)(
  'get_deliverability_stats — admin-only access',
  () => {
    let ownerClient: SupabaseClient
    let adminClient: SupabaseClient
    let serviceRoleClient: SupabaseClient
    const seedIds: string[] = []

    // Deterministic seed data — 10 rows across two template tags.
    //   test-tag-A: sent=3 (distinct msg-A1,A2,A3), bounced=1
    //     => bounce_rate = 1/3 * 100 = 33.33
    //   test-tag-B: sent=3 (distinct msg-B1,B2,B3), complained=2
    //     => complaint_rate = 2/3 * 100 = 66.67
    const seedRows = [
      { template_tag: 'test-tag-A', event_type: 'email.delivered', message_id: 'msg-A1' },
      { template_tag: 'test-tag-A', event_type: 'email.delivered', message_id: 'msg-A2' },
      { template_tag: 'test-tag-A', event_type: 'email.delivered', message_id: 'msg-A3' },
      { template_tag: 'test-tag-A', event_type: 'email.bounced', message_id: 'msg-A1' },
      { template_tag: 'test-tag-A', event_type: 'email.opened', message_id: 'msg-A2' },
      { template_tag: 'test-tag-B', event_type: 'email.delivered', message_id: 'msg-B1' },
      { template_tag: 'test-tag-B', event_type: 'email.delivered', message_id: 'msg-B2' },
      { template_tag: 'test-tag-B', event_type: 'email.complained', message_id: 'msg-B1' },
      { template_tag: 'test-tag-B', event_type: 'email.complained', message_id: 'msg-B2' },
      { template_tag: 'test-tag-B', event_type: 'email.opened', message_id: 'msg-B3' },
    ]

    beforeAll(async () => {
      const { ownerA } = getTestCredentials()
      ownerClient = await createTestClient(ownerA.email, ownerA.password)

      // Non-null assertions safe here: skipIf gated both above.
      adminClient = await createTestClient(
        adminCreds!.admin.email,
        adminCreds!.admin.password,
      )

      serviceRoleClient = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
      })

      // Seed within the default 30-day window (event_at = now).
      const nowIso = new Date().toISOString()
      const toInsert = seedRows.map((r) => ({
        ...r,
        recipient_email: `seed-${r.message_id}@example.test`,
        event_at: nowIso,
        raw_payload: {},
      }))

      const { data, error } = await serviceRoleClient
        .from('email_deliverability')
        .insert(toInsert)
        .select('id')

      if (error) {
        throw new Error(`Seed insert failed: ${error.message}`)
      }
      if (data) {
        for (const row of data as Array<{ id: string }>) {
          seedIds.push(row.id)
        }
      }
    })

    afterAll(async () => {
      if (seedIds.length > 0 && serviceRoleClient) {
        await serviceRoleClient
          .from('email_deliverability')
          .delete()
          .in('id', seedIds)
      }
      await ownerClient?.auth.signOut()
      await adminClient?.auth.signOut()
    })

    it('rejects non-admin caller with Unauthorized', async () => {
      const { error } = await ownerClient.rpc('get_deliverability_stats', {
        p_days: 30,
      })

      expect(error).not.toBeNull()
      expect(error!.message).toMatch(/unauthorized/i)
    })

    it('returns aggregate rows for admin caller', async () => {
      const { data, error } = await adminClient.rpc('get_deliverability_stats', {
        p_days: 30,
      })

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      expect((data ?? []).length).toBeGreaterThanOrEqual(2)

      for (const row of data ?? []) {
        expect(row).toHaveProperty('template_tag')
        expect(row).toHaveProperty('sent_count')
        expect(row).toHaveProperty('delivered_count')
        expect(row).toHaveProperty('bounced_count')
        expect(row).toHaveProperty('complained_count')
        expect(row).toHaveProperty('opened_count')
        expect(row).toHaveProperty('bounce_rate')
        expect(row).toHaveProperty('complaint_rate')
      }
    })

    it('computes bounce_rate and complaint_rate from seeded counts', async () => {
      const { data, error } = await adminClient.rpc('get_deliverability_stats', {
        p_days: 30,
      })

      expect(error).toBeNull()
      const rows = (data ?? []) as Array<{
        template_tag: string | null
        sent_count: number
        bounced_count: number
        complained_count: number
        bounce_rate: number
        complaint_rate: number
      }>

      const tagA = rows.find((r) => r.template_tag === 'test-tag-A')
      expect(tagA).toBeDefined()
      expect(Number(tagA!.sent_count)).toBe(3)
      expect(Number(tagA!.bounced_count)).toBe(1)
      // 1/3 * 100 = 33.33 (rounded 2dp)
      expect(Number(tagA!.bounce_rate)).toBeCloseTo(33.33, 1)

      const tagB = rows.find((r) => r.template_tag === 'test-tag-B')
      expect(tagB).toBeDefined()
      expect(Number(tagB!.sent_count)).toBe(3)
      expect(Number(tagB!.complained_count)).toBe(2)
      // 2/3 * 100 = 66.67 (rounded 2dp)
      expect(Number(tagB!.complaint_rate)).toBeCloseTo(66.67, 1)
    })

    it('rejects p_days outside 1..365 range', async () => {
      const tooLow = await adminClient.rpc('get_deliverability_stats', {
        p_days: 0,
      })
      expect(tooLow.error).not.toBeNull()
      expect(tooLow.error!.message).toMatch(/p_days|between/i)

      const tooHigh = await adminClient.rpc('get_deliverability_stats', {
        p_days: 366,
      })
      expect(tooHigh.error).not.toBeNull()
      expect(tooHigh.error!.message).toMatch(/p_days|between/i)
    })
  },
)
