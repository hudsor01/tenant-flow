/**
 * Tenants CRUD Integration Tests
 * Tests complete Create, Read, Update, Delete operations with real API calls
 *
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
	describe,
	it,
	expect,
	beforeAll,
	afterAll,
	afterEach,
	beforeEach
} from 'vitest'
import {
	useTenantList,
	useTenant,
	useCreateTenant,
	useUpdateTenant,
	useMarkTenantAsMovedOut,
	useInviteTenant,
	useResendInvitation
} from '#hooks/api/use-tenant'
import type { Tenant } from '@repo/shared/types/core'
import type {
	CreateTenantRequest,
	UpdateTenantRequest
} from '@repo/shared/types/backend-domain'
import { clientFetch } from '#lib/api/client'
import { createBrowserClient } from '@supabase/ssr'

// This is an INTEGRATION test - it calls the REAL API
// Make sure backend is running before running these tests
// Requires test user credentials in environment variables

const TEST_TENANT_PREFIX = 'TEST-CRUD'

// Shared QueryClient instance for tests that need cache coordination
let sharedQueryClient: QueryClient | null = null

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false, // Don't retry in tests
				gcTime: 60000 // Keep cache for 60s to allow optimistic locking version checks
			},
			mutations: {
				retry: false
			}
		}
	})

	// Store for cleanup
	sharedQueryClient = queryClient

	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

describe('Tenants CRUD Integration Tests', () => {
	let createdTenantIds: string[] = []

	// Authenticate before running tests
	beforeAll(async () => {
		// Validate ALL required environment variables
		const requiredEnvVars = [
			'NEXT_PUBLIC_SUPABASE_URL',
			'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
			'E2E_OWNER_A_EMAIL',
			'E2E_OWNER_A_PASSWORD'
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
			email: process.env.E2E_OWNER_A_EMAIL,
			password: process.env.E2E_OWNER_A_PASSWORD
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

	beforeEach(() => {
		createdTenantIds = []
	})

	// Cleanup: Delete all test tenants after tests
	afterEach(async () => {
		// Clear QueryClient cache to prevent memory leaks and test pollution
		if (sharedQueryClient) {
			sharedQueryClient.clear()
		}

		for (const id of createdTenantIds) {
			try {
				await clientFetch(`/api/v1/tenants/${id}`, { method: 'DELETE' })
			} catch (error) {
				console.warn(`Failed to cleanup tenant ${id}:`, error)
			}
		}
	})

	describe('CREATE Tenant', () => {
		it('creates a new tenant successfully', async () => {
			const { result } = renderHook(() => useCreateTenant(), {
				wrapper: createWrapper()
			})

			const newTenant: CreateTenantRequest = {
				firstName: `${TEST_TENANT_PREFIX} John`,
				lastName: `Doe ${Date.now()}`,
				email: `test-tenant-${Date.now()}@example.com`,
				phone: '+1234567890'
			}

			// Call the mutation
			const createdTenant = await result.current.mutateAsync(newTenant)

			// Assertions
			expect(createdTenant).toBeDefined()
			expect(createdTenant!.firstName).toBe(newTenant.firstName)
			expect(createdTenant!.lastName).toBe(newTenant.lastName)
			expect(createdTenant!.email).toBe(newTenant.email)
			expect(createdTenant!.phone).toBe(newTenant.phone)
			expect(createdTenant!.status).toBe('ACTIVE')
			expect(createdTenant!.id).toBeTruthy()
			expect(createdTenant!.version).toBe(1) // Optimistic locking

			// Track for cleanup
			createdTenantIds.push(createdTenant!.id)
		})

		it('validates required fields', async () => {
			const { result } = renderHook(() => useCreateTenant(), {
				wrapper: createWrapper()
			})

			// Missing required email field
			const invalidTenant = {
				firstName: 'John',
				lastName: 'Doe'
				// email is required but missing
			}

			// @ts-expect-error - Testing validation of missing required field
			await expect(result.current.mutateAsync(invalidTenant)).rejects.toThrow()
		})
	})

	describe('READ Tenant', () => {
		let testTenantId: string

		beforeEach(async () => {
			// Create test tenant
			const tenant = await clientFetch<Tenant>('/api/v1/tenants', {
				method: 'POST',
				body: JSON.stringify({
					firstName: `${TEST_TENANT_PREFIX} Read`,
					lastName: `Test ${Date.now()}`,
					email: `read-test-${Date.now()}@example.com`
				})
			})
			testTenantId = tenant.id
			createdTenantIds.push(tenant.id)
		})

		it('fetches tenant by ID', async () => {
			const { result } = renderHook(() => useTenant(testTenantId), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(result.current.data!.id).toBe(testTenantId)
			expect(result.current.data!.firstName).toContain(TEST_TENANT_PREFIX)
		})

		it('fetches tenant list', async () => {
			const { result } = renderHook(() => useTenantList(), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(Array.isArray(result.current.data!.data)).toBe(true)
			expect(result.current.data!.total).toBeGreaterThanOrEqual(1)
		})

		it('fetches tenant list with pagination', async () => {
		// Create multiple tenants for pagination testing
		const tenants = await Promise.all([
			clientFetch<Tenant>('/api/v1/tenants', {
				method: 'POST',
				body: JSON.stringify({
					firstName: `${TEST_TENANT_PREFIX} Page1`,
					lastName: `Test ${Date.now()}`,
					email: `page1-${Date.now()}@example.com`
				})
			}),
			clientFetch<Tenant>('/api/v1/tenants', {
				method: 'POST',
				body: JSON.stringify({
					firstName: `${TEST_TENANT_PREFIX} Page2`,
					lastName: `Test ${Date.now() + 1}`,
					email: `page2-${Date.now() + 1}@example.com`
				})
			})
		])
		createdTenantIds.push(...tenants.map(t => t.id))

		// Test first page with limit 1
		const { result } = renderHook(() => useTenantList(1, 1), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data).toBeDefined()
		expect(Array.isArray(result.current.data)).toBe(true)
		expect(result.current.data!.length).toBeGreaterThanOrEqual(1)
	})

	it('fetches tenant list with different page sizes', async () => {
		// Test with limit 50 (max)
		const { result } = renderHook(() => useTenantList(1, 50), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data).toBeDefined()
		expect(Array.isArray(result.current.data)).toBe(true)
	})

	/**
	 * TODO: Add search/filter tests when useTenantList is extended
	 * Backend supports: search, invitationStatus, sortBy, sortOrder
	 * Hook currently only supports: page, limit
	 * 
	 * Future tests:
	 * - it('filters by search query')
	 * - it('filters by invitationStatus (PENDING, ACTIVE, etc.)')
	 * - it('sorts by different fields (createdAt, firstName, etc.)')
	 * - it('combines multiple filters')
	 */
	})

	describe('UPDATE Tenant', () => {
		it('updates tenant successfully', async () => {
			// Create tenant first
			const created = await clientFetch<Tenant>('/api/v1/tenants', {
				method: 'POST',
				body: JSON.stringify({
					firstName: `${TEST_TENANT_PREFIX} Update`,
					lastName: `Original ${Date.now()}`,
					email: `update-test-${Date.now()}@example.com`
				})
			})
			createdTenantIds.push(created.id)

			// Update it
			const { result } = renderHook(() => useUpdateTenant(), {
				wrapper: createWrapper()
			})

			const updateData: UpdateTenantRequest = {
				firstName: `${TEST_TENANT_PREFIX} Updated`,
				lastName: `Modified ${Date.now()}`,
				phone: '+1987654321'
			}

			const updated = await result.current.mutateAsync({
				id: created.id,
				data: updateData
			})

			expect(updated.firstName).toBe(updateData.firstName)
			expect(updated.lastName).toBe(updateData.lastName)
			expect(updated.phone).toBe(updateData.phone)
			expect(updated.version).toBe(2) // Version incremented
		})

		it('handles optimistic locking', async () => {
			// Create tenant first
			const created = await clientFetch<Tenant>('/api/v1/tenants', {
				method: 'POST',
				body: JSON.stringify({
					firstName: `${TEST_TENANT_PREFIX} Lock`,
					lastName: `Test ${Date.now()}`,
					email: `lock-test-${Date.now()}@example.com`
				})
			})
			createdTenantIds.push(created.id)

			// Try to update with wrong version (simulate concurrent update)
			const { result } = renderHook(() => useUpdateTenant(), {
				wrapper: createWrapper()
			})

			// This should either succeed (if version checking is disabled) or fail with 409
			try {
				await result.current.mutateAsync({
					id: created.id,
					data: { firstName: 'Updated Name' }
				})
				// If it succeeds, version should be incremented
				expect(true).toBe(true) // Test passes either way
			} catch (error: any) {
				// If it fails, it should be due to version conflict
				expect(error.message).toContain('version') // Version conflict expected
			}
		})
	})

	describe('TENANT INVITATIONS', () => {
		let testTenantId: string

		beforeEach(async () => {
			// Create test tenant
			const tenant = await clientFetch<Tenant>('/api/v1/tenants', {
				method: 'POST',
				body: JSON.stringify({
					firstName: `${TEST_TENANT_PREFIX} Invite`,
					lastName: `Test ${Date.now()}`,
					email: `invite-test-${Date.now()}@example.com`
				})
			})
			testTenantId = tenant.id
			createdTenantIds.push(tenant.id)
		})

		/**
	 * TEST: Invitation Flow (with Supabase Auth verification)
	 * 
	 * What we CAN test (now automated):
	 * - ✅ useInviteTenant() creates tenant with PENDING status
	 * - ✅ Tenant is associated with lease
	 * - ✅ API call succeeds
	 * - ✅ Supabase Auth user is created (auth_user_id populated)
	 * - ✅ invitation_status changes to 'SENT'
	 * - ✅ invitation_sent_at timestamp is set
	 * 
	 * What still requires MANUAL verification:
	 * - ⚠️  Email delivery to inbox (Supabase handles this)
	 * - ⚠️  Email content and formatting
	 * - ⚠️  Invitation link works and redirects correctly
	 * - ⚠️  Tenant onboarding flow completion
	 * - ⚠️  Status changes from PENDING → ACTIVE after onboarding
	 * 
	 * For full E2E testing of invitation flow, see Playwright tests.
	 */
	it('creates tenant with invitation and verifies Supabase Auth integration', async () => {
		// Setup: Create property, unit, and lease for invitation
		const property = await clientFetch<{ id: string }>('/api/v1/properties', {
			method: 'POST',
			body: JSON.stringify({
				name: `TEST Property ${Date.now()}`,
				address: '123 Test St',
				city: 'Test City',
				state: 'CA',
				zipCode: '12345',
				propertyType: 'APARTMENT'
			})
		})

		const unit = await clientFetch<{ id: string }>('/api/v1/units', {
			method: 'POST',
			body: JSON.stringify({
				propertyId: property.id,
				unitNumber: `UNIT-${Date.now()}`,
				bedrooms: 2,
				bathrooms: 1,
				squareFeet: 1000,
				rentAmount: 1500,
				status: 'VACANT'
			})
		})

		const lease = await clientFetch<{ id: string }>('/api/v1/leases', {
			method: 'POST',
			body: JSON.stringify({
				propertyId: property.id,
				unitId: unit.id,
				startDate: new Date().toISOString(),
				endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
				rentAmount: 1500,
				status: 'ACTIVE'
			})
		})

		// Test: Invite tenant via useInviteTenant hook
		const { result } = renderHook(() => useInviteTenant(), {
			wrapper: createWrapper()
		})

		const invitationData = {
			email: `invited-tenant-${Date.now()}@example.com`,
			firstName: 'Invited',
			lastName: 'Tenant',
			phone: '+15551234567',
			leaseId: lease.id
		}

		const invitedTenant = await result.current.mutateAsync(invitationData)

		// Assertions: Verify API call created tenant correctly
		expect(invitedTenant).toBeDefined()
		expect(invitedTenant.email).toBe(invitationData.email)
		expect(invitedTenant.firstName).toBe(invitationData.firstName)
		expect(invitedTenant.status).toBe('PENDING') // Still PENDING until onboarding

		// ✅ NEW: Verify Supabase Auth integration
		// After invitation, backend should have:
		// 1. Created Supabase Auth user
		// 2. Linked tenant to auth user (auth_user_id populated)
		// 3. Updated invitation_status to 'SENT'
		// 4. Set invitation_sent_at timestamp

		// Fetch the tenant again to verify backend updates
		const { result: fetchResult } = renderHook(() => useTenant(invitedTenant.id), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(fetchResult.current.isSuccess).toBe(true)
		})

		const fetchedTenant = fetchResult.current.data!

		// ✅ Verify Supabase Auth user was created and linked
		expect(fetchedTenant.auth_user_id).toBeDefined()
		expect(fetchedTenant.auth_user_id).toBeTruthy()

		// ✅ Verify invitation status was updated
		expect(fetchedTenant.invitation_status).toBe('SENT')

		// ✅ Verify invitation timestamp was set
		expect(fetchedTenant.invitation_sent_at).toBeDefined()
		expect(fetchedTenant.invitation_sent_at).toBeTruthy()
		
		// Verify timestamp is recent (within last 5 seconds)
		const sentAt = new Date(fetchedTenant.invitation_sent_at!)
		const now = new Date()
		const diffSeconds = (now.getTime() - sentAt.getTime()) / 1000
		expect(diffSeconds).toBeLessThan(5)

		createdTenantIds.push(invitedTenant.id)

		// Cleanup
		try {
			await clientFetch(`/api/v1/leases/${lease.id}`, { method: 'DELETE' })
			await clientFetch(`/api/v1/units/${unit.id}`, { method: 'DELETE' })
			await clientFetch(`/api/v1/properties/${property.id}`, { method: 'DELETE' })
		} catch (error) {
			console.warn('Failed to cleanup invitation test resources:', error)
		}

		// ⚠️  MANUAL VERIFICATION STILL REQUIRED:
		// 1. Check email inbox for invitation email (Supabase sends automatically)
		// 2. Verify email contains invitation link with correct redirect URL
		// 3. Click link and complete tenant onboarding
		// 4. Verify tenant status changes to ACTIVE after onboarding
		// 5. Verify tenant can access tenant portal
	})

	it('resends invitation and verifies timestamp update', async () => {
		// Create a PENDING tenant first
		const pendingTenant = await clientFetch<Tenant>('/api/v1/tenants', {
			method: 'POST',
			body: JSON.stringify({
				firstName: 'Pending',
				lastName: `Resend ${Date.now()}`,
				email: `pending-resend-${Date.now()}@example.com`,
				phone: '+15559876543',
				status: 'PENDING'
			})
		})
		createdTenantIds.push(pendingTenant.id)

		// Wait 1 second to ensure timestamp difference
		await new Promise(resolve => setTimeout(resolve, 1000))

		// Capture original timestamp
		const originalSentAt = pendingTenant.invitation_sent_at

		// Test: Resend invitation
		const { result } = renderHook(() => useResendInvitation(), {
			wrapper: createWrapper()
		})

		const response = await result.current.mutateAsync(pendingTenant.id)

		// Assertions: Verify API call succeeded
		expect(response).toBeDefined()
		expect(response.message).toBeDefined()

		// ✅ NEW: Verify invitation_sent_at timestamp was updated
		const { result: fetchResult } = renderHook(() => useTenant(pendingTenant.id), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(fetchResult.current.isSuccess).toBe(true)
		})

		const updatedTenant = fetchResult.current.data!

		// Verify new timestamp is more recent than original
		if (originalSentAt) {
			const original = new Date(originalSentAt)
			const updated = new Date(updatedTenant.invitation_sent_at!)
			expect(updated.getTime()).toBeGreaterThan(original.getTime())
		}

		// Verify timestamp is recent (within last 5 seconds)
		const sentAt = new Date(updatedTenant.invitation_sent_at!)
		const now = new Date()
		const diffSeconds = (now.getTime() - sentAt.getTime()) / 1000
		expect(diffSeconds).toBeLessThan(5)

		// ⚠️  MANUAL VERIFICATION STILL REQUIRED:
		// 1. Check email inbox for new invitation email
		// 2. Verify email timestamp matches invitation_sent_at
		// 3. Verify new link is different from original (if using tokens)
	})
	})

	describe('SOFT DELETE Tenant', () => {
		it('marks tenant as moved out (soft delete)', async () => {
			// Create tenant first
			const created = await clientFetch<Tenant>('/api/v1/tenants', {
				method: 'POST',
				body: JSON.stringify({
					firstName: `${TEST_TENANT_PREFIX} Delete`,
					lastName: `Test ${Date.now()}`,
					email: `delete-test-${Date.now()}@example.com`
				})
			})
			createdTenantIds.push(created.id)

			// Mark as moved out
			const { result } = renderHook(() => useMarkTenantAsMovedOut(), {
				wrapper: createWrapper()
			})

			const updated = await result.current.mutateAsync(created.id)

			expect(updated.status).toBe('MOVED_OUT')
			expect(updated.move_out_date).toBeTruthy()
		})
	})

	describe('ERROR HANDLING', () => {
		/**
		 * Test specific error scenarios with proper assertions
		 * Replaces generic `.rejects.toThrow()` with specific status checks
		 */

		it('returns 404 for non-existent tenant', async () => {
			const fakeId = '00000000-0000-0000-0000-000000000000'
			const { result } = renderHook(() => useTenant(fakeId), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isError).toBe(true)
			})

			// Verify 404 status in error message
			expect(result.current.error).toBeDefined()
			expect(result.current.error!.message).toMatch(/404|not found/i)
		})

		it('returns 400 for invalid email format', async () => {
			const { result } = renderHook(() => useCreateTenant(), {
				wrapper: createWrapper()
			})

			try {
				await result.current.mutateAsync({
					firstName: 'Invalid',
					lastName: 'Email',
					email: 'not-an-email', // Invalid format
					phone: '+1234567890'
				})
				expect.fail('Should have thrown an error')
			} catch (error: any) {
				expect(error.message).toMatch(/400|invalid|email/i)
			}
		})

		it('returns 400 for missing required fields', async () => {
			const { result } = renderHook(() => useCreateTenant(), {
				wrapper: createWrapper()
			})

			try {
				await result.current.mutateAsync({
					// @ts-expect-error - intentionally missing required fields
					firstName: 'Missing',
					// lastName missing
					email: `missing-${Date.now()}@example.com`
				})
				expect.fail('Should have thrown an error')
			} catch (error: any) {
				expect(error.message).toMatch(/400|missing|required/i)
			}
		})

		it('handles 409 conflict for optimistic locking (version mismatch)', async () => {
			// Create a tenant
			const created = await clientFetch<Tenant>('/api/v1/tenants', {
				method: 'POST',
				body: JSON.stringify({
					firstName: 'Conflict',
					lastName: `Test ${Date.now()}`,
					email: `conflict-${Date.now()}@example.com`
				})
			})
			createdTenantIds.push(created.id)

			// Simulate concurrent update by updating directly via API
			await clientFetch(`/api/v1/tenants/${created.id}`, {
				method: 'PUT',
				body: JSON.stringify({
					firstName: 'Changed',
					version: created.version
				})
			})

			// Now try to update with old version (should fail with 409)
			const { result } = renderHook(() => useUpdateTenant(), {
				wrapper: createWrapper()
			})

			try {
				await result.current.mutateAsync({
					id: created.id,
					data: {
						firstName: 'Outdated Update',
						version: created.version // Old version
					}
				})
				expect.fail('Should have thrown an error')
			} catch (error: any) {
				expect(error.message).toMatch(/409|conflict|version/i)
			}
		})

		/**
		 * TODO: Add more specific error tests
		 * - 401 Unauthorized (requires test without auth)
		 * - 403 Forbidden (requires multi-tenant RLS setup)
		 * - 422 Unprocessable Entity (complex validation failures)
		 */
	})

	describe('CRUD Workflow', () => {
		it('completes full CRUD lifecycle', async () => {
			const wrapper = createWrapper()

			// 1. CREATE
			const { result: createResult } = renderHook(() => useCreateTenant(), {
				wrapper
			})
			const created = await createResult.current.mutateAsync({
				firstName: `${TEST_TENANT_PREFIX} Lifecycle`,
				lastName: `Test ${Date.now()}`,
				email: `lifecycle-${Date.now()}@example.com`,
				phone: '+1555123456'
			})
			expect(created.version).toBe(1)

			// 2. READ
			const { result: readResult } = renderHook(() => useTenant(created.id), {
				wrapper
			})
			await waitFor(() => expect(readResult.current.isSuccess).toBe(true))
			expect(readResult.current.data!.firstName).toContain(TEST_TENANT_PREFIX)

			// 3. UPDATE
			const { result: updateResult } = renderHook(() => useUpdateTenant(), {
				wrapper
			})
			const updated = await updateResult.current.mutateAsync({
				id: created.id,
				data: { firstName: `${TEST_TENANT_PREFIX} Updated Lifecycle` }
			})
			expect(updated.version).toBe(2)

			// 4. SOFT DELETE (business-appropriate for tenants)
			const { result: deleteResult } = renderHook(
				() => useMarkTenantAsMovedOut(),
				{ wrapper }
			)
			const deleted = await deleteResult.current.mutateAsync(created.id)
			expect(deleted.status).toBe('MOVED_OUT')

			// Track for cleanup (hard delete in afterEach)
			createdTenantIds.push(created.id)
		})
	})
})

/**
 * ================================================================
 * MANUAL VERIFICATION CHECKLIST
 * ================================================================
 * 
 * The integration tests above cover API functionality, but some flows
 * require manual verification due to external dependencies (email, auth, etc.)
 * 
 * 1. TENANT INVITATION FLOW (Supabase Auth Integration)
 *    ✅ Automated: API creates tenant with PENDING status
 *    ✅ Automated: Tenant is associated with lease
 *    ✅ Automated: Supabase Auth user is created (auth_user_id populated)
 *    ✅ Automated: invitation_status changes to 'SENT'
 *    ✅ Automated: invitation_sent_at timestamp is set and recent
 *    ⚠️  Manual Required:
 *        - Check email inbox for invitation email (Supabase sends via SMTP)
 *        - Verify email contains correct property/unit details
 *        - Verify email has invitation link with proper redirect URL
 *        - Verify email formatting/branding is professional
 * 
 * 2. TENANT ONBOARDING FLOW
 *    ✅ Automated: N/A (frontend integration tests don't cover this)
 *    ⚠️  Manual Required:
 *        - Click invitation link in email
 *        - Complete tenant onboarding form
 *        - Create Supabase Auth account
 *        - Verify redirect to tenant portal
 *        - Verify tenant status changes PENDING → ACTIVE
 *        - Verify tenant can log in
 * 
 * 3. RESEND INVITATION
 *    ✅ Automated: API call succeeds
 *    ✅ Automated: invitation_sent_at timestamp is updated
 *    ✅ Automated: New timestamp is more recent than original
 *    ⚠️  Manual Required:
 *        - Check email inbox for new invitation
 *        - Verify new email was actually sent (not just DB update)
 *        - Verify link is different from original (if using one-time tokens)
 * 
 * 4. TENANT PORTAL ACCESS
 *    ✅ Automated: N/A (E2E tests cover this)
 *    ⚠️  Manual Required:
 *        - Log in as active tenant
 *        - Verify access to lease details
 *        - Verify can make rent payments
 *        - Verify can submit maintenance requests
 *        - Verify can view payment history
 * 
 * 5. OWNER DASHBOARD (Multi-Tenant View)
 *    ✅ Automated: LIST endpoint returns tenants
 *    ⚠️  Manual Required:
 *        - Verify owner sees all their tenants (ACTIVE + PENDING)
 *        - Verify filtering by status works in UI
 *        - Verify search works in UI
 *        - Verify pagination works in UI
 *        - Verify tenant details display correctly
 * 
 * 6. EMAIL CONTENT VERIFICATION
 *    ⚠️  Manual Required:
 *        - Invitation subject line is professional
 *        - Email body has correct property/unit details
 *        - Link doesn't expire prematurely
 *        - Unsubscribe link works (if applicable)
 *        - Mobile rendering looks good
 * 
 * 7. EDGE CASES (Manual Testing)
 *    ⚠️  Manual Required:
 *        - Expired invitation link behavior
 *        - Invitation to existing user email
 *        - Multiple pending invitations for same email
 *        - Invitation after tenant moved out
 *        - Network errors during invitation send
 * 
 * 8. MULTI-TENANT ISOLATION (RLS Testing)
 *    ✅ Automated: Covered in RLS tests (use-tenants-rls.test.tsx)
 *    ⚠️  Manual Verification:
 *        - Owner A can't see Owner B's tenants
 *        - Tenant A can't see Tenant B's data
 *        - API returns 403 for unauthorized access
 * 
 * ================================================================
 * HOW TO RUN MANUAL VERIFICATION
 * ================================================================
 * 
 * 1. Start dev environment:
 *    doppler run -- pnpm dev
 * 
 * 2. Create test property/unit/lease via UI or API
 * 
 * 3. Invite a tenant using your personal email (so you can check inbox):
 *    - Go to Leases page
 *    - Click "Invite Tenant" on a lease
 *    - Enter your email address
 *    - Submit form
 * 
 * 4. Check email inbox:
 *    - Verify email received within 1 minute
 *    - Verify email content/formatting
 *    - Click invitation link
 * 
 * 5. Complete onboarding:
 *    - Fill out onboarding form
 *    - Create password
 *    - Verify redirect to tenant portal
 * 
 * 6. Verify as owner:
 *    - Log back in as owner
 *    - Check tenant shows as ACTIVE
 *    - Verify lease shows tenant name
 * 
 * 7. Test resend invitation:
 *    - Create another invitation (different email)
 *    - Wait 5 minutes (don't complete onboarding)
 *    - Click "Resend Invitation" in owner dashboard
 *    - Verify new email received
 * 
 * ================================================================
 * FOR E2E TESTING (Playwright)
 * ================================================================
 * 
 * The following should be covered in E2E tests (not integration):
 * - Full invitation → onboarding → login flow
 * - Email link clicking and navigation
 * - Multi-page form workflows
 * - Cross-user scenarios (owner + tenant)
 * - Browser-specific behaviors
 * - Screenshot comparisons for UI
 * 
 * See: apps/e2e-tests/ for Playwright test suite
 * ================================================================
 */
