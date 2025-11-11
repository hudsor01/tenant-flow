/**
 * RLS (Row Level Security) Boundary Integration Tests
 *
 * Tests that data isolation between users is properly enforced at the database level.
 * These tests verify that:
 * 1. User A cannot access User B's data
 * 2. Tenants cannot access owner-only endpoints
 * 3. Payment methods are isolated per user (PCI compliance requirement)
 *
 * REQUIREMENTS:
 * - Multiple test accounts must be created in Supabase Auth before running these tests
 * - Test accounts need environment variables in .env.test:
 *   - E2E_owner_A_EMAIL/PASSWORD
 *   - E2E_owner_B_EMAIL/PASSWORD
 *   - E2E_TENANT_A_EMAIL/PASSWORD
 *   - E2E_TENANT_B_EMAIL/PASSWORD
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createBrowserClient } from '@supabase/ssr'
import { clientFetch } from '#lib/api/client'
import type { Property } from '@repo/shared/types/core'
import type { CreatePropertyInput } from '@repo/shared/types/backend-domain'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'RlsBoundaryTest' })
const shouldRunIntegrationTests =
	process.env.RUN_INTEGRATION_TESTS === 'true' &&
	process.env.SKIP_INTEGRATION_TESTS !== 'true'
const describeIfReady = shouldRunIntegrationTests ? describe : describe.skip

// ========================================
// Multi-User Authentication Utilities
// ========================================

interface TestUser {
	email: string
	password: string
	session: { access_token: string; expires_at?: number } | null
	user: { id: string; email?: string } | null
}

/**
 * Authenticates a test user and returns their session
 * This allows tests to impersonate different users
 */
async function authenticateTestUser(
	email: string,
	password: string
): Promise<TestUser> {
	// Validate required environment variables
	if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
		throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
	}
	if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
		throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required')
	}

	const supabase = createBrowserClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
	)

	const { data, error } = await supabase.auth.signInWithPassword({
		email,
		password
	})

	if (error || !data.session) {
		throw new Error(
			`Failed to authenticate ${email}: ${error?.message || 'No session'}`
		)
	}

	return {
		email,
		password,
		session: data.session,
		user: data.user
	}
}

/**
 * Makes an authenticated API request as a specific user
 * Overrides the default session from setup.ts
 */
async function fetchAsUser<T>(
	user: TestUser,
	endpoint: string,
	options?: RequestInit
): Promise<T> {
	// Validate session exists before using
	if (!user.session || !user.session.access_token) {
		throw new Error(`No valid session for user ${user.email}`)
	}

	const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoint}`

	const response = await fetch(url, {
		...options,
		headers: {
			...options?.headers,
			'Content-Type': 'application/json',
			Authorization: `Bearer ${user.session.access_token}`,
			'User-Agent':
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			Origin: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000',
			Referer: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'
		}
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(`API request failed (${response.status}): ${errorText}`)
	}

	// Handle empty/no-body responses (204 No Content, 205 Reset Content)
	if (response.status === 204 || response.status === 205) {
		return null as T
	}

	// Check if response has content
	const contentLength = response.headers.get('content-length')
	if (contentLength === '0') {
		return null as T
	}

	// Check if content-type is JSON
	const contentType = response.headers.get('content-type')
	if (!contentType || !contentType.includes('application/json')) {
		const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoint}`
		logger.warn('Non-JSON response received', {
			metadata: { url, status: response.status, contentType }
		})
		throw new Error(
			`Expected JSON response from ${endpoint} but got ${contentType}. Status: ${response.status}`
		)
	}

	return response.json()
}

/**
 * Expects an API call to fail with 403 Forbidden (authorization failure)
 */
async function expectForbidden(
	user: TestUser,
	endpoint: string,
	options?: RequestInit
) {
	const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoint}`

	const response = await fetch(url, {
		...options,
		headers: {
			...options?.headers,
			'Content-Type': 'application/json',
			Authorization: `Bearer ${user.session!.access_token}`
		}
	})

	expect(response.status).toBe(403)
}

/**
 * Expects an API call to fail with 404 Not Found (RLS filtered out the data)
 */
async function expectNotFound(
	user: TestUser,
	endpoint: string,
	options?: RequestInit
) {
	const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoint}`

	const response = await fetch(url, {
		...options,
		headers: {
			...options?.headers,
			'Content-Type': 'application/json',
			Authorization: `Bearer ${user.session!.access_token}`
		}
	})

	expect(response.status).toBe(404)
}

// ========================================
// Test Suite
// ========================================

describe.skip('RLS Boundary Tests', () => {
	// Test users (skip tests until these are configured)
	let ownerA: TestUser
	let ownerB: TestUser
	let tenantA: TestUser
	let tenantB: TestUser

	// Test data IDs for cleanup
	let ownerAPropertyId: string
	let ownerBPropertyId: string
	let ownerAPaymentMethodId: string
	let ownerBPaymentMethodId: string

	beforeAll(async () => {
		// Authenticate all test users
		// These accounts must exist in Supabase Auth
		ownerA = await authenticateTestUser(
			process.env.E2E_owner_A_EMAIL!,
			process.env.E2E_owner_A_PASSWORD!
		)

		ownerB = await authenticateTestUser(
			process.env.E2E_owner_B_EMAIL!,
			process.env.E2E_owner_B_PASSWORD!
		)

		tenantA = await authenticateTestUser(
			process.env.E2E_TENANT_A_EMAIL!,
			process.env.E2E_TENANT_A_PASSWORD!
		)

		tenantB = await authenticateTestUser(
			process.env.E2E_TENANT_B_EMAIL!,
			process.env.E2E_TENANT_B_PASSWORD!
		)

		// Create test data for each owner
		const propertyA = await fetchAsUser<Property>(
			ownerA,
			'/api/v1/properties',
			{
				method: 'POST',
				body: JSON.stringify({
					name: 'RLS Test Property A',
					propertyType: 'APARTMENT'
				} as CreatePropertyInput)
			}
		)
		ownerAPropertyId = propertyA.id

		const propertyB = await fetchAsUser<Property>(
			ownerB,
			'/api/v1/properties',
			{
				method: 'POST',
				body: JSON.stringify({
					name: 'RLS Test Property B',
					propertyType: 'APARTMENT'
				} as CreatePropertyInput)
			}
		)
		ownerBPropertyId = propertyB.id
	})

	afterAll(async () => {
		// Cleanup: Delete test data
		if (ownerAPropertyId) {
			try {
				await fetchAsUser(ownerA, `/api/v1/properties/${ownerAPropertyId}`, {
					method: 'DELETE'
				})
			} catch (error) {
				logger.warn('Failed to cleanup ownerA property', {
					metadata: { error: error instanceof Error ? error.message : String(error) }
				})
			}
		}

		if (ownerBPropertyId) {
			try {
				await fetchAsUser(ownerB, `/api/v1/properties/${ownerBPropertyId}`, {
					method: 'DELETE'
				})
			} catch (error) {
				logger.warn('Failed to cleanup ownerB property', {
					metadata: { error: error instanceof Error ? error.message : String(error) }
				})
			}
		}
	})

	// ========================================
	// Cross-User Property Isolation Tests
	// ========================================

	describeIfReady('Property Isolation', () => {
		it("owner A cannot read owner B's properties", async () => {
			// owner A tries to fetch owner B's property by ID
			await expectNotFound(ownerA, `/api/v1/properties/${ownerBPropertyId}`)
		})

		it("owner B cannot read owner A's properties", async () => {
			// owner B tries to fetch owner A's property by ID
			await expectNotFound(ownerB, `/api/v1/properties/${ownerAPropertyId}`)
		})

		it("owner A cannot update owner B's properties", async () => {
			// owner A tries to update owner B's property
			await expectForbidden(ownerA, `/api/v1/properties/${ownerBPropertyId}`, {
				method: 'PUT',
				body: JSON.stringify({
					name: 'Unauthorized Update'
				})
			})
		})

		it("owner A cannot delete owner B's properties", async () => {
			// owner A tries to delete owner B's property
			await expectForbidden(ownerA, `/api/v1/properties/${ownerBPropertyId}`, {
				method: 'DELETE'
			})
		})

		it('owner A can only see their own properties in list endpoint', async () => {
			const response = await fetchAsUser<{ properties: Property[] }>(
				ownerA,
				'/api/v1/properties'
			)

			// Verify ownerA only sees their own property
			expect(response.properties.some(p => p.id === ownerAPropertyId)).toBe(
				true
			)
			expect(response.properties.some(p => p.id === ownerBPropertyId)).toBe(
				false
			)
		})
	})

	// ========================================
	// Role-Based Access Tests (Tenant vs owner)
	// ========================================

	describeIfReady('Role-Based Access', () => {
		it('tenant cannot create properties', async () => {
			await expectForbidden(tenantA, '/api/v1/properties', {
				method: 'POST',
				body: JSON.stringify({
					name: 'Unauthorized Property',
					propertyType: 'APARTMENT'
				})
			})
		})

		it('tenant cannot update properties', async () => {
			await expectForbidden(tenantA, `/api/v1/properties/${ownerAPropertyId}`, {
				method: 'PUT',
				body: JSON.stringify({
					name: 'Unauthorized Update'
				})
			})
		})

		it('tenant cannot delete properties', async () => {
			await expectForbidden(tenantA, `/api/v1/properties/${ownerAPropertyId}`, {
				method: 'DELETE'
			})
		})

		it('tenant cannot access owner dashboard endpoints', async () => {
			await expectForbidden(tenantA, '/api/v1/dashboard/owner-stats')
		})

		it('owner cannot access tenant-only endpoints', async () => {
			await expectForbidden(ownerA, '/api/v1/tenant/profile')
		})
	})

	// ========================================
	// Payment Method Isolation Tests (PCI Compliance)
	// ========================================

	describeIfReady('Payment Method Isolation (PCI Compliance)', () => {
		it("owner A cannot read owner B's payment methods", async () => {
			// Get owner B's payment methods
			const ownerBMethods = await fetchAsUser<{ paymentMethods: any[] }>(
				ownerB,
				'/api/v1/payment-methods'
			)

			if (ownerBMethods.paymentMethods.length > 0) {
				const methodId = ownerBMethods.paymentMethods[0].id

				// owner A tries to read owner B's payment method
				await expectNotFound(ownerA, `/api/v1/payment-methods/${methodId}`)
			}
		})

		it("owner A cannot use owner B's payment method for rent payment", async () => {
			// Get owner B's payment methods
			const ownerBMethods = await fetchAsUser<{ paymentMethods: any[] }>(
				ownerB,
				'/api/v1/payment-methods'
			)

			if (ownerBMethods.paymentMethods.length > 0) {
				const methodId = ownerBMethods.paymentMethods[0].id

				// owner A tries to use owner B's payment method
				await expectForbidden(ownerA, '/api/v1/rent-payments', {
					method: 'POST',
					body: JSON.stringify({
						tenantId: 'some-tenant-id',
						leaseId: 'some-lease-id',
						amount: 100000,
						paymentMethodId: methodId // owner B's payment method
					})
				})
			}
		})

		it("tenant cannot read owner's payment methods", async () => {
			// Get owner A's payment methods
			const ownerAMethods = await fetchAsUser<{ paymentMethods: any[] }>(
				ownerA,
				'/api/v1/payment-methods'
			)

			if (ownerAMethods.paymentMethods.length > 0) {
				const methodId = ownerAMethods.paymentMethods[0].id

				// Tenant tries to read owner A's payment method
				await expectNotFound(tenantA, `/api/v1/payment-methods/${methodId}`)
			}
		})
	})

	// ========================================
	// Tenant Data Isolation Tests
	// ========================================

	describeIfReady('Tenant Data Isolation', () => {
		it("tenant A cannot read tenant B's profile", async () => {
			// Get Tenant B's ID (assuming it's stored in user object)
			const tenantBId = tenantB.user!.id

			// Tenant A tries to read Tenant B's profile
			await expectForbidden(tenantA, `/api/v1/tenants/${tenantBId}`)
		})

		it("tenant A cannot update tenant B's profile", async () => {
			const tenantBId = tenantB.user!.id

			// Tenant A tries to update Tenant B's profile
			await expectForbidden(tenantA, `/api/v1/tenants/${tenantBId}`, {
				method: 'PUT',
				body: JSON.stringify({
					firstName: 'Unauthorized Update'
				})
			})
		})

		it("tenant A cannot read tenant B's emergency contact", async () => {
			const tenantBId = tenantB.user!.id

			// Tenant A tries to read Tenant B's emergency contact
			await expectForbidden(
				tenantA,
				`/api/v1/tenants/${tenantBId}/emergency-contact`
			)
		})

		it("tenant A cannot read tenant B's notification preferences", async () => {
			const tenantBId = tenantB.user!.id

			// Tenant A tries to read Tenant B's notification preferences
			await expectForbidden(
				tenantA,
				`/api/v1/tenants/${tenantBId}/notification-preferences`
			)
		})
	})

	// ========================================
	// Lease Data Isolation Tests
	// ========================================

	describeIfReady('Lease Data Isolation', () => {
		it("owner A cannot read owner B's leases", async () => {
			// Get owner B's leases
			const ownerBLeases = await fetchAsUser<{ leases: any[] }>(
				ownerB,
				'/api/v1/leases'
			)

			if (ownerBLeases.leases.length > 0) {
				const leaseId = ownerBLeases.leases[0].id

				// owner A tries to read owner B's lease
				await expectNotFound(ownerA, `/api/v1/leases/${leaseId}`)
			}
		})

		it("tenant A cannot read tenant B's lease", async () => {
			// Get Tenant B's current lease
			const tenantBLease = await fetchAsUser<{ lease: any }>(
				tenantB,
				'/api/v1/leases/current'
			)

			if (tenantBLease.lease) {
				const leaseId = tenantBLease.lease.id

				// Tenant A tries to read Tenant B's lease
				await expectNotFound(tenantA, `/api/v1/leases/${leaseId}`)
			}
		})
	})

	// ========================================
	// Maintenance Request Isolation Tests
	// ========================================

	describeIfReady('Maintenance Request Isolation', () => {
		it("tenant A cannot read tenant B's maintenance requests", async () => {
			// Get Tenant B's maintenance requests
			const tenantBRequests = await fetchAsUser<{ requests: any[] }>(
				tenantB,
				'/api/v1/maintenance-requests'
			)

			if (tenantBRequests.requests.length > 0) {
				const requestId = tenantBRequests.requests[0].id

				// Tenant A tries to read Tenant B's maintenance request
				await expectNotFound(
					tenantA,
					`/api/v1/maintenance-requests/${requestId}`
				)
			}
		})

		it("owner A cannot read owner B's maintenance requests", async () => {
			// Get owner B's maintenance requests
			const ownerBRequests = await fetchAsUser<{ requests: any[] }>(
				ownerB,
				'/api/v1/maintenance-requests'
			)

			if (ownerBRequests.requests.length > 0) {
				const requestId = ownerBRequests.requests[0].id

				// owner A tries to read owner B's maintenance request
				await expectNotFound(
					ownerA,
					`/api/v1/maintenance-requests/${requestId}`
				)
			}
		})
	})
})

// ========================================
// Setup Instructions
// ========================================

/**
 * TO RUN THESE TESTS:
 *
 * 1. Create test accounts in Supabase Auth:
 *    - 2 owner accounts (with different auth_user_ids)
 *    - 2 tenant accounts (with different auth_user_ids)
 *
 * 2. Add test credentials to .env.test:
 *    E2E_owner_A_EMAIL=owner-a@test.com
 *    E2E_owner_A_PASSWORD=SecurePassword123!
 *    E2E_owner_B_EMAIL=owner-b@test.com
 *    E2E_owner_B_PASSWORD=SecurePassword123!
 *    E2E_TENANT_A_EMAIL=tenant-a@test.com
 *    E2E_TENANT_A_PASSWORD=SecurePassword123!
 *    E2E_TENANT_B_EMAIL=tenant-b@test.com
 *    E2E_TENANT_B_PASSWORD=SecurePassword123!
 *
 * 3. Remove the .skip from describe.skip() above
 *
 * 4. Run tests:
 *    pnpm --filter @repo/frontend test:integration rls-boundary
 *
 * SECURITY NOTES:
 * - These tests verify that RLS policies are correctly enforced
 * - Failures indicate critical security vulnerabilities
 * - All tests should pass before deploying to production
 * - Payment method isolation is required for PCI DSS compliance
 */
