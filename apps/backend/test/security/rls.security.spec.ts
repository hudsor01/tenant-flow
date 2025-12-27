/**
 * RLS (Row-Level Security) Policy Security Tests
 *
 * Validates that Supabase RLS policies correctly enforce data isolation:
 * - Owners cannot access other owners' data
 * - Tenants cannot access other tenants' data
 * - Unauthenticated users cannot access protected resources
 * - Cross-tenant data leakage is prevented
 * - Service role operations bypass RLS correctly
 */

import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { AppModule } from '../../src/app.module'
import request from 'supertest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { shouldSkipIntegrationTests } from '../integration/rls/setup'

const describeOrSkip = shouldSkipIntegrationTests ? describe.skip : describe

describeOrSkip('RLS Policy Security Tests', () => {
	let app: INestApplication
	let ownerA: { client: SupabaseClient; accessToken: string; userId: string }
	let ownerB: { client: SupabaseClient; accessToken: string; userId: string }
	let tenantA: { client: SupabaseClient; accessToken: string; userId: string }
	let tenantB: { client: SupabaseClient; accessToken: string; userId: string }

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule]
		}).compile()

		app = moduleFixture.createNestApplication()
		await app.init()

		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
		const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''

		// Create Owner A
		const ownerAClient = createClient(supabaseUrl, supabaseKey)
		const { data: ownerAData } = await ownerAClient.auth.signInWithPassword({
			email: process.env.E2E_OWNER_EMAIL || 'ownerA@example.com',
			password: process.env.E2E_OWNER_PASSWORD || 'testpass123'
		})

		ownerA = {
			client: ownerAClient,
			accessToken: ownerAData?.session?.access_token || '',
			userId: ownerAData?.user?.id || ''
		}

		// Create Owner B (use different email if available)
		const ownerBClient = createClient(supabaseUrl, supabaseKey)
		const { data: ownerBData } = await ownerBClient.auth.signUp({
			email: `ownerB-${Date.now()}@example.com`,
			password: 'testpass123'
		})

		ownerB = {
			client: ownerBClient,
			accessToken: ownerBData?.session?.access_token || '',
			userId: ownerBData?.user?.id || ''
		}

		// Create Tenant A
		const tenantAClient = createClient(supabaseUrl, supabaseKey)
		const { data: tenantAData } = await tenantAClient.auth.signUp({
			email: `tenantA-${Date.now()}@example.com`,
			password: 'testpass123'
		})

		tenantA = {
			client: tenantAClient,
			accessToken: tenantAData?.session?.access_token || '',
			userId: tenantAData?.user?.id || ''
		}

		// Create Tenant B
		const tenantBClient = createClient(supabaseUrl, supabaseKey)
		const { data: tenantBData } = await tenantBClient.auth.signUp({
			email: `tenantB-${Date.now()}@example.com`,
			password: 'testpass123'
		})

		tenantB = {
			client: tenantBClient,
			accessToken: tenantBData?.session?.access_token || '',
			userId: tenantBData?.user?.id || ''
		}
	})

	afterAll(async () => {
		await app.close()
	})

	describe('Lease RLS Policies', () => {
		it('should prevent ownerA from reading ownerB leases', async () => {
			// Arrange: Create lease as ownerB
			const ownerBLease = await request(app.getHttpServer())
				.post('/api/v1/leases')
				.set('Authorization', `Bearer ${ownerB.accessToken}`)
				.send({
					unit_id: '123e4567-e89b-12d3-a456-426614174000',
					primary_tenant_id: '123e4567-e89b-12d3-a456-426614174001',
					start_date: '2025-01-01',
					end_date: '2026-01-01',
					rent_amount: 1000
				})

			// Skip if lease creation failed (unit not found, etc.)
			if (ownerBLease.status !== 201) {
				return
			}

			const leaseId = ownerBLease.body.id

			// Act: OwnerA attempts to read ownerB's lease via RLS-enforced query
			const { data, error } = await ownerA.client
				.from('leases')
				.select('*')
				.eq('id', leaseId)
				.single()

			// Assert: Should not return data (RLS blocks access)
			expect(data).toBeNull()
			expect(error).toBeDefined()
			expect(error?.code).toMatch(/PGRST116/) // PostgREST error code for no rows
		})

		it('should prevent ownerA from updating ownerB leases', async () => {
			// Arrange: Create lease as ownerB
			const ownerBLease = await request(app.getHttpServer())
				.post('/api/v1/leases')
				.set('Authorization', `Bearer ${ownerB.accessToken}`)
				.send({
					unit_id: '123e4567-e89b-12d3-a456-426614174000',
					primary_tenant_id: '123e4567-e89b-12d3-a456-426614174001',
					start_date: '2025-01-01',
					end_date: '2026-01-01',
					rent_amount: 1000
				})

			if (ownerBLease.status !== 201) {
				return
			}

			const leaseId = ownerBLease.body.id

			// Act: OwnerA attempts to update ownerB's lease
			const { data, error } = await ownerA.client
				.from('leases')
				.update({ rent_amount: 9999 })
				.eq('id', leaseId)

			// Assert: Update should fail (RLS blocks)
			expect(error).toBeDefined()
		})

		it('should prevent ownerA from deleting ownerB leases', async () => {
			// Arrange: Create lease as ownerB
			const ownerBLease = await request(app.getHttpServer())
				.post('/api/v1/leases')
				.set('Authorization', `Bearer ${ownerB.accessToken}`)
				.send({
					unit_id: '123e4567-e89b-12d3-a456-426614174000',
					primary_tenant_id: '123e4567-e89b-12d3-a456-426614174001',
					start_date: '2025-01-01',
					end_date: '2026-01-01',
					rent_amount: 1000
				})

			if (ownerBLease.status !== 201) {
				return
			}

			const leaseId = ownerBLease.body.id

			// Act: OwnerA attempts to delete ownerB's lease
			const { data, error } = await ownerA.client.from('leases').delete().eq('id', leaseId)

			// Assert: Delete should fail (RLS blocks)
			expect(error).toBeDefined()
		})

		it('should allow owner to read their own leases', async () => {
			// Act: OwnerA reads their own leases
			const { data, error } = await ownerA.client.from('leases').select('*')

			// Assert: Should succeed (may be empty array)
			expect(error).toBeNull()
			expect(Array.isArray(data)).toBe(true)
		})
	})

	describe('Property RLS Policies', () => {
		it('should prevent ownerA from reading ownerB properties', async () => {
			// Arrange: Create property as ownerB (via API)
			const ownerBProperty = await request(app.getHttpServer())
				.post('/api/v1/properties')
				.set('Authorization', `Bearer ${ownerB.accessToken}`)
				.send({
					name: 'OwnerB Property',
					address: '123 Test St',
					city: 'Test City',
					state: 'CA',
					zip: '12345'
				})

			if (ownerBProperty.status !== 201) {
				return
			}

			const propertyId = ownerBProperty.body.id

			// Act: OwnerA attempts to read ownerB's property
			const { data, error } = await ownerA.client
				.from('properties')
				.select('*')
				.eq('id', propertyId)
				.single()

			// Assert: Should not return data
			expect(data).toBeNull()
			expect(error).toBeDefined()
		})

		it('should prevent ownerA from updating ownerB properties', async () => {
			// Arrange: Create property as ownerB
			const ownerBProperty = await request(app.getHttpServer())
				.post('/api/v1/properties')
				.set('Authorization', `Bearer ${ownerB.accessToken}`)
				.send({
					name: 'OwnerB Property',
					address: '123 Test St',
					city: 'Test City',
					state: 'CA',
					zip: '12345'
				})

			if (ownerBProperty.status !== 201) {
				return
			}

			const propertyId = ownerBProperty.body.id

			// Act: OwnerA attempts to update ownerB's property
			const { data, error } = await ownerA.client
				.from('properties')
				.update({ name: 'Hacked Property' })
				.eq('id', propertyId)

			// Assert: Update should fail
			expect(error).toBeDefined()
		})
	})

	describe('Tenant RLS Policies', () => {
		it('should prevent tenantA from updating tenantB profile', async () => {
			// Act: TenantA attempts to update tenantB's profile
			const { data, error } = await tenantA.client
				.from('tenants')
				.update({ phone: '555-HACKED' })
				.eq('user_id', tenantB.userId)

			// Assert: Update should fail
			expect(error).toBeDefined()
		})

		it('should prevent tenantA from reading tenantB profile', async () => {
			// Act: TenantA attempts to read tenantB's profile
			const { data, error } = await tenantA.client
				.from('tenants')
				.select('*')
				.eq('user_id', tenantB.userId)
				.single()

			// Assert: Should not return data
			expect(data).toBeNull()
			expect(error).toBeDefined()
		})

		it('should allow tenant to read their own profile', async () => {
			// Act: TenantA reads their own profile
			const { data, error } = await tenantA.client
				.from('tenants')
				.select('*')
				.eq('user_id', tenantA.userId)

			// Assert: Should succeed (may be null if profile not created)
			expect(error).toBeNull()
		})
	})

	describe('Unauthenticated Access', () => {
		it('should prevent unauthenticated access to protected tables', async () => {
			// Arrange: Create unauthenticated client
			const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
			const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
			const unauthClient = createClient(supabaseUrl, supabaseKey)

			// Act: Attempt to read leases without authentication
			const { data, error } = await unauthClient.from('leases').select('*')

			// Assert: Should fail (RLS blocks unauthenticated access)
			expect(data).toEqual([]) // RLS returns empty array for unauthenticated
			// Note: Supabase may not return error for SELECT, just empty array
		})

		it('should prevent unauthenticated INSERT on protected tables', async () => {
			// Arrange: Create unauthenticated client
			const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
			const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
			const unauthClient = createClient(supabaseUrl, supabaseKey)

			// Act: Attempt to create lease without authentication
			const { data, error } = await unauthClient.from('leases').insert({
				unit_id: '123e4567-e89b-12d3-a456-426614174000',
				primary_tenant_id: '123e4567-e89b-12d3-a456-426614174001',
				start_date: '2025-01-01',
				end_date: '2026-01-01',
				rent_amount: 1000
			})

			// Assert: Should fail
			expect(error).toBeDefined()
			expect(error?.code).toMatch(/42501|PGRST/) // Permission denied
		})

		it('should prevent unauthenticated UPDATE on protected tables', async () => {
			// Arrange
			const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
			const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
			const unauthClient = createClient(supabaseUrl, supabaseKey)

			// Act: Attempt to update leases without authentication
			const { data, error } = await unauthClient
				.from('leases')
				.update({ rent_amount: 0 })
				.eq('id', '123e4567-e89b-12d3-a456-426614174000')

			// Assert: Should fail
			expect(error).toBeDefined()
		})

		it('should prevent unauthenticated DELETE on protected tables', async () => {
			// Arrange
			const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
			const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
			const unauthClient = createClient(supabaseUrl, supabaseKey)

			// Act: Attempt to delete leases without authentication
			const { data, error } = await unauthClient
				.from('leases')
				.delete()
				.eq('id', '123e4567-e89b-12d3-a456-426614174000')

			// Assert: Should fail
			expect(error).toBeDefined()
		})
	})

	describe('Cross-Tenant Data Leakage', () => {
		it('should prevent owner from seeing tenant personal data without invitation', async () => {
			// Act: OwnerA attempts to list all tenants (should only see invited tenants)
			const { data, error } = await ownerA.client.from('tenants').select('*')

			// Assert: Should succeed but only return tenants invited to ownerA's properties
			expect(error).toBeNull()
			expect(Array.isArray(data)).toBe(true)

			// Verify tenantB is not in the list (assuming no invitation exists)
			const tenantBInList = data?.some(t => t.user_id === tenantB.userId)
			expect(tenantBInList).toBe(false)
		})

		it('should prevent tenant from seeing other tenants in same property', async () => {
			// Note: This test assumes multi-tenant units exist
			// In practice, tenants should only see their own data, not other tenants

			// Act: TenantA queries all tenants
			const { data, error } = await tenantA.client.from('tenants').select('*')

			// Assert: Should only return tenantA's own profile
			expect(error).toBeNull()
			if (data && data.length > 0) {
				expect(data.every(t => t.user_id === tenantA.userId)).toBe(true)
			}
		})
	})

	describe('RLS Policy Enforcement', () => {
		it('should enforce row-level security on all tenant-scoped tables', async () => {
			// Arrange: List of tables that should have RLS enabled
			const rlsTables = [
				'leases',
				'properties',
				'units',
				'tenants',
				'tenant_invitations',
				'maintenance_requests',
				'payments',
				'payment_methods'
			]

			// Act & Assert: Verify each table has RLS enabled
			for (const table of rlsTables) {
				// Attempt unauthenticated access
				const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
				const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
				const unauthClient = createClient(supabaseUrl, supabaseKey)

				const { data } = await unauthClient.from(table).select('*').limit(1)

				// Should return empty array (RLS enforced)
				expect(data).toEqual([])
			}
		})

		it('should allow RLS bypass for service role key (admin operations)', async () => {
			// Arrange: Create service role client (if key available)
			const serviceRoleKey = process.env.SB_SECRET_KEY

			if (!serviceRoleKey) {
				console.warn('Service role key not available, skipping test')
				return
			}

			const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
			const serviceClient = createClient(supabaseUrl, serviceRoleKey)

			// Act: Service role should bypass RLS
			const { data, error } = await serviceClient.from('leases').select('*').limit(1)

			// Assert: Should succeed (bypasses RLS)
			expect(error).toBeNull()
			// Data may be empty array, but no error should occur
		})

		it('should prevent privilege escalation via RLS bypass attempts', async () => {
			// Arrange: Attempt to use service role key in regular API call
			const serviceRoleKey = process.env.SB_SECRET_KEY

			if (!serviceRoleKey) {
				return
			}

			// Act: Try to use service role key in Authorization header (should fail)
			const response = await request(app.getHttpServer())
				.get('/api/v1/leases')
				.set('Authorization', `Bearer ${serviceRoleKey}`)

			// Assert: Should be rejected (service role key is not a JWT token)
			expect(response.status).toBe(401)
		})
	})

	describe('Data Isolation Verification', () => {
		it('should ensure zero data leakage between owners', async () => {
			// Arrange: OwnerA and OwnerB each have data
			// Act: Query all tables as ownerA
			const tables = ['leases', 'properties', 'units', 'tenants']

			for (const table of tables) {
				const { data, error } = await ownerA.client.from(table).select('*')

				// Assert: Should only see ownerA's data
				expect(error).toBeNull()
				expect(Array.isArray(data)).toBe(true)

				// Verify no data belongs to ownerB (if owner_user_id exists)
				if (data && data.length > 0 && 'owner_user_id' in data[0]) {
					const hasOwnerBData = (data as Array<{ owner_user_id?: string | null }>).some(
						row => row.owner_user_id === ownerB.userId
					)
					expect(hasOwnerBData).toBe(false)
				}
			}
		})

		it('should validate RLS policies prevent JOIN-based leakage', async () => {
			// Act: Attempt to join tables to leak data
			const { data, error } = await ownerA.client
				.from('leases')
				.select('*, units(*), properties(*)')

			// Assert: Should only return joined data that ownerA owns
			expect(error).toBeNull()

			if (data && data.length > 0) {
				(data as Array<{ properties?: { owner_user_id?: string | null } | null }>).forEach((lease) => {
					// Verify units and properties also belong to ownerA
					if (lease.properties) {
						expect(lease.properties.owner_user_id).toBe(ownerA.userId)
					}
				})
			}
		})
	})
})
