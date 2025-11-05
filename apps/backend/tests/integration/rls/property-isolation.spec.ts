/**
 * Backend RLS Integration Tests: Property Isolation
 *
 * Tests that property table and related RLS policies correctly enforce data isolation:
 * - Landlords can only see/manage their own properties
 * - Landlords cannot access other landlords' properties
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
	cleanupTestData,
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
	let landlordA: AuthenticatedTestClient
	let landlordB: AuthenticatedTestClient
	let tenantA: AuthenticatedTestClient
	let serviceClient: ReturnType<typeof getServiceRoleClient>

	// Test data IDs for cleanup
	const testData = {
		properties: [] as string[],
		units: [] as string[]
	}

	beforeAll(async () => {
		landlordA = await authenticateAs(TEST_USERS.LANDLORD_A)
		landlordB = await authenticateAs(TEST_USERS.LANDLORD_B)
		tenantA = await authenticateAs(TEST_USERS.TENANT_A)
		serviceClient = getServiceRoleClient()
	})

	afterAll(async () => {
		// Cleanup units first (foreign key constraint)
		for (const id of testData.units) {
			await serviceClient.from('unit').delete().eq('id', id)
		}

		await cleanupTestData(serviceClient, testData)
	})

	describe('Property Ownership Access', () => {
		let landlordAPropertyId: string
		let landlordBPropertyId: string

		beforeAll(async () => {
			// Get landlord A's first property
			const { data: propertyA } = await serviceClient
				.from('property')
				.select('id')
				.eq('ownerId', landlordA.userId)
				.limit(1)
				.single()

			// Get landlord B's first property
			const { data: propertyB } = await serviceClient
				.from('property')
				.select('id')
				.eq('ownerId', landlordB.userId)
				.limit(1)
				.single()

			if (propertyA) landlordAPropertyId = propertyA.id
			if (propertyB) landlordBPropertyId = propertyB.id
		})

		it('landlord A can read their own properties', async () => {
			const { data, error } = await landlordA.client
				.from('property')
				.select('*')
				.eq('ownerId', landlordA.userId)

			expect(error).toBeNull()
			expect(data).toBeDefined()
			expect(Array.isArray(data)).toBe(true)

			// All returned properties must belong to landlord A
			if (data && data.length > 0) {
				for (const property of data) {
					expect(property.ownerId).toBe(landlordA.userId)
				}
			}
		})

		it('landlord A cannot read landlord B properties', async () => {
			if (!landlordBPropertyId) {
				console.warn('Landlord B has no properties - skipping test')
				return
			}

			const { data, error } = await landlordA.client
				.from('property')
				.select('*')
				.eq('id', landlordBPropertyId)

			expect(error).toBeNull()
			expectEmptyResult(data, 'landlord A querying landlord B property')
		})

		it('landlord A can update their own property', async () => {
			if (!landlordAPropertyId) {
				console.warn('Landlord A has no properties - skipping test')
				return
			}

			const { data, error } = await landlordA.client
				.from('property')
				.update({ name: `Updated Property ${Date.now()}` })
				.eq('id', landlordAPropertyId)
				.select()
				.single()

			expect(error).toBeNull()
			expect(data).toBeDefined()
		})

		it('landlord A cannot update landlord B property', async () => {
			if (!landlordBPropertyId) {
				console.warn('Landlord B has no properties - skipping test')
				return
			}

			const { data, error } = await landlordA.client
				.from('property')
				.update({ name: 'Hacked Property' })
				.eq('id', landlordBPropertyId)
				.select()

			// MUST fail or return empty
			if (error) {
				expectPermissionError(error, 'landlord A updating landlord B property')
			} else {
				expectEmptyResult(data, 'landlord A updating landlord B property')
			}
		})

		it('tenant cannot read property management data', async () => {
			if (!landlordAPropertyId) {
				console.warn('Landlord A has no properties - skipping test')
				return
			}

			const { data, error } = await tenantA.client
				.from('property')
				.select('*')
				.eq('id', landlordAPropertyId)

			expect(error).toBeNull()
			expectEmptyResult(data, 'tenant querying property management data')
		})

		it('tenant cannot list all properties', async () => {
			const { data, error } = await tenantA.client
				.from('property')
				.select('*')

			expect(error).toBeNull()
			expectEmptyResult(data, 'tenant listing all properties')
		})
	})

	describe('Property Creation', () => {
		it('landlord A can create property', async () => {
			const newProperty: Database['public']['Tables']['property']['Insert'] = {
				name: `TEST Property ${Date.now()}`,
				propertyType: 'SINGLE_FAMILY',
				address: '123 Test St',
				city: 'Test City',
				state: 'TS',
				zipCode: '12345',
				ownerId: landlordA.userId
			}

			const { data, error } = await landlordA.client
				.from('property')
				.insert(newProperty)
				.select()
				.single<PropertyRow>()

			expect(error).toBeNull()
			expect(data).toBeDefined()
			expect(data?.ownerId).toBe(landlordA.userId)

			if (data) {
				testData.properties.push(data.id)
			}
		})

		it('landlord A cannot create property for landlord B', async () => {
			const maliciousProperty: Database['public']['Tables']['property']['Insert'] =
				{
					name: 'Spoofed Property',
					propertyType: 'APARTMENT',
					ownerId: landlordB.userId // Attempt to spoof owner
				}

			const { data, error } = await landlordA.client
				.from('property')
				.insert(maliciousProperty)
				.select()

			// MUST fail due to RLS policy check (ownerId = auth.uid())
			expectPermissionError(
				error,
				'landlord A creating property for landlord B'
			)
			expect(data).toBeNull()
		})

		it('tenant cannot create property', async () => {
			const property: Database['public']['Tables']['property']['Insert'] = {
				name: 'Tenant Spoofed Property',
				propertyType: 'CONDO',
				ownerId: tenantA.userId
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
		let landlordAPropertyId: string
		let landlordAUnitId: string
		let landlordBPropertyId: string
		let landlordBUnitId: string

		beforeAll(async () => {
			// Get landlord A's property and unit
			const { data: propertyA } = await serviceClient
				.from('property')
				.select('id')
				.eq('ownerId', landlordA.userId)
				.limit(1)
				.single()

			if (propertyA) {
				landlordAPropertyId = propertyA.id

				const { data: unitA } = await serviceClient
					.from('unit')
					.select('id')
					.eq('propertyId', propertyA.id)
					.limit(1)
					.single()

				if (unitA) landlordAUnitId = unitA.id
			}

			// Get landlord B's property and unit
			const { data: propertyB } = await serviceClient
				.from('property')
				.select('id')
				.eq('ownerId', landlordB.userId)
				.limit(1)
				.single()

			if (propertyB) {
				landlordBPropertyId = propertyB.id

				const { data: unitB } = await serviceClient
					.from('unit')
					.select('id')
					.eq('propertyId', propertyB.id)
					.limit(1)
					.single()

				if (unitB) landlordBUnitId = unitB.id
			}
		})

		it('landlord A can read units in their own property', async () => {
			if (!landlordAPropertyId) {
				console.warn('Landlord A has no properties - skipping test')
				return
			}

			const { data, error } = await landlordA.client
				.from('unit')
				.select('*')
				.eq('propertyId', landlordAPropertyId)

			expect(error).toBeNull()
			expect(data).toBeDefined()
		})

		it('landlord A cannot read units in landlord B property', async () => {
			if (!landlordBPropertyId) {
				console.warn('Landlord B has no properties - skipping test')
				return
			}

			const { data, error } = await landlordA.client
				.from('unit')
				.select('*')
				.eq('propertyId', landlordBPropertyId)

			expect(error).toBeNull()
			expectEmptyResult(
				data,
				'landlord A querying units in landlord B property'
			)
		})

		it('landlord A can create unit in their own property', async () => {
			if (!landlordAPropertyId) {
				console.warn('Landlord A has no properties - skipping test')
				return
			}

			const newUnit: Database['public']['Tables']['unit']['Insert'] = {
				propertyId: landlordAPropertyId,
				unitNumber: `TEST-${Date.now()}`,
				bedrooms: 2,
				bathrooms: 1,
				status: 'AVAILABLE'
			}

			const { data, error } = await landlordA.client
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

		it('landlord A cannot create unit in landlord B property', async () => {
			if (!landlordBPropertyId) {
				console.warn('Landlord B has no properties - skipping test')
				return
			}

			const maliciousUnit: Database['public']['Tables']['unit']['Insert'] = {
				propertyId: landlordBPropertyId, // Attempt to create unit in another landlord's property
				unitNumber: 'HACKED-UNIT',
				bedrooms: 1,
				bathrooms: 1,
				status: 'AVAILABLE'
			}

			const { data, error } = await landlordA.client
				.from('unit')
				.insert(maliciousUnit)
				.select()

			// MUST fail due to RLS policy (propertyId must belong to auth.uid())
			expectPermissionError(
				error,
				'landlord A creating unit in landlord B property'
			)
			expect(data).toBeNull()
		})

		it('landlord A can update unit in their own property', async () => {
			if (!landlordAUnitId) {
				console.warn('Landlord A has no units - skipping test')
				return
			}

			const { data, error } = await landlordA.client
				.from('unit')
				.update({ bedrooms: 3 })
				.eq('id', landlordAUnitId)
				.select()
				.single()

			expect(error).toBeNull()
			expect(data).toBeDefined()
			expect(data?.bedrooms).toBe(3)
		})

		it('landlord A cannot update unit in landlord B property', async () => {
			if (!landlordBUnitId) {
				console.warn('Landlord B has no units - skipping test')
				return
			}

			const { data, error } = await landlordA.client
				.from('unit')
				.update({ bedrooms: 99 })
				.eq('id', landlordBUnitId)
				.select()

			// MUST fail or return empty
			if (error) {
				expectPermissionError(
					error,
					'landlord A updating unit in landlord B property'
				)
			} else {
				expectEmptyResult(
					data,
					'landlord A updating unit in landlord B property'
				)
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
					name: `Status Test Property ${Date.now()}`,
					propertyType: 'SINGLE_FAMILY',
					ownerId: landlordA.userId,
					status: 'ACTIVE'
				})
				.select()
				.single()

			if (data) {
				testPropertyId = data.id
				testData.properties.push(data.id)
			}
		})

		it('landlord A can mark their property as sold', async () => {
			if (!testPropertyId) {
				console.warn('Test property not created - skipping test')
				return
			}

			const { data, error } = await landlordA.client
				.from('property')
				.update({ status: 'SOLD' })
				.eq('id', testPropertyId)
				.select()
				.single()

			expect(error).toBeNull()
			expect(data?.status).toBe('SOLD')
		})

		it('landlord B cannot mark landlord A property as sold', async () => {
			if (!testPropertyId) {
				console.warn('Test property not created - skipping test')
				return
			}

			const { data, error } = await landlordB.client
				.from('property')
				.update({ status: 'SOLD' })
				.eq('id', testPropertyId)
				.select()

			// MUST fail or return empty
			if (error) {
				expectPermissionError(
					error,
					'landlord B updating landlord A property status'
				)
			} else {
				expectEmptyResult(
					data,
					'landlord B updating landlord A property status'
				)
			}
		})
	})

	describe('Property Metadata Access', () => {
		it('landlord A can read property metadata (address, features)', async () => {
			const { data, error } = await landlordA.client
				.from('property')
				.select('id, name, address, city, state, zipCode, yearBuilt, squareFootage')
				.eq('ownerId', landlordA.userId)
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
