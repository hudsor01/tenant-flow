/**
 * Properties CRUD Integration Tests
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
	vi,
	beforeEach
} from 'vitest'
import {
	usePropertyList,
	useProperty,
	useCreateProperty,
	useUpdateProperty,
	useDeleteProperty,
	useMarkPropertySold,
	propertiesKeys
} from '#hooks/api/use-properties'
import type { Property } from '@repo/shared/types/core'
import type { CreatePropertyRequest } from '@repo/shared/types/backend-domain'
import { clientFetch } from '#lib/api/client'
import { createBrowserClient } from '@supabase/ssr'

// This is an INTEGRATION test - it calls the REAL API
// Make sure backend is running before running these tests
// Requires test user credentials in environment variables

const TEST_PROPERTY_PREFIX = 'TEST-CRUD'
let createdPropertyIds: string[] = []

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

describe('Properties CRUD Integration Tests', () => {
	// Authenticate before running tests
	beforeAll(async () => {
		// Validate ALL required environment variables
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

	// Cleanup: Delete all test properties and clear QueryClient cache
	afterEach(async () => {
		// Clear QueryClient cache to prevent memory leaks and test pollution
		if (sharedQueryClient) {
			sharedQueryClient.clear()
		}

		for (const id of createdPropertyIds) {
			try {
				await clientFetch(`/api/v1/properties/${id}`, { method: 'DELETE' })
			} catch (error) {
				console.warn(`Failed to cleanup property ${id}:`, error)
			}
		}
		createdPropertyIds = []
	})

	describe('CREATE Property', () => {
		it('creates a new property successfully', async () => {
			const { result } = renderHook(() => useCreateProperty(), {
				wrapper: createWrapper()
			})

			const newProperty: CreatePropertyRequest = {
				name: `${TEST_PROPERTY_PREFIX} Sunset Apartments ${Date.now()}`,
				address: '123 Test St',
				city: 'San Francisco',
				state: 'CA',
				zipCode: '94105',
				propertyType: 'APARTMENT',
				description: 'Integration test property'
			}

			// Call the mutation
			const createdProperty = await result.current.mutateAsync(newProperty)

			// Assertions
			expect(createdProperty).toBeDefined()
			expect(createdProperty!.name).toBe(newProperty.name)
			expect(createdProperty!.address).toBe(newProperty.address)
			expect(createdProperty!.city).toBe(newProperty.city)
			expect(createdProperty!.state).toBe(newProperty.state)
			expect(createdProperty!.zipCode).toBe(newProperty.zipCode)
			expect(createdProperty!.propertyType).toBe(newProperty.propertyType)
			expect(createdProperty!.status).toBe('ACTIVE')
			expect(createdProperty!.id).toBeTruthy()
			expect(createdProperty!.version).toBe(1) // Optimistic locking

			// Track for cleanup
			createdPropertyIds.push(createdProperty!.id)
		})

		it('validates required fields', async () => {
			const { result } = renderHook(() => useCreateProperty(), {
				wrapper: createWrapper()
			})

			const invalidProperty = {
				name: '', // Empty name should fail
				address: '123 Test St',
				city: 'SF',
				state: 'CA',
				zipCode: '94105'
			} as CreatePropertyRequest

			// Should throw validation error
			await expect(
				result.current.mutateAsync(invalidProperty)
			).rejects.toThrow()
		})

		it('handles duplicate property names', async () => {
			const { result } = renderHook(() => useCreateProperty(), {
				wrapper: createWrapper()
			})

			const propertyData: CreatePropertyRequest = {
				name: `${TEST_PROPERTY_PREFIX} Duplicate Test ${Date.now()}`,
				address: '456 Test Ave',
				city: 'Oakland',
				state: 'CA',
				zipCode: '94601',
				propertyType: 'SINGLE_FAMILY'
			}

			// Create first property
			const first = await result.current.mutateAsync(propertyData)
			createdPropertyIds.push(first.id)

			// Create second with same name (should succeed - names aren't unique)
			const second = await result.current.mutateAsync(propertyData)
			createdPropertyIds.push(second.id)

			expect(first.id).not.toBe(second.id)
			expect(first.name).toBe(second.name)
		})
	})

	describe('READ Property', () => {
		let testPropertyId: string

		beforeEach(async () => {
			// Create a test property to read
			const property: CreatePropertyRequest = {
				name: `${TEST_PROPERTY_PREFIX} Read Test ${Date.now()}`,
				address: '789 Read St',
				city: 'Berkeley',
				state: 'CA',
				zipCode: '94704',
				propertyType: 'CONDO'
			}

			const created = await clientFetch<Property>('/api/v1/properties', {
				method: 'POST',
				body: JSON.stringify(property)
			})

			testPropertyId = created.id
			createdPropertyIds.push(created.id)
		})

		it('fetches property by ID', async () => {
			const { result } = renderHook(() => useProperty(testPropertyId), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(result.current.data).toBeDefined()
			expect(result.current.data!.id).toBe(testPropertyId)
			expect(result.current.data!.name).toContain('Read Test')
		})

		it('fetches property list', async () => {
			const { result } = renderHook(() => usePropertyList(), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(result.current.data).toBeDefined()
			expect(result.current.data!.data).toBeInstanceOf(Array)
			expect(result.current.data!.total).toBeGreaterThan(0)

			// Should include our test property
			const foundProperty = result.current.data!.data.find(
				p => p.id === testPropertyId
			)
			expect(foundProperty).toBeDefined()
		})

		it('filters property list by search', async () => {
			const uniqueName = `UNIQUE-${Date.now()}`
			const property: CreatePropertyRequest = {
				name: uniqueName,
				address: '111 Search St',
				city: 'San Jose',
				state: 'CA',
				zipCode: '95110',
				propertyType: 'TOWNHOUSE'
			}

			const created = await clientFetch<Property>('/api/v1/properties', {
				method: 'POST',
				body: JSON.stringify(property)
			})
			createdPropertyIds.push(created.id)

			const { result } = renderHook(
				() => usePropertyList({ search: uniqueName }),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(result.current.data?.data).toHaveLength(1)
			expect(result.current.data?.data[0].name).toBe(uniqueName)
		})

		it('handles non-existent property ID', async () => {
			// Use properly formatted UUID that doesn't exist in database
			const nonExistentId = '00000000-0000-0000-0000-000000000000'
			const { result } = renderHook(() => useProperty(nonExistentId), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isError).toBe(true)
			})

			expect(result.current.error).toBeDefined()
		})
	})

	describe('UPDATE Property', () => {
		let testPropertyId: string

		beforeEach(async () => {
			// Create a test property to update
			const property: CreatePropertyRequest = {
				name: `${TEST_PROPERTY_PREFIX} Update Test ${Date.now()}`,
				address: '222 Update Blvd',
				city: 'Palo Alto',
				state: 'CA',
				zipCode: '94301',
				propertyType: 'SINGLE_FAMILY',
				description: 'Original description'
			}

			const created = await clientFetch<Property>('/api/v1/properties', {
				method: 'POST',
				body: JSON.stringify(property)
			})

			testPropertyId = created.id
			createdPropertyIds.push(created.id)
		})

		it('updates property successfully', async () => {
			const wrapper = createWrapper()

			// Fetch property first to get current version
			const { result: readResult } = renderHook(
				() => useProperty(testPropertyId),
				{
					wrapper
				}
			)

			await waitFor(() => {
				expect(readResult.current.isSuccess).toBe(true)
			})

			const currentProperty = readResult.current.data!

			const { result } = renderHook(() => useUpdateProperty(), {
				wrapper
			})

			const updatedData = {
				name: `${TEST_PROPERTY_PREFIX} Updated Name`,
				description: 'Updated description'
			}

			const updated = await result.current.mutateAsync({
				id: testPropertyId,
				data: updatedData,
				version: currentProperty.version // 🔐 Pass version for optimistic locking
			})

			expect(updated).toBeDefined()
			expect(updated!.name).toBe(updatedData.name)
			expect(updated!.description).toBe(updatedData.description)
			expect(updated!.version).toBe(2) // Version incremented
		})

		it('handles optimistic locking conflicts', async () => {
			const wrapper = createWrapper()

			// Get current property and populate cache
			const { result: readResult } = renderHook(
				() => useProperty(testPropertyId),
				{
					wrapper
				}
			)

			await waitFor(() => {
				expect(readResult.current.isSuccess).toBe(true)
			})

			const currentProperty = readResult.current.data!

			// Simulate concurrent update (update with old version)
			const { result: hook1 } = renderHook(() => useUpdateProperty(), {
				wrapper
			})

			// First update succeeds
			await hook1.current.mutateAsync({
				id: testPropertyId,
				data: { name: 'First Update' }
			})

			// Second update with stale version should fail (409 Conflict)
			const { result: hook2 } = renderHook(() => useUpdateProperty(), {
				wrapper: createWrapper()
			})

			await expect(
				hook2.current.mutateAsync({
					id: testPropertyId,
					data: {
						name: 'Second Update',
						version: currentProperty.version // Stale version
					}
				})
			).rejects.toThrow()
		})

		it('updates only specified fields', async () => {
			const wrapper = createWrapper()

			// Fetch property first to get current version
			const { result: readResult } = renderHook(
				() => useProperty(testPropertyId),
				{
					wrapper
				}
			)

			await waitFor(() => {
				expect(readResult.current.isSuccess).toBe(true)
			})

			const currentProperty = readResult.current.data!

			const { result } = renderHook(() => useUpdateProperty(), {
				wrapper
			})

			// Update only description
			const updated = await result.current.mutateAsync({
				id: testPropertyId,
				data: { description: 'Only description changed' },
				version: currentProperty.version // 🔐 Pass version for optimistic locking
			})

			// Name should remain unchanged
			expect(updated.description).toBe('Only description changed')
			expect(updated.name).toContain('Update Test')
		})
	})

	// DELETE Property tests removed - properties cannot be deleted in production UI
	// DELETE endpoint exists for backend/admin cleanup only
	// Test cleanup still uses DELETE in afterEach

	describe('MARK SOLD Property', () => {
		let testPropertyId: string

		beforeEach(async () => {
			// Create a test property to mark as sold
			const property: CreatePropertyRequest = {
				name: `${TEST_PROPERTY_PREFIX} Sold Test ${Date.now()}`,
				address: '444 Sold Ln',
				city: 'Sunnyvale',
				state: 'CA',
				zipCode: '94086',
				propertyType: 'SINGLE_FAMILY'
			}

			const created = await clientFetch<Property>('/api/v1/properties', {
				method: 'POST',
				body: JSON.stringify(property)
			})

			testPropertyId = created.id
			createdPropertyIds.push(created.id)
		})

		it('marks property as sold with required fields', async () => {
			const { result } = renderHook(() => useMarkPropertySold(), {
				wrapper: createWrapper()
			})

			const saleDate = new Date('2024-12-01')
			const salePrice = 750000
			const saleNotes = 'Sold to first-time buyer'

			await result.current.mutateAsync({
				id: testPropertyId,
				dateSold: saleDate,
				salePrice,
				saleNotes
			})

			// Verify property is marked as sold
			const soldProperty = await clientFetch<Property>(
				`/api/v1/properties/${testPropertyId}`
			)

			expect(soldProperty.status).toBe('SOLD')
			expect(soldProperty.date_sold).toBeTruthy()
			expect(soldProperty.sale_price).toBe(salePrice)
			expect(soldProperty.sale_notes).toBe(saleNotes)
		})

		it('requires sale price when marking as sold', async () => {
			const { result } = renderHook(() => useMarkPropertySold(), {
				wrapper: createWrapper()
			})

			await expect(
				result.current.mutateAsync({
					id: testPropertyId,
					dateSold: new Date(),
					salePrice: 0 // Invalid sale price
				})
			).rejects.toThrow()
		})
	})

	describe('CRUD Workflow', () => {
		it('completes full CRUD lifecycle', async () => {
			const wrapper = createWrapper()

			// 1. CREATE
			const { result: createResult } = renderHook(() => useCreateProperty(), {
				wrapper
			})

			const newProperty: CreatePropertyRequest = {
				name: `${TEST_PROPERTY_PREFIX} Lifecycle ${Date.now()}`,
				address: '555 Lifecycle Way',
				city: 'Redwood City',
				state: 'CA',
				zipCode: '94063',
				propertyType: 'CONDO',
				description: 'Test lifecycle'
			}

			const created = await createResult.current.mutateAsync(newProperty)
			expect(created.id).toBeTruthy()
			expect(created.version).toBe(1)

			const propertyId = created.id
			createdPropertyIds.push(propertyId)

			// 2. READ
			const { result: readResult } = renderHook(() => useProperty(propertyId), {
				wrapper
			})

			await waitFor(() => {
				expect(readResult.current.isSuccess).toBe(true)
			})

			expect(readResult.current.data!.name).toBe(newProperty.name)

			// 3. UPDATE
			const { result: updateResult } = renderHook(() => useUpdateProperty(), {
				wrapper
			})

			const currentVersion = readResult.current.data!.version

			const updated = await updateResult.current.mutateAsync({
				id: propertyId,
				data: { description: 'Updated lifecycle description' },
				version: currentVersion // 🔐 Pass version for optimistic locking
			})

			expect(updated.description).toBe('Updated lifecycle description')
			expect(updated.version).toBe(2)

			// Note: Properties are not deleted in production UI
			// They can be marked as SOLD via useMarkPropertySold()
			// Lifecycle completes at UPDATE (no DELETE step)
		})
	})

	describe('Cache Invalidation', () => {
		it('invalidates list cache after create', async () => {
			const wrapper = createWrapper()
			const { result: listResult } = renderHook(() => usePropertyList(), {
				wrapper
			})

			// Wait for initial list
			await waitFor(() => {
				expect(listResult.current.isSuccess).toBe(true)
			})

			const initialCount = listResult.current.data!.total

			// Create new property
			const { result: createResult } = renderHook(() => useCreateProperty(), {
				wrapper
			})

			const newProperty: CreatePropertyRequest = {
				name: `${TEST_PROPERTY_PREFIX} Cache Test ${Date.now()}`,
				address: '666 Cache Ct',
				city: 'Cupertino',
				state: 'CA',
				zipCode: '95014',
				propertyType: 'SINGLE_FAMILY'
			}

			const created = await createResult.current.mutateAsync(newProperty)
			createdPropertyIds.push(created.id)

			// Wait for list to be invalidated and refetched
			await waitFor(() => {
				expect(listResult.current.data!.total).toBeGreaterThan(initialCount)
			})

			// New property should be in the list
			const foundProperty = listResult.current.data!.data.find(
				p => p.id === created.id
			)
			expect(foundProperty).toBeDefined()
		})
	})
})
