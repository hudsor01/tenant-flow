/**
 * Backend RLS Integration Tests: Property Isolation
 *
 * Tests that property table and related RLS policies correctly enforce data isolation:
 * - owners can only see/manage their own properties
 * - owners cannot access other owners' properties
 * - Tenants cannot view property management data
 * - Unit isolation follows property ownership
 *
 * @group integration
 * @group rls
 * @group security
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import {
	authenticateAs,
	expectEmptyResult,
	expectPermissionError,
	getServiceRoleClient,
	TEST_USERS,
	type AuthenticatedTestClient
} from './setup'
import type { Database } from '@repo/shared/types/supabase-generated'

type PropertyRow = Database['public']['Tables']['property']['Row']
type UnitRow = Database['public']['Tables']['unit']['Row']

describe('RLS: Property Isolation', () => {
	let ownerA: AuthenticatedTestClient
	let ownerB: AuthenticatedTestClient
	let tenantA: AuthenticatedTestClient
	let serviceClient: ReturnType<typeof getServiceRoleClient>

	// Test data IDs for cleanup
	const testData = {
		properties: [] as string[],
		units: [] as string[]
	}

	beforeAll(async () => {
		ownerA = await authenticateAs(TEST_USERS.owner_A)
		ownerB = await authenticateAs(TEST_USERS.owner_B)
		tenantA = await authenticateAs(TEST_USERS.TENANT_A)
		serviceClient = getServiceRoleClient()
	})

	afterAll(async () => {
		// Cleanup in correct order: units first (foreign key), then properties
		for (const id of testData.units) {
			await serviceClient.from('unit').delete().eq('id', id)
		}
		for (const id of testData.properties) {
			await serviceClient.from('property').delete().eq('id', id)
		}
	})

	describe('Property Ownership Access', () => {
		let ownerAPropertyId: string
		let ownerBPropertyId: string

		beforeAll(async () => {
			// Get owner A's first property
			const { data: propertyA } = await serviceClient
				.from('property')
				.select('id')
				.eq('ownerId', ownerA.userId)
				.limit(1)
				.single()

			// Get owner B's first property
			const { data: propertyB } = await serviceClient
				.from('property')
				.select('id')
				.eq('ownerId', ownerB.userId)
				.limit(1)
				.single()

			if (propertyA) ownerAPropertyId = propertyA.id
			if (propertyB) ownerBPropertyId = propertyB.id
		})

		it('owner A can read their own properties', async () => {
			const { data, error } = await ownerA.client
				.from('property')
				.select('*')
				.eq('ownerId', ownerA.userId)

			expect(error).toBeNull()
			expect(data).toBeDefined()
			expect(Array.isArray(data)).toBe(true)

			// All returned properties must belong to owner A
			if (data && data.length > 0) {
				for (const property of data) {
					expect(property.ownerId).toBe(ownerA.userId)
				}
			}
		})

		it('owner A cannot read owner B properties', async () => {
			if (!ownerBPropertyId) {
				console.warn('owner B has no properties - skipping test')
				return
			}

			const { data, error } = await ownerA.client
				.from('property')
				.select('*')
				.eq('id', ownerBPropertyId)

			expect(error).toBeNull()
			expectEmptyResult(data, 'owner A querying owner B property')
		})

		it('owner A can update their own property', async () => {
			if (!ownerAPropertyId) {
				console.warn('owner A has no properties - skipping test')
				return
			}

			const { data, error } = await ownerA.client
				.from('property')
				.update({ name: `Updated Property ${Date.now()}` })
				.eq('id', ownerAPropertyId)
				.select()
				.single()

			expect(error).toBeNull()
			expect(data).toBeDefined()
		})

		it('owner A cannot update owner B property', async () => {
			if (!ownerBPropertyId) {
				console.warn('owner B has no properties - skipping test')
				return
			}

			const { data, error } = await ownerA.client
				.from('property')
				.update({ name: 'Hacked Property' })
				.eq('id', ownerBPropertyId)
				.select()

			// MUST fail or return empty
			if (error) {
				expectPermissionError(error, 'owner A updating owner B property')
			} else {
				expectEmptyResult(data, 'owner A updating owner B property')
			}
		})

		it('tenant cannot read property management data', async () => {
			if (!ownerAPropertyId) {
				console.warn('owner A has no properties - skipping test')
				return
			}

			const { data, error } = await tenantA.client
				.from('property')
				.select('*')
				.eq('id', ownerAPropertyId)

			expect(error).toBeNull()
			expectEmptyResult(data, 'tenant querying property management data')
		})

		it('tenant cannot list all properties', async () => {
			const { data, error } = await tenantA.client.from('property').select('*')

			expect(error).toBeNull()
			expectEmptyResult(data, 'tenant listing all properties')
		})
	})

	describe('Property Creation', () => {
		it('owner A can create property', async () => {
			const newProperty: Database['public']['Tables']['property']['Insert'] = {
				name: `TEST Property ${Date.now()}`,
				propertyType: 'SINGLE_FAMILY',
				address: '123 Test St',
				city: 'Test City',
				state: 'TS',
				zipCode: '12345',
				ownerId: ownerA.userId
			}

			const { data, error } = await ownerA.client
				.from('property')
				.insert(newProperty)
				.select()
				.single<PropertyRow>()

			expect(error).toBeNull()
			expect(data).toBeDefined()
			expect(data?.ownerId).toBe(ownerA.userId)

			if (data) {
				testData.properties.push(data.id)
			}
		})

		it('owner A cannot create property for owner B', async () => {
			const maliciousProperty: Database['public']['Tables']['property']['Insert'] =
				{
					name: 'Spoofed Property',
					propertyType: 'APARTMENT',
					ownerId: ownerB.userId, // Attempt to spoof owner
					address: '123 Fake St',
					city: 'Fake City',
					state: 'CA',
					zipCode: '12345'
				}

			const { data, error } = await ownerA.client
				.from('property')
				.insert(maliciousProperty)
				.select()

			// MUST fail due to RLS policy check (ownerId = auth.uid())
			expectPermissionError(error, 'owner A creating property for owner B')
			expect(data).toBeNull()
		})

		it('tenant cannot create property', async () => {
			const property: Database['public']['Tables']['property']['Insert'] = {
				name: 'Tenant Spoofed Property',
				propertyType: 'CONDO',
				ownerId: tenantA.userId,
				address: '456 Fake Ave',
				city: 'Fake City',
				state: 'CA',
				zipCode: '12345'
			}

			const { data, error } = await tenantA.client
				.from('property')
				.insert(property)
				.select()

			// MUST fail - tenants have no INSERT policy
			expectPermissionError(error, 'tenant creating property')
			expect(data).toBeNull()
		})
	})

	describe('Unit Isolation', () => {
		let ownerAPropertyId: string
		let ownerAUnitId: string
		let ownerBPropertyId: string
		let ownerBUnitId: string

		beforeAll(async () => {
			// Get owner A's property and unit
			const { data: propertyA } = await serviceClient
				.from('property')
				.select('id')
				.eq('ownerId', ownerA.userId)
				.limit(1)
				.single()

			if (propertyA) {
				ownerAPropertyId = propertyA.id

				const { data: unitA } = await serviceClient
					.from('unit')
					.select('id')
					.eq('propertyId', propertyA.id)
					.limit(1)
					.single()

				if (unitA) ownerAUnitId = unitA.id
			}

			// Get owner B's property and unit
			const { data: propertyB } = await serviceClient
				.from('property')
				.select('id')
				.eq('ownerId', ownerB.userId)
				.limit(1)
				.single()

			if (propertyB) {
				ownerBPropertyId = propertyB.id

				const { data: unitB } = await serviceClient
					.from('unit')
					.select('id')
					.eq('propertyId', propertyB.id)
					.limit(1)
					.single()

				if (unitB) ownerBUnitId = unitB.id
			}
		})

		it('owner A can read units in their own property', async () => {
			if (!ownerAPropertyId) {
				console.warn('owner A has no properties - skipping test')
				return
			}

			const { data, error } = await ownerA.client
				.from('unit')
				.select('*')
				.eq('propertyId', ownerAPropertyId)

			expect(error).toBeNull()
			expect(data).toBeDefined()
		})

		it('owner A cannot read units in owner B property', async () => {
			if (!ownerBPropertyId) {
				console.warn('owner B has no properties - skipping test')
				return
			}

			const { data, error } = await ownerA.client
				.from('unit')
				.select('*')
				.eq('propertyId', ownerBPropertyId)

			expect(error).toBeNull()
			expectEmptyResult(data, 'owner A querying units in owner B property')
		})

		it('owner A can create unit in their own property', async () => {
			if (!ownerAPropertyId) {
				console.warn('owner A has no properties - skipping test')
				return
			}

			const newUnit: Database['public']['Tables']['unit']['Insert'] = {
				propertyId: ownerAPropertyId,
				unitNumber: `TEST-${Date.now()}`,
				bedrooms: 2,
				bathrooms: 1,
				rent: 1500,
				status: 'VACANT'
			}

			const { data, error } = await ownerA.client
				.from('unit')
				.insert(newUnit)
				.select()
				.single<UnitRow>()

			expect(error).toBeNull()
			expect(data).toBeDefined()

			if (data) {
				testData.units.push(data.id)
			}
		})

		it('owner A cannot create unit in owner B property', async () => {
			if (!ownerBPropertyId) {
				console.warn('owner B has no properties - skipping test')
				return
			}

			const maliciousUnit: Database['public']['Tables']['unit']['Insert'] = {
				propertyId: ownerBPropertyId, // Attempt to create unit in another owner's property
				unitNumber: 'HACKED-UNIT',
				bedrooms: 1,
				bathrooms: 1,
				rent: 1200,
				status: 'VACANT'
			}

			const { data, error } = await ownerA.client
				.from('unit')
				.insert(maliciousUnit)
				.select()

			// MUST fail due to RLS policy (propertyId must belong to auth.uid())
			expectPermissionError(error, 'owner A creating unit in owner B property')
			expect(data).toBeNull()
		})

		it('owner A can update unit in their own property', async () => {
			if (!ownerAUnitId) {
				console.warn('owner A has no units - skipping test')
				return
			}

			const { data, error } = await ownerA.client
				.from('unit')
				.update({ bedrooms: 3 })
				.eq('id', ownerAUnitId)
				.select()
				.single()

			expect(error).toBeNull()
			expect(data).toBeDefined()
			expect(data?.bedrooms).toBe(3)
		})

		it('owner A cannot update unit in owner B property', async () => {
			if (!ownerBUnitId) {
				console.warn('owner B has no units - skipping test')
				return
			}

			const { data, error } = await ownerA.client
				.from('unit')
				.update({ bedrooms: 99 })
				.eq('id', ownerBUnitId)
				.select()

			// MUST fail or return empty
			if (error) {
				expectPermissionError(
					error,
					'owner A updating unit in owner B property'
				)
			} else {
				expectEmptyResult(data, 'owner A updating unit in owner B property')
			}
		})
	})

	describe('Property Status Transitions', () => {
		let testPropertyId: string

		beforeAll(async () => {
			// Create a test property for status transition tests
			const { data } = await serviceClient
				.from('property')
				.insert({
					name: 'Test Property',
					propertyType: 'SINGLE_FAMILY',
					ownerId: ownerA.userId,
					address: '123 Test St',
					city: 'Test City',
					state: 'CA',
					zipCode: '12345'
				})
				.select()
				.single()

			if (data) {
				testPropertyId = data.id
				testData.properties.push(data.id)
			}
		})

		it('owner A can mark their property as sold', async () => {
			if (!testPropertyId) {
				console.warn('Test property not created - skipping test')
				return
			}

			const { data, error } = await ownerA.client
				.from('property')
				.update({
					status: 'SOLD',
					date_sold: new Date().toISOString(),
					sale_price: 500000
				})
				.eq('id', testPropertyId)
				.select()
				.single()

			expect(error).toBeNull()
			expect(data?.status).toBe('SOLD')
		})

		it('owner B cannot mark owner A property as sold', async () => {
			if (!testPropertyId) {
				console.warn('Test property not created - skipping test')
				return
			}

			const { data, error } = await ownerB.client
				.from('property')
				.update({ status: 'SOLD' })
				.eq('id', testPropertyId)
				.select()

			// MUST fail or return empty
			if (error) {
				expectPermissionError(error, 'owner B updating owner A property status')
			} else {
				expectEmptyResult(data, 'owner B updating owner A property status')
			}
		})
	})

	describe('Property Metadata Access', () => {
		it('owner A can read property metadata (address, features)', async () => {
			const { data, error } = await ownerA.client
				.from('property')
				.select(
					'id, name, address, city, state, zipCode, propertyType, description'
				)
				.eq('ownerId', ownerA.userId)
				.limit(1)

			expect(error).toBeNull()
			expect(data).toBeDefined()
		})

		it('tenant cannot access property owner information', async () => {
			const { data, error } = await tenantA.client
				.from('property')
				.select('ownerId, createdAt, updatedAt')

			expect(error).toBeNull()
			expectEmptyResult(data, 'tenant accessing property ownership data')
		})
	})
})
