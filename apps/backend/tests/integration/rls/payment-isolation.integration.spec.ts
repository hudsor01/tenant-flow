/**
 * Backend RLS Integration Tests: Payment Isolation
 *
 * Tests that rent_payment table RLS policies correctly enforce data isolation:
 * - owners can only see payments for their properties
 * - Tenants can only see their own payments
 * - Only service role can INSERT/UPDATE payments
 * - Prevents unauthorized payment access (PCI DSS compliance)
 *
 * @group integration
 * @group rls
 * @group security
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import type { Database } from '@repo/shared/types/supabase-generated'
import {
	authenticateAs,
	ensureTestLease,
	expectEmptyResult,
	expectPermissionError,
	getServiceRoleClient,
	TEST_USERS,
	type AuthenticatedTestClient
} from './setup'

describe('RLS: Payment Isolation', () => {
	let ownerA: AuthenticatedTestClient
	let ownerB: AuthenticatedTestClient
	let tenantA: AuthenticatedTestClient
	let tenantB: AuthenticatedTestClient
	let serviceClient: ReturnType<typeof getServiceRoleClient>
	let testLeaseId: string

	// Test data IDs for cleanup
	const testData = {
		properties: [] as string[],
		tenants: [] as string[],
		leases: [] as string[],
		payments: [] as string[]
	}

	beforeAll(async () => {
		// Authenticate all test users
		ownerA = await authenticateAs(TEST_USERS.owner_A)
		ownerB = await authenticateAs(TEST_USERS.owner_B)
		tenantA = await authenticateAs(TEST_USERS.TENANT_A)
		tenantB = await authenticateAs(TEST_USERS.TENANT_B)
		serviceClient = getServiceRoleClient()

		// Create test lease for payment foreign key
		testLeaseId = await ensureTestLease(ownerA.userId, tenantA.userId)
	})

	describe('SELECT Policy: Owner/Tenant Access', () => {
		it('owner A can only see their own property payments', async () => {
			// owner A queries all payments
			const { data, error } = await ownerA.client
				.from('rent_payment')
				.select('*')

			expect(error).toBeNull()
			expect(data).toBeDefined()

			// All returned payments should belong to owner A
			if (data && data.length > 0) {
				for (const payment of data) {
					expect(payment.ownerId).toBe(ownerA.userId)
				}
			}
		})

		it('owner A cannot see owner B payments', async () => {
			// Try to query payments by owner B's ID directly
			const { data, error } = await ownerA.client
				.from('rent_payment')
				.select('*')
				.eq('ownerId', ownerB.userId)

			expect(error).toBeNull()
			expectEmptyResult(data, 'owner A querying owner B payments')
		})

		it('tenant A can only see their own payments', async () => {
			const { data, error } = await tenantA.client
				.from('rent_payment')
				.select('*')

			expect(error).toBeNull()
			expect(data).toBeDefined()

			// All returned payments should belong to tenant A
			if (data && data.length > 0) {
				for (const payment of data) {
					expect(payment.tenantId).toBe(tenantA.userId)
				}
			}
		})

		it('tenant A cannot see tenant B payments', async () => {
			const { data, error } = await tenantA.client
				.from('rent_payment')
				.select('*')
				.eq('tenantId', tenantB.userId)

			expect(error).toBeNull()
			expectEmptyResult(data, 'tenant A querying tenant B payments')
		})

		it('tenant cannot see owner payments for other properties', async () => {
			const { data, error } = await tenantA.client
				.from('rent_payment')
				.select('*')
				.eq('ownerId', ownerB.userId)

			expect(error).toBeNull()
			expectEmptyResult(data, 'tenant querying other owner payments')
		})
	})

	describe('INSERT Policy: Service Role Only', () => {
		it('authenticated user (owner) CANNOT insert payments', async () => {
			const { data, error } = await ownerA.client
				.from('rent_payment')
				.insert({
					ownerId: ownerA.userId,
					tenantId: tenantA.userId,
					amount: 150000,
					status: 'pending',
					dueDate: new Date().toISOString().split('T')[0] || null,
					leaseId: testLeaseId,
					ownerReceives: 142500, // 5% platform fee
					paymentType: 'card',
					platformFee: 7500,
					stripeFee: 0
				})
				.select()

			// CRITICAL: This MUST fail due to RLS policy restricting INSERT to service_role
			expectPermissionError(error, 'owner attempting to insert payment')
			expect(data).toBeNull()
		})

		it('authenticated user (tenant) CANNOT insert payments', async () => {
			const { data, error } = await tenantA.client
				.from('rent_payment')
				.insert({
					ownerId: ownerB.userId,
					tenantId: tenantA.userId,
					amount: 150000,
					status: 'pending',
					dueDate: new Date().toISOString().split('T')[0] || null,
					leaseId: testLeaseId,
					ownerReceives: 142500, // 5% platform fee
					paymentType: 'card',
					platformFee: 7500,
					stripeFee: 0
				})
				.select()

			// CRITICAL: This MUST fail due to RLS policy restricting INSERT to service_role
			expectPermissionError(error, 'tenant attempting to insert payment')
			expect(data).toBeNull()
		})

		it('service role CAN insert payments', async () => {
			const testPayment: Database['public']['Tables']['rent_payment']['Insert'] =
				{
					ownerId: ownerA.userId,
					tenantId: tenantA.userId,
					amount: 150000,
					status: 'pending',
					dueDate: new Date().toISOString().split('T')[0] || null,
					leaseId: testLeaseId,
					ownerReceives: 142500, // 5% platform fee
					paymentType: 'card',
					platformFee: 7500,
					stripeFee: 0
				}

			const { data, error } = await serviceClient
				.from('rent_payment')
				.insert(testPayment)
				.select()
				.single()

			expect(error).toBeNull()
			expect(data).toBeDefined()
			expect(data?.amount).toBe(150000)

			// Track for cleanup
			if (data) {
				testData.payments.push(data.id)
			}
		})
	})

	describe('UPDATE Policy: Service Role Only', () => {
		let testPaymentId: string

		beforeAll(async () => {
			// Create test payment using service role
			const { data } = await serviceClient
				.from('rent_payment')
				.insert({
					ownerId: ownerA.userId,
					tenantId: tenantA.userId,
					amount: 150000,
					status: 'pending',
					dueDate: new Date().toISOString().split('T')[0] || null,
					leaseId: testLeaseId,
					ownerReceives: 142500, // 5% platform fee
					paymentType: 'card',
					platformFee: 7500,
					stripeFee: 0
				})
				.select()
				.single()

			if (data) {
				testPaymentId = data.id
				testData.payments.push(data.id)
			}
		})

		it('authenticated user (owner) CANNOT update payments', async () => {
			const { data, error } = await ownerA.client
				.from('rent_payment')
				.update({ status: 'succeeded' })
				.eq('id', testPaymentId)
				.select()

			// CRITICAL: This MUST fail due to RLS policy restricting UPDATE to service_role
			expectPermissionError(error, 'owner attempting to update payment')
			expect(data).toBeNull()
		})

		it('authenticated user (tenant) CANNOT update payments', async () => {
			const { data, error } = await tenantA.client
				.from('rent_payment')
				.update({ status: 'succeeded' })
				.eq('id', testPaymentId)
				.select()

			// CRITICAL: This MUST fail due to RLS policy restricting UPDATE to service_role
			expectPermissionError(error, 'tenant attempting to update payment')
			expect(data).toBeNull()
		})

		it('service role CAN update payments', async () => {
			const { data, error } = await serviceClient
				.from('rent_payment')
				.update({ status: 'succeeded', paidAt: new Date().toISOString() })
				.eq('id', testPaymentId)
				.select()
				.single()

			expect(error).toBeNull()
			expect(data).toBeDefined()
			expect(data?.status).toBe('succeeded')
		})
	})

	describe('DELETE Policy: None (7-Year Retention)', () => {
		let testPaymentId: string

		beforeAll(async () => {
			// Create test payment using service role
			const { data } = await serviceClient
				.from('rent_payment')
				.insert({
					ownerId: ownerA.userId,
					tenantId: tenantA.userId,
					amount: 150000,
					status: 'pending',
					dueDate: new Date().toISOString().split('T')[0] || null,
					leaseId: testLeaseId,
					ownerReceives: 142500, // 5% platform fee
					paymentType: 'card',
					platformFee: 7500,
					stripeFee: 0
				})
				.select()
				.single()

			if (data) {
				testPaymentId = data.id
				testData.payments.push(data.id)
			}
		})

		it('authenticated user (owner) CANNOT delete payments', async () => {
			const { data, error } = await ownerA.client
				.from('rent_payment')
				.delete()
				.eq('id', testPaymentId)

			// MUST fail - no DELETE policy exists (7-year retention requirement)
			expectPermissionError(error, 'owner attempting to delete payment')
			expect(data).toBeNull()
		})

		it('authenticated user (tenant) CANNOT delete payments', async () => {
			const { data, error } = await tenantA.client
				.from('rent_payment')
				.delete()
				.eq('id', testPaymentId)

			// MUST fail - no DELETE policy exists (7-year retention requirement)
			expectPermissionError(error, 'tenant attempting to delete payment')
			expect(data).toBeNull()
		})

		it('service role CAN delete payments (cleanup only)', async () => {
			// Service role can delete for test cleanup, but application should never do this
			const { error } = await serviceClient
				.from('rent_payment')
				.delete()
				.eq('id', testPaymentId)

			expect(error).toBeNull()

			// Remove from cleanup list since we just deleted it
			testData.payments = testData.payments.filter(id => id !== testPaymentId)
		})
	})

	describe('Cross-Tenant Payment Spoofing Prevention', () => {
		it('tenant cannot create payment with another tenant ID', async () => {
			// Tenant A tries to create payment claiming to be Tenant B
			const { data, error } = await tenantA.client
				.from('rent_payment')
				.insert({
					ownerId: ownerA.userId,
					tenantId: tenantB.userId, // Spoofing attempt
					amount: 150000,
					status: 'pending',
					dueDate: new Date().toISOString().split('T')[0] || null,
					leaseId: testLeaseId,
					ownerReceives: 142500, // 5% platform fee
					paymentType: 'card',
					platformFee: 7500,
					stripeFee: 0
				})
				.select()

			// CRITICAL: This MUST fail - tenants cannot insert payments at all
			expectPermissionError(error, 'tenant spoofing another tenant ID')
			expect(data).toBeNull()
		})

		it('owner cannot create payment for another owner', async () => {
			// owner A tries to create payment claiming to be owner B
			const { data, error } = await ownerA.client
				.from('rent_payment')
				.insert({
					ownerId: ownerB.userId, // Spoofing attempt
					tenantId: tenantA.userId,
					amount: 150000,
					status: 'pending',
					dueDate: new Date().toISOString().split('T')[0] || null,
					leaseId: testLeaseId,
					ownerReceives: 142500, // 5% platform fee
					paymentType: 'card',
					platformFee: 7500,
					stripeFee: 0
				})
				.select()

			// CRITICAL: This MUST fail - owners cannot insert payments at all
			expectPermissionError(error, 'owner spoofing another owner ID')
			expect(data).toBeNull()
		})
	})
})
