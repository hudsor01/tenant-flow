/**
 * Units CRUD Integration Tests
 *
 * Tests unit hooks against real backend API.
 * Authentication is handled by the global setup (tests/integration/setup.ts)
 * which authenticates once and stores tokens for all test files.
 *
 * Run with:
 *   RUN_INTEGRATION_TESTS=true doppler run -- pnpm --filter @repo/frontend exec vitest run --config vitest.integration.config.js tests/integration/hooks/api/use-units-crud.test.tsx
 *
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { describe, it, expect, afterEach } from 'vitest'
import type { ReactNode } from 'react'
import {
	useUnit,
	useUnitList,
	useUnitStats,
	useVacantUnits,
	useAllUnits
} from '#hooks/api/use-unit'
import { unitQueries } from '#hooks/api/queries/unit-queries'

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

describeIfReady('Units CRUD Integration Tests', () => {
	afterEach(() => {
		if (sharedQueryClient) {
			sharedQueryClient.clear()
		}
	})

	// ============================================
	// READ OPERATIONS - Query Hooks
	// ============================================

	describe('READ Operations', () => {
		describe('useUnitList', () => {
			it('fetches unit list with correct response shape', async () => {
				const { result } = renderHook(() => useUnitList(), {
					wrapper: createWrapper()
				})

				await waitFor(() => {
					expect(result.current.isSuccess).toBe(true)
				})

				// useUnitList returns Unit[] (select extracts data array)
				expect(Array.isArray(result.current.data)).toBe(true)

				// Validate unit shape if data exists
				if (result.current.data && result.current.data.length > 0) {
					const unit = result.current.data[0]
					expect(unit).toHaveProperty('id')
					expect(unit).toHaveProperty('unit_number')
					expect(unit).toHaveProperty('status')
					expect(typeof unit.id).toBe('string')
					expect(typeof unit.unit_number).toBe('string')
				}
			})

			it('supports status filtering', async () => {
				const { result } = renderHook(
					() => useUnitList({ status: 'VACANT' }),
					{ wrapper: createWrapper() }
				)

				await waitFor(() => {
					expect(result.current.isSuccess).toBe(true)
				})

				expect(result.current.data).toBeDefined()
			})

			it('supports pagination parameters', async () => {
				const { result } = renderHook(
					() => useUnitList({ limit: 10, offset: 0 }),
					{ wrapper: createWrapper() }
				)

				await waitFor(() => {
					expect(result.current.isSuccess).toBe(true)
				})

				expect(result.current.data).toBeDefined()
			})
		})

		describe('useUnit', () => {
			it('returns undefined for empty ID (disabled query)', () => {
				const { result } = renderHook(() => useUnit(''), {
					wrapper: createWrapper()
				})

				// Query should be disabled
				expect(result.current.isFetching).toBe(false)
				expect(result.current.data).toBeUndefined()
			})

			it('handles non-existent unit with 404', async () => {
				const fakeId = '00000000-0000-0000-0000-000000000000'
				// Use useQuery directly to ensure retry: false
				const { result } = renderHook(
					() =>
						useQuery({
							...unitQueries.detail(fakeId),
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

		describe('useUnitStats', () => {
			it('fetches unit statistics', async () => {
				const { result } = renderHook(() => useUnitStats(), {
					wrapper: createWrapper()
				})

				await waitFor(() => {
					expect(result.current.isSuccess).toBe(true)
				})

				expect(result.current.data).toBeDefined()
			})
		})

		describe('useVacantUnits', () => {
			it('fetches vacant units', async () => {
				const { result } = renderHook(() => useVacantUnits(), {
					wrapper: createWrapper()
				})

				await waitFor(() => {
					expect(result.current.isSuccess).toBe(true)
				})

				expect(result.current.data).toBeDefined()
				expect(Array.isArray(result.current.data)).toBe(true)
			})
		})

		describe('useAllUnits', () => {
			it('fetches all units for dropdowns', async () => {
				const { result } = renderHook(() => useAllUnits(), {
					wrapper: createWrapper()
				})

				await waitFor(() => {
					expect(result.current.isSuccess).toBe(true)
				})

				expect(result.current.data).toBeDefined()
				expect(Array.isArray(result.current.data)).toBe(true)
			})
		})
	})

	// ============================================
	// CACHE BEHAVIOR
	// ============================================

	describe('Cache Behavior', () => {
		it('caches unit list and reuses on subsequent calls', async () => {
			const wrapper = createWrapper()

			// First call
			const { result: result1 } = renderHook(() => useUnitList(), {
				wrapper
			})

			await waitFor(() => {
				expect(result1.current.isSuccess).toBe(true)
			})

			const firstData = result1.current.data

			// Second call should use cache
			const { result: result2 } = renderHook(() => useUnitList(), {
				wrapper
			})

			// Should immediately have data from cache
			expect(result2.current.data).toEqual(firstData)
		})
	})

	// ============================================
	// ERROR HANDLING
	// ============================================

	describe('Error Handling', () => {
		it('handles network errors gracefully', async () => {
			const { result } = renderHook(() => useUnitList(), {
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
						...unitQueries.detail(fakeId),
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
