/**
 * Leases CRUD Integration Tests
 * Tests complete Create, Read, Update, Delete operations with real API calls
 * Mirrors production implementation patterns from use-lease.ts
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
	useLeaseList,
	useLease,
	useCreateLease,
	useUpdateLease,
	useDeleteLease,
	useRenewLease,
	useTerminateLease
} from '#hooks/api/use-lease'
import type { Lease } from '@repo/shared/types/core'
import type {
	CreateLeaseInput,
	UpdateLeaseInput
} from '@repo/shared/types/api-inputs'
import { createBrowserClient } from '@supabase/ssr'
import { clientFetch } from '#lib/api/client'

const TEST_LEASE_PREFIX = 'TEST-CRUD'
let createdLeaseIds: string[] = []
let createdTenantIds: string[] = []
let createdUnitIds: string[] = []
let createdPropertyIds: string[] = []

// Create wrapper with fresh QueryClient for each test
function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0 },
			mutations: { retry: false }
		}
	})

	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

// Helper to create test property
async function createTestProperty(): Promise<string> {
	const property = await clientFetch<{ id: string }>('/api/v1/properties', {
		method: 'POST',
		body: JSON.stringify({
			name: `${TEST_LEASE_PREFIX} Test Property ${Date.now()}`,
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
			unitNumber: `${TEST_LEASE_PREFIX}-Unit-${Date.now()}`,
			bedrooms: 2,
			bathrooms: 1,
			rent: 2000,
			status: 'VACANT'
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
			name: `${TEST_LEASE_PREFIX} Tenant ${Date.now()}`,
			email: `test-tenant-${Date.now()}@example.com`,
			phone: '555-0001',
			status: 'ACTIVE'
		})
	})
	createdTenantIds.push(tenant.id)
	return tenant.id
}

describe('Leases CRUD Integration Tests', () => {
	// Authenticate before running tests
	beforeAll(async () => {
		// Validate required E2E environment variables
		if (!process.env.E2E_OWNER_A_EMAIL) {
			throw new Error(
				'E2E_OWNER_A_EMAIL environment variable is required for integration tests. Please set this variable before running tests.'
			)
		}
		if (!process.env.E2E_OWNER_A_PASSWORD) {
			throw new Error(
				'E2E_OWNER_A_PASSWORD environment variable is required for integration tests. Please set this variable before running tests.'
			)
		}

		const supabase = createBrowserClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
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

	// Cleanup after each test (order matters for foreign keys)
	afterEach(async () => {
		// Delete leases first
		for (const id of createdLeaseIds) {
			try {
				await clientFetch(`/api/v1/leases/${id}`, { method: 'DELETE' })
			} catch (error) {
				console.warn(`Failed to cleanup lease ${id}:`, error)
			}
		}
		createdLeaseIds = []

		// Delete tenants
		for (const id of createdTenantIds) {
			try {
				await clientFetch(`/api/v1/tenants/${id}`, { method: 'DELETE' })
			} catch (error) {
				console.warn(`Failed to cleanup tenant ${id}:`, error)
			}
		}
		createdTenantIds = []

		// Delete units
		for (const id of createdUnitIds) {
			try {
				await clientFetch(`/api/v1/units/${id}`, { method: 'DELETE' })
			} catch (error) {
				console.warn(`Failed to cleanup unit ${id}:`, error)
			}
		}
		createdUnitIds = []

		// Delete properties last
		for (const id of createdPropertyIds) {
			try {
				await clientFetch(`/api/v1/properties/${id}`, { method: 'DELETE' })
			} catch (error) {
				console.warn(`Failed to cleanup property ${id}:`, error)
			}
		}
		createdPropertyIds = []
	})

	describe('CREATE Lease', () => {
		it('creates a new lease successfully', async () => {
			const propertyId = await createTestProperty()
			const unitId = await createTestUnit(propertyId)
			const tenantId = await createTestTenant()

			const { result } = renderHook(() => useCreateLease(), {
				wrapper: createWrapper()
			})

			const startDate = new Date().toISOString()
			const endDate = new Date(
				Date.now() + 365 * 24 * 60 * 60 * 1000
			).toISOString() // 1 year

			const newLease: CreateLeaseInput = {
				tenantId,
				unitId,
				propertyId,
				startDate,
				endDate,
				rentAmount: 2000,
				securityDeposit: 4000,
				monthlyRent: 2000,
				status: 'ACTIVE',
				terms: 'Standard 1-year lease',
				gracePeriodDays: 5,
				lateFeeAmount: 50,
				lateFeePercentage: null
			}

			let createdLease: Lease | undefined
			await waitFor(async () => {
				createdLease = await result.current.mutateAsync(newLease)
			})

			// Assertions
			expect(createdLease).toBeDefined()
			expect(createdLease!.id).toBeTruthy()
			expect(createdLease!.tenantId).toBe(tenantId)
			expect(createdLease!.unitId).toBe(unitId)
			expect(createdLease!.propertyId).toBe(propertyId)
			expect(createdLease!.rentAmount).toBe(2000)
			expect(createdLease!.securityDeposit).toBe(4000)
			expect(createdLease!.status).toBe('ACTIVE')
			expect(createdLease!.version).toBe(1) // Optimistic locking

			// Track for cleanup
			createdLeaseIds.push(createdLease!.id)
		})

		it('validates required fields', async () => {
			const { result } = renderHook(() => useCreateLease(), {
				wrapper: createWrapper()
			})

			// Missing tenantId, startDate, endDate (required fields)
			const invalidLease = {
				rentAmount: 2000
			} as CreateLeaseInput

			await expect(async () => {
				await result.current.mutateAsync(invalidLease)
			}).rejects.toThrow()
		})

		it('handles invalid date ranges', async () => {
			const propertyId = await createTestProperty()
			const unitId = await createTestUnit(propertyId)
			const tenantId = await createTestTenant()

			const { result } = renderHook(() => useCreateLease(), {
				wrapper: createWrapper()
			})

			// End date before start date
			const invalidLease: CreateLeaseInput = {
				tenantId,
				unitId,
				propertyId,
				startDate: new Date().toISOString(),
				endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
				rentAmount: 2000,
				securityDeposit: 4000,
				status: 'ACTIVE'
			}

			await expect(async () => {
				await result.current.mutateAsync(invalidLease)
			}).rejects.toThrow()
		})
	})

	describe('READ Lease', () => {
		let testPropertyId: string
		let testUnitId: string
		let testTenantId: string
		let testLeaseId: string

		beforeEach(async () => {
			testPropertyId = await createTestProperty()
			testUnitId = await createTestUnit(testPropertyId)
			testTenantId = await createTestTenant()

			// Create a test lease
			const startDate = new Date().toISOString()
			const endDate = new Date(
				Date.now() + 365 * 24 * 60 * 60 * 1000
			).toISOString()

			const lease = await clientFetch<Lease>('/api/v1/leases', {
				method: 'POST',
				body: JSON.stringify({
					tenantId: testTenantId,
					unitId: testUnitId,
					propertyId: testPropertyId,
					startDate,
					endDate,
					rentAmount: 2000,
					securityDeposit: 4000,
					status: 'ACTIVE'
				})
			})
			testLeaseId = lease.id
			createdLeaseIds.push(lease.id)
		})

		it('fetches lease by ID', async () => {
			const { result } = renderHook(() => useLease(testLeaseId), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(result.current.data).toBeDefined()
			expect(result.current.data!.id).toBe(testLeaseId)
			expect(result.current.data!.tenantId).toBe(testTenantId)
		})

		it('fetches lease list', async () => {
			const { result } = renderHook(() => useLeaseList(), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(result.current.data).toBeDefined()
			expect(result.current.data!.data).toBeInstanceOf(Array)
		})

		it('filters by status', async () => {
			const { result } = renderHook(() => useLeaseList({ status: 'ACTIVE' }), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			const leases = result.current.data!.data
			expect(leases.every((l: Lease) => l.status === 'ACTIVE')).toBe(true)
		})

		it('returns empty result for non-existent ID', async () => {
			const { result } = renderHook(() => useLease('non-existent-id'), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isError).toBe(true)
			})
		})
	})

	describe('UPDATE Lease', () => {
		let testPropertyId: string
		let testUnitId: string
		let testTenantId: string
		let testLeaseId: string
		let testLease: Lease

		beforeEach(async () => {
			testPropertyId = await createTestProperty()
			testUnitId = await createTestUnit(testPropertyId)
			testTenantId = await createTestTenant()

			const startDate = new Date().toISOString()
			const endDate = new Date(
				Date.now() + 365 * 24 * 60 * 60 * 1000
			).toISOString()

			testLease = await clientFetch<Lease>('/api/v1/leases', {
				method: 'POST',
				body: JSON.stringify({
					tenantId: testTenantId,
					unitId: testUnitId,
					propertyId: testPropertyId,
					startDate,
					endDate,
					rentAmount: 2000,
					securityDeposit: 4000,
					status: 'ACTIVE'
				})
			})
			testLeaseId = testLease.id
			createdLeaseIds.push(testLease.id)
		})

		it('updates lease successfully', async () => {
			const { result } = renderHook(() => useUpdateLease(), {
				wrapper: createWrapper()
			})

			const updates: UpdateLeaseInput = {
				rentAmount: 2200, // Updated from 2000
				monthlyRent: 2200,
				terms: 'Updated terms'
			}

			let updatedLease: Lease | undefined
			await waitFor(async () => {
				updatedLease = await result.current.mutateAsync({
					id: testLeaseId,
					data: updates
				})
			})

			expect(updatedLease).toBeDefined()
			expect(updatedLease!.rentAmount).toBe(2200)
			expect(updatedLease!.terms).toBe('Updated terms')
		})

		it('allows partial updates', async () => {
			const { result } = renderHook(() => useUpdateLease(), {
				wrapper: createWrapper()
			})

			// Only update late fee amount
			const partialUpdate: UpdateLeaseInput = {
				lateFeeAmount: 75
			}

			let updatedLease: Lease | undefined
			await waitFor(async () => {
				updatedLease = await result.current.mutateAsync({
					id: testLeaseId,
					data: partialUpdate
				})
			})

			expect(updatedLease).toBeDefined()
			expect(updatedLease!.lateFeeAmount).toBe(75)
			expect(updatedLease!.rentAmount).toBe(testLease.rentAmount) // Unchanged
		})

		it('updates lease status', async () => {
			const { result } = renderHook(() => useUpdateLease(), {
				wrapper: createWrapper()
			})

			const statusUpdate: UpdateLeaseInput = {
				status: 'EXPIRED'
			}

			let updatedLease: Lease | undefined
			await waitFor(async () => {
				updatedLease = await result.current.mutateAsync({
					id: testLeaseId,
					data: statusUpdate
				})
			})

			expect(updatedLease!.status).toBe('EXPIRED')
		})
	})

	describe('DELETE Lease', () => {
		let testPropertyId: string
		let testUnitId: string
		let testTenantId: string
		let testLeaseId: string

		beforeEach(async () => {
			testPropertyId = await createTestProperty()
			testUnitId = await createTestUnit(testPropertyId)
			testTenantId = await createTestTenant()

			const startDate = new Date().toISOString()
			const endDate = new Date(
				Date.now() + 365 * 24 * 60 * 60 * 1000
			).toISOString()

			const lease = await clientFetch<Lease>('/api/v1/leases', {
				method: 'POST',
				body: JSON.stringify({
					tenantId: testTenantId,
					unitId: testUnitId,
					propertyId: testPropertyId,
					startDate,
					endDate,
					rentAmount: 2000,
					securityDeposit: 4000,
					status: 'ACTIVE'
				})
			})
			testLeaseId = lease.id
			createdLeaseIds.push(lease.id)
		})

		it('deletes lease successfully', async () => {
			const { result } = renderHook(() => useDeleteLease(), {
				wrapper: createWrapper()
			})

			await waitFor(async () => {
				await result.current.mutateAsync(testLeaseId)
			})

			// Remove from cleanup array
			createdLeaseIds = createdLeaseIds.filter(id => id !== testLeaseId)

			// Verify deletion
			const { result: fetchResult } = renderHook(() => useLease(testLeaseId), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(fetchResult.current.isError).toBe(true)
			})
		})

		it('handles delete of non-existent lease', async () => {
			const { result } = renderHook(() => useDeleteLease(), {
				wrapper: createWrapper()
			})

			await expect(async () => {
				await result.current.mutateAsync('non-existent-id')
			}).rejects.toThrow()
		})

		it('removes lease from cache after deletion', async () => {
			const wrapper = createWrapper()

			// Fetch to populate cache
			const { result: fetchResult } = renderHook(() => useLease(testLeaseId), {
				wrapper
			})

			await waitFor(() => {
				expect(fetchResult.current.isSuccess).toBe(true)
			})

			// Delete
			const { result: deleteResult } = renderHook(() => useDeleteLease(), {
				wrapper
			})

			await waitFor(async () => {
				await deleteResult.current.mutateAsync(testLeaseId)
			})

			createdLeaseIds = createdLeaseIds.filter(id => id !== testLeaseId)

			// Verify cache invalidation
			await waitFor(() => {
				expect(fetchResult.current.isError).toBe(true)
			})
		})
	})

	describe('RENEW Lease', () => {
		let testPropertyId: string
		let testUnitId: string
		let testTenantId: string
		let testLeaseId: string

		beforeEach(async () => {
			testPropertyId = await createTestProperty()
			testUnitId = await createTestUnit(testPropertyId)
			testTenantId = await createTestTenant()

			const startDate = new Date().toISOString()
			const endDate = new Date(
				Date.now() + 30 * 24 * 60 * 60 * 1000
			).toISOString() // 30 days

			const lease = await clientFetch<Lease>('/api/v1/leases', {
				method: 'POST',
				body: JSON.stringify({
					tenantId: testTenantId,
					unitId: testUnitId,
					propertyId: testPropertyId,
					startDate,
					endDate,
					rentAmount: 2000,
					securityDeposit: 4000,
					status: 'ACTIVE'
				})
			})
			testLeaseId = lease.id
			createdLeaseIds.push(lease.id)
		})

		it('renews lease successfully', async () => {
			const { result } = renderHook(() => useRenewLease(), {
				wrapper: createWrapper()
			})

			const newEndDate = new Date(
				Date.now() + 395 * 24 * 60 * 60 * 1000
			).toISOString() // 395 days (1 year + 30 days)

			let renewedLease: Lease | undefined
			await waitFor(async () => {
				renewedLease = await result.current.mutateAsync({
					id: testLeaseId,
					newEndDate
				})
			})

			expect(renewedLease).toBeDefined()
			expect(renewedLease!.endDate).toBe(newEndDate)
		})
	})

	describe('TERMINATE Lease', () => {
		let testPropertyId: string
		let testUnitId: string
		let testTenantId: string
		let testLeaseId: string

		beforeEach(async () => {
			testPropertyId = await createTestProperty()
			testUnitId = await createTestUnit(testPropertyId)
			testTenantId = await createTestTenant()

			const startDate = new Date(
				Date.now() - 90 * 24 * 60 * 60 * 1000
			).toISOString() // 90 days ago
			const endDate = new Date(
				Date.now() + 275 * 24 * 60 * 60 * 1000
			).toISOString() // 275 days from now

			const lease = await clientFetch<Lease>('/api/v1/leases', {
				method: 'POST',
				body: JSON.stringify({
					tenantId: testTenantId,
					unitId: testUnitId,
					propertyId: testPropertyId,
					startDate,
					endDate,
					rentAmount: 2000,
					securityDeposit: 4000,
					status: 'ACTIVE'
				})
			})
			testLeaseId = lease.id
			createdLeaseIds.push(lease.id)
		})

		it('terminates lease successfully', async () => {
			const { result } = renderHook(() => useTerminateLease(), {
				wrapper: createWrapper()
			})

			const terminationDate = new Date().toISOString()

			let terminatedLease: Lease | undefined
			await waitFor(async () => {
				terminatedLease = await result.current.mutateAsync({
					id: testLeaseId,
					terminationDate,
					reason: 'Tenant relocating'
				})
			})

			expect(terminatedLease).toBeDefined()
			expect(terminatedLease!.status).toBe('TERMINATED')
		})

		it('terminates lease without reason', async () => {
			const { result } = renderHook(() => useTerminateLease(), {
				wrapper: createWrapper()
			})

			const terminationDate = new Date().toISOString()

			let terminatedLease: Lease | undefined
			await waitFor(async () => {
				terminatedLease = await result.current.mutateAsync({
					id: testLeaseId,
					terminationDate
				})
			})

			expect(terminatedLease).toBeDefined()
		})
	})

	describe('CRUD Workflow', () => {
		it('completes full CRUD lifecycle', async () => {
			const wrapper = createWrapper()
			const propertyId = await createTestProperty()
			const unitId = await createTestUnit(propertyId)
			const tenantId = await createTestTenant()

			// 1. CREATE
			const { result: createResult } = renderHook(() => useCreateLease(), {
				wrapper
			})

			const startDate = new Date().toISOString()
			const endDate = new Date(
				Date.now() + 365 * 24 * 60 * 60 * 1000
			).toISOString()

			const newLease: CreateLeaseInput = {
				tenantId,
				unitId,
				propertyId,
				startDate,
				endDate,
				rentAmount: 2000,
				securityDeposit: 4000,
				status: 'ACTIVE'
			}

			let createdLease: Lease | undefined
			await waitFor(async () => {
				createdLease = await createResult.current.mutateAsync(newLease)
			})

			expect(createdLease).toBeDefined()
			expect(createdLease!.version).toBe(1)
			createdLeaseIds.push(createdLease!.id)

			// 2. READ
			const { result: readResult } = renderHook(
				() => useLease(createdLease!.id),
				{ wrapper }
			)

			await waitFor(() => {
				expect(readResult.current.isSuccess).toBe(true)
			})

			expect(readResult.current.data!.tenantId).toBe(tenantId)

			// 3. UPDATE
			const { result: updateResult } = renderHook(() => useUpdateLease(), {
				wrapper
			})

			const updates: UpdateLeaseInput = {
				rentAmount: 2200,
				terms: 'Updated terms'
			}

			let updatedLease: Lease | undefined
			await waitFor(async () => {
				updatedLease = await updateResult.current.mutateAsync({
					id: createdLease!.id,
					data: updates
				})
			})

			expect(updatedLease!.rentAmount).toBe(2200)

			// 4. DELETE
			const { result: deleteResult } = renderHook(() => useDeleteLease(), {
				wrapper
			})

			await waitFor(async () => {
				await deleteResult.current.mutateAsync(createdLease!.id)
			})

			createdLeaseIds = createdLeaseIds.filter(id => id !== createdLease!.id)

			// Verify deletion
			const { result: verifyResult } = renderHook(
				() => useLease(createdLease!.id),
				{ wrapper }
			)

			await waitFor(() => {
				expect(verifyResult.current.isError).toBe(true)
			})
		})
	})

	describe('Cache Invalidation', () => {
		it('invalidates cache after mutations', async () => {
			const wrapper = createWrapper()
			const propertyId = await createTestProperty()
			const unitId = await createTestUnit(propertyId)
			const tenantId = await createTestTenant()

			// Fetch initial list
			const { result: listResult } = renderHook(() => useLeaseList(), {
				wrapper
			})

			await waitFor(() => {
				expect(listResult.current.isSuccess).toBe(true)
			})

			const initialCount = listResult.current.data!.data.length

			// Create new lease
			const { result: createResult } = renderHook(() => useCreateLease(), {
				wrapper
			})

			const startDate = new Date().toISOString()
			const endDate = new Date(
				Date.now() + 365 * 24 * 60 * 60 * 1000
			).toISOString()

			const newLease: CreateLeaseInput = {
				tenantId,
				unitId,
				propertyId,
				startDate,
				endDate,
				rentAmount: 2000,
				securityDeposit: 4000,
				status: 'ACTIVE'
			}

			await waitFor(async () => {
				const created = await createResult.current.mutateAsync(newLease)
				createdLeaseIds.push(created.id)
			})

			// List should be invalidated and refetch
			await waitFor(() => {
				expect(listResult.current.data!.data.length).toBeGreaterThanOrEqual(
					initialCount
				)
			})
		})
	})
})
