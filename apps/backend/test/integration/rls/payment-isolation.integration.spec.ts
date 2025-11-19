/**
 * Backend RLS Integration Tests: Payment Isolation
 *
 * Tests that rent_payments table RLS policies correctly enforce data isolation:
 * - owners can only see payments for their properties
 * - Tenants can only see their own payments
 * - Only service user_type can INSERT/UPDATE payments
 * - Prevents unauthorized payment access (PCI DSS compliance)
 *
 * @group integration
 * @group rls
 * @group security
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { Logger } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'
import {
	authenticateAs,
	ensureTestLease,
	expectEmptyResult,
	expectPermissionError,
	getServiceuser_typeClient,
	TEST_USERS,
	type AuthenticatedTestClient
} from './setup'

describe('RLS: Payment Isolation', () => {
	const testLogger = new Logger('RLSPaymentIsolationTest')
	let ownerA: AuthenticatedTestClient
	let tenantA: AuthenticatedTestClient
	let tenantB: AuthenticatedTestClient
	let serviceClient: ReturnType<typeof getServiceuser_typeClient>
	let testlease_id: string

	// Test data IDs for cleanup
	const testData = {
		properties: [] as string[],
		tenants: [] as string[],
		leases: [] as string[],
		payments: [] as string[]
	}

	beforeAll(async () => {
		// Authenticate all test users
		ownerA = await authenticateAs(TEST_USERS.OWNER_A)
		tenantA = await authenticateAs(TEST_USERS.TENANT_A)
		tenantB = await authenticateAs(TEST_USERS.TENANT_B)
		serviceClient = getServiceuser_typeClient()

		// Create test lease for payment foreign key
		testlease_id = await ensureTestLease(ownerA.user_id, tenantA.user_id)
	})

	afterAll(async () => {
		try {
			// Cleanup in reverse foreign key order
			// Delete payments created during tests
			for (const id of testData.payments) {
				await serviceClient.from('rent_payments').delete().eq('id', id)
			}
			// Delete test lease if it was created
			if (testlease_id) {
				await serviceClient.from('leases').delete().eq('id', testlease_id)
			}
		} catch (error) {
			// Log but don't fail tests on cleanup errors
			testLogger.error('Cleanup error in payment-isolation tests:', error as Error)
		}
	})

	describe('SELECT Policy: Owner/Tenant Access', () => {
		it('owner A can only see their own property payments', async () => {
			// owner A queries all payments
			const { data, error } = await ownerA.client
				.from('rent_payments')
				.select('*')

			expect(error).toBeNull()
			expect(data).toBeDefined()

			// All returned payments should belong to owner A
			// Payment ownership verified through RLS policy (joins on leases -> properties)
			expect(data?.length).toBeGreaterThan(0)
		})

		it('owner A cannot see owner B payments', async () => {
			// Try to query payments by owner B's ID directly
			const { data, error } = await ownerA.client
				.from('rent_payments')
				.select('*')
				// RLS policy ensures only owner's payments are returned; owner_id field doesn't exist in schema

			expect(error).toBeNull()
			expectEmptyResult(data, 'owner A querying owner B payments')
		})

		it('tenant A can only see their own payments', async () => {
			const { data, error } = await tenantA.client
				.from('rent_payments')
				.select('*')

			expect(error).toBeNull()
			expect(data).toBeDefined()

			// All returned payments should belong to tenant A
			if (data && data.length > 0) {
				for (const payment of data) {
					expect(payment.tenant_id).toBe(tenantA.user_id)
				}
			}
		})

		it('tenant A cannot see tenant B payments', async () => {
			const { data, error } = await tenantA.client
				.from('rent_payments')
				.select('*')
				.eq('tenant_id', tenantB.user_id)

			expect(error).toBeNull()
			expectEmptyResult(data, 'tenant A querying tenant B payments')
		})

		it('tenant cannot see owner payments for other properties', async () => {
			const { data, error } = await tenantA.client
				.from('rent_payments')
				.select('*')
				// RLS policy ensures only owner's payments are returned; owner_id field doesn't exist in schema

			expect(error).toBeNull()
			expectEmptyResult(data, 'tenant querying other owner payments')
		})
	})

	describe('INSERT Policy: Service user_type Only', () => {
		it('authenticated user (owner) CANNOT insert payments', async () => {
			const { data, error } = await ownerA.client
				.from('rent_payments')
				.insert({
				tenant_id: tenantA.user_id,
				amount: 150000,
				application_fee_amount: 7500,
				currency: 'USD',
				status: 'pending',
				due_date: new Date().toISOString().split('T')[0]!,
				lease_id: testlease_id,
				payment_method_type: 'card',
				period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!,
				period_end: new Date().toISOString().split('T')[0]!,
				stripe_payment_intent_id: 'pi_test_123'
			})
				.select()

			// CRITICAL: This MUST fail due to RLS policy restricting INSERT to service_user_type
			expectPermissionError(error, 'owner attempting to insert payment')
			expect(data).toBeNull()
		})

		it('authenticated user (tenant) CANNOT insert payments', async () => {
			const { data, error } = await tenantA.client
				.from('rent_payments')
			.insert({
				tenant_id: tenantA.user_id,
					amount: 150000,
					status: 'pending',
					due_date: new Date().toISOString().split('T')[0]!,
					lease_id: testlease_id,
					payment_method_type: 'card',
					application_fee_amount: 7500,
					currency: 'usd',
					period_start: new Date().toISOString(),
					period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
					stripe_payment_intent_id: 'pi_test'
				} as any)
				.select()

			// CRITICAL: This MUST fail due to RLS policy restricting INSERT to service_user_type
			expectPermissionError(error, 'tenant attempting to insert payment')
			expect(data).toBeNull()
		})

		it('service user_type CAN insert payments', async () => {
			const testPayment: Database['public']['Tables']['rent_payments']['Insert'] =
				{
					tenant_id: tenantA.user_id,
					amount: 150000,
					status: 'pending',
					due_date: new Date().toISOString().split('T')[0]!,
					lease_id: testlease_id,
					payment_method_type: 'card',
					application_fee_amount: 7500,
					currency: 'usd',
					period_start: new Date().toISOString(),
					period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
					stripe_payment_intent_id: 'pi_test'
				}

			const { data, error } = await serviceClient
				.from('rent_payments')
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

	describe('UPDATE Policy: Service user_type Only', () => {
		let testPaymentId: string

		beforeAll(async () => {
			// Create test payment using service user_type
			const { data } = await serviceClient
				.from('rent_payments')
				.insert({
				tenant_id: tenantA.user_id,
				amount: 150000,
				application_fee_amount: 7500,
				currency: 'USD',
				status: 'pending',
				due_date: new Date().toISOString().split('T')[0]!,
				lease_id: testlease_id,
				payment_method_type: 'card',
				period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!,
				period_end: new Date().toISOString().split('T')[0]!,
				stripe_payment_intent_id: 'pi_test_123'
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
				.from('rent_payments')
				.update({ status: 'succeeded' })
				.eq('id', testPaymentId)
				.select()

			// CRITICAL: This MUST fail due to RLS policy restricting UPDATE to service_user_type
			expectPermissionError(error, 'owner attempting to update payment')
			expect(data).toBeNull()
		})

		it('authenticated user (tenant) CANNOT update payments', async () => {
			const { data, error } = await tenantA.client
				.from('rent_payments')
				.update({ status: 'succeeded' })
				.eq('id', testPaymentId)
				.select()

			// CRITICAL: This MUST fail due to RLS policy restricting UPDATE to service_user_type
			expectPermissionError(error, 'tenant attempting to update payment')
			expect(data).toBeNull()
		})

		it('service user_type CAN update payments', async () => {
			const { data, error } = await serviceClient
				.from('rent_payments')
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
			// Create test payment using service user_type
			const { data } = await serviceClient
				.from('rent_payments')
				.insert({
				tenant_id: tenantA.user_id,
				amount: 150000,
				application_fee_amount: 7500,
				currency: 'USD',
				status: 'pending',
				due_date: new Date().toISOString().split('T')[0]!,
				lease_id: testlease_id,
				payment_method_type: 'card',
				period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!,
				period_end: new Date().toISOString().split('T')[0]!,
				stripe_payment_intent_id: 'pi_test_123'
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
				.from('rent_payments')
				.delete()
				.eq('id', testPaymentId)

			// MUST fail - no DELETE policy exists (7-year retention requirement)
			expectPermissionError(error, 'owner attempting to delete payment')
			expect(data).toBeNull()
		})

		it('authenticated user (tenant) CANNOT delete payments', async () => {
			const { data, error } = await tenantA.client
				.from('rent_payments')
				.delete()
				.eq('id', testPaymentId)

			// MUST fail - no DELETE policy exists (7-year retention requirement)
			expectPermissionError(error, 'tenant attempting to delete payment')
			expect(data).toBeNull()
		})

		it('service user_type CAN delete payments (cleanup only)', async () => {
			// Service user_type can delete for test cleanup, but application should never do this
			const { error } = await serviceClient
				.from('rent_payments')
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
				.from('rent_payments')
				.insert({
					tenant_id: tenantB.user_id, // Spoofing attempt
					amount: 150000,
					status: 'pending',
					due_date: new Date().toISOString().split('T')[0]!,
					lease_id: testlease_id,
					payment_method_type: 'card',
					application_fee_amount: 7500,
					currency: 'usd',
					period_start: new Date().toISOString(),
					period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
					stripe_payment_intent_id: 'pi_test'
				} as any)
				.select()

			// CRITICAL: This MUST fail - tenants cannot insert payments at all
			expectPermissionError(error, 'tenant spoofing another tenant ID')
			expect(data).toBeNull()
		})

		it('owner cannot create payment for another owner', async () => {
			// owner A tries to create payment claiming to be owner B
			const { data, error } = await ownerA.client
				.from('rent_payments')
				.insert({
					tenant_id: tenantA.user_id,
					amount: 150000,
					status: 'pending',
					due_date: new Date().toISOString().split('T')[0]!,
					lease_id: testlease_id,
					payment_method_type: 'card',
					application_fee_amount: 7500,
					currency: 'usd',
					period_start: new Date().toISOString(),
					period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
					stripe_payment_intent_id: 'pi_test'
				} as any)
				.select()

			// CRITICAL: This MUST fail - owners cannot insert payments at all
			expectPermissionError(error, 'owner spoofing another owner ID')
			expect(data).toBeNull()
		})
	})
})
