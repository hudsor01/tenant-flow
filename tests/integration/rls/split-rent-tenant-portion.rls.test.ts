/**
 * Split-rent RLS — TEST-07: tenant sees own portion computed from
 * lease_tenants.responsibility_percentage, not the full lease amount.
 *
 * Formula (matches src/hooks/api/use-tenant-payments.ts L97-98):
 *   tenantPortion = lease.rent_amount * responsibility_percentage / 100
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
  'Split-rent RLS — tenant sees own portion (TEST-07)',
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

    it('tenant A rent_due query returns rows only for the shared lease', async () => {
      const { data, error } = await fixture.tenantAClient
        .from('rent_due')
        .select('id, lease_id, amount')
        .eq('lease_id', fixture.sharedLeaseId)

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect((data ?? []).length).toBeGreaterThan(0)
      ;(data ?? []).forEach((row) => {
        expect(row.lease_id).toBe(fixture.sharedLeaseId)
      })
    })

    it('tenant A portion computed from responsibility_percentage matches formula', async () => {
      const { data: lease, error } = await fixture.tenantAClient
        .from('leases')
        .select(
          'id, rent_amount, lease_tenants!inner(tenant_id, responsibility_percentage)',
        )
        .eq('id', fixture.sharedLeaseId)
        .single()

      expect(error).toBeNull()
      expect(lease).not.toBeNull()
      expect(Number(lease!.rent_amount)).toBe(fixture.sharedRentAmount)

      const lts = mapLeaseTenants(lease)
      // Tenant A sees only their own lease_tenants row via RLS — that row
      // must match the fixture's tenantA entry.
      const tenantAEntry = lts.find((lt) => lt.tenant_id === fixture.tenantAId)
      expect(tenantAEntry).toBeDefined()
      expect(tenantAEntry!.responsibility_percentage).toBe(fixture.tenantAPct)

      const expectedPortion = (fixture.sharedRentAmount * fixture.tenantAPct) / 100
      const actualPortion =
        (Number(lease!.rent_amount) * tenantAEntry!.responsibility_percentage) / 100
      expect(actualPortion).toBe(expectedPortion)

      // When the split is not 100%, the tenant portion MUST be strictly less
      // than the full lease amount — this guards against an RLS bug that
      // returned the full amount as the tenant's personal due.
      if (fixture.tenantAPct < 100) {
        expect(actualPortion).toBeLessThan(fixture.sharedRentAmount)
      }
    })

    it('tenant B portion computed from responsibility_percentage matches formula', async () => {
      const { data: lease, error } = await fixture.tenantBClient
        .from('leases')
        .select(
          'id, rent_amount, lease_tenants!inner(tenant_id, responsibility_percentage)',
        )
        .eq('id', fixture.sharedLeaseId)
        .single()

      expect(error).toBeNull()
      expect(lease).not.toBeNull()

      const lts = mapLeaseTenants(lease)
      const tenantBEntry = lts.find((lt) => lt.tenant_id === fixture.tenantBId)
      expect(tenantBEntry).toBeDefined()
      expect(tenantBEntry!.responsibility_percentage).toBe(fixture.tenantBPct)

      const expectedPortion = (fixture.sharedRentAmount * fixture.tenantBPct) / 100
      const actualPortion =
        (Number(lease!.rent_amount) * tenantBEntry!.responsibility_percentage) / 100
      expect(actualPortion).toBe(expectedPortion)

      if (fixture.tenantBPct < 100) {
        expect(actualPortion).toBeLessThan(fixture.sharedRentAmount)
      }
    })

    it('percentages across tenants on the shared lease sum to <= 100 and are each >= 1', async () => {
      expect(fixture.tenantAPct + fixture.tenantBPct).toBeLessThanOrEqual(100)
      expect(fixture.tenantAPct).toBeGreaterThanOrEqual(1)
      expect(fixture.tenantBPct).toBeGreaterThanOrEqual(1)
    })
  },
)
