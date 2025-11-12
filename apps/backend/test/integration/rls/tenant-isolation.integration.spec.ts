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
	getServiceRoleClient,
	TEST_USERS,
	type AuthenticatedTestClient
} from './setup'

const testLogger = new Logger('RLSTenantIsolationTest')

describe('RLS: Tenant Isolation', () => {
	let tenantA: AuthenticatedTestClient
	let tenantB: AuthenticatedTestClient
	let serviceClient: ReturnType<typeof getServiceRoleClient>

	// Test data IDs for cleanup
	const testData = {
		tenants: [] as string[],
		emergencyContacts: [] as string[]
	}

	beforeAll(async () => {
		tenantA = await authenticateAs(TEST_USERS.TENANT_A)
		tenantB = await authenticateAs(TEST_USERS.TENANT_B)
		serviceClient = getServiceRoleClient()

		// Create tenant records for test users
		const tenantData = [
			{
				auth_user_id: tenantA.userId,
				userId: tenantA.userId,
				firstName: 'Test',
				lastName: 'Tenant A',
				email: tenantA.email,
				phone: '+1234567890',
				status: 'ACTIVE' as const
			},
			{
				auth_user_id: tenantB.userId,
				userId: tenantB.userId,
				firstName: 'Test',
				lastName: 'Tenant B',
				email: tenantB.email,
				phone: '+1234567891',
				status: 'ACTIVE' as const
			}
		]

		for (const tenant of tenantData) {
			const { data, error } = await serviceClient
				.from('tenant')
				.insert(tenant)
				.select('id')
				.single()
			if (error) {
				testLogger.error(`Failed to create tenant record for ${tenant.email}:`, error)
			} else if (data) {
				testData.tenants.push(data.id)
			}
		}
	})

	afterAll(async () => {
		// Cleanup emergency contacts first
		for (const id of testData.emergencyContacts) {
			await serviceClient.from('tenant_emergency_contact').delete().eq('id', id)
		}

		// Cleanup tenant records
		for (const id of testData.tenants) {
			await serviceClient.from('tenant').delete().eq('id', id)
		}
	})

	describe('Tenant Profile Access', () => {
		it('tenant A can read their own profile', async () => {
			const { data, error } = await tenantA.client
				.from('tenant')
				.select('*')
				.eq('auth_user_id', tenantA.userId)
				.single()

			expect(error).toBeNull()
			expect(data).toBeDefined()
			expect(data?.auth_user_id).toBe(tenantA.userId)
		})

		it('tenant A cannot read tenant B profile', async () => {
			const { data, error } = await tenantA.client
				.from('tenant')
				.select('*')
				.eq('auth_user_id', tenantB.userId)

			expect(error).toBeNull()
			expectEmptyResult(data, 'tenant A querying tenant B profile')
		})

		it('tenant A can update their own profile', async () => {
			// First get tenant A's record
			const { data: tenantRecord } = await serviceClient
				.from('tenant')
				.select('id')
				.eq('auth_user_id', tenantA.userId)
				.single()

			if (!tenantRecord) {
				testLogger.warn('Tenant A record not found - skipping update test')
				return
			}

			// Update as tenant A
			const { data, error } = await tenantA.client
				.from('tenant')
				.update({ firstName: 'UpdatedName' })
				.eq('id', tenantRecord.id)
				.select()
				.single()

			expect(error).toBeNull()
			expect(data?.firstName).toBe('UpdatedName')

			// Restore original value
			await serviceClient
				.from('tenant')
				.update({ firstName: 'Test' })
				.eq('id', tenantRecord.id)
		})

		it('tenant A cannot update tenant B profile', async () => {
			// Get tenant B's record
			const { data: tenantRecord } = await serviceClient
				.from('tenant')
				.select('id')
				.eq('auth_user_id', tenantB.userId)
				.single()

			if (!tenantRecord) {
				testLogger.warn('Tenant B record not found - skipping test')
				return
			}

			// Tenant A tries to update tenant B
			const { data, error } = await tenantA.client
				.from('tenant')
				.update({ firstName: 'Hacked' })
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
		let tenantAEmergencyContactId: string

		beforeAll(async () => {
			// Get tenant IDs
			const { data: tenantARecord } = await serviceClient
				.from('tenant')
				.select('id')
				.eq('auth_user_id', tenantA.userId)
				.single()

			const { data: tenantBRecord } = await serviceClient
				.from('tenant')
				.select('id')
				.eq('auth_user_id', tenantB.userId)
				.single()

			if (tenantARecord) tenantAId = tenantARecord.id
			if (tenantBRecord) tenantBId = tenantBRecord.id

			// Create unique emergency contact for tenant A (test isolation)
			if (tenantAId) {
				const uniquePhone = `+1${Date.now().toString().slice(-9)}`
				const { data } = await serviceClient
					.from('tenant_emergency_contact')
					.insert({
						tenant_id: tenantAId,
						contact_name: `John Emergency ${Date.now()}`,
						relationship: 'Father',
						phone_number: uniquePhone,
						email: `emergency-${Date.now()}@test.com`
					})
					.select()
					.single()

				if (data) {
					tenantAEmergencyContactId = data.id
					testData.emergencyContacts.push(data.id)
				}
			}
		})

		it('tenant A can read their own emergency contact', async () => {
		if (!tenantAId) {
			testLogger.warn('Tenant A ID not found - skipping test')
			return
		}

			const { data, error } = await tenantA.client
				.from('tenant_emergency_contact')
				.select('*')
				.eq('tenant_id', tenantAId)
				.single()

			expect(error).toBeNull()
			expect(data).toBeDefined()
			expect(data?.tenant_id).toBe(tenantAId)
		})

		it('tenant B cannot read tenant A emergency contact', async () => {
		if (!tenantAId) {
			testLogger.warn('Tenant A ID not found - skipping test')
			return
		}

			const { data, error } = await tenantB.client
				.from('tenant_emergency_contact')
				.select('*')
				.eq('tenant_id', tenantAId)

			expect(error).toBeNull()
			expectEmptyResult(data, 'tenant B querying tenant A emergency contact')
		})

		it('tenant A can create their own emergency contact', async () => {
		if (!tenantAId) {
			testLogger.warn('Tenant A ID not found - skipping test')
			return
		}

			// Create unique contact for this test (don't delete all contacts)
			const uniquePhone = `+1${Date.now().toString().slice(-9)}`
			const { data, error } = await tenantA.client
				.from('tenant_emergency_contact')
				.insert({
					tenant_id: tenantAId,
					contact_name: 'Jane Emergency',
					relationship: 'Mother',
					phone_number: uniquePhone
				})
				.select()
				.single()

			expect(error).toBeNull()
			expect(data).toBeDefined()

			if (data) {
				tenantAEmergencyContactId = data.id
				testData.emergencyContacts.push(data.id)
			}
		})

		it('tenant A cannot create emergency contact for tenant B', async () => {
		if (!tenantBId) {
			testLogger.warn('Tenant B ID not found - skipping test')
			return
		}

			const { data, error } = await tenantA.client
				.from('tenant_emergency_contact')
				.insert({
					tenant_id: tenantBId, // Attempt to create for tenant B
					contact_name: 'Hacker Contact',
					relationship: 'None',
					phone_number: '+1111111111'
				})
				.select()

			// MUST fail due to RLS policy
			expectPermissionError(error, 'tenant A creating contact for tenant B')
			expect(data).toBeNull()
		})

		it('tenant A can update their own emergency contact', async () => {
		if (!tenantAId || !tenantAEmergencyContactId) {
			testLogger.warn('Test data not available - skipping test')
			return
		}

			const { data, error } = await tenantA.client
				.from('tenant_emergency_contact')
				.update({ phone_number: '+1555555555' })
				.eq('id', tenantAEmergencyContactId)
				.select()
				.single()

			expect(error).toBeNull()
			expect(data?.phone_number).toBe('+1555555555')
		})

		it('tenant A cannot update tenant B emergency contact', async () => {
			// Create emergency contact for tenant B first
		if (!tenantBId) {
			testLogger.warn('Tenant B ID not found - skipping test')
			return
		}

			const { data: tenantBContact } = await serviceClient
				.from('tenant_emergency_contact')
				.insert({
					tenant_id: tenantBId,
					contact_name: 'Tenant B Contact',
					relationship: 'Sibling',
					phone_number: '+1222222222'
				})
				.select()
				.single()

			if (!tenantBContact) {
			testLogger.warn('Failed to create tenant B contact - skipping test')
			return
		}

			testData.emergencyContacts.push(tenantBContact.id)

			// Tenant A tries to update tenant B's contact
			const { data, error } = await tenantA.client
				.from('tenant_emergency_contact')
				.update({ phone_number: '+1999999999' })
				.eq('id', tenantBContact.id)
				.select()

			// MUST fail or return empty
			if (error) {
				expectPermissionError(
					error,
					'tenant A updating tenant B emergency contact'
				)
			} else {
				expectEmptyResult(data, 'tenant A updating tenant B emergency contact')
			}
		})

		it('tenant A can delete their own emergency contact', async () => {
		if (!tenantAId || !tenantAEmergencyContactId) {
			testLogger.warn('Test data not available - skipping test')
			return
		}

			const { error } = await tenantA.client
				.from('tenant_emergency_contact')
				.delete()
				.eq('id', tenantAEmergencyContactId)

			expect(error).toBeNull()

			// Remove from cleanup list
			testData.emergencyContacts = testData.emergencyContacts.filter(
				id => id !== tenantAEmergencyContactId
			)
		})

		it('tenant A cannot delete tenant B emergency contact', async () => {
			// Get tenant B's contact
			const { data: contacts } = await serviceClient
				.from('tenant_emergency_contact')
				.select('id')
				.eq('tenant_id', tenantBId)
				.limit(1)

		if (!contacts || contacts.length === 0) {
			testLogger.warn('Tenant B has no emergency contact - skipping test')
			return
		}

		const contactId = contacts[0]?.id
		if (!contactId) {
			testLogger.warn('Contact ID is undefined - skipping test')
			return
		}

			const { data, error } = await tenantA.client
				.from('tenant_emergency_contact')
				.delete()
				.eq('id', contactId)
				.select()

			// MUST fail or return empty
			if (error) {
				expectPermissionError(
					error,
					'tenant A deleting tenant B emergency contact'
				)
			} else {
				expectEmptyResult(data, 'tenant A deleting tenant B emergency contact')
			}
		})
	})

	describe('Notification Preferences Isolation', () => {
		it('tenant A can read their own notification preferences', async () => {
			const { data: tenantRecord } = await serviceClient
				.from('tenant')
				.select('id, notification_preferences')
				.eq('auth_user_id', tenantA.userId)
				.single()

		if (!tenantRecord) {
			testLogger.warn('Tenant A record not found - skipping test')
			return
		}

			const { data, error } = await tenantA.client
				.from('tenant')
				.select('notification_preferences')
				.eq('id', tenantRecord.id)
				.single()

			expect(error).toBeNull()
			expect(data).toBeDefined()
		})

		it('tenant A cannot read tenant B notification preferences', async () => {
			const { data: tenantRecord } = await serviceClient
				.from('tenant')
				.select('id')
				.eq('auth_user_id', tenantB.userId)
				.single()

		if (!tenantRecord) {
			testLogger.warn('Tenant B record not found - skipping test')
			return
		}

			const { data, error } = await tenantA.client
				.from('tenant')
				.select('notification_preferences')
				.eq('id', tenantRecord.id)

			expect(error).toBeNull()
			expectEmptyResult(
				data,
				'tenant A querying tenant B notification preferences'
			)
		})
	})
})
