/**
 * RLS (Row Level Security) Boundary Integration Tests
 *
 * Tests that data isolation between users is properly enforced at the database level.
 * These tests verify that:
 * 1. User A cannot access User B's data
 * 2. Tenants cannot access landlord-only endpoints
 * 3. Payment methods are isolated per user (PCI compliance requirement)
 *
 * REQUIREMENTS:
 * - Multiple test accounts must be created in Supabase Auth before running these tests
 * - Test accounts need environment variables in .env.test:
 *   - E2E_LANDLORD_A_EMAIL/PASSWORD
 *   - E2E_LANDLORD_B_EMAIL/PASSWORD
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
	const supabase = createBrowserClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
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
	const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoint}`

	const response = await fetch(url, {
		...options,
		headers: {
			...options?.headers,
			'Content-Type': 'application/json',
			Authorization: `Bearer ${user.session!.access_token}`
		}
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(
			`API request failed (${response.status}): ${errorText}`
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
	let landlordA: TestUser
	let landlordB: TestUser
	let tenantA: TestUser
	let tenantB: TestUser

	// Test data IDs for cleanup
	let landlordAPropertyId: string
	let landlordBPropertyId: string
	let landlordAPaymentMethodId: string
	let landlordBPaymentMethodId: string

	beforeAll(async () => {
		// Authenticate all test users
		// These accounts must exist in Supabase Auth
		landlordA = await authenticateTestUser(
			process.env.E2E_LANDLORD_A_EMAIL!,
			process.env.E2E_LANDLORD_A_PASSWORD!
		)

		landlordB = await authenticateTestUser(
			process.env.E2E_LANDLORD_B_EMAIL!,
			process.env.E2E_LANDLORD_B_PASSWORD!
		)

		tenantA = await authenticateTestUser(
			process.env.E2E_TENANT_A_EMAIL!,
			process.env.E2E_TENANT_A_PASSWORD!
		)

		tenantB = await authenticateTestUser(
			process.env.E2E_TENANT_B_EMAIL!,
			process.env.E2E_TENANT_B_PASSWORD!
		)

		// Create test data for each landlord
		const propertyA = await fetchAsUser<Property>(landlordA, '/api/v1/properties', {
			method: 'POST',
			body: JSON.stringify({
				name: 'RLS Test Property A',
				propertyType: 'APARTMENT'
			} as CreatePropertyInput)
		})
		landlordAPropertyId = propertyA.id

		const propertyB = await fetchAsUser<Property>(landlordB, '/api/v1/properties', {
			method: 'POST',
			body: JSON.stringify({
				name: 'RLS Test Property B',
				propertyType: 'APARTMENT'
			} as CreatePropertyInput)
		})
		landlordBPropertyId = propertyB.id
	})

	afterAll(async () => {
		// Cleanup: Delete test data
		if (landlordAPropertyId) {
			try {
				await fetchAsUser(landlordA, `/api/v1/properties/${landlordAPropertyId}`, {
					method: 'DELETE'
				})
			} catch (error) {
				console.warn('Failed to cleanup landlordA property:', error)
			}
		}

		if (landlordBPropertyId) {
			try {
				await fetchAsUser(landlordB, `/api/v1/properties/${landlordBPropertyId}`, {
					method: 'DELETE'
				})
			} catch (error) {
				console.warn('Failed to cleanup landlordB property:', error)
			}
		}
	})

	// ========================================
	// Cross-User Property Isolation Tests
	// ========================================

	describe('Property Isolation', () => {
		it('landlord A cannot read landlord B\'s properties', async () => {
			// Landlord A tries to fetch Landlord B's property by ID
			await expectNotFound(landlordA, `/api/v1/properties/${landlordBPropertyId}`)
		})

		it('landlord B cannot read landlord A\'s properties', async () => {
			// Landlord B tries to fetch Landlord A's property by ID
			await expectNotFound(landlordB, `/api/v1/properties/${landlordAPropertyId}`)
		})

		it('landlord A cannot update landlord B\'s properties', async () => {
			// Landlord A tries to update Landlord B's property
			await expectForbidden(landlordA, `/api/v1/properties/${landlordBPropertyId}`, {
				method: 'PUT',
				body: JSON.stringify({
					name: 'Unauthorized Update'
				})
			})
		})

		it('landlord A cannot delete landlord B\'s properties', async () => {
			// Landlord A tries to delete Landlord B's property
			await expectForbidden(landlordA, `/api/v1/properties/${landlordBPropertyId}`, {
				method: 'DELETE'
			})
		})

		it('landlord A can only see their own properties in list endpoint', async () => {
			const response = await fetchAsUser<{ properties: Property[] }>(
				landlordA,
				'/api/v1/properties'
			)

			// Verify landlordA only sees their own property
			expect(response.properties.some(p => p.id === landlordAPropertyId)).toBe(true)
			expect(response.properties.some(p => p.id === landlordBPropertyId)).toBe(false)
		})
	})

	// ========================================
	// Role-Based Access Tests (Tenant vs Landlord)
	// ========================================

	describe('Role-Based Access', () => {
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
			await expectForbidden(tenantA, `/api/v1/properties/${landlordAPropertyId}`, {
				method: 'PUT',
				body: JSON.stringify({
					name: 'Unauthorized Update'
				})
			})
		})

		it('tenant cannot delete properties', async () => {
			await expectForbidden(tenantA, `/api/v1/properties/${landlordAPropertyId}`, {
				method: 'DELETE'
			})
		})

		it('tenant cannot access landlord dashboard endpoints', async () => {
			await expectForbidden(tenantA, '/api/v1/dashboard/landlord-stats')
		})

		it('landlord cannot access tenant-only endpoints', async () => {
			await expectForbidden(landlordA, '/api/v1/tenant/profile')
		})
	})

	// ========================================
	// Payment Method Isolation Tests (PCI Compliance)
	// ========================================

	describe('Payment Method Isolation (PCI Compliance)', () => {
		it('landlord A cannot read landlord B\'s payment methods', async () => {
			// Get Landlord B's payment methods
			const landlordBMethods = await fetchAsUser<{ paymentMethods: any[] }>(
				landlordB,
				'/api/v1/payment-methods'
			)

			if (landlordBMethods.paymentMethods.length > 0) {
				const methodId = landlordBMethods.paymentMethods[0].id

				// Landlord A tries to read Landlord B's payment method
				await expectNotFound(landlordA, `/api/v1/payment-methods/${methodId}`)
			}
		})

		it('landlord A cannot use landlord B\'s payment method for rent payment', async () => {
			// Get Landlord B's payment methods
			const landlordBMethods = await fetchAsUser<{ paymentMethods: any[] }>(
				landlordB,
				'/api/v1/payment-methods'
			)

			if (landlordBMethods.paymentMethods.length > 0) {
				const methodId = landlordBMethods.paymentMethods[0].id

				// Landlord A tries to use Landlord B's payment method
				await expectForbidden(landlordA, '/api/v1/rent-payments', {
					method: 'POST',
					body: JSON.stringify({
						tenantId: 'some-tenant-id',
						leaseId: 'some-lease-id',
						amount: 100000,
						paymentMethodId: methodId // Landlord B's payment method
					})
				})
			}
		})

		it('tenant cannot read landlord\'s payment methods', async () => {
			// Get Landlord A's payment methods
			const landlordAMethods = await fetchAsUser<{ paymentMethods: any[] }>(
				landlordA,
				'/api/v1/payment-methods'
			)

			if (landlordAMethods.paymentMethods.length > 0) {
				const methodId = landlordAMethods.paymentMethods[0].id

				// Tenant tries to read Landlord A's payment method
				await expectNotFound(tenantA, `/api/v1/payment-methods/${methodId}`)
			}
		})
	})

	// ========================================
	// Tenant Data Isolation Tests
	// ========================================

	describe('Tenant Data Isolation', () => {
		it('tenant A cannot read tenant B\'s profile', async () => {
			// Get Tenant B's ID (assuming it's stored in user object)
			const tenantBId = tenantB.user!.id

			// Tenant A tries to read Tenant B's profile
			await expectForbidden(tenantA, `/api/v1/tenants/${tenantBId}`)
		})

		it('tenant A cannot update tenant B\'s profile', async () => {
			const tenantBId = tenantB.user!.id

			// Tenant A tries to update Tenant B's profile
			await expectForbidden(tenantA, `/api/v1/tenants/${tenantBId}`, {
				method: 'PUT',
				body: JSON.stringify({
					firstName: 'Unauthorized Update'
				})
			})
		})

		it('tenant A cannot read tenant B\'s emergency contact', async () => {
			const tenantBId = tenantB.user!.id

			// Tenant A tries to read Tenant B's emergency contact
			await expectForbidden(tenantA, `/api/v1/tenants/${tenantBId}/emergency-contact`)
		})

		it('tenant A cannot read tenant B\'s notification preferences', async () => {
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

	describe('Lease Data Isolation', () => {
		it('landlord A cannot read landlord B\'s leases', async () => {
			// Get Landlord B's leases
			const landlordBLeases = await fetchAsUser<{ leases: any[] }>(
				landlordB,
				'/api/v1/leases'
			)

			if (landlordBLeases.leases.length > 0) {
				const leaseId = landlordBLeases.leases[0].id

				// Landlord A tries to read Landlord B's lease
				await expectNotFound(landlordA, `/api/v1/leases/${leaseId}`)
			}
		})

		it('tenant A cannot read tenant B\'s lease', async () => {
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

	describe('Maintenance Request Isolation', () => {
		it('tenant A cannot read tenant B\'s maintenance requests', async () => {
			// Get Tenant B's maintenance requests
			const tenantBRequests = await fetchAsUser<{ requests: any[] }>(
				tenantB,
				'/api/v1/maintenance-requests'
			)

			if (tenantBRequests.requests.length > 0) {
				const requestId = tenantBRequests.requests[0].id

				// Tenant A tries to read Tenant B's maintenance request
				await expectNotFound(tenantA, `/api/v1/maintenance-requests/${requestId}`)
			}
		})

		it('landlord A cannot read landlord B\'s maintenance requests', async () => {
			// Get Landlord B's maintenance requests
			const landlordBRequests = await fetchAsUser<{ requests: any[] }>(
				landlordB,
				'/api/v1/maintenance-requests'
			)

			if (landlordBRequests.requests.length > 0) {
				const requestId = landlordBRequests.requests[0].id

				// Landlord A tries to read Landlord B's maintenance request
				await expectNotFound(landlordA, `/api/v1/maintenance-requests/${requestId}`)
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
 *    - 2 landlord accounts (with different auth_user_ids)
 *    - 2 tenant accounts (with different auth_user_ids)
 *
 * 2. Add test credentials to .env.test:
 *    E2E_LANDLORD_A_EMAIL=landlord-a@test.com
 *    E2E_LANDLORD_A_PASSWORD=SecurePassword123!
 *    E2E_LANDLORD_B_EMAIL=landlord-b@test.com
 *    E2E_LANDLORD_B_PASSWORD=SecurePassword123!
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
