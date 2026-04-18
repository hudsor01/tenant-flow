import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Landlord-only tenant CRUD integration tests.
 *
 * After migration 20260418150000_tenants_contact_columns, the tenants table
 * becomes self-contained: owners can INSERT/SELECT/UPDATE tenant records with
 * contact fields (first_name, last_name, email, phone) directly on the row,
 * with user_id nullable (tenant may or may not have an auth account).
 *
 * RLS must allow owners to INSERT tenants they manage (user_id NULL) and
 * isolate them across owners via the lease_tenants linkage.
 */
describe('Tenants landlord-only CRUD (RLS)', () => {
	let clientA: SupabaseClient
	let clientB: SupabaseClient
	let ownerAId: string
	const createdTenantIds: string[] = []

	beforeAll(async () => {
		const { ownerA, ownerB } = getTestCredentials()
		clientA = await createTestClient(ownerA.email, ownerA.password)
		clientB = await createTestClient(ownerB.email, ownerB.password)

		const {
			data: { user: userA },
		} = await clientA.auth.getUser()
		ownerAId = userA!.id
	})

	afterAll(async () => {
		// Best-effort cleanup of rows created by this suite
		for (const id of createdTenantIds) {
			try {
				await clientA.from('tenants').delete().eq('id', id)
			} catch {
				// ignore
			}
		}
		await clientA.auth.signOut()
		await clientB.auth.signOut()
	})

	it('owner A can INSERT a landlord-managed tenant (no user_id)', async () => {
		const { data, error } = await clientA
			.from('tenants')
			.insert({
				owner_user_id: ownerAId,
				first_name: 'Jane',
				last_name: 'Doe',
				name: 'Jane Doe',
				email: `jane-${Date.now()}@test.tenantflow.invalid`,
				phone: '555-1234'
			})
			.select('id, first_name, last_name, name, email, phone, user_id, status')
			.single()

		expect(error).toBeNull()
		expect(data).not.toBeNull()
		expect(data!.first_name).toBe('Jane')
		expect(data!.last_name).toBe('Doe')
		expect(data!.name).toBe('Jane Doe')
		expect(data!.email).toMatch(/^jane-/)
		expect(data!.phone).toBe('555-1234')
		expect(data!.user_id).toBeNull()
		expect(data!.status).toBe('active')

		createdTenantIds.push(data!.id as string)
	})

	it('owner A can SELECT the landlord-managed tenant without joining users', async () => {
		const tenantId = createdTenantIds[0]
		if (!tenantId) throw new Error('prior test did not create a tenant')

		const { data, error } = await clientA
			.from('tenants')
			.select('id, first_name, last_name, email, phone, status')
			.eq('id', tenantId)
			.single()

		expect(error).toBeNull()
		expect(data).not.toBeNull()
		expect(data!.first_name).toBe('Jane')
		expect(data!.last_name).toBe('Doe')
		expect(data!.status).toBe('active')
	})

	it('owner A can UPDATE status to inactive (move-out flow)', async () => {
		const tenantId = createdTenantIds[0]
		if (!tenantId) throw new Error('prior test did not create a tenant')

		const { data, error } = await clientA
			.from('tenants')
			.update({ status: 'inactive' })
			.eq('id', tenantId)
			.select('id, status')
			.single()

		expect(error).toBeNull()
		expect(data).not.toBeNull()
		expect(data!.status).toBe('inactive')
	})

	it('owner B cannot SELECT owner A landlord-managed tenants', async () => {
		const tenantId = createdTenantIds[0]
		if (!tenantId) throw new Error('prior test did not create a tenant')

		const { data, error } = await clientB
			.from('tenants')
			.select('id')
			.eq('id', tenantId)
			.maybeSingle()

		// Owner B must not see owner A's landlord-managed tenant.
		// If RLS allows cross-owner read via lease_tenants linkage, that's OK,
		// but this tenant has no lease linkage, so must be invisible to owner B.
		expect(error).toBeNull()
		expect(data).toBeNull()
	})
})
