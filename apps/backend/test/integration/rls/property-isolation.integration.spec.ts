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
import { Logger } from '@nestjs/common'
import {
	authenticateAs,
	expectEmptyResult,
	expectPermissionError,
	isTestUserAvailable,
	TEST_USERS,
	type AuthenticatedTestClient
} from './setup'
import type { Database } from '@repo/shared/types/supabase'

type PropertyRow = Database['public']['Tables']['properties']['Row']
type UnitRow = Database['public']['Tables']['units']['Row']

const testLogger = new Logger('RLSPropertyIsolationTest')

describe('RLS: Property Isolation', () => {
	let ownerA: AuthenticatedTestClient
	let ownerB: AuthenticatedTestClient | null = null
	let tenantA: AuthenticatedTestClient | null = null
	// After Stripe decoupling: owner_user_id references auth.users.id directly (not stripe_connected_accounts.id)
	let ownerAPropertyOwnerId: string | null = null
	let ownerBPropertyOwnerId: string | null = null

	// Test data IDs for cleanup
	const testData = {
		properties: [] as string[],
		units: [] as string[]
	}

	beforeAll(async () => {
		ownerA = await authenticateAs(TEST_USERS.OWNER_A)
		// Use auth user ID directly - owner_user_id now references users.id
		ownerAPropertyOwnerId = ownerA.user_id

		// Optional users - skip tests that need them if not configured
		if (isTestUserAvailable('OWNER_B')) {
			try {
				ownerB = await authenticateAs(TEST_USERS.OWNER_B)
				ownerBPropertyOwnerId = ownerB.user_id
			} catch (error) {
				testLogger.warn(
					`[SKIP] Failed to authenticate OWNER_B: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			}
		}
		if (isTestUserAvailable('TENANT_A')) {
			try {
				tenantA = await authenticateAs(TEST_USERS.TENANT_A)
			} catch (error) {
				testLogger.warn(
					`[SKIP] Failed to authenticate TENANT_A: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			}
		}
	})

	afterAll(async () => {
		if (!ownerA) return
		// Cleanup using owner's authenticated client
		for (const id of testData.units) {
			await ownerA.client.from('units').delete().eq('id', id)
		}
		for (const id of testData.properties) {
			await ownerA.client.from('properties').delete().eq('id', id)
		}
	})

	describe('Property Ownership Access', () => {
		let ownerAproperty_id: string
		let ownerBproperty_id: string

		beforeAll(async () => {
			if (!ownerAPropertyOwnerId) {
				testLogger.warn(
					'Owner A has no stripe_connected_accounts record - some tests will be skipped'
				)
				return
			}
			// Get owner A's first property
			const { data: propertyA } = await ownerA.client
				.from('properties')
				.select('id')
				.eq('owner_user_id', ownerAPropertyOwnerId)
				.limit(1)
				.single()

			if (propertyA) ownerAproperty_id = propertyA.id

			// Get owner B's first property (only if ownerB is available)
			if (ownerB && ownerBPropertyOwnerId) {
				const { data: propertyB } = await ownerB.client
					.from('properties')
					.select('id')
					.eq('owner_user_id', ownerBPropertyOwnerId)
					.limit(1)
					.single()

				if (propertyB) ownerBproperty_id = propertyB.id
			}
		})

		it('owner A can read their own properties', async () => {
			if (!ownerAPropertyOwnerId) {
				testLogger.warn(
					'Owner A has no stripe_connected_accounts record - skipping test'
				)
				return
			}
			const { data, error } = await ownerA.client
				.from('properties')
				.select('*')
				.eq('owner_user_id', ownerAPropertyOwnerId)

			expect(error).toBeNull()
			expect(data).toBeDefined()
			expect(Array.isArray(data)).toBe(true)

			// All returned properties must belong to owner A
			if (data && data.length > 0) {
				for (const property of data) {
					expect(property.owner_user_id).toBe(ownerAPropertyOwnerId)
				}
			}
		})

		it('owner A cannot read owner B properties', async () => {
			if (!ownerB || !ownerBproperty_id) {
				testLogger.warn(
					'owner B not available or has no properties - skipping test'
				)
				return
			}

			const { data, error } = await ownerA.client
				.from('properties')
				.select('*')
				.eq('id', ownerBproperty_id)

			expect(error).toBeNull()
			expectEmptyResult(data, 'owner A querying owner B property')
		})

		it('owner A can update their own property', async () => {
			if (!ownerAproperty_id) {
				testLogger.warn('owner A has no properties - skipping test')
				return
			}

			const { data, error } = await ownerA.client
				.from('properties')
				.update({ name: `Updated Property ${Date.now()}` })
				.eq('id', ownerAproperty_id)
				.select()
				.single()

			expect(error).toBeNull()
			expect(data).toBeDefined()
		})

		it('owner A cannot update owner B property', async () => {
			if (!ownerB || !ownerBproperty_id) {
				testLogger.warn(
					'owner B not available or has no properties - skipping test'
				)
				return
			}

			const { data, error } = await ownerA.client
				.from('properties')
				.update({ name: 'Hacked Property' })
				.eq('id', ownerBproperty_id)
				.select()

			// MUST fail or return empty
			if (error) {
				expectPermissionError(error, 'owner A updating owner B property')
			} else {
				expectEmptyResult(data, 'owner A updating owner B property')
			}
		})

		it('tenant cannot read property management data', async () => {
			if (!tenantA) {
				testLogger.warn('tenant A not available - skipping test')
				return
			}
			if (!ownerAproperty_id) {
				testLogger.warn('owner A has no properties - skipping test')
				return
			}

			const { data, error } = await tenantA.client
				.from('properties')
				.select('*')
				.eq('id', ownerAproperty_id)

			expect(error).toBeNull()
			expectEmptyResult(data, 'tenant querying property management data')
		})

		it('tenant cannot list all properties', async () => {
			if (!tenantA) {
				testLogger.warn('tenant A not available - skipping test')
				return
			}

			const { data, error } = await tenantA.client
				.from('properties')
				.select('*')

			expect(error).toBeNull()
			expectEmptyResult(data, 'tenant listing all properties')
		})
	})

	describe('Property Creation', () => {
		it('owner A can create property', async () => {
			if (!ownerAPropertyOwnerId) {
				testLogger.warn(
					'Owner A has no stripe_connected_accounts record - skipping test'
				)
				return
			}
			const newProperty: Database['public']['Tables']['properties']['Insert'] =
				{
					name: `TEST Property ${Date.now()}`,
					property_type: 'SINGLE_FAMILY',
					address_line1: '123 Test St',
					city: 'Test City',
					state: 'TS',
					postal_code: '12345',
					owner_user_id: ownerAPropertyOwnerId
				}

			const { data, error } = await ownerA.client
				.from('properties')
				.insert(newProperty)
				.select()
				.single<PropertyRow>()

			expect(error).toBeNull()
			expect(data).toBeDefined()
			expect(data?.owner_user_id).toBe(ownerAPropertyOwnerId)

			if (data) {
				testData.properties.push(data.id)
			}
		})

		it('owner A cannot create property for owner B', async () => {
			if (!ownerB || !ownerBPropertyOwnerId) {
				testLogger.warn(
					'owner B not available or has no stripe_connected_accounts record - skipping test'
				)
				return
			}

			const maliciousProperty: Database['public']['Tables']['properties']['Insert'] =
				{
					name: 'Spoofed Property',
					property_type: 'APARTMENT',
					owner_user_id: ownerBPropertyOwnerId, // Attempt to spoof owner
					address_line1: '123 Fake St',
					city: 'Fake City',
					state: 'CA',
					postal_code: '12345'
				}

			const { data, error } = await ownerA.client
				.from('properties')
				.insert(maliciousProperty)
				.select()

			// MUST fail due to RLS policy check (owner_user_id = get_current_owner_user_id())
			expectPermissionError(error, 'owner A creating property for owner B')
			expect(data).toBeNull()
		})

		it('tenant cannot create property', async () => {
			if (!tenantA) {
				testLogger.warn('tenant A not available - skipping test')
				return
			}

			// Tenant doesn't have a stripe_connected_accounts record, so use any dummy ID
			const property: Database['public']['Tables']['properties']['Insert'] = {
				name: 'Tenant Spoofed Property',
				property_type: 'CONDO',
				owner_user_id: tenantA.user_id, // Will fail - tenants can't create properties
				address_line1: '456 Fake Ave',
				city: 'Fake City',
				state: 'CA',
				postal_code: '12345'
			}

			const { data, error } = await tenantA.client
				.from('properties')
				.insert(property)
				.select()

			// MUST fail - tenants have no INSERT policy
			expectPermissionError(error, 'tenant creating property')
			expect(data).toBeNull()
		})
	})

	describe('Unit Isolation', () => {
		let ownerAproperty_id: string
		let ownerAunit_id: string
		let ownerBproperty_id: string
		let ownerBunit_id: string

		beforeAll(async () => {
			if (!ownerAPropertyOwnerId) {
				testLogger.warn(
					'Owner A has no stripe_connected_accounts record - Unit Isolation tests will be skipped'
				)
				return
			}
			// Get owner A's property and unit
			const { data: propertyA } = await ownerA.client
				.from('properties')
				.select('id')
				.eq('owner_user_id', ownerAPropertyOwnerId)
				.limit(1)
				.single()

			if (propertyA) {
				ownerAproperty_id = propertyA.id

				const { data: unitA } = await ownerA.client
					.from('units')
					.select('id')
					.eq('property_id', propertyA.id)
					.limit(1)
					.single()

				if (unitA) ownerAunit_id = unitA.id
			}

			// Get owner B's property and unit (only if ownerB is available)
			if (ownerB && ownerBPropertyOwnerId) {
				const { data: propertyB } = await ownerB.client
					.from('properties')
					.select('id')
					.eq('owner_user_id', ownerBPropertyOwnerId)
					.limit(1)
					.single()

				if (propertyB) {
					ownerBproperty_id = propertyB.id

					const { data: unitB } = await ownerB.client
						.from('units')
						.select('id')
						.eq('property_id', propertyB.id)
						.limit(1)
						.single()

					if (unitB) ownerBunit_id = unitB.id
				}
			}
		})

		it('owner A can read units in their own property', async () => {
			if (!ownerAproperty_id) {
				testLogger.warn('owner A has no properties - skipping test')
				return
			}

			const { data, error } = await ownerA.client
				.from('units')
				.select('*')
				.eq('property_id', ownerAproperty_id)

			expect(error).toBeNull()
			expect(data).toBeDefined()
		})

		it('owner A cannot read units in owner B property', async () => {
			if (!ownerB || !ownerBproperty_id) {
				testLogger.warn(
					'owner B not available or has no properties - skipping test'
				)
				return
			}

			const { data, error } = await ownerA.client
				.from('units')
				.select('*')
				.eq('property_id', ownerBproperty_id)

			expect(error).toBeNull()
			expectEmptyResult(data, 'owner A querying units in owner B property')
		})

		it('owner A can create unit in their own property', async () => {
			if (!ownerAproperty_id || !ownerAPropertyOwnerId) {
				testLogger.warn(
					'owner A has no properties or stripe_connected_accounts record - skipping test'
				)
				return
			}

			const newUnit: Database['public']['Tables']['units']['Insert'] = {
				property_id: ownerAproperty_id,
				owner_user_id: ownerAPropertyOwnerId,
				unit_number: `TEST-${Date.now()}`,
				bedrooms: 2,
				bathrooms: 1,
				rent_amount: 1500,
				status: 'available'
			}

			const { data, error } = await ownerA.client
				.from('units')
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
			if (!ownerB || !ownerBproperty_id) {
				testLogger.warn(
					'owner B not available or has no properties - skipping test'
				)
				return
			}

			const maliciousUnit: Database['public']['Tables']['units']['Insert'] = {
				property_id: ownerBproperty_id, // Attempt to create unit in another owner's property
				unit_number: 'HACKED-UNIT',
				bedrooms: 1,
				bathrooms: 1,
				rent_amount: 1200,
				status: 'vacant'
			}

			const { data, error } = await ownerA.client
				.from('units')
				.insert(maliciousUnit)
				.select()

			// MUST fail due to RLS policy (property_id must belong to auth.uid())
			expectPermissionError(error, 'owner A creating unit in owner B property')
			expect(data).toBeNull()
		})

		it('owner A can update unit in their own property', async () => {
			if (!ownerAunit_id) {
				testLogger.warn('owner A has no units - skipping test')
				return
			}

			const { data, error } = await ownerA.client
				.from('units')
				.update({ bedrooms: 3 })
				.eq('id', ownerAunit_id)
				.select()
				.single()

			expect(error).toBeNull()
			expect(data).toBeDefined()
			expect(data?.bedrooms).toBe(3)
		})

		it('owner A cannot update unit in owner B property', async () => {
			if (!ownerB || !ownerBunit_id) {
				testLogger.warn('owner B not available or has no units - skipping test')
				return
			}

			const { data, error } = await ownerA.client
				.from('units')
				.update({ bedrooms: 99 })
				.eq('id', ownerBunit_id)
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
		let testproperty_id: string

		beforeAll(async () => {
			if (!ownerAPropertyOwnerId) {
				testLogger.warn(
					'Owner A has no stripe_connected_accounts record - Property Status Transitions tests will be skipped'
				)
				return
			}
			// Create a test property for status transition tests
			const { data } = await ownerA.client
				.from('properties')
				.insert({
					name: 'Test Property',
					property_type: 'SINGLE_FAMILY',
					owner_user_id: ownerAPropertyOwnerId,
					address_line1: '123 Test St',
					city: 'Test City',
					state: 'CA',
					postal_code: '12345'
				})
				.select()
				.single()

			if (data) {
				testproperty_id = data.id
				testData.properties.push(data.id)
			}
		})

		it('owner A can mark their property as sold', async () => {
			if (!testproperty_id) {
				testLogger.warn('Test property not created - skipping test')
				return
			}

			const { data, error } = await ownerA.client
				.from('properties')
				.update({
					status: 'sold',
					date_sold: new Date().toISOString(),
					sale_price: 500000
				})
				.eq('id', testproperty_id)
				.select()
				.single()

			expect(error).toBeNull()
			expect(data?.status).toBe('sold')
		})

		it('owner B cannot mark owner A property as sold', async () => {
			if (!ownerB) {
				testLogger.warn('owner B not available - skipping test')
				return
			}
			if (!testproperty_id) {
				testLogger.warn('Test property not created - skipping test')
				return
			}

			const { data, error } = await ownerB.client
				.from('properties')
				.update({ status: 'sold' })
				.eq('id', testproperty_id)
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
			if (!ownerAPropertyOwnerId) {
				testLogger.warn(
					'Owner A has no stripe_connected_accounts record - skipping test'
				)
				return
			}
			const { data, error } = await ownerA.client
				.from('properties')
				.select(
					'id, name, address_line1, city, state, postal_code, property_type'
				)
				.eq('owner_user_id', ownerAPropertyOwnerId)
				.limit(1)

			expect(error).toBeNull()
			expect(data).toBeDefined()
		})

		it('tenant cannot access property owner information', async () => {
			if (!tenantA) {
				testLogger.warn('tenant A not available - skipping test')
				return
			}

			const { data, error } = await tenantA.client
				.from('properties')
				.select('owner_user_id, created_at, updated_at')

			expect(error).toBeNull()
			expectEmptyResult(data, 'tenant accessing property ownership data')
		})
	})
})
