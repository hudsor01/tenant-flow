/**
 * Split-rent RLS — TEST-08: tenant A on a shared lease cannot read
 * tenant B's tenant-scoped rows. Cross-tenant queries return zero rows
 * (RLS filter), NOT an auth error (401/403).
 *
 * Schema note: `rent_due` has no `tenant_id` column — it is keyed by
 * lease_id and both tenants on a shared lease see the same rent_due
 * rows (that is the correct shared-lease behavior). Isolation on the
 * rent path is therefore enforced at:
 *   - rent_payments (has tenant_id; RLS: tenant_id = get_current_tenant_id())
 *   - lease_tenants (RLS: tenant_id = get_current_tenant_id())
 *   - tenants       (RLS: user_id = auth.uid())
 *
 * Skips when getSplitRentFixture() returns null.
 */

import {
  getSplitRentFixture,
  type SplitRentFixture,
} from '../setup/split-rent-fixture'

const fixturePromise = getSplitRentFixture()

describe.skipIf(!(await fixturePromise))(
  'Split-rent RLS — cross-tenant isolation on shared lease (TEST-08)',
  () => {
    let fixture: SplitRentFixture

    beforeAll(async () => {
      const f = await fixturePromise
      if (!f) throw new Error('fixture should be present when describe.skipIf is false')
      fixture = f
    })

    afterAll(async () => {
      await fixture.cleanup()
    })

    it('tenant A querying rent_payments by tenant B id returns zero rows (not an error)', async () => {
      const { data, error } = await fixture.tenantAClient
        .from('rent_payments')
        .select('id, tenant_id')
        .eq('tenant_id', fixture.tenantBId)

      expect(error).toBeNull()
      expect(data ?? []).toEqual([])
    })

    it('tenant B querying rent_payments by tenant A id returns zero rows (not an error)', async () => {
      const { data, error } = await fixture.tenantBClient
        .from('rent_payments')
        .select('id, tenant_id')
        .eq('tenant_id', fixture.tenantAId)

      expect(error).toBeNull()
      expect(data ?? []).toEqual([])
    })

    it('tenant A and tenant B rent_payments sets are disjoint by id', async () => {
      const { data: aPayments } = await fixture.tenantAClient
        .from('rent_payments')
        .select('id')
      const { data: bPayments } = await fixture.tenantBClient
        .from('rent_payments')
        .select('id')

      const aIds = new Set((aPayments ?? []).map((r) => r.id as string))
      const bIds = new Set((bPayments ?? []).map((r) => r.id as string))
      bIds.forEach((id) => {
        expect(aIds.has(id)).toBe(false)
      })
    })

    it('tenant A querying lease_tenants for tenant B id returns zero rows', async () => {
      // lease_tenants RLS: tenant_id = get_current_tenant_id() OR owner path.
      // Tenant A sees only their own lease_tenants row; filtering to tenant B id yields zero.
      const { data, error } = await fixture.tenantAClient
        .from('lease_tenants')
        .select('id, tenant_id')
        .eq('tenant_id', fixture.tenantBId)

      expect(error).toBeNull()
      expect(data ?? []).toEqual([])
    })

    it('tenant B querying lease_tenants for tenant A id returns zero rows', async () => {
      const { data, error } = await fixture.tenantBClient
        .from('lease_tenants')
        .select('id, tenant_id')
        .eq('tenant_id', fixture.tenantAId)

      expect(error).toBeNull()
      expect(data ?? []).toEqual([])
    })

    it('tenant A cannot read tenant B tenants row by id', async () => {
      // tenants RLS: user_id = auth.uid(). Even sharing a lease does not
      // grant read access to the other tenant's tenants row.
      const { data, error } = await fixture.tenantAClient
        .from('tenants')
        .select('id')
        .eq('id', fixture.tenantBId)

      expect(error).toBeNull()
      expect(data ?? []).toEqual([])
    })

    it('tenant B cannot read tenant A tenants row by id', async () => {
      const { data, error } = await fixture.tenantBClient
        .from('tenants')
        .select('id')
        .eq('id', fixture.tenantAId)

      expect(error).toBeNull()
      expect(data ?? []).toEqual([])
    })

    it('rent_due is shared at lease level (both tenants see the same rows on shared lease)', async () => {
      // rent_due has no tenant_id column — RLS filters by lease_id via
      // lease_tenants membership. On a shared lease, both tenants see the
      // same rent_due rows. This test documents the correct behavior and
      // would catch a regression where RLS accidentally filtered rent_due
      // per-tenant (which would drop rows for one of the shared tenants).
      const { data: aRows, error: aErr } = await fixture.tenantAClient
        .from('rent_due')
        .select('id')
        .eq('lease_id', fixture.sharedLeaseId)
      const { data: bRows, error: bErr } = await fixture.tenantBClient
        .from('rent_due')
        .select('id')
        .eq('lease_id', fixture.sharedLeaseId)

      expect(aErr).toBeNull()
      expect(bErr).toBeNull()
      const aIds = new Set((aRows ?? []).map((r) => r.id as string))
      const bIds = new Set((bRows ?? []).map((r) => r.id as string))
      // Both tenants see an identical set of rent_due rows for the shared lease
      expect(aIds.size).toBe(bIds.size)
      aIds.forEach((id) => {
        expect(bIds.has(id)).toBe(true)
      })
    })
  },
)
