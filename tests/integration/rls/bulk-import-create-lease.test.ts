/**
 * Integration tests for `bulk_import_create_lease` SECURITY DEFINER RPC.
 *
 * Why this exists: cycle 4 of the v2.3 audit caught a P0 production bug
 * where every bulk-imported lease was being rejected — the cycle-2 H9
 * fix introduced a positionally-swapped + semantically-incompatible call
 * to `assert_can_create_lease`. Three audit cycles missed it because
 * there was no integration test exercising the RPC end-to-end. This
 * file pins down the contract so a future regression of the same shape
 * fails CI.
 *
 * Pattern matches `tests/integration/rls/lease-rpcs.test.ts` (dual
 * client, fixture-create + cleanup, graceful skip if env missing).
 */

import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('bulk_import_create_lease RPC', () => {
	let clientA: SupabaseClient
	let clientB: SupabaseClient
	let ownerAId: string
	let ownerBId: string

	// Fixtures created in beforeAll, cleaned in afterAll.
	let propertyA: { id: string } | null = null
	let unitA: { id: string } | null = null
	let tenantA: { id: string } | null = null
	let propertyB: { id: string } | null = null
	let unitB: { id: string } | null = null
	let tenantB: { id: string } | null = null
	const insertedLeaseIds: string[] = []

	beforeAll(async () => {
		const { ownerA, ownerB } = getTestCredentials()
		clientA = await createTestClient(ownerA.email, ownerA.password)
		clientB = await createTestClient(ownerB.email, ownerB.password)

		const {
			data: { user: userA },
		} = await clientA.auth.getUser()
		const {
			data: { user: userB },
		} = await clientB.auth.getUser()
		ownerAId = userA!.id
		ownerBId = userB!.id

		// Create fresh fixtures so the test owns the cleanup. Re-using
		// existing prod-like data risks polluting it with test leases.
		const { data: pA } = await clientA
			.from('properties')
			.insert({
				name: 'Bulk-Import Test Property A',
				address_line1: '1 Test St',
				city: 'Testville',
				state: 'CA',
				postal_code: '94105',
				country: 'US',
				property_type: 'APARTMENT',
				owner_user_id: ownerAId,
			})
			.select('id')
			.single()
		propertyA = pA ? { id: pA.id } : null

		if (propertyA) {
			const { data: uA } = await clientA
				.from('units')
				.insert({
					property_id: propertyA.id,
					unit_number: 'BULK-A-101',
					bedrooms: 1,
					bathrooms: 1,
					rent_amount: 1500,
					owner_user_id: ownerAId,
				})
				.select('id')
				.single()
			unitA = uA ? { id: uA.id } : null
		}

		const { data: tA } = await clientA
			.from('tenants')
			.insert({
				email: `bulk-test-tenant-a-${Date.now()}@example.com`,
				first_name: 'Bulk',
				last_name: 'TestA',
				owner_user_id: ownerAId,
			})
			.select('id')
			.single()
		tenantA = tA ? { id: tA.id } : null

		// Mirror fixtures for owner B so cross-tenant tests have something
		// to point at.
		const { data: pB } = await clientB
			.from('properties')
			.insert({
				name: 'Bulk-Import Test Property B',
				address_line1: '2 Test St',
				city: 'Testville',
				state: 'CA',
				postal_code: '94105',
				country: 'US',
				property_type: 'APARTMENT',
				owner_user_id: ownerBId,
			})
			.select('id')
			.single()
		propertyB = pB ? { id: pB.id } : null

		if (propertyB) {
			const { data: uB } = await clientB
				.from('units')
				.insert({
					property_id: propertyB.id,
					unit_number: 'BULK-B-101',
					bedrooms: 1,
					bathrooms: 1,
					rent_amount: 1500,
					owner_user_id: ownerBId,
				})
				.select('id')
				.single()
			unitB = uB ? { id: uB.id } : null
		}

		const { data: tB } = await clientB
			.from('tenants')
			.insert({
				email: `bulk-test-tenant-b-${Date.now()}@example.com`,
				first_name: 'Bulk',
				last_name: 'TestB',
				owner_user_id: ownerBId,
			})
			.select('id')
			.single()
		tenantB = tB ? { id: tB.id } : null
	})

	afterAll(async () => {
		// Hard-delete leases first (lease_tenants cascades), then unit, tenant,
		// property. lease_tenants will auto-cascade with the lease delete.
		for (const id of insertedLeaseIds) {
			await clientA.from('leases').delete().eq('id', id)
			await clientB.from('leases').delete().eq('id', id)
		}
		if (unitA) await clientA.from('units').delete().eq('id', unitA.id)
		if (tenantA) await clientA.from('tenants').delete().eq('id', tenantA.id)
		if (propertyA) await clientA.from('properties').delete().eq('id', propertyA.id)
		if (unitB) await clientB.from('units').delete().eq('id', unitB.id)
		if (tenantB) await clientB.from('tenants').delete().eq('id', tenantB.id)
		if (propertyB) await clientB.from('properties').delete().eq('id', propertyB.id)
		await clientA.auth.signOut()
		await clientB.auth.signOut()
	})

	// ---------------------------------------------------------------------------
	// THE TEST CYCLE 4 SHOULD HAVE CAUGHT IN CYCLE 1
	// ---------------------------------------------------------------------------

	it('inserts a valid lease end-to-end (regression: cycle-4 P0)', async () => {
		if (!unitA || !tenantA) {
			console.warn('Skipping: fixtures not created')
			return
		}

		const { data: leaseId, error } = await clientA.rpc('bulk_import_create_lease', {
			p_unit_id: unitA.id,
			p_primary_tenant_id: tenantA.id,
			p_start_date: '2026-05-01',
			p_end_date: '2027-04-30',
			p_rent_amount: 1800,
			p_security_deposit: 1800,
			p_payment_day: 1,
		})

		expect(error).toBeNull()
		expect(leaseId).toBeTruthy()
		if (typeof leaseId === 'string') insertedLeaseIds.push(leaseId)

		// Verify the lease exists AND has a corresponding lease_tenants row
		// (the atomicity claim in the function comment). lease_tenants has
		// no SELECT policy — by design, reads happen via parent-table joins
		// (tenants → lease_tenants(...)). That mirrors how the app reads
		// the data and verifies the junction row is wired through RLS.
		const { data: leaseRow } = await clientA
			.from('leases')
			.select(
				'id, unit_id, primary_tenant_id, lease_status, rent_currency, lease_tenants(tenant_id, is_primary, responsibility_percentage)'
			)
			.eq('id', leaseId as string)
			.single()
		expect(leaseRow).toBeTruthy()
		expect(leaseRow!.unit_id).toBe(unitA.id)
		expect(leaseRow!.primary_tenant_id).toBe(tenantA.id)
		expect(leaseRow!.lease_status).toBe('draft')
		expect(leaseRow!.rent_currency).toBe('USD')
		expect(leaseRow!.lease_tenants).toHaveLength(1)
		expect(leaseRow!.lease_tenants[0]!.tenant_id).toBe(tenantA.id)
		expect(leaseRow!.lease_tenants[0]!.is_primary).toBe(true)
		expect(leaseRow!.lease_tenants[0]!.responsibility_percentage).toBe(100)
	})

	// ---------------------------------------------------------------------------
	// Ownership enforcement
	// ---------------------------------------------------------------------------

	it('rejects when caller does not own the unit', async () => {
		if (!unitB || !tenantA) {
			console.warn('Skipping: fixtures not created')
			return
		}

		// Owner A tries to create a lease on owner B's unit
		const { error } = await clientA.rpc('bulk_import_create_lease', {
			p_unit_id: unitB.id,
			p_primary_tenant_id: tenantA.id,
			p_start_date: '2026-05-01',
			p_end_date: '2027-04-30',
			p_rent_amount: 1800,
			p_security_deposit: 1800,
			p_payment_day: 1,
		})
		expect(error).not.toBeNull()
		expect(error!.message).toMatch(/unit.*not yours|access denied/i)
	})

	it('rejects when caller does not own the tenant', async () => {
		if (!unitA || !tenantB) {
			console.warn('Skipping: fixtures not created')
			return
		}

		const { error } = await clientA.rpc('bulk_import_create_lease', {
			p_unit_id: unitA.id,
			p_primary_tenant_id: tenantB.id,
			p_start_date: '2026-05-01',
			p_end_date: '2027-04-30',
			p_rent_amount: 1800,
			p_security_deposit: 1800,
			p_payment_day: 1,
		})
		expect(error).not.toBeNull()
		expect(error!.message).toMatch(/tenant.*not yours|access denied/i)
	})

	// ---------------------------------------------------------------------------
	// Input-range validation (cycle-2 M13 + cycle-4 L2 NULL guards)
	// ---------------------------------------------------------------------------

	it.each([
		['payment_day < 1', { p_payment_day: 0 }, /payment day/i],
		['payment_day > 31', { p_payment_day: 32 }, /payment day/i],
		['rent_amount = 0', { p_rent_amount: 0 }, /rent amount/i],
		['negative security_deposit', { p_security_deposit: -1 }, /security deposit/i],
		['end_date before start_date', { p_end_date: '2026-04-30', p_start_date: '2026-05-01' }, /end date/i],
		['rent_currency wrong length', { p_rent_currency: 'US' }, /currency/i],
		['lease_status invalid', { p_lease_status: 'bogus' }, /lease status/i],
	])('rejects input: %s', async (_label, override, pattern) => {
		if (!unitA || !tenantA) {
			console.warn('Skipping: fixtures not created')
			return
		}

		const base = {
			p_unit_id: unitA.id,
			p_primary_tenant_id: tenantA.id,
			p_start_date: '2026-05-01',
			p_end_date: '2027-04-30',
			p_rent_amount: 1800,
			p_security_deposit: 1800,
			p_payment_day: 1,
		}
		const { error } = await clientA.rpc('bulk_import_create_lease', {
			...base,
			...override,
		})
		expect(error).not.toBeNull()
		expect(error!.message).toMatch(pattern)
	})

	// ---------------------------------------------------------------------------
	// Cycle-4 fix: overlap check
	// ---------------------------------------------------------------------------

	it('rejects a lease whose date range overlaps an existing active lease on the same unit', async () => {
		if (!unitA || !tenantA) {
			console.warn('Skipping: fixtures not created')
			return
		}

		// Create the first lease (active status so the overlap check picks it up).
		const { data: firstId } = await clientA.rpc('bulk_import_create_lease', {
			p_unit_id: unitA.id,
			p_primary_tenant_id: tenantA.id,
			p_start_date: '2026-08-01',
			p_end_date: '2027-07-31',
			p_rent_amount: 2000,
			p_security_deposit: 2000,
			p_payment_day: 1,
			p_lease_status: 'active',
		})
		if (typeof firstId === 'string') insertedLeaseIds.push(firstId)

		// Try a second lease that overlaps the date range.
		const { error } = await clientA.rpc('bulk_import_create_lease', {
			p_unit_id: unitA.id,
			p_primary_tenant_id: tenantA.id,
			p_start_date: '2027-01-01',
			p_end_date: '2028-01-01',
			p_rent_amount: 2100,
			p_security_deposit: 2100,
			p_payment_day: 1,
		})
		expect(error).not.toBeNull()
		expect(error!.message).toMatch(/overlap/i)
	})

	it('accepts a non-overlapping lease on the same unit (after the first ends)', async () => {
		if (!unitA || !tenantA) {
			console.warn('Skipping: fixtures not created')
			return
		}

		// First lease ends 2027-07-31 (created in the prior test, still in
		// insertedLeaseIds). New lease starts 2027-08-01 — no overlap.
		const { data: nextId, error } = await clientA.rpc('bulk_import_create_lease', {
			p_unit_id: unitA.id,
			p_primary_tenant_id: tenantA.id,
			p_start_date: '2027-08-01',
			p_end_date: '2028-07-31',
			p_rent_amount: 2200,
			p_security_deposit: 2200,
			p_payment_day: 1,
		})
		expect(error).toBeNull()
		expect(nextId).toBeTruthy()
		if (typeof nextId === 'string') insertedLeaseIds.push(nextId)
	})

	// ---------------------------------------------------------------------------
	// Cycle-4 LOW: NULL guards
	// ---------------------------------------------------------------------------

	it.each([
		['p_unit_id', { p_unit_id: null }, /unit id is required/i],
		['p_primary_tenant_id', { p_primary_tenant_id: null }, /tenant id is required/i],
		['p_start_date', { p_start_date: null }, /start date is required/i],
		['p_end_date', { p_end_date: null }, /end date is required/i],
		['p_payment_day', { p_payment_day: null }, /payment day is required/i],
	])('rejects NULL %s with a clear field-name error', async (_label, override, pattern) => {
		if (!unitA || !tenantA) {
			console.warn('Skipping: fixtures not created')
			return
		}

		const base = {
			p_unit_id: unitA.id,
			p_primary_tenant_id: tenantA.id,
			p_start_date: '2026-05-01',
			p_end_date: '2027-04-30',
			p_rent_amount: 1800,
			p_security_deposit: 1800,
			p_payment_day: 1,
		}
		const { error } = await clientA.rpc('bulk_import_create_lease', {
			...base,
			...override,
		} as never)
		expect(error).not.toBeNull()
		expect(error!.message).toMatch(pattern)
	})
})
