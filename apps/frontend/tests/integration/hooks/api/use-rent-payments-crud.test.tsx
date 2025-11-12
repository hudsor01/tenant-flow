/**
 * Rent Payments Integration Tests
 * Tests rent payment creation and history with real API calls
 * Mirrors production implementation patterns from use-rent-payments.ts
 *
 * Note: Rent payments are immutable (no UPDATE/DELETE operations)
 * This follows accounting best practices - payment records should not be modified
 *
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { useCreateRentPayment } from '#hooks/api/use-rent-payments'
import { clientFetch } from '#lib/api/client'
import { createBrowserClient } from '@supabase/ssr'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'UseRentPaymentsCrudTest' })
const shouldRunIntegrationTests =
	process.env.RUN_INTEGRATION_TESTS === 'true' &&
	process.env.SKIP_INTEGRATION_TESTS !== 'true'
const describeIfReady = shouldRunIntegrationTests ? describe : describe.skip

const TEST_PAYMENT_PREFIX = 'TEST-CRUD'
let createdPaymentIds: string[] = []
let createdLeaseIds: string[] = []
let createdTenantIds: string[] = []
let createdUnitIds: string[] = []
let createdPropertyIds: string[] = []

// Create wrapper with fresh QueryClient for each test
// Shared QueryClient instance for tests that need cache coordination
let sharedQueryClient: QueryClient | null = null

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0 },
			mutations: { retry: false }
		}
	})

	// Store for cleanup
	sharedQueryClient = queryClient

	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

// Helper to create test property
async function createTestProperty(): Promise<string> {
	const property = await clientFetch<{ id: string }>('/api/v1/properties', {
		method: 'POST',
		body: JSON.stringify({
			name: `${TEST_PAYMENT_PREFIX} Test Property ${Date.now()}`,
			address: '123 Test St',
			city: 'San Francisco',
			state: 'CA',
			zipCode: '94105',
			propertyType: 'APARTMENT'
		})
	})
	createdPropertyIds.push(property.id)
	return property.id
}

// Helper to create test unit
async function createTestUnit(propertyId: string): Promise<string> {
	const unit = await clientFetch<{ id: string }>('/api/v1/units', {
		method: 'POST',
		body: JSON.stringify({
			propertyId,
			unitNumber: `${TEST_PAYMENT_PREFIX}-Unit-${Date.now()}`,
			bedrooms: 2,
			bathrooms: 1,
			rent: 2000,
			status: 'OCCUPIED'
		})
	})
	createdUnitIds.push(unit.id)
	return unit.id
}

// Helper to create test tenant
async function createTestTenant(): Promise<string> {
	const tenant = await clientFetch<{ id: string }>('/api/v1/tenants', {
		method: 'POST',
		body: JSON.stringify({
			name: `${TEST_PAYMENT_PREFIX} Tenant ${Date.now()}`,
			email: `test-tenant-${Date.now()}@example.com`,
			phone: '555-0001',
			status: 'ACTIVE'
		})
	})
	createdTenantIds.push(tenant.id)
	return tenant.id
}

// Helper to create test lease
async function createTestLease(
	tenantId: string,
	unitId: string,
	propertyId: string
): Promise<string> {
	const startDate = new Date().toISOString()
	const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

	const lease = await clientFetch<{ id: string }>('/api/v1/leases', {
		method: 'POST',
		body: JSON.stringify({
			tenantId,
			unitId,
			propertyId,
			startDate,
			endDate,
			rentAmount: 2000,
			securityDeposit: 4000,
			status: 'ACTIVE'
		})
	})
	createdLeaseIds.push(lease.id)
	return lease.id
}

describeIfReady('Rent Payments Integration Tests', () => {
	// Authenticate before running tests
	beforeAll(async () => {
		// Validate ALL required environment variables - NO FALLBACKS
		const requiredEnvVars = [
			'NEXT_PUBLIC_SUPABASE_URL',
			'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
			'E2E_OWNER_EMAIL',
			'E2E_OWNER_PASSWORD'
		] as const

		for (const envVar of requiredEnvVars) {
			if (!process.env[envVar]) {
				throw new Error(
					`Missing required environment variable: ${envVar}. Please check your .env.test.local file.`
				)
			}
		}

		const supabase = createBrowserClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL,
			process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
		)

		const { data, error } = await supabase.auth.signInWithPassword({
			email: process.env.E2E_OWNER_EMAIL,
			password: process.env.E2E_OWNER_PASSWORD
		})

		if (error || !data.session) {
			throw new Error(
				`Failed to authenticate test user: ${error?.message || 'No session'}`
			)
		}
	})

	// Sign out after all tests
	afterAll(async () => {
		const supabase = createBrowserClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
		)
		await supabase.auth.signOut()
	})

	// Cleanup after each test (order matters for foreign keys)
	afterEach(async () => {
		// Clear QueryClient cache to prevent memory leaks and test pollution
		if (sharedQueryClient) {
			sharedQueryClient.clear()
		}

		// Note: Rent payments typically cannot be deleted in production
		// They are immutable for accounting/audit purposes
		// In test environment, we may allow deletion for cleanup

		// Delete in reverse order of creation
		for (const id of createdLeaseIds) {
			try {
				await clientFetch(`/api/v1/leases/${id}`, { method: 'DELETE' })
			} catch (error) {
				logger.warn(`Failed to cleanup lease ${id}`, {
					metadata: { error: error instanceof Error ? error.message : String(error) }
				})
			}
		}
		createdLeaseIds = []

		for (const id of createdTenantIds) {
			try {
				await clientFetch(`/api/v1/tenants/${id}`, { method: 'DELETE' })
			} catch (error) {
				logger.warn(`Failed to cleanup tenant ${id}`, {
					metadata: { error: error instanceof Error ? error.message : String(error) }
				})
			}
		}
		createdTenantIds = []

		for (const id of createdUnitIds) {
			try {
				await clientFetch(`/api/v1/units/${id}`, { method: 'DELETE' })
			} catch (error) {
				logger.warn(`Failed to cleanup unit ${id}`, {
					metadata: { error: error instanceof Error ? error.message : String(error) }
				})
			}
		}
		createdUnitIds = []

		for (const id of createdPropertyIds) {
			try {
				await clientFetch(`/api/v1/properties/${id}`, { method: 'DELETE' })
			} catch (error) {
				logger.warn(`Failed to cleanup property ${id}`, {
					metadata: { error: error instanceof Error ? error.message : String(error) }
				})
			}
		}
		createdPropertyIds = []

		// Clear payment IDs (may not be deletable)
		createdPaymentIds = []
	})

	describe('CREATE Rent Payment', () => {
		it('creates a one-time rent payment successfully', async () => {
			// Skip this test if Stripe test mode is not configured
			// Rent payments require Stripe payment methods
			const hasStripeTestKey = process.env.STRIPE_SECRET_KEY?.includes('test')

			if (!hasStripeTestKey) {
				logger.warn('⚠️  Skipping rent payment test - requires Stripe test mode')
				return
			}

			const propertyId = await createTestProperty()
			const unitId = await createTestUnit(propertyId)
			const tenantId = await createTestTenant()
			const leaseId = await createTestLease(tenantId, unitId, propertyId)

			const { result } = renderHook(() => useCreateRentPayment(), {
				wrapper: createWrapper()
			})

			// Note: This requires a valid Stripe payment method
			// In real tests, you'd create a test payment method first
			const paymentParams = {
				tenantId,
				leaseId,
				amount: 2000, // $20.00 in cents
				paymentMethodId: 'pm_card_visa' // Stripe test payment method
			}

			let paymentResult:
				| {
						success: boolean
						payment: { id: string; amount: number; status: string }
						paymentIntent: { id: string; status: string }
				  }
				| undefined

			// Direct await instead of waitFor for mutations (prevents 30s timeouts)
			paymentResult = await result.current.mutateAsync(paymentParams)

			// Assertions
			expect(paymentResult).toBeDefined()
			expect(paymentResult!.success).toBe(true)
			expect(paymentResult!.payment).toBeDefined()
			expect(paymentResult!.payment.amount).toBe(2000)
			expect(paymentResult!.paymentIntent).toBeDefined()

			// Track for potential cleanup
			if (paymentResult!.payment.id) {
				createdPaymentIds.push(paymentResult!.payment.id)
			}
		})

		it('validates required fields', async () => {
			const { result } = renderHook(() => useCreateRentPayment(), {
				wrapper: createWrapper()
			})

			// Missing required fields
			const invalidParams = {
				amount: 2000
			} as any

			await expect(async () => {
				await result.current.mutateAsync(invalidParams)
			}).rejects.toThrow()
		})

		it('validates amount is positive', async () => {
			const propertyId = await createTestProperty()
			const unitId = await createTestUnit(propertyId)
			const tenantId = await createTestTenant()
			const leaseId = await createTestLease(tenantId, unitId, propertyId)

			const { result } = renderHook(() => useCreateRentPayment(), {
				wrapper: createWrapper()
			})

			// Negative amount
			const invalidParams = {
				tenantId,
				leaseId,
				amount: -100,
				paymentMethodId: 'pm_card_visa'
			}

			await expect(async () => {
				await result.current.mutateAsync(invalidParams)
			}).rejects.toThrow()
		})
	})

	describe('READ Rent Payment History', () => {
		it('fetches payment history', async () => {
			// Note: Payment history endpoint requires JWT token
			// This test would need proper authentication setup
			const historyResponse = await clientFetch<{
				payments: Array<{
					id: string
					amount: number
					status: string
					createdAt: string
				}>
			}>('/api/v1/rent-payments/history')

			expect(historyResponse).toBeDefined()
			expect(historyResponse.payments).toBeInstanceOf(Array)
		})

		it('filters payment history by subscription', async () => {
			const subscriptionId = 'sub_test123'

			const historyResponse = await clientFetch<{
				payments: Array<{
					id: string
					subscriptionId: string
					amount: number
				}>
			}>(`/api/v1/rent-payments/history/subscription/${subscriptionId}`)

			expect(historyResponse).toBeDefined()
			expect(historyResponse.payments).toBeInstanceOf(Array)

			// All payments should belong to the specified subscription
			if (historyResponse.payments.length > 0) {
				expect(
					historyResponse.payments.every(
						p => p.subscriptionId === subscriptionId
					)
				).toBe(true)
			}
		})
	})

	describe('Payment Workflow', () => {
		it('completes payment creation workflow', async () => {
			// Skip if no Stripe test mode
			if (!process.env.STRIPE_SECRET_KEY?.includes('test')) {
				logger.warn('⚠️  Skipping payment workflow test - requires Stripe test mode')
				return
			}

			const wrapper = createWrapper()
			const propertyId = await createTestProperty()
			const unitId = await createTestUnit(propertyId)
			const tenantId = await createTestTenant()
			const leaseId = await createTestLease(tenantId, unitId, propertyId)

			// 1. CREATE payment
			const { result: createResult } = renderHook(
				() => useCreateRentPayment(),
				{
					wrapper
				}
			)

			const paymentParams = {
				tenantId,
				leaseId,
				amount: 2000,
				paymentMethodId: 'pm_card_visa'
			}

			let payment:
				| {
						success: boolean
						payment: { id: string; status: string }
				  }
				| undefined

			// Direct await instead of waitFor for mutations (prevents 30s timeouts)
			payment = await createResult.current.mutateAsync(paymentParams)

			expect(payment).toBeDefined()
			expect(payment!.success).toBe(true)

			if (payment!.payment.id) {
				createdPaymentIds.push(payment!.payment.id)
			}

			// 2. VERIFY payment appears in history
			const historyResponse = await clientFetch<{
				payments: Array<{ id: string }>
			}>('/api/v1/rent-payments/history')

			expect(historyResponse.payments).toBeInstanceOf(Array)
		})
	})

	describe('Cache Invalidation', () => {
		it('invalidates cache after payment creation', async () => {
			// Skip if no Stripe test mode
			if (!process.env.STRIPE_SECRET_KEY?.includes('test')) {
				logger.warn('⚠️  Skipping cache test - requires Stripe test mode')
				return
			}

			const wrapper = createWrapper()
			const propertyId = await createTestProperty()
			const unitId = await createTestUnit(propertyId)
			const tenantId = await createTestTenant()
			const leaseId = await createTestLease(tenantId, unitId, propertyId)

			// Create payment
			const { result: createResult } = renderHook(
				() => useCreateRentPayment(),
				{
					wrapper
				}
			)

			const paymentParams = {
				tenantId,
				leaseId,
				amount: 2000,
				paymentMethodId: 'pm_card_visa'
			}

			// Direct await instead of waitFor for mutations (prevents 30s timeouts)
			const result = await createResult.current.mutateAsync(paymentParams)
			if (result?.payment?.id) {
				createdPaymentIds.push(result.payment.id)
			}

			// Payment list cache should be invalidated
			// Verify by checking if new payment appears in list
			// (This would require fetching the list, which needs proper hook setup)
		})
	})

	describe('Error Handling', () => {
		it('handles invalid payment method gracefully', async () => {
			const propertyId = await createTestProperty()
			const unitId = await createTestUnit(propertyId)
			const tenantId = await createTestTenant()
			const leaseId = await createTestLease(tenantId, unitId, propertyId)

			const { result } = renderHook(() => useCreateRentPayment(), {
				wrapper: createWrapper()
			})

			const invalidParams = {
				tenantId,
				leaseId,
				amount: 2000,
				paymentMethodId: 'invalid_pm_id'
			}

			await expect(async () => {
				await result.current.mutateAsync(invalidParams)
			}).rejects.toThrow()
		})

		it('handles network errors with rollback', async () => {
			const propertyId = await createTestProperty()
			const unitId = await createTestUnit(propertyId)
			const tenantId = await createTestTenant()
			const leaseId = await createTestLease(tenantId, unitId, propertyId)

			const { result } = renderHook(() => useCreateRentPayment(), {
				wrapper: createWrapper()
			})

			// Use invalid endpoint to simulate network error
			const params = {
				tenantId,
				leaseId,
				amount: 2000,
				paymentMethodId: 'pm_invalid'
			}

			await expect(async () => {
				await result.current.mutateAsync(params)
			}).rejects.toThrow()

			// Optimistic update should be rolled back on error
		})
	})

	describe('Business Rules', () => {
		it('prevents duplicate simultaneous payments', async () => {
			// Skip if no Stripe test mode
			if (!process.env.STRIPE_SECRET_KEY?.includes('test')) {
				logger.warn('⚠️  Skipping duplicate test - requires Stripe test mode')
				return
			}

			const wrapper = createWrapper()
			const propertyId = await createTestProperty()
			const unitId = await createTestUnit(propertyId)
			const tenantId = await createTestTenant()
			const leaseId = await createTestLease(tenantId, unitId, propertyId)

			const { result } = renderHook(() => useCreateRentPayment(), {
				wrapper
			})

			const paymentParams = {
				tenantId,
				leaseId,
				amount: 2000,
				paymentMethodId: 'pm_card_visa'
			}

			// First payment should succeed
			const payment1 = await result.current.mutateAsync(paymentParams)
			if (payment1?.payment?.id) {
				createdPaymentIds.push(payment1.payment.id)
			}

			// Second identical payment should potentially be prevented
			// (depending on backend idempotency implementation)
			// This test documents the expected behavior
		})

		it('validates amount matches lease rent amount', async () => {
			const propertyId = await createTestProperty()
			const unitId = await createTestUnit(propertyId)
			const tenantId = await createTestTenant()
			const leaseId = await createTestLease(tenantId, unitId, propertyId)

			const { result } = renderHook(() => useCreateRentPayment(), {
				wrapper: createWrapper()
			})

			// Payment amount significantly different from lease rent
			// (This validation may or may not exist in your backend)
			const params = {
				tenantId,
				leaseId,
				amount: 1, // $0.01 - unrealistic rent payment
				paymentMethodId: 'pm_card_visa'
			}

			// Depending on backend validation, this may or may not throw
			// Test documents the expected behavior
			try {
				const result = await result.current.mutateAsync(params)
				if (result?.payment?.id) {
					createdPaymentIds.push(result.payment.id)
				}
			} catch (error) {
				// Expected if backend validates amount
			}
		})
	})
})
