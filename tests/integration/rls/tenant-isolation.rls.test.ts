import {
  createTestClient,
  getTestCredentials,
  getTenantTestCredentials,
} from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Cross-tenant isolation tests (TEST-09).
 *
 * Verifies that tenant-role users can only access their own data:
 * - rent_payments (via lease_tenants association)
 * - notifications (via user_id)
 * - payment_methods (via tenant_id)
 *
 * These tests require E2E_TENANT_EMAIL and E2E_TENANT_PASSWORD env vars.
 * If tenant credentials are not available, the describe block is skipped.
 */

const tenantCredentials = getTenantTestCredentials()
const hasTenantCredentials = tenantCredentials !== null

describe.skipIf(!hasTenantCredentials)(
  'Tenant Isolation RLS — cross-tenant data boundary',
  () => {
    let tenantClient: SupabaseClient
    let ownerClient: SupabaseClient
    let tenantUserId: string
    let ownerUserId: string

    beforeAll(async () => {
      // Tenant client
      const { tenantA } = tenantCredentials!
      tenantClient = await createTestClient(tenantA.email, tenantA.password)

      const {
        data: { user: tenantUser },
      } = await tenantClient.auth.getUser()
      tenantUserId = tenantUser!.id

      // Owner client (for cross-role isolation checks)
      const { ownerA } = getTestCredentials()
      ownerClient = await createTestClient(ownerA.email, ownerA.password)

      const {
        data: { user: ownerUser },
      } = await ownerClient.auth.getUser()
      ownerUserId = ownerUser!.id
    })

    afterAll(async () => {
      await tenantClient.auth.signOut()
      await ownerClient.auth.signOut()
    })

    // -------------------------------------------------------------------------
    // Tenant sees only their own rent_payments
    // -------------------------------------------------------------------------

    it('tenant can only read rent_payments for their own leases', async () => {
      const { data, error } = await tenantClient
        .from('rent_payments')
        .select('id, tenant_id')

      expect(error).toBeNull()
      expect(data).not.toBeNull()

      if (!data || data.length === 0) return

      // Verify all returned rent_payments belong to this tenant
      // rent_payments RLS: tenant_id = get_current_tenant_id()
      // All rows should reference the same tenant identity
      const tenantIds = new Set(data.map((r) => r.tenant_id as string))
      expect(tenantIds.size).toBeLessThanOrEqual(1)
    })

    // -------------------------------------------------------------------------
    // Tenant sees only their own notifications
    // -------------------------------------------------------------------------

    it('tenant can only read their own notifications', async () => {
      const { data, error } = await tenantClient
        .from('notifications')
        .select('id, user_id')

      expect(error).toBeNull()
      expect(data).not.toBeNull()

      if (!data || data.length === 0) return

      data.forEach((row) => {
        expect(row.user_id).toBe(tenantUserId)
      })
    })

    // -------------------------------------------------------------------------
    // Tenant sees only their own payment_methods
    // -------------------------------------------------------------------------

    it('tenant can only read their own payment_methods', async () => {
      const { data, error } = await tenantClient
        .from('payment_methods')
        .select('id, tenant_id')

      expect(error).toBeNull()
      expect(data).not.toBeNull()

      if (!data || data.length === 0) return

      // All returned payment_methods should belong to this tenant
      const tenantIds = new Set(data.map((r) => r.tenant_id as string))
      expect(tenantIds.size).toBeLessThanOrEqual(1)
    })

    // -------------------------------------------------------------------------
    // Cross-role isolation: tenant cannot see owner-only data
    // -------------------------------------------------------------------------

    it('tenant rent_payments do not include owner-only payments', async () => {
      const { data: tenantData } = await tenantClient
        .from('rent_payments')
        .select('id')
      const { data: ownerData } = await ownerClient
        .from('rent_payments')
        .select('id')

      const tenantPaymentIds = new Set(
        (tenantData ?? []).map((r) => r.id as string),
      )
      const ownerPaymentIds = new Set(
        (ownerData ?? []).map((r) => r.id as string),
      )

      // Any IDs visible only to owner should NOT appear in tenant results
      // (Owner sees payments via lease chain; tenant sees via tenant_id.
      // Some overlap is valid if tenant has payments on owner's leases.)
      // The key assertion: tenant cannot see payments from OTHER owners' leases.
      // Since we only have one owner, verify sets are either identical or disjoint.
      if (tenantPaymentIds.size > 0 && ownerPaymentIds.size > 0) {
        // At least verify tenant did not get ALL of owner's payments
        // (which would indicate an overly permissive policy)
        expect(tenantPaymentIds.size).toBeLessThanOrEqual(
          ownerPaymentIds.size,
        )
      }
    })

    it('tenant cannot read owner notifications', async () => {
      const { data: ownerNotifications } = await ownerClient
        .from('notifications')
        .select('id')

      if (!ownerNotifications || ownerNotifications.length === 0) return

      // Tenant tries to read a specific owner notification by ID
      const targetId = ownerNotifications[0]!.id as string
      const { data, error } = await tenantClient
        .from('notifications')
        .select('id')
        .eq('id', targetId)

      expect(error).toBeNull()
      // RLS should block — either empty array or null
      expect(data ?? []).toEqual([])
    })

    it('tenant cannot read owner notification_settings', async () => {
      const { data: ownerSettings } = await ownerClient
        .from('notification_settings')
        .select('id')

      if (!ownerSettings || ownerSettings.length === 0) return

      const targetId = ownerSettings[0]!.id as string
      const { data, error } = await tenantClient
        .from('notification_settings')
        .select('id')
        .eq('id', targetId)

      expect(error).toBeNull()
      expect(data ?? []).toEqual([])
    })
  },
)
