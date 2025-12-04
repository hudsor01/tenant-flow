/**
 * Backend RLS Integration Tests: Tenant Isolation
 *
 * Tests that tenant table and related RLS policies correctly enforce data isolation:
 * - Tenants can only see/update their own profile
 * - Tenants cannot access other tenants' data
 * - owners can view their managed tenants
 * - Emergency contacts are properly isolated
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

const testLogger = new Logger('RLSTenantIsolationTest')

describe('RLS: Tenant Isolation', () => {
	let tenantA: AuthenticatedTestClient | null = null
	let tenantB: AuthenticatedTestClient | null = null

	// Test data IDs for cleanup
	const testData = {
		tenants: [] as string[],
		emergency_contacts: [] as string[]
	}

	beforeAll(async () => {
		// These tests require tenant users - skip if not available
		if (!isTestUserAvailable('TENANT_A')) {
			testLogger.warn('[SKIP] Tenant isolation tests require TENANT_A credentials')
			return
		}
		try {
			tenantA = await authenticateAs(TEST_USERS.TENANT_A)
		} catch (error) {
			testLogger.warn(`[SKIP] Failed to authenticate TENANT_A: ${error instanceof Error ? error.message : 'Unknown error'}`)
			return
		}
		if (isTestUserAvailable('TENANT_B')) {
			try {
				tenantB = await authenticateAs(TEST_USERS.TENANT_B)
			} catch (error) {
				testLogger.warn(`[SKIP] Failed to authenticate TENANT_B: ${error instanceof Error ? error.message : 'Unknown error'}`)
			}
		}

		// Create tenant record for tenantA (tenantA is guaranteed non-null here after try/catch)
		if (!tenantA) return

		const { data: tenantAData, error: tenantAError } = await tenantA.client
			.from('tenants')
			.insert({
				user_id: tenantA.user_id,
				stripe_customer_id: `cus_${tenantA.user_id}_a`
			})
			.select('id')
			.single()

		if (tenantAError && !tenantAError.message.includes('duplicate key')) {
			testLogger.error(`Failed to create tenant record for tenantA:`, tenantAError)
		} else if (tenantAData) {
			testData.tenants.push(tenantAData.id)
		}

		// Create tenant record for tenantB if available
		if (tenantB) {
			const { data: tenantBData, error: tenantBError } = await tenantB.client
				.from('tenants')
				.insert({
					user_id: tenantB.user_id,
					stripe_customer_id: `cus_${tenantB.user_id}_b`
				})
				.select('id')
				.single()

			if (tenantBError && !tenantBError.message.includes('duplicate key')) {
				testLogger.error(`Failed to create tenant record for tenantB:`, tenantBError)
			} else if (tenantBData) {
				testData.tenants.push(tenantBData.id)
			}
		}
	})

	afterAll(async () => {
		// Cleanup tenant records
		if (!tenantA) return
		for (const id of testData.tenants) {
			await tenantA.client.from('tenants').delete().eq('id', id)
		}
	})

	describe('Tenant Profile Access', () => {
		it('tenant A can read their own profile', async () => {
			if (!tenantA) {
				testLogger.warn('[SKIP] TenantA not available')
				return
			}
			const { data, error } = await tenantA.client
				.from('tenants')
				.select('*')
				.eq('user_id', tenantA.user_id)
				.single()

			expect(error).toBeNull()
			expect(data).toBeDefined()
			expect(data?.user_id).toBe(tenantA.user_id)
		})

		it('tenant A cannot read tenant B profile', async () => {
			if (!tenantA) {
				testLogger.warn('[SKIP] TenantA not available')
				return
			}
			if (!tenantB) {
				testLogger.warn('[SKIP] Tenant B not available')
				return
			}
			const { data, error } = await tenantA.client
				.from('tenants')
				.select('*')
				.eq('user_id', tenantB.user_id)

			expect(error).toBeNull()
			expectEmptyResult(data, 'tenant A querying tenant B profile')
		})

		it('tenant A can update their own profile', async () => {
			if (!tenantA) {
				testLogger.warn('[SKIP] TenantA not available')
				return
			}
			// First get tenant A's record
			const { data: tenantRecord } = await tenantA.client
				.from('tenants')
				.select('id')
				.eq('user_id', tenantA.user_id)
				.single()

			if (!tenantRecord) {
				testLogger.warn('Tenant A record not found - skipping update test')
				return
			}

			// Update as tenant A
			const { data, error } = await tenantA.client
				.from('tenants')
				.update({ emergency_contact_name: 'Updated Emergency Contact' })
				.eq('id', tenantRecord.id)
				.select()
				.single()

			expect(error).toBeNull()
			expect(data?.emergency_contact_name).toBe('Updated Emergency Contact')

			// Restore original value
			await tenantA.client
				.from('tenants')
				.update({ emergency_contact_name: null })
				.eq('id', tenantRecord.id)
		})

		it('tenant A cannot update tenant B profile', async () => {
			if (!tenantA) {
				testLogger.warn('[SKIP] TenantA not available')
				return
			}
			if (!tenantB) {
				testLogger.warn('[SKIP] Tenant B not available')
				return
			}
			// Get tenant B's record
			const { data: tenantRecord } = await tenantA.client
				.from('tenants')
				.select('id')
				.eq('user_id', tenantB.user_id)
				.single()

			if (!tenantRecord) {
				testLogger.warn('Tenant B record not found - skipping test')
				return
			}

			// Tenant A tries to update tenant B
			const { data, error } = await tenantA.client
				.from('tenants')
				.update({ emergency_contact_name: 'Hacked Emergency Contact' })
				.eq('id', tenantRecord.id)
				.select()

			// MUST fail or return empty
			if (error) {
				expectPermissionError(error, 'tenant A updating tenant B')
			} else {
				expectEmptyResult(data, 'tenant A updating tenant B')
			}
		})
	})

	describe('Emergency Contact Isolation', () => {
		let tenantAId: string
		let tenantBId: string

		beforeAll(async () => {
			if (!tenantA) {
				testLogger.warn('[SKIP] TenantA not available for Emergency Contact tests')
				return
			}
			// Get tenant IDs
			const { data: tenantARecord } = await tenantA.client
				.from('tenants')
				.select('id')
				.eq('user_id', tenantA.user_id)
				.single()

			if (tenantARecord) tenantAId = tenantARecord.id

			// Get tenant B ID only if tenantB is available
			if (tenantB) {
				const { data: tenantBRecord } = await tenantA.client
					.from('tenants')
					.select('id')
					.eq('user_id', tenantB.user_id)
					.single()

				if (tenantBRecord) tenantBId = tenantBRecord.id
			}

			// Set up initial emergency contact data for tenant A
			if (tenantAId) {
				await tenantA.client
					.from('tenants')
					.update({
						emergency_contact_name: `John Emergency ${Date.now()}`,
						emergency_contact_phone: `+1${Date.now().toString().slice(-10)}`,
						emergency_contact_relationship: 'Father'
					})
					.eq('id', tenantAId)
			}
		})

		it('tenant A can read their own emergency contact', async () => {
			if (!tenantA) {
				testLogger.warn('[SKIP] TenantA not available')
				return
			}
			if (!tenantAId) {
				testLogger.warn('Tenant A ID not found - skipping test')
				return
			}

			const { data, error } = await tenantA.client
				.from('tenants')
				.select('emergency_contact_name, emergency_contact_phone, emergency_contact_relationship')
				.eq('id', tenantAId)
				.single()

			expect(error).toBeNull()
			expect(data).toBeDefined()
			expect(data?.emergency_contact_name).toContain('John Emergency')
			expect(data?.emergency_contact_relationship).toBe('Father')
		})

		it('tenant B cannot read tenant A emergency contact', async () => {
			if (!tenantB) {
				testLogger.warn('[SKIP] Tenant B not available')
				return
			}
			if (!tenantAId) {
				testLogger.warn('Tenant A ID not found - skipping test')
				return
			}

			const { data, error } = await tenantB.client
				.from('tenants')
				.select('emergency_contact_name, emergency_contact_phone, emergency_contact_relationship')
				.eq('id', tenantAId)

			expect(error).toBeNull()
			expectEmptyResult(data, 'tenant B querying tenant A emergency contact')
		})

		it('tenant A can update their own emergency contact', async () => {
			if (!tenantA) {
				testLogger.warn('[SKIP] TenantA not available')
				return
			}
			if (!tenantAId) {
				testLogger.warn('Tenant A ID not found - skipping test')
				return
			}

			const { data, error } = await tenantA.client
				.from('tenants')
				.update({
					emergency_contact_name: 'Jane Emergency',
					emergency_contact_phone: '+15555',
					emergency_contact_relationship: 'Mother'
				})
				.eq('id', tenantAId)
				.select()
				.single()

			expect(error).toBeNull()
			expect(data?.emergency_contact_name).toBe('Jane Emergency')
			expect(data?.emergency_contact_phone).toBe('+15555') // As provided in update
			expect(data?.emergency_contact_relationship).toBe('Mother')
		})

		it('tenant A cannot update tenant B emergency contact', async () => {
			if (!tenantA) {
				testLogger.warn('[SKIP] TenantA not available')
				return
			}
			if (!tenantBId) {
				testLogger.warn('Tenant B ID not found - skipping test')
				return
			}

			// Tenant A tries to update tenant B's emergency contact
			const { data, error } = await tenantA.client
				.from('tenants')
				.update({
					emergency_contact_name: 'Hacker Contact',
					emergency_contact_phone: '+19999',
					emergency_contact_relationship: 'None'
				})
				.eq('id', tenantBId)
				.select()

			// MUST fail or return empty
			if (error) {
				expectPermissionError(error, 'tenant A updating tenant B emergency contact')
			} else {
				expectEmptyResult(data, 'tenant A updating tenant B emergency contact')
			}
		})

		it('tenant A cannot access tenant B emergency contact after update attempt', async () => {
			if (!tenantA) {
				testLogger.warn('[SKIP] TenantA not available')
				return
			}
			if (!tenantBId) {
				testLogger.warn('Tenant B ID not found - skipping test')
				return
			}

			// Verify tenant B's emergency contact is still secure
			const { data, error } = await tenantA.client
				.from('tenants')
				.select('emergency_contact_name, emergency_contact_phone, emergency_contact_relationship')
				.eq('id', tenantBId)

			expect(error).toBeNull()
			expectEmptyResult(data, 'tenant A accessing tenant B emergency contact after update attempt')
		})
	})

	describe('Tenant Data Isolation', () => {
		it('tenant A can read their own tenant data', async () => {
			if (!tenantA) {
				testLogger.warn('[SKIP] TenantA not available')
				return
			}
			const { data: tenantRecord } = await tenantA.client
				.from('tenants')
				.select('id')
				.eq('user_id', tenantA.user_id)
				.single()

			if (!tenantRecord) {
				testLogger.warn('Tenant A record not found - skipping test')
				return
			}

			const { data, error } = await tenantA.client
				.from('tenants')
				.select('*')
				.eq('id', tenantRecord.id)
				.single()

			expect(error).toBeNull()
			expect(data).toBeDefined()
		})

		it('tenant A cannot read tenant B data', async () => {
			if (!tenantA) {
				testLogger.warn('[SKIP] TenantA not available')
				return
			}
			if (!tenantB) {
				testLogger.warn('[SKIP] Tenant B not available')
				return
			}
			const { data: tenantRecord } = await tenantA.client
				.from('tenants')
				.select('id')
				.eq('user_id', tenantB.user_id)
				.single()

			if (!tenantRecord) {
				testLogger.warn('Tenant B record not found - skipping test')
				return
			}

			const { data, error } = await tenantA.client
				.from('tenants')
				.select('*')
				.eq('id', tenantRecord.id)

			expect(error).toBeNull()
			expectEmptyResult(
				data,
				'tenant A querying tenant B data'
			)
		})
	})
})
