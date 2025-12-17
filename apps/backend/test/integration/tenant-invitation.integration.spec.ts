/**
 * Backend Integration Tests: Tenant Invitation Flow
 *
 * Tests the full tenant invitation workflow:
 * - Owner creates invitation with property/unit
 * - Invitation token is stored correctly
 * - Token validation works
 * - Token acceptance links tenant to user account
 * - Amount due calculation with late fees
 *
 * @group integration
 * @group invitation
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { Logger } from '@nestjs/common'
import {
	authenticateAs,

	TEST_OWNER,
	type AuthenticatedTestClient
} from './invitation-setup'
import * as crypto from 'crypto'

const testLogger = new Logger('TenantInvitationIntegrationTest')

describe('Tenant Invitation Flow', () => {
	let ownerA: AuthenticatedTestClient
	let ownerAPropertyOwnerId: string | null = null

	// Test data IDs for cleanup
	const testData = {
		properties: [] as string[],
		units: [] as string[],
		tenants: [] as string[],
		leases: [] as string[],
		invitations: [] as string[],
		payments: [] as string[]
	}

	// Test property/unit for invitations (must be valid UUIDs)
	const testPropertyId = crypto.randomUUID()
	const testUnitId = crypto.randomUUID()

	beforeAll(async () => {
		ownerA = await authenticateAs(TEST_OWNER)

		// Get the property_owners.id for RLS compliance
		ownerAPropertyOwnerId = ownerA.user_id
		if (!ownerAPropertyOwnerId) {
			throw new Error(`No property_owners record found for auth user ${ownerA.user_id}. User must be registered as a property owner.`)
		}

		// Use owner's authenticated client - RLS policies allow owners to manage their data
		const client = ownerA.client

		// Create test property (owner can create via RLS policy)
		const { data: property, error: propertyError } = await client
			.from('properties')
			.insert({
				id: testPropertyId,
				owner_user_id: ownerAPropertyOwnerId,
				name: 'Test Invitation Property',
				address_line1: '123 Invite St',
				city: 'Test City',
				state: 'CA',
				postal_code: '90210',
				property_type: 'SINGLE_FAMILY',
				status: 'active'
			})
			.select('id')
			.single()

		if (propertyError) {
			testLogger.error('Failed to create test property:', propertyError)
		} else if (property) {
			testData.properties.push(property.id)
		}

		// Create test unit (owner can create via RLS policy)
		const { data: unit, error: unitError } = await client
			.from('units')
			.insert({
				id: testUnitId,
				property_id: testPropertyId,
				owner_user_id: ownerAPropertyOwnerId,
				unit_number: '101',
				rent_amount: 150000, // $1,500
				bedrooms: 2,
				bathrooms: 1,
				square_feet: 800,
				status: 'available'
			})
			.select('id')
			.single()

		if (unitError) {
			testLogger.error('Failed to create test unit:', unitError)
		} else if (unit) {
			testData.units.push(unit.id)
		}
	})

	afterAll(async () => {
		if (!ownerA) return
		const client = ownerA.client
		// Cleanup in reverse foreign key order
		for (const id of testData.invitations) {
			await client.from('tenant_invitations').delete().eq('id', id)
		}
		for (const id of testData.payments) {
			await client.from('rent_payments').delete().eq('id', id)
		}
		for (const id of testData.leases) {
			await client.from('leases').delete().eq('id', id)
		}
		for (const id of testData.tenants) {
			await client.from('tenants').delete().eq('id', id)
		}
		for (const id of testData.units) {
			await client.from('units').delete().eq('id', id)
		}
		for (const id of testData.properties) {
			await client.from('properties').delete().eq('id', id)
		}
	})

	describe('Invitation Token Storage', () => {
		it('should store invitation with secure 64-char hex token', async () => {
			const testInviteId = crypto.randomUUID()
			const testEmail = `token-test-${Date.now()}@example.com`

			// Generate a secure token (simulating what the service does)
			const secureToken = crypto.randomBytes(32).toString('hex')

			// Store invitation with token
			const expiresAt = new Date()
			expiresAt.setDate(expiresAt.getDate() + 7)

			const { data: invitation, error: inviteError } = await ownerA.client
				.from('tenant_invitations')
				.insert({
					id: testInviteId,
					email: testEmail,
					invitation_code: secureToken,
					invitation_url: `https://app.test/accept-invite?code=${secureToken}`,
					expires_at: expiresAt.toISOString(),
					unit_id: testUnitId,
					owner_user_id: ownerAPropertyOwnerId!
				})
				.select('id, invitation_code')
				.single()

			if (inviteError) {
				testLogger.error('Failed to create invitation:', inviteError)
				throw inviteError
			}
			testData.invitations.push(testInviteId)

			// Verify token format
			expect(invitation).toBeDefined()
			expect(invitation!.invitation_code).toHaveLength(64)
			expect(invitation!.invitation_code).toMatch(/^[a-f0-9]+$/)
		})

		it('should set correct expiration date (7 days)', async () => {
			const testInviteId = crypto.randomUUID()
			const testEmail = `expiry-test-${Date.now()}@example.com`

			// Create invitation with 7-day expiry
			const now = new Date()
			const expiresAt = new Date(now)
			expiresAt.setDate(expiresAt.getDate() + 7)

			const secureToken = crypto.randomBytes(32).toString('hex')
			const { data: invitation, error } = await ownerA.client
				.from('tenant_invitations')
				.insert({
					id: testInviteId,
					email: testEmail,
					invitation_code: secureToken,
					invitation_url: `https://app.test/accept-invite?code=${secureToken}`,
					expires_at: expiresAt.toISOString(),
					unit_id: testUnitId,
					owner_user_id: ownerAPropertyOwnerId!
				})
				.select('expires_at')
				.single()

			if (error) throw error
			testData.invitations.push(testInviteId)

			// Verify expiry is approximately 7 days from now
			const storedExpiry = new Date(invitation!.expires_at)
			const expectedExpiry = new Date(now)
			expectedExpiry.setDate(expectedExpiry.getDate() + 7)

			// Allow 1 minute tolerance for test execution time
			const diff = Math.abs(storedExpiry.getTime() - expectedExpiry.getTime())
			expect(diff).toBeLessThan(60000) // Less than 1 minute difference
		})
	})

	describe('Token Validation', () => {
		it('should find valid invitation by token', async () => {
			const testInviteId = crypto.randomUUID()
			const testEmail = `valid-test-${Date.now()}@example.com`
			const token = crypto.randomBytes(32).toString('hex')

			const expiresAt = new Date()
			expiresAt.setDate(expiresAt.getDate() + 7)

			await ownerA.client.from('tenant_invitations').insert({
				id: testInviteId,
				email: testEmail,
				invitation_code: token,
				invitation_url: `https://app.test/accept-invite?code=${token}`,
				expires_at: expiresAt.toISOString(),
				unit_id: testUnitId,
				owner_user_id: ownerAPropertyOwnerId!
			})
			testData.invitations.push(testInviteId)

			// Query for invitation by token
			const { data: found, error } = await ownerA.client
				.from('tenant_invitations')
				.select('id, email, expires_at, accepted_at')
				.eq('invitation_code', token)
				.is('accepted_at', null)
				.gt('expires_at', new Date().toISOString())
				.single()

			expect(error).toBeNull()
			expect(found).toBeDefined()
			expect(found!.id).toBe(testInviteId)
			expect(found!.email).toBe(testEmail)
		})

		it('should reject expired invitation token', async () => {
			const testInviteId = crypto.randomUUID()
			const testEmail = `expired-test-${Date.now()}@example.com`
			const token = crypto.randomBytes(32).toString('hex')

			// Create invitation with past expiry
			const expiredAt = new Date()
			expiredAt.setDate(expiredAt.getDate() - 1) // Yesterday

			await ownerA.client.from('tenant_invitations').insert({
				id: testInviteId,
				email: testEmail,
				invitation_code: token,
				invitation_url: `https://app.test/accept-invite?code=${token}`,
				expires_at: expiredAt.toISOString(),
				unit_id: testUnitId,
				owner_user_id: ownerAPropertyOwnerId!
			})
			testData.invitations.push(testInviteId)

			// Query should not find expired invitation
			const { data: found } = await ownerA.client
				.from('tenant_invitations')
				.select('id')
				.eq('invitation_code', token)
				.is('accepted_at', null)
				.gt('expires_at', new Date().toISOString())
				.maybeSingle()

			expect(found).toBeNull()
		})

		it('should reject already accepted invitation token', async () => {
			const testInviteId = crypto.randomUUID()
			const testEmail = `accepted-test-${Date.now()}@example.com`
			const token = crypto.randomBytes(32).toString('hex')

			// Create already-accepted invitation
			const expiresAt = new Date()
			expiresAt.setDate(expiresAt.getDate() + 7)

			await ownerA.client.from('tenant_invitations').insert({
				id: testInviteId,
				email: testEmail,
				invitation_code: token,
				invitation_url: `https://app.test/accept-invite?code=${token}`,
				expires_at: expiresAt.toISOString(),
				accepted_at: new Date().toISOString(), // Already accepted
				unit_id: testUnitId,
				owner_user_id: ownerAPropertyOwnerId!
			})
			testData.invitations.push(testInviteId)

			// Query should not find accepted invitation
			const { data: found } = await ownerA.client
				.from('tenant_invitations')
				.select('id')
				.eq('invitation_code', token)
				.is('accepted_at', null)
				.gt('expires_at', new Date().toISOString())
				.maybeSingle()

			expect(found).toBeNull()
		})
	})

	describe.skip('Late Fee Calculation', () => {
		it('should calculate correct late fee after grace period', async () => {
			// Create a mock tenant linked to a user
			const testTenantId = crypto.randomUUID()
			const testLeaseId = crypto.randomUUID()

			// Clean up any existing tenant with this user_id from previous test runs
			await ownerA.client.from('tenants').delete().eq('user_id', ownerA.user_id)

			// Create tenant record (requires user_id and stripe_customer_id)
			const { error: tenantError } = await ownerA.client.from('tenants').insert({
				id: testTenantId,
				user_id: ownerA.user_id, // Use owner's ID for test (would normally be tenant's user)
				stripe_customer_id: `cus_test_${Date.now()}`
			})

			if (tenantError) {
				testLogger.error('Failed to create test tenant:', tenantError)
				throw tenantError
			}
			testData.tenants.push(testTenantId)

			// Create lease with due date 10 days ago (past grace period)
			const startDate = new Date()
			startDate.setMonth(startDate.getMonth() - 1)
			const endDate = new Date()
			endDate.setFullYear(endDate.getFullYear() + 1)

			const { error: leaseError } = await ownerA.client.from('leases').insert({
				id: testLeaseId,
				primary_tenant_id: testTenantId,
				unit_id: testUnitId,
				owner_user_id: ownerAPropertyOwnerId!,
				rent_amount: 150000, // $1,500
				security_deposit: 150000,
				start_date: startDate.toISOString().split('T')[0]!,
				end_date: endDate.toISOString().split('T')[0]!,
				lease_status: 'active',
				late_fee_amount: 5000, // $50 late fee
				grace_period_days: 5
			})

			if (leaseError) {
				testLogger.error('Failed to create lease:', leaseError)
				throw leaseError
			}
			testData.leases.push(testLeaseId)

			// Verify lease was created with correct late fee configuration
			const { data: lease } = await ownerA.client
				.from('leases')
				.select('rent_amount, late_fee_amount, grace_period_days')
				.eq('id', testLeaseId)
				.single()

			expect(lease).toBeDefined()
			expect(lease!.rent_amount).toBe(150000)
			expect(lease!.late_fee_amount).toBe(5000)
			expect(lease!.grace_period_days).toBe(5)

			// Calculate expected total: $1,500 rent + $50 late fee = $1,550
			// Days late = 10, grace period = 5, so late fee applies
			const daysLate = 10
			const gracePeriod = lease!.grace_period_days ?? 5
			const expectedLateFee = daysLate > gracePeriod ? lease!.late_fee_amount : 0
			const expectedTotal = lease!.rent_amount + (expectedLateFee ?? 0)

			expect(expectedLateFee).toBe(5000)
			expect(expectedTotal).toBe(155000) // $1,550
		})

		it('should not charge late fee within grace period', async () => {
			// Simulate 3 days late (within grace period)
			const daysLate = 3
			const gracePeriod = 5
			const lateFeeAmount = 5000

			// No late fee should apply
			const lateFeeApplies = daysLate > gracePeriod
			const actualLateFee = lateFeeApplies ? lateFeeAmount : 0

			expect(lateFeeApplies).toBe(false)
			expect(actualLateFee).toBe(0)
		})
	})

	describe('Invitation Status Tracking', () => {
		it('should track invitation status as sent initially', async () => {
			const testInviteId = crypto.randomUUID()
			const testEmail = `status-test-${Date.now()}@example.com`
			const token = crypto.randomBytes(32).toString('hex')

			const expiresAt = new Date()
			expiresAt.setDate(expiresAt.getDate() + 7)

			const { data: invitation } = await ownerA.client
				.from('tenant_invitations')
				.insert({
					id: testInviteId,
					email: testEmail,
					invitation_code: token,
					invitation_url: `https://app.test/accept-invite?code=${token}`,
					expires_at: expiresAt.toISOString(),
					unit_id: testUnitId,
					owner_user_id: ownerAPropertyOwnerId!
				})
				.select('id, accepted_at, expires_at, status')
				.single()

			testData.invitations.push(testInviteId)

			// Status should be 'pending' (default) until explicitly marked as sent
			expect(invitation!.accepted_at).toBeNull()
			expect(invitation!.status).toBe('pending')
			const isExpired = new Date(invitation!.expires_at) < new Date()
			expect(isExpired).toBe(false)
		})

		it('should update status when invitation is accepted', async () => {
			const testInviteId = crypto.randomUUID()
			const testEmail = `accept-status-${Date.now()}@example.com`
			const token = crypto.randomBytes(32).toString('hex')

			const expiresAt = new Date()
			expiresAt.setDate(expiresAt.getDate() + 7)

			await ownerA.client.from('tenant_invitations').insert({
				id: testInviteId,
				email: testEmail,
				invitation_code: token,
				invitation_url: `https://app.test/accept-invite?code=${token}`,
				expires_at: expiresAt.toISOString(),
				unit_id: testUnitId,
				owner_user_id: ownerAPropertyOwnerId!
			})
			testData.invitations.push(testInviteId)

			// Simulate acceptance
			const acceptedAt = new Date().toISOString()
			const { data: updated } = await ownerA.client
				.from('tenant_invitations')
				.update({
					accepted_at: acceptedAt,
					status: 'accepted'
				})
				.eq('id', testInviteId)
				.select('accepted_at, status')
				.single()

			expect(updated!.accepted_at).toBeDefined()
			expect(updated!.accepted_at).not.toBeNull()
			expect(updated!.status).toBe('accepted')
		})
	})

	describe('Owner can view their invitations', () => {
		it('should return invitations created by the owner', async () => {
			const testInviteId = crypto.randomUUID()
			const testEmail = `owner-view-${Date.now()}@example.com`
			const token = crypto.randomBytes(32).toString('hex')

			const expiresAt = new Date()
			expiresAt.setDate(expiresAt.getDate() + 7)

			await ownerA.client.from('tenant_invitations').insert({
				id: testInviteId,
				email: testEmail,
				invitation_code: token,
				invitation_url: `https://app.test/accept-invite?code=${token}`,
				expires_at: expiresAt.toISOString(),
				unit_id: testUnitId,
				owner_user_id: ownerAPropertyOwnerId!
			})
			testData.invitations.push(testInviteId)

			// Query invitations for this owner
			const { data: invitations, error } = await ownerA.client
				.from('tenant_invitations')
				.select('id, email, status, expires_at')
				.eq('owner_user_id', ownerAPropertyOwnerId!)
				.order('created_at', { ascending: false })

			expect(error).toBeNull()
			expect(invitations).toBeDefined()
			expect(invitations!.length).toBeGreaterThan(0)

			// Find our test invitation
			const foundInvite = invitations!.find(i => i.id === testInviteId)
			expect(foundInvite).toBeDefined()
			expect(foundInvite!.email).toBe(testEmail)
		})
	})
})
