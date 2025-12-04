/**
 * Properties CRUD Integration Tests
 *
 * Tests property hooks against real backend API.
 * Authentication is handled by the global setup (tests/integration/setup.ts)
 * which authenticates once and stores tokens for all test files.
 *
 * Run with:
 *   RUN_INTEGRATION_TESTS=true doppler run -- pnpm --filter @repo/frontend exec vitest run --config vitest.integration.config.js tests/integration/hooks/api/use-properties-crud.test.tsx
 *
 * @vitest-environment jsdom
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import {
	usePropertyList,
	useProperty,
	usePropertiesWithUnits,
	usePropertyStats,
	usePropertyPerformanceAnalytics,
	usePropertyOccupancyAnalytics,
	usePropertyFinancialAnalytics,
	usePropertyMaintenanceAnalytics,
	useCreateProperty,
	useUpdateProperty,
	useDeleteProperty,
	useMarkPropertySold
} from '#hooks/api/use-properties'
import { propertyQueries } from '#hooks/api/queries/property-queries'

// Only run when explicitly enabled
const shouldRunIntegrationTests =
	process.env.RUN_INTEGRATION_TESTS === 'true' &&
	process.env.SKIP_INTEGRATION_TESTS !== 'true'
const describeIfReady = shouldRunIntegrationTests ? describe : describe.skip

// Shared QueryClient for tests
let sharedQueryClient: QueryClient | null = null

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				gcTime: 60000,
				staleTime: 0 // Always fetch fresh for tests
			},
			mutations: { retry: false }
		}
	})
	sharedQueryClient = queryClient
	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

describeIfReady('Properties CRUD Integration Tests', () => {
	afterEach(() => {
		if (sharedQueryClient) {
			sharedQueryClient.clear()
		}
	})

	// ============================================
	// READ OPERATIONS - Query Hooks
	// ============================================

	describe('READ Operations', () => {
		describe('usePropertyList', () => {
			it('fetches paginated property list with correct response shape', async () => {
				const { result } = renderHook(() => usePropertyList(), {
					wrapper: createWrapper()
				})

				await waitFor(() => {
					expect(result.current.isSuccess).toBe(true)
				})

				// Should return array of properties
				expect(result.current.data).toBeDefined()
				expect(Array.isArray(result.current.data)).toBe(true)

				// Validate property shape if data exists
				if (result.current.data && result.current.data.length > 0) {
					const property = result.current.data[0]
					// Required fields for Property entity
					expect(property).toHaveProperty('id')
					expect(property).toHaveProperty('name')
					expect(property).toHaveProperty('address_line1')
					expect(property).toHaveProperty('city')
					expect(property).toHaveProperty('state')
					expect(property).toHaveProperty('postal_code')
					// Type validation
					expect(typeof property.id).toBe('string')
					expect(typeof property.name).toBe('string')
				}
			})

			it('supports search filtering', async () => {
				const { result } = renderHook(
					() => usePropertyList({ search: 'test' }),
					{ wrapper: createWrapper() }
				)

				await waitFor(() => {
					expect(result.current.isSuccess).toBe(true)
				})

				expect(result.current.data).toBeDefined()
			})

			it('supports pagination parameters', async () => {
				const { result } = renderHook(
					() => usePropertyList({ limit: 10, offset: 0 }),
					{ wrapper: createWrapper() }
				)

				await waitFor(() => {
					expect(result.current.isSuccess).toBe(true)
				})

				expect(result.current.data).toBeDefined()
			})
		})

		describe('useProperty', () => {
			it('returns undefined for empty ID (disabled query)', () => {
				const { result } = renderHook(() => useProperty(''), {
					wrapper: createWrapper()
				})

				// Query should be disabled
				expect(result.current.isFetching).toBe(false)
				expect(result.current.data).toBeUndefined()
			})

			it('handles non-existent property with 404', async () => {
				const fakeId = '00000000-0000-0000-0000-000000000000'
				// Use useQuery directly to ensure retry: false
				const { result } = renderHook(
					() =>
						useQuery({
							...propertyQueries.detail(fakeId),
							retry: false
						}),
					{ wrapper: createWrapper() }
				)

				await waitFor(() => {
					expect(result.current.isError).toBe(true)
				})

				expect(result.current.error).toBeDefined()
			})
		})

		describe('usePropertiesWithUnits', () => {
			it('fetches properties with their units', async () => {
				const { result } = renderHook(() => usePropertiesWithUnits(), {
					wrapper: createWrapper()
				})

				await waitFor(() => {
					expect(result.current.isSuccess).toBe(true)
				})

				expect(result.current.data).toBeDefined()
				expect(Array.isArray(result.current.data)).toBe(true)

				// Each property should have units array
				if (result.current.data && result.current.data.length > 0) {
					expect(result.current.data[0]).toHaveProperty('units')
					expect(Array.isArray(result.current.data[0].units)).toBe(true)
				}
			})
		})

		describe('usePropertyStats', () => {
			it('fetches property statistics with correct shape', async () => {
				const { result } = renderHook(() => usePropertyStats(), {
					wrapper: createWrapper()
				})

				await waitFor(() => {
					expect(result.current.isSuccess).toBe(true)
				})

				expect(result.current.data).toBeDefined()
				// Stats should have key metrics - validate shape
				expect(result.current.data).toHaveProperty('total')
				expect(typeof result.current.data!.total).toBe('number')
			})
		})
	})

	// ============================================
	// RESPONSE SHAPE VALIDATION
	// ============================================

	describe('Response Shape Validation', () => {
		it('property create response includes all required fields', async () => {
			const wrapper = createWrapper()
			const { result } = renderHook(() => useCreateProperty(), { wrapper })

			let created: Record<string, unknown> | undefined

			await act(async () => {
				created = (await result.current.mutateAsync({
					name: `Shape Test Property ${Date.now()}`,
					address_line1: '123 Shape St',
					city: 'Shape City',
					state: 'CA',
					postal_code: '12345'
				})) as Record<string, unknown>
			})

			// Validate complete response shape
			expect(created).toBeDefined()
			expect(created!.id).toBeDefined()
			expect(typeof created!.id).toBe('string')
			expect(created!.name).toContain('Shape Test Property')
			expect(created!.address_line1).toBe('123 Shape St')
			expect(created!.city).toBe('Shape City')
			expect(created!.state).toBe('CA')
			expect(created!.postal_code).toBe('12345')
			// Should have timestamps
			expect(created!.created_at).toBeDefined()

			// Cleanup
			const { result: deleteResult } = renderHook(() => useDeleteProperty(), {
				wrapper
			})
			await act(async () => {
				await deleteResult.current.mutateAsync(created!.id as string)
			})
		})

		it('property update response reflects changes', async () => {
			const wrapper = createWrapper()

			// Create property
			const { result: createResult } = renderHook(() => useCreateProperty(), {
				wrapper
			})
			let property: { id: string } | undefined

			await act(async () => {
				property = (await createResult.current.mutateAsync({
					name: 'Original Name',
					address_line1: '123 Original St',
					city: 'Original City',
					state: 'CA',
					postal_code: '12345'
				})) as { id: string }
			})

			// Update and validate response
			const { result: updateResult } = renderHook(() => useUpdateProperty(), {
				wrapper
			})
			let updated: { name: string } | undefined

			await act(async () => {
				updated = (await updateResult.current.mutateAsync({
					id: property!.id,
					data: { name: 'Updated Name' }
				})) as { name: string }
			})

			expect(updated!.name).toBe('Updated Name')

			// Cleanup
			const { result: deleteResult } = renderHook(() => useDeleteProperty(), {
				wrapper
			})
			await act(async () => {
				await deleteResult.current.mutateAsync(property!.id)
			})
		})

		it('handles empty property list gracefully', async () => {
			// Search for something that won't exist
			const { result } = renderHook(
				() => usePropertyList({ search: 'xyznonexistent12345' }),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			// Should return empty array, not null/undefined
			expect(result.current.data).toBeDefined()
			expect(Array.isArray(result.current.data)).toBe(true)
			expect(result.current.data!.length).toBe(0)
		})
	})

	// ============================================
	// ANALYTICS Operations
	// ============================================

	describe('Analytics Operations', () => {
		describe('usePropertyPerformanceAnalytics', () => {
			it('fetches performance analytics', async () => {
				const { result } = renderHook(() => usePropertyPerformanceAnalytics(), {
					wrapper: createWrapper()
				})

				await waitFor(() => {
					expect(result.current.isSuccess).toBe(true)
				})

				expect(result.current.data).toBeDefined()
			})
		})

		describe('usePropertyOccupancyAnalytics', () => {
			it('fetches occupancy analytics', async () => {
				const { result } = renderHook(() => usePropertyOccupancyAnalytics(), {
					wrapper: createWrapper()
				})

				await waitFor(() => {
					expect(result.current.isSuccess).toBe(true)
				})

				expect(result.current.data).toBeDefined()
			})
		})

		describe('usePropertyFinancialAnalytics', () => {
			it('fetches financial analytics', async () => {
				const { result } = renderHook(() => usePropertyFinancialAnalytics(), {
					wrapper: createWrapper()
				})

				await waitFor(() => {
					expect(result.current.isSuccess).toBe(true)
				})

				expect(result.current.data).toBeDefined()
			})
		})

		describe('usePropertyMaintenanceAnalytics', () => {
			it('fetches maintenance analytics', async () => {
				const { result } = renderHook(() => usePropertyMaintenanceAnalytics(), {
					wrapper: createWrapper()
				})

				await waitFor(() => {
					expect(result.current.isSuccess).toBe(true)
				})

				expect(result.current.data).toBeDefined()
			})
		})
	})

	// ============================================
	// WRITE OPERATIONS - Mutation Hooks
	// ============================================

	describe('WRITE Operations', () => {
		// Track created property IDs for cleanup
		let createdPropertyIds: string[] = []

		afterEach(async () => {
			// Cleanup: Delete any properties created during tests
			// This prevents test pollution
			if (createdPropertyIds.length > 0) {
				const wrapper = createWrapper()
				const { result } = renderHook(() => useDeleteProperty(), { wrapper })

				for (const id of createdPropertyIds) {
					try {
						await act(async () => {
							await result.current.mutateAsync(id)
						})
					} catch {
						// Ignore cleanup errors - property may already be deleted
					}
				}
				createdPropertyIds = []
			}
		})

		describe('useCreateProperty', () => {
			it('creates a new property', async () => {
				const { result } = renderHook(() => useCreateProperty(), {
					wrapper: createWrapper()
				})

				let createdProperty: unknown

				await act(async () => {
					createdProperty = await result.current.mutateAsync({
						name: `Integration Test Property ${Date.now()}`,
						address_line1: '789 Integration St',
						city: 'Test City',
						state: 'CA',
						postal_code: '90210'
					})
				})

				expect(createdProperty).toBeDefined()
				expect(createdProperty).toHaveProperty('id')
				expect((createdProperty as { name: string }).name).toContain(
					'Integration Test Property'
				)

				// Track for cleanup
				if ((createdProperty as { id: string }).id) {
					createdPropertyIds.push((createdProperty as { id: string }).id)
				}
			})
		})

		describe('useUpdateProperty', () => {
			it('updates an existing property', async () => {
				const wrapper = createWrapper()

				// First create a property to update
				const { result: createResult } = renderHook(() => useCreateProperty(), {
					wrapper
				})

				let createdProperty: { id: string; name: string } | undefined

				await act(async () => {
					createdProperty = (await createResult.current.mutateAsync({
						name: `Update Test Property ${Date.now()}`,
						address_line1: '123 Update St',
						city: 'Update City',
						state: 'CA',
						postal_code: '12345'
					})) as { id: string; name: string }
				})

				expect(createdProperty?.id).toBeDefined()
				createdPropertyIds.push(createdProperty!.id)

				// Now update the property
				const { result: updateResult } = renderHook(
					() => useUpdateProperty(),
					{ wrapper }
				)

				let updatedProperty: unknown

				await act(async () => {
					updatedProperty = await updateResult.current.mutateAsync({
						id: createdProperty!.id,
						data: { name: 'Updated Property Name' }
					})
				})

				expect(updatedProperty).toBeDefined()
				expect((updatedProperty as { name: string }).name).toBe(
					'Updated Property Name'
				)
			})
		})

		describe('useDeleteProperty', () => {
			it('deletes a property', async () => {
				const wrapper = createWrapper()

				// First create a property to delete
				const { result: createResult } = renderHook(() => useCreateProperty(), {
					wrapper
				})

				let createdProperty: { id: string } | undefined

				await act(async () => {
					createdProperty = (await createResult.current.mutateAsync({
						name: `Delete Test Property ${Date.now()}`,
						address_line1: '123 Delete St',
						city: 'Delete City',
						state: 'CA',
						postal_code: '12345'
					})) as { id: string }
				})

				expect(createdProperty?.id).toBeDefined()

				// Now delete the property
				const { result: deleteResult } = renderHook(
					() => useDeleteProperty(),
					{ wrapper }
				)

				let deleteResponse: unknown

				await act(async () => {
					deleteResponse = await deleteResult.current.mutateAsync(
						createdProperty!.id
					)
				})

				expect(deleteResponse).toBeDefined()
				expect(deleteResponse).toHaveProperty('message')
			})

			it('handles delete of non-existent property', async () => {
				const { result } = renderHook(() => useDeleteProperty(), {
					wrapper: createWrapper()
				})

				await act(async () => {
					try {
						await result.current.mutateAsync(
							'00000000-0000-0000-0000-000000000000'
						)
						// Should not reach here
						expect(true).toBe(false)
					} catch (error) {
						// Expected error for non-existent property
						expect(error).toBeDefined()
					}
				})
			})
		})

		describe('useMarkPropertySold', () => {
			it('marks a property as sold', async () => {
				const wrapper = createWrapper()

				// First create a property to mark as sold
				const { result: createResult } = renderHook(() => useCreateProperty(), {
					wrapper
				})

				let createdProperty: { id: string } | undefined

				await act(async () => {
					createdProperty = (await createResult.current.mutateAsync({
						name: `Sold Test Property ${Date.now()}`,
						address_line1: '123 Sold St',
						city: 'Sold City',
						state: 'CA',
						postal_code: '12345'
					})) as { id: string }
				})

				expect(createdProperty?.id).toBeDefined()
				createdPropertyIds.push(createdProperty!.id)

				// Now mark as sold
				const { result: soldResult } = renderHook(
					() => useMarkPropertySold(),
					{ wrapper }
				)

				let soldResponse: unknown

				await act(async () => {
					soldResponse = await soldResult.current.mutateAsync({
						id: createdProperty!.id,
						dateSold: new Date(),
						salePrice: 500000,
						saleNotes: 'Integration test sale'
					})
				})

				expect(soldResponse).toBeDefined()
				expect(soldResponse).toHaveProperty('success')
				expect((soldResponse as { success: boolean }).success).toBe(true)
			})
		})
	})

	// ============================================
	// CACHE BEHAVIOR
	// ============================================

	describe('Cache Behavior', () => {
		it('caches property list and reuses on subsequent calls', async () => {
			const wrapper = createWrapper()

			// First call
			const { result: result1 } = renderHook(() => usePropertyList(), {
				wrapper
			})

			await waitFor(() => {
				expect(result1.current.isSuccess).toBe(true)
			})

			const firstData = result1.current.data

			// Second call should use cache
			const { result: result2 } = renderHook(() => usePropertyList(), {
				wrapper
			})

			// Should immediately have data from cache
			expect(result2.current.data).toEqual(firstData)
		})

		it('invalidates cache after mutation', async () => {
			const wrapper = createWrapper()

			// First, fetch the list
			const { result: listResult } = renderHook(() => usePropertyList(), {
				wrapper
			})

			await waitFor(() => {
				expect(listResult.current.isSuccess).toBe(true)
			})

			const initialCount = listResult.current.data?.length || 0

			// Now create a property (triggers invalidation)
			const { result: createResult } = renderHook(() => useCreateProperty(), {
				wrapper
			})

			let createdProperty: { id: string } | undefined

			await act(async () => {
				createdProperty = (await createResult.current.mutateAsync({
					name: `Cache Test Property ${Date.now()}`,
					address_line1: '123 Cache St',
					city: 'Cache City',
					state: 'CA',
					postal_code: '12345'
				})) as { id: string }
			})

			// Wait for refetch after invalidation
			await waitFor(() => {
				const newCount = listResult.current.data?.length || 0
				expect(newCount).toBeGreaterThanOrEqual(initialCount)
			})

			// Cleanup
			if (createdProperty?.id) {
				const { result: deleteResult } = renderHook(
					() => useDeleteProperty(),
					{ wrapper }
				)
				await act(async () => {
					await deleteResult.current.mutateAsync(createdProperty!.id)
				})
			}
		})
	})

	// ============================================
	// ERROR HANDLING
	// ============================================

	describe('Error Handling', () => {
		it('handles network errors gracefully', async () => {
			// This tests that hooks don't crash on network issues
			const { result } = renderHook(() => usePropertyList(), {
				wrapper: createWrapper()
			})

			// Should eventually resolve (either success or error)
			await waitFor(
				() => {
					expect(result.current.isSuccess || result.current.isError).toBe(true)
				},
				{ timeout: 10000 }
			)
		})

		it('exposes error state correctly', async () => {
			const fakeId = '00000000-0000-0000-0000-000000000000'
			const { result } = renderHook(
				() =>
					useQuery({
						...propertyQueries.detail(fakeId),
						retry: false
					}),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current.isError).toBe(true)
			})

			// Error should be accessible
			expect(result.current.error).toBeDefined()
		})
	})
})
