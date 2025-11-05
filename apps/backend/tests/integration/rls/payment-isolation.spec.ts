/**
 * Backend RLS Integration Tests: Payment Isolation
 *
 * Tests that rent_payment table RLS policies correctly enforce data isolation:
 * - Landlords can only see payments for their properties
 * - Tenants can only see their own payments
 * - Only service role can INSERT/UPDATE payments
 * - Prevents unauthorized payment access (PCI DSS compliance)
 *
 * @group integration
 * @group rls
 * @group security
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import type { Database } from '@repo/shared/types/supabase-generated'
import {
	authenticateAs,
	cleanupTestData,
	expectEmptyResult,
	expectPermissionError,
	getServiceRoleClient,
	TEST_USERS,
	type AuthenticatedTestClient
} from './setup'

describe('RLS: Payment Isolation', () => {
	let landlordA: AuthenticatedTestClient
	let landlordB: AuthenticatedTestClient
	let tenantA: AuthenticatedTestClient
	let tenantB: AuthenticatedTestClient
	let serviceClient: ReturnType<typeof getServiceRoleClient>

	// Test data IDs for cleanup
	const testData = {
		properties: [] as string[],
		tenants: [] as string[],
		leases: [] as string[],
		payments: [] as string[]
	}

	beforeAll(async () => {
		// Authenticate all test users
		landlordA = await authenticateAs(TEST_USERS.LANDLORD_A)
		landlordB = await authenticateAs(TEST_USERS.LANDLORD_B)
		tenantA = await authenticateAs(TEST_USERS.TENANT_A)
		tenantB = await authenticateAs(TEST_USERS.TENANT_B)
		serviceClient = getServiceRoleClient()
	})

	afterAll(async () => {
		// Cleanup test data (must use service role)
		await cleanupTestData(serviceClient, testData)
	})

	describe('SELECT Policy: Owner/Tenant Access', () => {
		it('landlord A can only see their own property payments', async () => {
			// Landlord A queries all payments
			const { data, error } = await landlordA.client
				.from('rent_payment')
				.select('*')

			expect(error).toBeNull()
			expect(data).toBeDefined()

			// All returned payments should belong to landlord A
			if (data && data.length > 0) {
				for (const payment of data) {
					expect(payment.landlordId).toBe(landlordA.userId)
				}
			}
		})

		it('landlord A cannot see landlord B payments', async () => {
			// Try to query payments by landlord B's ID directly
			const { data, error } = await landlordA.client
				.from('rent_payment')
				.select('*')
				.eq('landlordId', landlordB.userId)

			expect(error).toBeNull()
			expectEmptyResult(data, 'landlord A querying landlord B payments')
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

		it('tenant cannot see landlord payments for other properties', async () => {
			const { data, error } = await tenantA.client
				.from('rent_payment')
				.select('*')
				.eq('landlordId', landlordB.userId)

			expect(error).toBeNull()
			expectEmptyResult(data, 'tenant querying other landlord payments')
		})
	})

	describe('INSERT Policy: Service Role Only', () => {
		it('authenticated user (landlord) CANNOT insert payments', async () => {
			const { data, error } = await landlordA.client
				.from('rent_payment')
				.insert({
					landlordId: landlordA.userId,
					tenantId: tenantA.userId,
					amount: 150000,
					status: 'DUE',
					dueDate: new Date().toISOString().split('T')[0],
					leaseId: 'test-lease-id'
				})
				.select()

			// CRITICAL: This MUST fail due to RLS policy restricting INSERT to service_role
			expectPermissionError(error, 'landlord attempting to insert payment')
			expect(data).toBeNull()
		})

		it('authenticated user (tenant) CANNOT insert payments', async () => {
			const { data, error } = await tenantA.client
				.from('rent_payment')
				.insert({
					landlordId: landlordB.userId,
					tenantId: tenantA.userId,
					amount: 150000,
					status: 'DUE',
					dueDate: new Date().toISOString().split('T')[0],
					leaseId: 'test-lease-id'
				})
				.select()

			// CRITICAL: This MUST fail due to RLS policy restricting INSERT to service_role
			expectPermissionError(error, 'tenant attempting to insert payment')
			expect(data).toBeNull()
		})

		it('service role CAN insert payments', async () => {
			const testPayment: Database['public']['Tables']['rent_payment']['Insert'] =
				{
					landlordId: landlordA.userId,
					tenantId: tenantA.userId,
					amount: 150000,
					status: 'DUE',
					dueDate: new Date().toISOString().split('T')[0],
					leaseId: 'test-lease-id'
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
					landlordId: landlordA.userId,
					tenantId: tenantA.userId,
					amount: 150000,
					status: 'DUE',
					dueDate: new Date().toISOString().split('T')[0],
					leaseId: 'test-lease-id'
				})
				.select()
				.single()

			if (data) {
				testPaymentId = data.id
				testData.payments.push(data.id)
			}
		})

		it('authenticated user (landlord) CANNOT update payments', async () => {
			const { data, error } = await landlordA.client
				.from('rent_payment')
				.update({ status: 'PAID' })
				.eq('id', testPaymentId)
				.select()

			// CRITICAL: This MUST fail due to RLS policy restricting UPDATE to service_role
			expectPermissionError(error, 'landlord attempting to update payment')
			expect(data).toBeNull()
		})

		it('authenticated user (tenant) CANNOT update payments', async () => {
			const { data, error } = await tenantA.client
				.from('rent_payment')
				.update({ status: 'PAID' })
				.eq('id', testPaymentId)
				.select()

			// CRITICAL: This MUST fail due to RLS policy restricting UPDATE to service_role
			expectPermissionError(error, 'tenant attempting to update payment')
			expect(data).toBeNull()
		})

		it('service role CAN update payments', async () => {
			const { data, error } = await serviceClient
				.from('rent_payment')
				.update({ status: 'PAID', paidAt: new Date().toISOString() })
				.eq('id', testPaymentId)
				.select()
				.single()

			expect(error).toBeNull()
			expect(data).toBeDefined()
			expect(data?.status).toBe('PAID')
		})
	})

	describe('DELETE Policy: None (7-Year Retention)', () => {
		let testPaymentId: string

		beforeAll(async () => {
			// Create test payment using service role
			const { data } = await serviceClient
				.from('rent_payment')
				.insert({
					landlordId: landlordA.userId,
					tenantId: tenantA.userId,
					amount: 150000,
					status: 'DUE',
					dueDate: new Date().toISOString().split('T')[0],
					leaseId: 'test-lease-id'
				})
				.select()
				.single()

			if (data) {
				testPaymentId = data.id
				testData.payments.push(data.id)
			}
		})

		it('authenticated user (landlord) CANNOT delete payments', async () => {
			const { data, error } = await landlordA.client
				.from('rent_payment')
				.delete()
				.eq('id', testPaymentId)

			// MUST fail - no DELETE policy exists (7-year retention requirement)
			expectPermissionError(error, 'landlord attempting to delete payment')
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
					landlordId: landlordA.userId,
					tenantId: tenantB.userId, // Spoofing attempt
					amount: 150000,
					status: 'DUE',
					dueDate: new Date().toISOString().split('T')[0],
					leaseId: 'test-lease-id'
				})
				.select()

			// CRITICAL: This MUST fail - tenants cannot insert payments at all
			expectPermissionError(error, 'tenant spoofing another tenant ID')
			expect(data).toBeNull()
		})

		it('landlord cannot create payment for another landlord', async () => {
			// Landlord A tries to create payment claiming to be Landlord B
			const { data, error } = await landlordA.client
				.from('rent_payment')
				.insert({
					landlordId: landlordB.userId, // Spoofing attempt
					tenantId: tenantA.userId,
					amount: 150000,
					status: 'DUE',
					dueDate: new Date().toISOString().split('T')[0],
					leaseId: 'test-lease-id'
				})
				.select()

			// CRITICAL: This MUST fail - landlords cannot insert payments at all
			expectPermissionError(error, 'landlord spoofing another landlord ID')
			expect(data).toBeNull()
		})
	})
})
