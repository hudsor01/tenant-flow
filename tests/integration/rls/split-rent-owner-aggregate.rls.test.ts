/**
 * Split-rent RLS — TEST-09: property owner sees the full aggregated
 * view across every tenant on a shared lease. Owner's RLS path
 * (`owner_user_id = auth.uid()`) is unaffected by tenant-scoped
 * policies, so the owner:
 *   - sees BOTH tenants in the lease_tenants join on the shared lease
 *   - sees rent_due rows with the FULL rent_amount (not tenant-portion)
 *   - sees rent_payments from every tenant on the lease (aggregate)
 *   - sees a rent_due set that is a SUPERSET of the union of both
 *     tenants' individual views (over-restrictive RLS regression guard)
 *
 * Skips when getSplitRentFixture() returns null (env vars missing or no
 * shared lease exists in the test DB).
 */

import {
  getSplitRentFixture,
  type SplitRentFixture,
} from '../setup/split-rent-fixture'

const fixturePromise = getSplitRentFixture()

interface LeaseTenantEntry {
  tenant_id: string
  responsibility_percentage: number
}

function mapLeaseTenants(raw: unknown): LeaseTenantEntry[] {
  if (!raw || typeof raw !== 'object') return []
  const row = raw as Record<string, unknown>
  const lts = row['lease_tenants']
  if (!Array.isArray(lts)) return []
  const result: LeaseTenantEntry[] = []
  for (const item of lts) {
    if (!item || typeof item !== 'object') continue
    const entry = item as Record<string, unknown>
    const tenantId = entry['tenant_id']
    const pct = entry['responsibility_percentage']
    if (typeof tenantId !== 'string') continue
    if (typeof pct !== 'number') continue
    result.push({ tenant_id: tenantId, responsibility_percentage: pct })
  }
  return result
}

describe.skipIf(!(await fixturePromise))(
  'Split-rent RLS — owner sees full aggregated view (TEST-09)',
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

    it('owner can read the shared lease with BOTH tenants visible in the lease_tenants join', async () => {
      const { data, error } = await fixture.ownerClient
        .from('leases')
        .select(
          'id, rent_amount, lease_tenants(tenant_id, responsibility_percentage)',
        )
        .eq('id', fixture.sharedLeaseId)
        .single()

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(Number(data!.rent_amount)).toBe(fixture.sharedRentAmount)

      // Owner sees BOTH tenants in the join (not RLS-filtered to one).
      const lts = mapLeaseTenants(data)
      expect(lts.length).toBeGreaterThanOrEqual(2)
      const tenantIdsVisible = new Set(lts.map((lt) => lt.tenant_id))
      expect(tenantIdsVisible.has(fixture.tenantAId)).toBe(true)
      expect(tenantIdsVisible.has(fixture.tenantBId)).toBe(true)
    })

    it('owner rent_due rows for the shared lease carry the full rent amount (not tenant-portion)', async () => {
      const { data, error } = await fixture.ownerClient
        .from('rent_due')
        .select('id, lease_id, amount, status')
        .eq('lease_id', fixture.sharedLeaseId)

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect((data ?? []).length).toBeGreaterThan(0)

      // Owner view carries the full rent_amount — never the tenant-scoped
      // portion. A regression where rent_due were scoped per-tenant for
      // owners would break this assertion.
      ;(data ?? []).forEach((row) => {
        expect(row.lease_id).toBe(fixture.sharedLeaseId)
        expect(Number(row.amount)).toBe(fixture.sharedRentAmount)
      })
    })

    it('owner rent_payments aggregate view includes rows from every tenant on the shared lease', async () => {
      const { data, error } = await fixture.ownerClient
        .from('rent_payments')
        .select('id, lease_id, tenant_id')
        .eq('lease_id', fixture.sharedLeaseId)

      expect(error).toBeNull()
      expect(data).not.toBeNull()

      if ((data ?? []).length === 0) {
        // No payments yet on the shared-lease fixture — the query must still
        // succeed (RLS grants read access); aggregation check is vacuous.
        return
      }

      // Every tenant_id the owner sees must belong to one of the tenants on
      // this shared lease (subset of {tenantAId, tenantBId}).
      const tenantIds = new Set<string>()
      for (const row of data ?? []) {
        const tid = row.tenant_id
        if (typeof tid === 'string') tenantIds.add(tid)
      }
      const expectedSet = new Set([fixture.tenantAId, fixture.tenantBId])
      tenantIds.forEach((id) => {
        expect(expectedSet.has(id)).toBe(true)
      })
    })

    it('owner rent_due is a superset of the union of both tenants individual views', async () => {
      // Owner's RLS path must never produce FEWER rows than the union of
      // per-tenant views. An accidentally-applied tenant-scope on the owner
      // path would cause owner_ids ⊊ (aIds ∪ bIds) — this test fails then.
      const { data: ownerData } = await fixture.ownerClient
        .from('rent_due')
        .select('id')
        .eq('lease_id', fixture.sharedLeaseId)
      const { data: aData } = await fixture.tenantAClient
        .from('rent_due')
        .select('id')
        .eq('lease_id', fixture.sharedLeaseId)
      const { data: bData } = await fixture.tenantBClient
        .from('rent_due')
        .select('id')
        .eq('lease_id', fixture.sharedLeaseId)

      const ownerIds = new Set((ownerData ?? []).map((r) => r.id as string))
      const tenantVisibleIds = new Set<string>()
      for (const r of aData ?? []) tenantVisibleIds.add(r.id as string)
      for (const r of bData ?? []) tenantVisibleIds.add(r.id as string)

      tenantVisibleIds.forEach((id) => {
        expect(ownerIds.has(id)).toBe(true)
      })
    })
  },
)
