import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
	createTestClient,
	getTestCredentials
} from '../setup/supabase-client'

/**
 * v2.1 Phase 47 regression-proof — guarantees authenticated landlords can
 * actually read their own rows across every core table.
 *
 * The existing RLS specs (leases, maintenance, etc.) use `data.forEach(...)`.
 * When RLS blocks everything, `data = []` and forEach runs zero times — tests
 * pass with zero meaningful assertions. That's how v2.0 shipped to prod with
 * `leases` / `maintenance_requests` / `notifications` having RLS enabled and
 * ZERO policies: landlords couldn't read their own data, but tests were green.
 *
 * This spec seeds one row per table via the service-role client, then reads
 * back via the authenticated client. If RLS blocks the read, the test fails
 * explicitly because `data.length === 0` is asserted to be `> 0`.
 */

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_ROLE_KEY =
	process.env['SUPABASE_SERVICE_ROLE_KEY'] ??
	process.env['SUPABASE_SECRET_KEY']

const skipReason = !SUPABASE_URL
	? 'NEXT_PUBLIC_SUPABASE_URL not set'
	: !SERVICE_ROLE_KEY
		? 'SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY not set'
		: null

describe.skipIf(skipReason)('RLS non-empty smoke (v2.1 Phase 47)', () => {
	let ownerAClient: SupabaseClient
	let serviceRoleClient: SupabaseClient
	let ownerAId: string
	let seededPropertyId: string
	let seededLeaseId: string | null = null
	let seededMaintenanceId: string | null = null
	let seededNotificationId: string | null = null
	let seededTenantId: string | null = null
	let seededUnitId: string | null = null

	beforeAll(async () => {
		const { ownerA } = getTestCredentials()
		ownerAClient = await createTestClient(ownerA.email, ownerA.password)

		const {
			data: { user }
		} = await ownerAClient.auth.getUser()
		ownerAId = user!.id

		serviceRoleClient = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
			auth: { persistSession: false, autoRefreshToken: false }
		})

		// Ensure owner has at least one property (seed if not present)
		const { data: existingProps } = await serviceRoleClient
			.from('properties')
			.select('id')
			.eq('owner_user_id', ownerAId)
			.neq('status', 'inactive')
			.limit(1)

		if (existingProps && existingProps.length > 0) {
			seededPropertyId = existingProps[0]!.id
		} else {
			const { data: prop, error } = await serviceRoleClient
				.from('properties')
				.insert({
					owner_user_id: ownerAId,
					name: 'RLS Smoke Test Property',
					address_line1: '1 Test Lane',
					city: 'Testville',
					state: 'TX',
					postal_code: '78701',
					country: 'US',
					property_type: 'SINGLE_FAMILY',
					status: 'active'
				})
				.select('id')
				.single()
			if (error) throw new Error(`Seed property failed: ${error.message}`)
			seededPropertyId = prop!.id
		}

		// Seed unit + tenant + lease + maintenance + notification.
		// Idempotent: each insert uses a unique marker name so re-running the
		// spec doesn't accumulate rows — afterAll cleans up by stored IDs.
		const { data: unit, error: unitErr } = await serviceRoleClient
			.from('units')
			.insert({
				property_id: seededPropertyId,
				owner_user_id: ownerAId,
				unit_number: 'RLS-SMOKE',
				bedrooms: 1,
				bathrooms: 1,
				rent_amount: 1000,
				status: 'occupied'
			})
			.select('id')
			.single()
		if (unitErr) throw new Error(`Seed unit failed: ${unitErr.message}`)
		seededUnitId = unit!.id

		const { data: tenant, error: tenantErr } = await serviceRoleClient
			.from('tenants')
			.insert({
				owner_user_id: ownerAId,
				first_name: 'Smoke',
				last_name: 'Test',
				email: `smoke-test-${Date.now()}@rls.test`,
				status: 'active'
			})
			.select('id')
			.single()
		if (tenantErr) throw new Error(`Seed tenant failed: ${tenantErr.message}`)
		seededTenantId = tenant!.id

		const { data: lease, error: leaseErr } = await serviceRoleClient
			.from('leases')
			.insert({
				owner_user_id: ownerAId,
				unit_id: seededUnitId,
				primary_tenant_id: seededTenantId,
				start_date: '2026-01-01',
				end_date: '2026-12-31',
				rent_amount: 1000,
				security_deposit: 1000,
				lease_status: 'active'
			})
			.select('id')
			.single()
		if (leaseErr) throw new Error(`Seed lease failed: ${leaseErr.message}`)
		seededLeaseId = lease!.id

		const { data: maint, error: maintErr } = await serviceRoleClient
			.from('maintenance_requests')
			.insert({
				owner_user_id: ownerAId,
				unit_id: seededUnitId,
				tenant_id: seededTenantId,
				title: 'RLS Smoke Test',
				description: 'Seeded by rls-non-empty-smoke.test.ts',
				priority: 'low',
				status: 'open'
			})
			.select('id')
			.single()
		if (maintErr) throw new Error(`Seed maintenance failed: ${maintErr.message}`)
		seededMaintenanceId = maint!.id

		const { data: notif, error: notifErr } = await serviceRoleClient
			.from('notifications')
			.insert({
				user_id: ownerAId,
				notification_type: 'system',
				title: 'RLS Smoke Test',
				message: 'Seeded'
			})
			.select('id')
			.single()
		if (notifErr) {
			throw new Error(`Seed notification failed: ${notifErr.message}`)
		}
		seededNotificationId = notif!.id
	})

	afterAll(async () => {
		if (!serviceRoleClient) return
		if (seededMaintenanceId) {
			await serviceRoleClient
				.from('maintenance_requests')
				.delete()
				.eq('id', seededMaintenanceId)
		}
		if (seededNotificationId) {
			await serviceRoleClient
				.from('notifications')
				.delete()
				.eq('id', seededNotificationId)
		}
		if (seededLeaseId) {
			await serviceRoleClient
				.from('leases')
				.delete()
				.eq('id', seededLeaseId)
		}
		if (seededTenantId) {
			await serviceRoleClient
				.from('tenants')
				.delete()
				.eq('id', seededTenantId)
		}
		if (seededUnitId) {
			await serviceRoleClient
				.from('units')
				.delete()
				.eq('id', seededUnitId)
		}
		await ownerAClient.auth.signOut()
	})

	it('owner sees their seeded lease (blocks if RLS policy missing)', async () => {
		const { data, error } = await ownerAClient
			.from('leases')
			.select('id, owner_user_id')
			.eq('id', seededLeaseId!)
		expect(error).toBeNull()
		expect(data).not.toBeNull()
		expect(data!.length).toBe(1)
		expect(data![0]!.owner_user_id).toBe(ownerAId)
	})

	it('owner sees their seeded maintenance request', async () => {
		const { data, error } = await ownerAClient
			.from('maintenance_requests')
			.select('id, owner_user_id')
			.eq('id', seededMaintenanceId!)
		expect(error).toBeNull()
		expect(data).not.toBeNull()
		expect(data!.length).toBe(1)
		expect(data![0]!.owner_user_id).toBe(ownerAId)
	})

	it('owner sees their own notification', async () => {
		const { data, error } = await ownerAClient
			.from('notifications')
			.select('id, user_id')
			.eq('id', seededNotificationId!)
		expect(error).toBeNull()
		expect(data).not.toBeNull()
		expect(data!.length).toBe(1)
		expect(data![0]!.user_id).toBe(ownerAId)
	})

	it('owner sees their seeded property', async () => {
		const { data, error } = await ownerAClient
			.from('properties')
			.select('id, owner_user_id')
			.eq('id', seededPropertyId)
		expect(error).toBeNull()
		expect(data).not.toBeNull()
		expect(data!.length).toBe(1)
		expect(data![0]!.owner_user_id).toBe(ownerAId)
	})

	it('owner sees their seeded unit', async () => {
		const { data, error } = await ownerAClient
			.from('units')
			.select('id, owner_user_id')
			.eq('id', seededUnitId!)
		expect(error).toBeNull()
		expect(data).not.toBeNull()
		expect(data!.length).toBe(1)
		expect(data![0]!.owner_user_id).toBe(ownerAId)
	})

	it('owner sees their seeded tenant', async () => {
		const { data, error } = await ownerAClient
			.from('tenants')
			.select('id, owner_user_id')
			.eq('id', seededTenantId!)
		expect(error).toBeNull()
		expect(data).not.toBeNull()
		expect(data!.length).toBe(1)
		expect(data![0]!.owner_user_id).toBe(ownerAId)
	})
})
