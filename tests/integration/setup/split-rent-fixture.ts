/**
 * Split-rent RLS test fixture loader.
 *
 * Required env vars (all 6 must be set; fixture returns null when any are missing):
 *   - E2E_OWNER_EMAIL      — owner of a property whose lease is shared between tenantA and tenantB
 *   - E2E_OWNER_PASSWORD
 *   - E2E_TENANT_EMAIL     — tenantA sign-in credentials
 *   - E2E_TENANT_PASSWORD
 *   - E2E_TENANT_B_EMAIL   — tenantB sign-in credentials
 *   - E2E_TENANT_B_PASSWORD
 *
 * Required test-DB state:
 *   1. One lease that has BOTH tenantA AND tenantB recorded in lease_tenants
 *      with responsibility_percentage values that sum to <= 100 and are each >= 1.
 *   2. At least one rent_due row for that lease so the tenant-portion test has
 *      data to assert on. Tests are read-only and do not insert/update/delete
 *      any seed data; infrastructure provisioning is a separate concern.
 *
 * Skip-on-missing contract:
 *   - Returns null when any of the 6 env vars is missing.
 *   - Returns null when the authenticated tenantA cannot locate a shared lease
 *     that also contains tenantBId in its lease_tenants join.
 *   - Callers use `describe.skipIf(!fixture)` so tests report SKIP (not FAIL)
 *     in unprovisioned environments. Integration tests are never silent
 *     false-positives.
 */

import { createTestClient } from './supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface SplitRentFixture {
  ownerClient: SupabaseClient
  tenantAClient: SupabaseClient
  tenantBClient: SupabaseClient
  sharedLeaseId: string
  tenantAId: string
  tenantBId: string
  tenantAPct: number
  tenantBPct: number
  sharedRentAmount: number
  cleanup: () => Promise<void>
}

interface LeaseTenantRow {
  tenant_id: string
  responsibility_percentage: number
}

interface LeaseWithTenantsRow {
  id: string
  rent_amount: number
  lease_tenants: LeaseTenantRow[]
}

function readCredentials(): {
  owner: { email: string; password: string }
  tenantA: { email: string; password: string }
  tenantB: { email: string; password: string }
} | null {
  const ownerEmail = process.env['E2E_OWNER_EMAIL']
  const ownerPassword = process.env['E2E_OWNER_PASSWORD']
  const tenantAEmail = process.env['E2E_TENANT_EMAIL']
  const tenantAPassword = process.env['E2E_TENANT_PASSWORD']
  const tenantBEmail = process.env['E2E_TENANT_B_EMAIL']
  const tenantBPassword = process.env['E2E_TENANT_B_PASSWORD']

  if (
    !ownerEmail ||
    !ownerPassword ||
    !tenantAEmail ||
    !tenantAPassword ||
    !tenantBEmail ||
    !tenantBPassword
  ) {
    return null
  }

  return {
    owner: { email: ownerEmail, password: ownerPassword },
    tenantA: { email: tenantAEmail, password: tenantAPassword },
    tenantB: { email: tenantBEmail, password: tenantBPassword },
  }
}

async function resolveTenantId(client: SupabaseClient): Promise<string | null> {
  // Tenants RLS allows a tenant user to read their own row via user_id = auth.uid().
  const { data, error } = await client
    .from('tenants')
    .select('id')
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return data.id as string
}

function mapLeaseWithTenants(raw: unknown): LeaseWithTenantsRow | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = row['id']
  const rentAmount = row['rent_amount']
  const lts = row['lease_tenants']
  if (typeof id !== 'string') return null
  if (typeof rentAmount !== 'number') return null
  if (!Array.isArray(lts)) return null
  const lease_tenants: LeaseTenantRow[] = []
  for (const item of lts) {
    if (!item || typeof item !== 'object') continue
    const entry = item as Record<string, unknown>
    const tenantId = entry['tenant_id']
    const pct = entry['responsibility_percentage']
    if (typeof tenantId !== 'string') continue
    if (typeof pct !== 'number') continue
    lease_tenants.push({ tenant_id: tenantId, responsibility_percentage: pct })
  }
  return { id, rent_amount: rentAmount, lease_tenants }
}

async function findSharedLease(
  tenantAClient: SupabaseClient,
  tenantAId: string,
  tenantBId: string,
): Promise<LeaseWithTenantsRow | null> {
  // Tenant A sees lease_tenants rows via RLS only for their own tenant_id.
  // The `!inner` join filters leases to those where tenantA has a row; we then
  // re-query the full lease_tenants list for each candidate lease via the
  // owner's RLS path would not be possible as tenantA — but we can match by
  // existence: tenantA joins leases where they appear; for each, we must then
  // verify tenantB also has a row on that same lease via a second query using
  // tenantA's access to leases (RLS on leases allows tenants on the lease
  // to see the lease itself). We query lease_tenants filtered by lease_id list:
  // tenantA can only see their own lease_tenants rows, so we cannot confirm
  // tenantB's presence from tenantA's client. Instead we verify by asking
  // tenantB's client whether the same lease contains tenantB.
  const { data, error } = await tenantAClient
    .from('leases')
    .select(
      'id, rent_amount, lease_tenants!inner(tenant_id, responsibility_percentage)',
    )
    .eq('lease_tenants.tenant_id', tenantAId)
    .eq('lease_status', 'active')
  if (error || !data) return null

  for (const raw of data) {
    const mapped = mapLeaseWithTenants(raw)
    if (!mapped) continue
    // Tenant A can only see their own lease_tenants row — confirm tenantB is
    // on the same lease by querying lease_tenants via a separate client path.
    // We use tenantA's access to leases to read the lease row (which tenantA
    // can see because they are on it) — but to verify tenantB's presence we
    // must ask tenantB directly. That happens in getSplitRentFixture.
    void tenantBId
    return mapped
  }
  return null
}

async function confirmTenantBOnLease(
  tenantBClient: SupabaseClient,
  leaseId: string,
  tenantBId: string,
): Promise<LeaseTenantRow | null> {
  const { data, error } = await tenantBClient
    .from('leases')
    .select('id, lease_tenants!inner(tenant_id, responsibility_percentage)')
    .eq('id', leaseId)
    .eq('lease_tenants.tenant_id', tenantBId)
    .maybeSingle()
  if (error || !data) return null
  const mapped = mapLeaseWithTenants({ ...data, rent_amount: 0 })
  if (!mapped) return null
  const entry = mapped.lease_tenants.find((lt) => lt.tenant_id === tenantBId)
  return entry ?? null
}

export async function getSplitRentFixture(): Promise<SplitRentFixture | null> {
  const creds = readCredentials()
  if (!creds) return null

  let ownerClient: SupabaseClient | null = null
  let tenantAClient: SupabaseClient | null = null
  let tenantBClient: SupabaseClient | null = null

  try {
    ownerClient = await createTestClient(creds.owner.email, creds.owner.password)
    tenantAClient = await createTestClient(
      creds.tenantA.email,
      creds.tenantA.password,
    )
    tenantBClient = await createTestClient(
      creds.tenantB.email,
      creds.tenantB.password,
    )
  } catch {
    // Sign-in failure -> treat as unprovisioned environment and skip tests
    return null
  }

  const tenantAId = await resolveTenantId(tenantAClient)
  const tenantBId = await resolveTenantId(tenantBClient)
  if (!tenantAId || !tenantBId) return null

  const lease = await findSharedLease(tenantAClient, tenantAId, tenantBId)
  if (!lease) return null

  const tenantAEntry = lease.lease_tenants.find(
    (lt) => lt.tenant_id === tenantAId,
  )
  if (!tenantAEntry) return null

  const tenantBEntry = await confirmTenantBOnLease(
    tenantBClient,
    lease.id,
    tenantBId,
  )
  if (!tenantBEntry) return null

  const fixture: SplitRentFixture = {
    ownerClient,
    tenantAClient,
    tenantBClient,
    sharedLeaseId: lease.id,
    tenantAId,
    tenantBId,
    tenantAPct: tenantAEntry.responsibility_percentage,
    tenantBPct: tenantBEntry.responsibility_percentage,
    sharedRentAmount: Number(lease.rent_amount),
    cleanup: async () => {
      await Promise.all([
        ownerClient!.auth.signOut(),
        tenantAClient!.auth.signOut(),
        tenantBClient!.auth.signOut(),
      ])
    },
  }

  return fixture
}
