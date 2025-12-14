/**
 * RLS Circular Dependency Fix - Integration Tests
 *
 * Tests for migration: 20251213140000_fix_rls_circular_dependency_properly.sql
 *
 * WARNING **TESTS SKIPPED**: These tests use mock JWT tokens that are NOT
 * configured in Supabase Auth. RLS policies are NOT actually enforced,
 * causing tests to pass vacuously without validating the migration.
 *
 * **To enable these tests**:
 * 1. Set up Supabase Auth test users with real JWT tokens
 * 2. Use `supabase.auth.signInWithPassword()` to get valid sessions
 * 3. Extract `access_token` from session for `getUserClient()`
 * 4. Ensure test database has proper RLS policies enabled
 * 5. Change `describe.skip` to `describe` below
 *
 * **Current Status**: SKIPPED - Requires Supabase Auth configuration
 *
 * Would verify (when properly configured):
 * 1. Property owners can read their leases
 * 2. Tenants can read assigned leases via lease_tenants
 * 3. Unrelated users are denied access
 * 4. No infinite recursion during RLS checks (queries complete successfully)
 * 5. Performance: Queries execute within acceptable time limits
 */

import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SupabaseModule } from '../../../src/database/supabase.module'
import { SupabaseService } from '../../../src/database/supabase.service'
import type { Database } from '@repo/shared/types/supabase'

describe.skip('RLS Circular Dependency Fix (Integration)', () => {
	let app: INestApplication
	let supabase: SupabaseService

	// Test user tokens (from Supabase Auth test fixtures)
	const OWNER_1_TOKEN = 'mock-owner-1-jwt-token'
	const OWNER_2_TOKEN = 'mock-owner-2-jwt-token'
	const TENANT_1_TOKEN = 'mock-tenant-1-jwt-token'
	const TENANT_2_TOKEN = 'mock-tenant-2-jwt-token'
	const UNRELATED_USER_TOKEN = 'mock-unrelated-user-jwt-token'

	// Test data IDs
	let owner1Id: string
	let owner2Id: string
	let tenant1Id: string
	let tenant2Id: string
	let property1Id: string
	let property2Id: string
	let unit1Id: string
	let unit2Id: string
	let lease1Id: string
	let lease2Id: string

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [
				ConfigModule.forRoot({
					isGlobal: true,
					envFilePath: '.env.test'
				}),
				SupabaseModule
			]
		}).compile()

		app = moduleRef.createNestApplication()
		await app.init()

		supabase = moduleRef.get(SupabaseService)
	})

	afterAll(async () => {
		await app.close()
	})

	beforeEach(async () => {
		// Setup test data with proper RLS context
		const adminClient = supabase.getAdminClient()

		// Create owners
		const { data: owner1 } = await adminClient
			.from('property_owners')
			.insert({ email: 'owner1@test.com', name: 'Owner 1' })
			.select('id')
			.single()
		owner1Id = owner1!.id

		const { data: owner2 } = await adminClient
			.from('property_owners')
			.insert({ email: 'owner2@test.com', name: 'Owner 2' })
			.select('id')
			.single()
		owner2Id = owner2!.id

		// Create tenants
		const { data: tenant1 } = await adminClient
			.from('tenants')
			.insert({ email: 'tenant1@test.com', first_name: 'Tenant', last_name: '1' })
			.select('id')
			.single()
		tenant1Id = tenant1!.id

		const { data: tenant2 } = await adminClient
			.from('tenants')
			.insert({ email: 'tenant2@test.com', first_name: 'Tenant', last_name: '2' })
			.select('id')
			.single()
		tenant2Id = tenant2!.id

		// Create properties
		const { data: property1 } = await adminClient
			.from('properties')
			.insert({
				property_owner_id: owner1Id,
				name: 'Property 1',
				address: '123 Main St',
				city: 'Austin',
				state: 'TX',
				zip: '78701'
			})
			.select('id')
			.single()
		property1Id = property1!.id

		const { data: property2 } = await adminClient
			.from('properties')
			.insert({
				property_owner_id: owner2Id,
				name: 'Property 2',
				address: '456 Oak Ave',
				city: 'Austin',
				state: 'TX',
				zip: '78702'
			})
			.select('id')
			.single()
		property2Id = property2!.id

		// Create units
		const { data: unit1 } = await adminClient
			.from('units')
			.insert({
				property_id: property1Id,
				unit_number: '101',
				bedrooms: 2,
				bathrooms: 1
			})
			.select('id')
			.single()
		unit1Id = unit1!.id

		const { data: unit2 } = await adminClient
			.from('units')
			.insert({
				property_id: property2Id,
				unit_number: '201',
				bedrooms: 2,
				bathrooms: 1
			})
			.select('id')
			.single()
		unit2Id = unit2!.id

		// Create leases
		const { data: lease1 } = await adminClient
			.from('leases')
			.insert({
				property_owner_id: owner1Id,
				unit_id: unit1Id,
				primary_tenant_id: tenant1Id,
				start_date: '2024-01-01',
				end_date: '2024-12-31',
				rent_amount: 250000, // $2500
				rent_currency: 'USD',
				security_deposit: 250000,
				lease_status: 'active',
				payment_day: 1
			})
			.select('id')
			.single()
		lease1Id = lease1!.id

		const { data: lease2 } = await adminClient
			.from('leases')
			.insert({
				property_owner_id: owner2Id,
				unit_id: unit2Id,
				primary_tenant_id: tenant2Id,
				start_date: '2024-01-01',
				end_date: '2024-12-31',
				rent_amount: 300000, // $3000
				rent_currency: 'USD',
				security_deposit: 300000,
				lease_status: 'active',
				payment_day: 1
			})
			.select('id')
			.single()
		lease2Id = lease2!.id

		// Create lease_tenants associations
		await adminClient.from('lease_tenants').insert([
			{
				lease_id: lease1Id,
				tenant_id: tenant1Id,
				is_primary: true
			},
			{
				lease_id: lease2Id,
				tenant_id: tenant2Id,
				is_primary: true
			}
		])
	})

	afterEach(async () => {
		// Cleanup test data
		const adminClient = supabase.getAdminClient()

		await adminClient.from('lease_tenants').delete().in('lease_id', [lease1Id, lease2Id])
		await adminClient.from('leases').delete().in('id', [lease1Id, lease2Id])
		await adminClient.from('units').delete().in('id', [unit1Id, unit2Id])
		await adminClient.from('properties').delete().in('id', [property1Id, property2Id])
		await adminClient.from('tenants').delete().in('id', [tenant1Id, tenant2Id])
		await adminClient.from('property_owners').delete().in('id', [owner1Id, owner2Id])
	})

	describe('leases_select policy', () => {
		it('should allow property owners to read their own leases', async () => {
			const client = supabase.getUserClient(OWNER_1_TOKEN)

			const { data, error } = await client
				.from('leases')
				.select('id, property_owner_id')
				.eq('id', lease1Id)
				.single()

			expect(error).toBeNull()
			expect(data).toBeDefined()
			expect(data?.id).toBe(lease1Id)
			expect(data?.property_owner_id).toBe(owner1Id)
		})

		it('should deny property owners from reading other owners leases', async () => {
			const client = supabase.getUserClient(OWNER_1_TOKEN)

			const { data, error } = await client
				.from('leases')
				.select('id')
				.eq('id', lease2Id)
				.single()

			// Should return no rows (not an error, just empty result)
			expect(data).toBeNull()
		})

		it('should allow tenants to read their assigned leases via lease_tenants', async () => {
			const client = supabase.getUserClient(TENANT_1_TOKEN)

			const { data, error } = await client
				.from('leases')
				.select('id, primary_tenant_id')
				.eq('id', lease1Id)
				.single()

			expect(error).toBeNull()
			expect(data).toBeDefined()
			expect(data?.id).toBe(lease1Id)
			expect(data?.primary_tenant_id).toBe(tenant1Id)
		})

		it('should deny tenants from reading unassigned leases', async () => {
			const client = supabase.getUserClient(TENANT_1_TOKEN)

			const { data, error } = await client
				.from('leases')
				.select('id')
				.eq('id', lease2Id)
				.single()

			expect(data).toBeNull()
		})

		it('should deny unrelated users from reading any leases', async () => {
			const client = supabase.getUserClient(UNRELATED_USER_TOKEN)

			const { data, error } = await client.from('leases').select('id')

			expect(data).toBeDefined()
			expect(data?.length).toBe(0)
		})

		it('should complete queries without infinite recursion (performance check)', async () => {
			const client = supabase.getUserClient(OWNER_1_TOKEN)
			const startTime = Date.now()

			const { data, error } = await client.from('leases').select('id, property_owner_id')

			const duration = Date.now() - startTime

			expect(error).toBeNull()
			expect(data).toBeDefined()
			// Query should complete in under 1 second (generous limit to account for test DB)
			expect(duration).toBeLessThan(1000)
		})
	})

	describe('lease_tenants_select policy', () => {
		it('should allow tenants to read their own lease_tenants records', async () => {
			const client = supabase.getUserClient(TENANT_1_TOKEN)

			const { data, error } = await client
				.from('lease_tenants')
				.select('lease_id, tenant_id')
				.eq('lease_id', lease1Id)
				.eq('tenant_id', tenant1Id)
				.single()

			expect(error).toBeNull()
			expect(data).toBeDefined()
			expect(data?.lease_id).toBe(lease1Id)
			expect(data?.tenant_id).toBe(tenant1Id)
		})

		it('should allow owners to read lease_tenants for their leases', async () => {
			const client = supabase.getUserClient(OWNER_1_TOKEN)

			const { data, error } = await client
				.from('lease_tenants')
				.select('lease_id, tenant_id')
				.eq('lease_id', lease1Id)
				.single()

			expect(error).toBeNull()
			expect(data).toBeDefined()
			expect(data?.lease_id).toBe(lease1Id)
		})

		it('should deny owners from reading lease_tenants for other owners leases', async () => {
			const client = supabase.getUserClient(OWNER_1_TOKEN)

			const { data, error } = await client
				.from('lease_tenants')
				.select('lease_id')
				.eq('lease_id', lease2Id)
				.single()

			expect(data).toBeNull()
		})

		it('should deny tenants from reading other tenants lease_tenants records', async () => {
			const client = supabase.getUserClient(TENANT_1_TOKEN)

			const { data, error } = await client
				.from('lease_tenants')
				.select('lease_id')
				.eq('lease_id', lease2Id)
				.single()

			expect(data).toBeNull()
		})

		it('should complete queries without infinite recursion (performance check)', async () => {
			const client = supabase.getUserClient(OWNER_1_TOKEN)
			const startTime = Date.now()

			const { data, error } = await client.from('lease_tenants').select('lease_id, tenant_id')

			const duration = Date.now() - startTime

			expect(error).toBeNull()
			expect(data).toBeDefined()
			expect(duration).toBeLessThan(1000)
		})
	})

	describe('Cross-table query integration', () => {
		it('should allow joined queries without recursion', async () => {
			const client = supabase.getUserClient(OWNER_1_TOKEN)
			const startTime = Date.now()

			const { data, error } = await client
				.from('leases')
				.select(
					`
          id,
          property_owner_id,
          lease_tenants (
            tenant_id,
            is_primary
          )
        `
				)
				.eq('id', lease1Id)
				.single()

			const duration = Date.now() - startTime

			expect(error).toBeNull()
			expect(data).toBeDefined()
			expect(data?.lease_tenants).toBeDefined()
			expect(Array.isArray(data?.lease_tenants)).toBe(true)
			expect(duration).toBeLessThan(1000)
		})
	})
})
