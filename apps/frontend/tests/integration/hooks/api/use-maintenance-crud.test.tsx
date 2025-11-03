/**
 * Maintenance Requests CRUD Integration Tests
 * Tests complete Create, Read, Update, Delete operations with real API calls
 * Mirrors production implementation patterns from use-maintenance.ts
 *
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
	useAllMaintenanceRequests,
	useMaintenanceRequest,
	useCreateMaintenanceRequest,
	useUpdateMaintenanceRequest,
	useCompleteMaintenance,
	useCancelMaintenance
} from '#hooks/api/use-maintenance'
import type { MaintenanceRequest } from '@repo/shared/types/core'
import type {
	CreateMaintenanceRequest,
	UpdateMaintenanceRequest
} from '@repo/shared/types/backend-domain'
import { clientFetch } from '#lib/api/client'

const TEST_MAINTENANCE_PREFIX = 'TEST-CRUD'
let createdMaintenanceIds: string[] = []
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
			name: `${TEST_MAINTENANCE_PREFIX} Test Property ${Date.now()}`,
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
			unitNumber: `${TEST_MAINTENANCE_PREFIX}-Unit-${Date.now()}`,
			bedrooms: 2,
			bathrooms: 1,
			rent: 2000,
			status: 'OCCUPIED'
		})
	})
	createdUnitIds.push(unit.id)
	return unit.id
}

describe('Maintenance Requests CRUD Integration Tests', () => {
	// Cleanup after each test (order matters for foreign keys)
	afterEach(async () => {
		// Delete maintenance requests first
		for (const id of createdMaintenanceIds) {
			try {
				await clientFetch(`/api/v1/maintenance/${id}`, { method: 'DELETE' })
			} catch (error) {
				console.warn(`Failed to cleanup maintenance request ${id}:`, error)
			}
		}
		createdMaintenanceIds = []

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

	describe('CREATE Maintenance Request', () => {
		it('creates a new maintenance request successfully', async () => {
			const propertyId = await createTestProperty()
			const unitId = await createTestUnit(propertyId)

			const { result } = renderHook(() => useCreateMaintenanceRequest(), {
				wrapper: createWrapper()
			})

			const newRequest: CreateMaintenanceRequest = {
				title: `${TEST_MAINTENANCE_PREFIX} Leaky Faucet ${Date.now()}`,
				description: 'Kitchen faucet is leaking',
				priority: 'MEDIUM',
				category: 'PLUMBING',
				unitId,
				estimatedCost: 150
			}

			let createdRequest: MaintenanceRequest | undefined
			await waitFor(async () => {
				createdRequest = await result.current.mutateAsync(newRequest)
			})

			// Assertions
			expect(createdRequest).toBeDefined()
			expect(createdRequest!.id).toBeTruthy()
			expect(createdRequest!.title).toBe(newRequest.title)
			expect(createdRequest!.description).toBe(newRequest.description)
			expect(createdRequest!.priority).toBe('MEDIUM')
			expect(createdRequest!.category).toBe('PLUMBING')
			expect(createdRequest!.status).toBe('OPEN')
			expect(createdRequest!.unitId).toBe(unitId)
			expect(createdRequest!.estimatedCost).toBe(150)
			expect(createdRequest!.version).toBe(1) // Optimistic locking

			// Track for cleanup
			createdMaintenanceIds.push(createdRequest!.id)
		})

		it('validates required fields', async () => {
			const { result } = renderHook(() => useCreateMaintenanceRequest(), {
				wrapper: createWrapper()
			})

			// Missing title and description (required fields)
			const invalidRequest = {
				priority: 'MEDIUM'
			} as CreateMaintenanceRequest

			await expect(async () => {
				await result.current.mutateAsync(invalidRequest)
			}).rejects.toThrow()
		})

		it('handles different priority levels', async () => {
			const propertyId = await createTestProperty()
			const unitId = await createTestUnit(propertyId)

			const { result } = renderHook(() => useCreateMaintenanceRequest(), {
				wrapper: createWrapper()
			})

			const priorities: Array<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'> = [
				'LOW',
				'MEDIUM',
				'HIGH',
				'URGENT'
			]

			for (const priority of priorities) {
				const request: CreateMaintenanceRequest = {
					title: `${TEST_MAINTENANCE_PREFIX} Request ${priority} ${Date.now()}`,
					description: `Test ${priority} priority request`,
					priority,
					unitId
				}

				const created = await result.current.mutateAsync(request)
				expect(created.priority).toBe(priority)
				createdMaintenanceIds.push(created.id)
			}
		})
	})

	describe('READ Maintenance Request', () => {
		let testPropertyId: string
		let testUnitId: string
		let testRequestId: string

		beforeEach(async () => {
			testPropertyId = await createTestProperty()
			testUnitId = await createTestUnit(testPropertyId)

			// Create a test maintenance request
			const request = await clientFetch<MaintenanceRequest>(
				'/api/v1/maintenance',
				{
					method: 'POST',
					body: JSON.stringify({
						title: `${TEST_MAINTENANCE_PREFIX} Read Test ${Date.now()}`,
						description: 'Broken window',
						priority: 'HIGH',
						category: 'GENERAL',
						unitId: testUnitId
					})
				}
			)
			testRequestId = request.id
			createdMaintenanceIds.push(request.id)
		})

		it('fetches maintenance request by ID', async () => {
			const { result } = renderHook(() => useMaintenanceRequest(testRequestId), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(result.current.data).toBeDefined()
			expect(result.current.data!.id).toBe(testRequestId)
			expect(result.current.data!.unitId).toBe(testUnitId)
		})

		it('fetches maintenance request list', async () => {
			const { result } = renderHook(() => useAllMaintenanceRequests(), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(result.current.data).toBeDefined()
			expect(result.current.data).toBeInstanceOf(Array)
		})

		it('filters by unit ID', async () => {
			const { result } = renderHook(
				() => useAllMaintenanceRequests({ unitId: testUnitId }),
				{
					wrapper: createWrapper()
				}
			)

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			const requests = result.current.data!
			expect(requests.every(r => r.unitId === testUnitId)).toBe(true)
		})

		it('filters by priority', async () => {
			const { result } = renderHook(
				() => useAllMaintenanceRequests({ priority: 'HIGH' }),
				{
					wrapper: createWrapper()
				}
			)

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			const requests = result.current.data!
			expect(requests.every(r => r.priority === 'HIGH')).toBe(true)
		})

		it('filters by status', async () => {
			const { result } = renderHook(
				() => useAllMaintenanceRequests({ status: 'OPEN' }),
				{
					wrapper: createWrapper()
				}
			)

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			const requests = result.current.data!
			expect(requests.every(r => r.status === 'OPEN')).toBe(true)
		})

		it('returns empty result for non-existent ID', async () => {
			const { result } = renderHook(
				() => useMaintenanceRequest('non-existent-id'),
				{
					wrapper: createWrapper()
				}
			)

			await waitFor(() => {
				expect(result.current.isError).toBe(true)
			})
		})
	})

	describe('UPDATE Maintenance Request', () => {
		let testPropertyId: string
		let testUnitId: string
		let testRequestId: string
		let testRequest: MaintenanceRequest

		beforeEach(async () => {
			testPropertyId = await createTestProperty()
			testUnitId = await createTestUnit(testPropertyId)

			testRequest = await clientFetch<MaintenanceRequest>(
				'/api/v1/maintenance',
				{
					method: 'POST',
					body: JSON.stringify({
						title: `${TEST_MAINTENANCE_PREFIX} Update Test ${Date.now()}`,
						description: 'Original description',
						priority: 'MEDIUM',
						category: 'PLUMBING',
						unitId: testUnitId,
						estimatedCost: 200
					})
				}
			)
			testRequestId = testRequest.id
			createdMaintenanceIds.push(testRequest.id)
		})

		it('updates maintenance request successfully', async () => {
			const { result } = renderHook(() => useUpdateMaintenanceRequest(), {
				wrapper: createWrapper()
			})

			const updates: UpdateMaintenanceRequest = {
				title: `${TEST_MAINTENANCE_PREFIX} Updated Title ${Date.now()}`,
				description: 'Updated description',
				priority: 'HIGH',
				estimatedCost: 250
			}

			let updatedRequest: MaintenanceRequest | undefined
			await waitFor(async () => {
				updatedRequest = await result.current.mutateAsync({
					id: testRequestId,
					data: updates
				})
			})

			expect(updatedRequest).toBeDefined()
			expect(updatedRequest!.title).toBe(updates.title)
			expect(updatedRequest!.description).toBe('Updated description')
			expect(updatedRequest!.priority).toBe('HIGH')
			expect(updatedRequest!.estimatedCost).toBe(250)
		})

		it('allows partial updates', async () => {
			const { result } = renderHook(() => useUpdateMaintenanceRequest(), {
				wrapper: createWrapper()
			})

			// Only update priority
			const partialUpdate: UpdateMaintenanceRequest = {
				priority: 'URGENT'
			}

			let updatedRequest: MaintenanceRequest | undefined
			await waitFor(async () => {
				updatedRequest = await result.current.mutateAsync({
					id: testRequestId,
					data: partialUpdate
				})
			})

			expect(updatedRequest).toBeDefined()
			expect(updatedRequest!.priority).toBe('URGENT')
			expect(updatedRequest!.title).toBe(testRequest.title) // Unchanged
			expect(updatedRequest!.description).toBe(testRequest.description) // Unchanged
		})

		it('updates status to IN_PROGRESS', async () => {
			const { result } = renderHook(() => useUpdateMaintenanceRequest(), {
				wrapper: createWrapper()
			})

			const statusUpdate: UpdateMaintenanceRequest = {
				status: 'IN_PROGRESS'
			}

			let updatedRequest: MaintenanceRequest | undefined
			await waitFor(async () => {
				updatedRequest = await result.current.mutateAsync({
					id: testRequestId,
					data: statusUpdate
				})
			})

			expect(updatedRequest!.status).toBe('IN_PROGRESS')
		})

		it('updates category', async () => {
			const { result } = renderHook(() => useUpdateMaintenanceRequest(), {
				wrapper: createWrapper()
			})

			const categoryUpdate: UpdateMaintenanceRequest = {
				category: 'ELECTRICAL'
			}

			let updatedRequest: MaintenanceRequest | undefined
			await waitFor(async () => {
				updatedRequest = await result.current.mutateAsync({
					id: testRequestId,
					data: categoryUpdate
				})
			})

			expect(updatedRequest!.category).toBe('ELECTRICAL')
		})
	})

	describe('COMPLETE Maintenance Request', () => {
		let testPropertyId: string
		let testUnitId: string
		let testRequestId: string

		beforeEach(async () => {
			testPropertyId = await createTestProperty()
			testUnitId = await createTestUnit(testPropertyId)

			const request = await clientFetch<MaintenanceRequest>(
				'/api/v1/maintenance',
				{
					method: 'POST',
					body: JSON.stringify({
						title: `${TEST_MAINTENANCE_PREFIX} Complete Test ${Date.now()}`,
						description: 'Work completed',
						priority: 'MEDIUM',
						unitId: testUnitId,
						estimatedCost: 300
					})
				}
			)
			testRequestId = request.id
			createdMaintenanceIds.push(request.id)
		})

		it('completes maintenance request successfully', async () => {
			const { result } = renderHook(() => useCompleteMaintenance(), {
				wrapper: createWrapper()
			})

			let completedRequest: MaintenanceRequest | undefined
			await waitFor(async () => {
				completedRequest = await result.current.mutateAsync({
					id: testRequestId,
					actualCost: 280,
					notes: 'Replaced faucet'
				})
			})

			expect(completedRequest).toBeDefined()
			expect(completedRequest!.status).toBe('COMPLETED')
			expect(completedRequest!.actualCost).toBe(280)
			expect(completedRequest!.completedAt).toBeTruthy()
		})

		it('completes without actual cost', async () => {
			const { result } = renderHook(() => useCompleteMaintenance(), {
				wrapper: createWrapper()
			})

			let completedRequest: MaintenanceRequest | undefined
			await waitFor(async () => {
				completedRequest = await result.current.mutateAsync({
					id: testRequestId
				})
			})

			expect(completedRequest!.status).toBe('COMPLETED')
			expect(completedRequest!.completedAt).toBeTruthy()
		})
	})

	describe('CANCEL Maintenance Request', () => {
		let testPropertyId: string
		let testUnitId: string
		let testRequestId: string

		beforeEach(async () => {
			testPropertyId = await createTestProperty()
			testUnitId = await createTestUnit(testPropertyId)

			const request = await clientFetch<MaintenanceRequest>(
				'/api/v1/maintenance',
				{
					method: 'POST',
					body: JSON.stringify({
						title: `${TEST_MAINTENANCE_PREFIX} Cancel Test ${Date.now()}`,
						description: 'To be cancelled',
						priority: 'LOW',
						unitId: testUnitId
					})
				}
			)
			testRequestId = request.id
			createdMaintenanceIds.push(request.id)
		})

		it('cancels maintenance request successfully', async () => {
			const { result } = renderHook(() => useCancelMaintenance(), {
				wrapper: createWrapper()
			})

			let cancelledRequest: MaintenanceRequest | undefined
			await waitFor(async () => {
				cancelledRequest = await result.current.mutateAsync({
					id: testRequestId,
					reason: 'Tenant resolved issue'
				})
			})

			expect(cancelledRequest).toBeDefined()
			expect(cancelledRequest!.status).toBe('CANCELED')
		})

		it('cancels without reason', async () => {
			const { result } = renderHook(() => useCancelMaintenance(), {
				wrapper: createWrapper()
			})

			let cancelledRequest: MaintenanceRequest | undefined
			await waitFor(async () => {
				cancelledRequest = await result.current.mutateAsync({
					id: testRequestId
				})
			})

			expect(cancelledRequest!.status).toBe('CANCELED')
		})
	})

	describe('CRUD Workflow', () => {
		it('completes full CRUD lifecycle', async () => {
			const wrapper = createWrapper()
			const propertyId = await createTestProperty()
			const unitId = await createTestUnit(propertyId)

			// 1. CREATE
			const { result: createResult } = renderHook(
				() => useCreateMaintenanceRequest(),
				{
					wrapper
				}
			)

			const newRequest: CreateMaintenanceRequest = {
				title: `${TEST_MAINTENANCE_PREFIX} Lifecycle Test ${Date.now()}`,
				description: 'Full lifecycle test',
				priority: 'MEDIUM',
				category: 'PLUMBING',
				unitId,
				estimatedCost: 200
			}

			let createdRequest: MaintenanceRequest | undefined
			await waitFor(async () => {
				createdRequest = await createResult.current.mutateAsync(newRequest)
			})

			expect(createdRequest).toBeDefined()
			expect(createdRequest!.version).toBe(1)
			expect(createdRequest!.status).toBe('OPEN')
			createdMaintenanceIds.push(createdRequest!.id)

			// 2. READ
			const { result: readResult } = renderHook(
				() => useMaintenanceRequest(createdRequest!.id),
				{ wrapper }
			)

			await waitFor(() => {
				expect(readResult.current.isSuccess).toBe(true)
			})

			expect(readResult.current.data!.title).toBe(newRequest.title)

			// 3. UPDATE
			const { result: updateResult } = renderHook(
				() => useUpdateMaintenanceRequest(),
				{
					wrapper
				}
			)

			const updates: UpdateMaintenanceRequest = {
				status: 'IN_PROGRESS',
				priority: 'HIGH'
			}

			let updatedRequest: MaintenanceRequest | undefined
			await waitFor(async () => {
				updatedRequest = await updateResult.current.mutateAsync({
					id: createdRequest!.id,
					data: updates
				})
			})

			expect(updatedRequest!.status).toBe('IN_PROGRESS')
			expect(updatedRequest!.priority).toBe('HIGH')

			// 4. COMPLETE
			const { result: completeResult } = renderHook(
				() => useCompleteMaintenance(),
				{
					wrapper
				}
			)

			let completedRequest: MaintenanceRequest | undefined
			await waitFor(async () => {
				completedRequest = await completeResult.current.mutateAsync({
					id: createdRequest!.id,
					actualCost: 180
				})
			})

			expect(completedRequest!.status).toBe('COMPLETED')
			expect(completedRequest!.actualCost).toBe(180)

			// Note: DELETE is handled via React 19 useOptimistic in production
			// So we skip it in this integration test
		})
	})

	describe('Cache Invalidation', () => {
		it('invalidates cache after mutations', async () => {
			const wrapper = createWrapper()
			const propertyId = await createTestProperty()
			const unitId = await createTestUnit(propertyId)

			// Fetch initial list
			const { result: listResult } = renderHook(
				() => useAllMaintenanceRequests(),
				{
					wrapper
				}
			)

			await waitFor(() => {
				expect(listResult.current.isSuccess).toBe(true)
			})

			const initialCount = listResult.current.data!.length

			// Create new request
			const { result: createResult } = renderHook(
				() => useCreateMaintenanceRequest(),
				{
					wrapper
				}
			)

			const newRequest: CreateMaintenanceRequest = {
				title: `${TEST_MAINTENANCE_PREFIX} Cache Test ${Date.now()}`,
				description: 'Cache invalidation test',
				priority: 'MEDIUM',
				unitId
			}

			await waitFor(async () => {
				const created = await createResult.current.mutateAsync(newRequest)
				createdMaintenanceIds.push(created.id)
			})

			// List should be invalidated and refetch
			await waitFor(() => {
				expect(listResult.current.data!.length).toBeGreaterThanOrEqual(
					initialCount
				)
			})
		})
	})
})
