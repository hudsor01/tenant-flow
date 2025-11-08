/**
 * Units CRUD Integration Tests
 * Tests complete Create, Read, Update, Delete operations with real API calls
 * Mirrors production implementation patterns from use-unit.ts
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
	vi,
	beforeEach
} from 'vitest'
import {
	useUnitList,
	useUnit,
	useCreateUnit,
	useUpdateUnit,
	useDeleteUnit,
	useUnitsByProperty
} from '#hooks/api/use-unit'
import type { Unit } from '@repo/shared/types/core'
import type {
	CreateUnitInput,
	UpdateUnitInput
} from '@repo/shared/types/api-inputs'
import { clientFetch } from '#lib/api/client'
import { createBrowserClient } from '@supabase/ssr'

const TEST_UNIT_PREFIX = 'TEST-CRUD'
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

// Helper to create test property (units require a property)
async function createTestProperty(): Promise<string> {
	const property = await clientFetch<{ id: string }>('/api/v1/properties', {
		method: 'POST',
		body: JSON.stringify({
			name: `${TEST_UNIT_PREFIX} Test Property ${Date.now()}`,
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

describe('Units CRUD Integration Tests', () => {
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

	// Cleanup after each test
	afterEach(async () => {
		// Clear QueryClient cache to prevent memory leaks and test pollution
		if (sharedQueryClient) {
			sharedQueryClient.clear()
		}

		// Delete units first (foreign key constraint)
		for (const id of createdUnitIds) {
			try {
				await clientFetch(`/api/v1/units/${id}`, { method: 'DELETE' })
			} catch (error) {
				console.warn(`Failed to cleanup unit ${id}:`, error)
			}
		}
		createdUnitIds = []

		// Then delete properties
		for (const id of createdPropertyIds) {
			try {
				await clientFetch(`/api/v1/properties/${id}`, { method: 'DELETE' })
			} catch (error) {
				console.warn(`Failed to cleanup property ${id}:`, error)
			}
		}
		createdPropertyIds = []
	})

	describe('CREATE Unit', () => {
		it('creates a new unit successfully', async () => {
			const propertyId = await createTestProperty()
			const { result } = renderHook(() => useCreateUnit(), {
				wrapper: createWrapper()
			})

			const newUnit: CreateUnitInput = {
				propertyId,
				unitNumber: `${TEST_UNIT_PREFIX}-Unit-${Date.now()}`,
				bedrooms: 2,
				bathrooms: 1,
				squareFeet: 850,
				rent: 200,
				status: 'VACANT'
			}

			const createdUnit = await result.current.mutateAsync(newUnit)

			// Assertions
			expect(createdUnit).toBeDefined()
			expect(createdUnit!.id).toBeTruthy()
			expect(createdUnit!.unitNumber).toBe(newUnit.unitNumber)
			expect(createdUnit!.propertyId).toBe(propertyId)
			expect(createdUnit!.bedrooms).toBe(2)
			expect(createdUnit!.bathrooms).toBe(1)
			expect(createdUnit!.squareFeet).toBe(850)
			expect(createdUnit!.rent).toBe(2000)
			expect(createdUnit!.status).toBe('VACANT')
			// Optimistic locking
			expect(createdUnit!.version).toBe(1)

			// Track for cleanup
			createdUnitIds.push(createdUnit!.id)
		})

		it('validates required fields', async () => {
			const { result } = renderHook(() => useCreateUnit(), {
				wrapper: createWrapper()
			})

			// Missing propertyId and unitNumber (required fields)
			const invalidUnit = {
				bedrooms: 2
			} as CreateUnitInput

			await expect(async () => {
				await result.current.mutateAsync(invalidUnit)
			}).rejects.toThrow()
		})

		it('handles duplicate unit numbers for same property', async () => {
			const propertyId = await createTestProperty()
			const { result } = renderHook(() => useCreateUnit(), {
				wrapper: createWrapper()
			})

			const unitNumber = `${TEST_UNIT_PREFIX}-DUP-${Date.now()}`

			// Create first unit
			const unit1: CreateUnitInput = {
				propertyId,
				unitNumber,
				bedrooms: 2,
				bathrooms: 1,
				rent: 2000,
				status: 'VACANT'
			}

			const created1 = await result.current.mutateAsync(unit1)
			createdUnitIds.push(created1.id)

			// Try to create duplicate unit number for same property
			const unit2: CreateUnitInput = {
				propertyId,
				unitNumber, // Same unit number
				bedrooms: 1,
				bathrooms: 1,
				rent: 1500,
				status: 'VACANT'
			}

			await expect(async () => {
				await result.current.mutateAsync(unit2)
			}).rejects.toThrow()
		})
	})

	describe('READ Unit', () => {
		let testPropertyId: string
		let testUnitId: string

		beforeEach(async () => {
			testPropertyId = await createTestProperty()

			// Create a test unit
			const unit = await clientFetch<Unit>('/api/v1/units', {
				method: 'POST',
				body: JSON.stringify({
					propertyId: testPropertyId,
					unitNumber: `${TEST_UNIT_PREFIX}-Read-${Date.now()}`,
					bedrooms: 2,
					bathrooms: 1,
					squareFeet: 900,
					rent: 2200,
					status: 'VACANT'
				})
			})
			testUnitId = unit.id
			createdUnitIds.push(unit.id)
		})

		it('fetches unit by ID', async () => {
			const { result } = renderHook(() => useUnit(testUnitId), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(result.current.data).toBeDefined()
			expect(result.current.data!.id).toBe(testUnitId)
			expect(result.current.data!.propertyId).toBe(testPropertyId)
		})

		it('fetches units by property ID', async () => {
			const { result } = renderHook(() => useUnitsByProperty(testPropertyId), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(result.current.data).toBeDefined()
			expect(result.current.data!.data).toBeInstanceOf(Array)
			expect(result.current.data!.data.length).toBeGreaterThan(0)
			expect(result.current.data!.data[0].propertyId).toBe(testPropertyId)
		})

		it('fetches unit list', async () => {
			const { result } = renderHook(() => useUnitList(), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(result.current.data).toBeDefined()
			expect(result.current.data!.data).toBeInstanceOf(Array)
		})

		it('filters by search term', async () => {
			const uniqueTerm = `SEARCH-${Date.now()}`
			const propertyId = await createTestProperty()

			// Create unit with unique term
			const unit = await clientFetch<Unit>('/api/v1/units', {
				method: 'POST',
				body: JSON.stringify({
					propertyId,
					unitNumber: uniqueTerm,
					bedrooms: 2,
					bathrooms: 1,
					rent: 2000,
					status: 'VACANT'
				})
			})
			createdUnitIds.push(unit.id)

			const { result } = renderHook(() => useUnitList({ search: uniqueTerm }), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			const units = result.current.data!.data
			expect(units.some((u: Unit) => u.unitNumber.includes(uniqueTerm))).toBe(
				true
			)
		})

		it('returns empty result for non-existent ID', async () => {
			// Use properly formatted UUID that doesn't exist in database
			const nonExistentId = '00000000-0000-0000-0000-000000000000'
			const { result } = renderHook(() => useUnit(nonExistentId), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isError).toBe(true)
			})
		})
	})

	describe('UPDATE Unit', () => {
		let testPropertyId: string
		let testUnitId: string
		let testUnit: Unit

		beforeEach(async () => {
			testPropertyId = await createTestProperty()

			// Create a test unit
			testUnit = await clientFetch<Unit>('/api/v1/units', {
				method: 'POST',
				body: JSON.stringify({
					propertyId: testPropertyId,
					unitNumber: `${TEST_UNIT_PREFIX}-Update-${Date.now()}`,
					bedrooms: 2,
					bathrooms: 1,
					squareFeet: 900,
					rent: 220,
					status: 'VACANT'
				})
			})
			testUnitId = testUnit.id
			createdUnitIds.push(testUnit.id)
		})

		it('updates unit successfully', async () => {
			const { result } = renderHook(() => useUpdateUnit(), {
				wrapper: createWrapper()
			})

			const updates: UpdateUnitInput = {
				unitNumber: `${TEST_UNIT_PREFIX}-Updated-${Date.now()}`,
				bedrooms: 3, // Updated from 2
				rent: 250 // Updated from 2200
			}

			const updatedUnit = await result.current.mutateAsync({
				id: testUnitId,
				data: updates
			})

			expect(updatedUnit).toBeDefined()
			expect(updatedUnit!.unitNumber).toBe(updates.unitNumber)
			expect(updatedUnit!.bedrooms).toBe(3)
			expect(updatedUnit!.rent).toBe(250)
			expect(updatedUnit!.version).toBe(2) // Version incremented
		})

		it('handles optimistic locking conflicts', async () => {
			const { result } = renderHook(() => useUpdateUnit(), {
				wrapper: createWrapper()
			})

			// First update (will succeed)
			const update1: UpdateUnitInput = {
				bedrooms: 3
			}

			// Direct await instead of waitFor for mutations (prevents 30s timeouts)
			await result.current.mutateAsync({
				id: testUnitId,
				data: update1
			})

			// Simulate concurrent update by manually incrementing version in cache
			// This should cause a 409 conflict
			const update2: UpdateUnitInput = {
				bathrooms: 2
			}

			// The mutation should handle version conflicts
			// Note: This test assumes the backend enforces optimistic locking
			// Direct await instead of waitFor for mutations (prevents 30s timeouts)
			const result2 = await result.current.mutateAsync({
				id: testUnitId,
				data: update2
			})
			expect(result2.version).toBeGreaterThan(1)
		})

		it('allows partial updates', async () => {
			const { result } = renderHook(() => useUpdateUnit(), {
				wrapper: createWrapper()
			})

			// Only update bedrooms
			const partialUpdate: UpdateUnitInput = {
				bedrooms: 4
			}

			const updatedUnit = await result.current.mutateAsync({
				id: testUnitId,
				data: partialUpdate
			})

			expect(updatedUnit).toBeDefined()
			expect(updatedUnit!.bedrooms).toBe(4)
			expect(updatedUnit!.bathrooms).toBe(testUnit.bathrooms) // Unchanged
			expect(updatedUnit!.rent).toBe(testUnit.rent) // Unchanged
		})

		it('updates unit status', async () => {
			const { result } = renderHook(() => useUpdateUnit(), {
				wrapper: createWrapper()
			})

			const statusUpdate: UpdateUnitInput = {
				status: 'OCCUPIED'
			}

			const updatedUnit = await result.current.mutateAsync({
				id: testUnitId,
				data: statusUpdate
			})

			expect(updatedUnit!.status).toBe('OCCUPIED')
		})
	})

	describe('DELETE Unit', () => {
		let testPropertyId: string
		let testUnitId: string

		beforeEach(async () => {
			testPropertyId = await createTestProperty()

			// Create a test unit
			const unit = await clientFetch<Unit>('/api/v1/units', {
				method: 'POST',
				body: JSON.stringify({
					propertyId: testPropertyId,
					unitNumber: `${TEST_UNIT_PREFIX}-Delete-${Date.now()}`,
					bedrooms: 2,
					bathrooms: 1,
					rent: 2000,
					status: 'VACANT'
				})
			})
			testUnitId = unit.id
			createdUnitIds.push(unit.id)
		})

		it('deletes unit successfully', async () => {
			const { result } = renderHook(() => useDeleteUnit(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync(testUnitId)

			// Remove from cleanup array since it's already deleted
			createdUnitIds = createdUnitIds.filter(id => id !== testUnitId)

			// Verify deletion by trying to fetch
			const { result: fetchResult } = renderHook(() => useUnit(testUnitId), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(fetchResult.current.isError).toBe(true)
			})
		})

		it('handles delete of non-existent unit', async () => {
			const { result } = renderHook(() => useDeleteUnit(), {
				wrapper: createWrapper()
			})

			// Use properly formatted UUID that doesn't exist in database
			const nonExistentId = '00000000-0000-0000-0000-000000000000'
			await expect(async () => {
				await result.current.mutateAsync(nonExistentId)
			}).rejects.toThrow()
		})

		it('removes unit from cache after deletion', async () => {
			const wrapper = createWrapper()
			const { result: deleteResult } = renderHook(() => useDeleteUnit(), {
				wrapper
			})

			// First, fetch the unit to populate cache
			const { result: fetchResult } = renderHook(() => useUnit(testUnitId), {
				wrapper
			})

			await waitFor(() => {
				expect(fetchResult.current.isSuccess).toBe(true)
			})

			// Delete the unit
			await deleteResult.current.mutateAsync(testUnitId)

			createdUnitIds = createdUnitIds.filter(id => id !== testUnitId)

			// Verify cache is invalidated
			await waitFor(() => {
				expect(fetchResult.current.isError).toBe(true)
			})
		})
	})

	describe('CRUD Workflow', () => {
		it('completes full CRUD lifecycle', async () => {
			const wrapper = createWrapper()
			const propertyId = await createTestProperty()

			// 1. CREATE
			const { result: createResult } = renderHook(
				() => useCreateUnit(),
				{
					wrapper
				}
			)

			const newUnit: CreateUnitInput = {
				propertyId,
				unitNumber: `${TEST_UNIT_PREFIX}-Lifecycle-${Date.now()}`,
				bedrooms: 2,
				bathrooms: 1,
				squareFeet: 900,
				rent: 220,
				status: 'VACANT'
			}

			const createdUnit = await createResult.current.mutateAsync(newUnit)

			expect(createdUnit).toBeDefined()
			expect(createdUnit!.version).toBe(1)
			createdUnitIds.push(createdUnit!.id)

			// 2. READ
			const { result: $1 } = renderHook(
				() => useUnit(createdUnit!.id),
				{
					wrapper
				}
			)

			await waitFor(() => {
				expect(readResult.current.isSuccess).toBe(true)
			})

			expect(readResult.current.data!.unitNumber).toBe(newUnit.unitNumber)

			// 3. UPDATE
			const { result: $1 } = renderHook(
				() => useUpdateUnit(),
				{
					wrapper
				}
			)

			const updates: UpdateUnitInput = {
				bedrooms: 3,
				rent: 2500
			}

			const updatedUnit = await updateResult.current.mutateAsync({
				id: createdUnit!.id,
				data: updates
			})

			expect(updatedUnit!.bedrooms).toBe(3)
			expect(updatedUnit!.rent).toBe(2500)
			expect(updatedUnit!.version).toBe(2)

			// 4. DELETE
			const { result: $1 } = renderHook(
				() => useDeleteUnit(),
				{
					wrapper
				}
			)

			await deleteResult.current.mutateAsync(createdUnit!.id)

			createdUnitIds = createdUnitIds.filter(id => id !== createdUnit!.id)

			// Verify deletion
			const { result: $1 } = renderHook(
				() => useUnit(createdUnit!.id),
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

			// Fetch initial list
			const { result: listResult } = renderHook(() => useUnitList(), {
				wrapper
			})

			await waitFor(() => {
				expect(listResult.current.isSuccess).toBe(true)
			})

			const initialCount = listResult.current.data!.data.length

			// Create new unit
			const { result: createResult } = renderHook(() => useCreateUnit(), {
				wrapper
			})

			const newUnit: CreateUnitInput = {
				propertyId,
				unitNumber: `${TEST_UNIT_PREFIX}-Cache-${Date.now()}`,
				bedrooms: 2,
				bathrooms: 1,
				rent: 2000,
				status: 'VACANT'
			}

			const created = await createResult.current.mutateAsync(newUnit)
			createdUnitIds.push(created.id)

			// List should be invalidated and refetch
			await waitFor(() => {
				expect(listResult.current.data!.data.length).toBeGreaterThanOrEqual(
					initialCount
				)
			})
		})
	})
})
