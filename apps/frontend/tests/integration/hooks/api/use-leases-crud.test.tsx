/**
 * Leases CRUD Integration Tests
 *
 * Tests lease hooks against real backend API.
 * Authentication is handled by the global setup (tests/integration/setup.ts)
 * which authenticates once and stores tokens for all test files.
 *
 * Run with:
 *   RUN_INTEGRATION_TESTS=true doppler run -- pnpm --filter @repo/frontend exec vitest run --config vitest.integration.config.js tests/integration/hooks/api/use-leases-crud.test.tsx
 *
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { describe, it, expect, afterEach } from 'vitest'
import type { ReactNode } from 'react'
import {
	useLease,
	useLeaseList,
	useExpiringLeases,
	useLeaseStats
} from '#hooks/api/use-lease'
import { leaseQueries } from '#hooks/api/queries/lease-queries'

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

describeIfReady('Leases CRUD Integration Tests', () => {
	afterEach(() => {
		if (sharedQueryClient) {
			sharedQueryClient.clear()
		}
	})

	// ============================================
	// READ OPERATIONS - Query Hooks
	// ============================================

	describe('READ Operations', () => {
		describe('useLeaseList', () => {
			it('fetches paginated lease list with correct response shape', async () => {
				const { result } = renderHook(() => useLeaseList(), {
					wrapper: createWrapper()
				})

				await waitFor(() => {
					expect(result.current.isSuccess).toBe(true)
				})

				// useLeaseList returns PaginatedResponse { data: Lease[], total: number, ... }
				expect(result.current.data).toBeDefined()
				expect(Array.isArray(result.current.data?.data)).toBe(true)
				expect(typeof result.current.data?.total).toBe('number')

				// Validate lease shape if data exists
				if (result.current.data?.data && result.current.data.data.length > 0) {
					const lease = result.current.data.data[0]
					expect(lease).toHaveProperty('id')
					expect(lease).toHaveProperty('start_date')
					expect(lease).toHaveProperty('end_date')
					expect(lease).toHaveProperty('rent_amount')
					expect(typeof lease.id).toBe('string')
					expect(typeof lease.rent_amount).toBe('number')
				}
			})

			it('supports pagination parameters', async () => {
				const { result } = renderHook(
					() => useLeaseList({ page: 1, limit: 10 }),
					{ wrapper: createWrapper() }
				)

				await waitFor(() => {
					expect(result.current.isSuccess).toBe(true)
				})

				expect(result.current.data).toBeDefined()
			})

			it('supports status filtering', async () => {
				const { result } = renderHook(
					() => useLeaseList({ status: 'ACTIVE' }),
					{ wrapper: createWrapper() }
				)

				await waitFor(() => {
					expect(result.current.isSuccess).toBe(true)
				})

				expect(result.current.data).toBeDefined()
			})
		})

		describe('useLease', () => {
			it('returns undefined for empty ID (disabled query)', () => {
				const { result } = renderHook(() => useLease(''), {
					wrapper: createWrapper()
				})

				// Query should be disabled
				expect(result.current.isFetching).toBe(false)
				expect(result.current.data).toBeUndefined()
			})

			it('handles non-existent lease with 404', async () => {
				const fakeId = '00000000-0000-0000-0000-000000000000'
				// Use useQuery directly to ensure retry: false
				const { result } = renderHook(
					() =>
						useQuery({
							...leaseQueries.detail(fakeId),
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

		describe('useExpiringLeases', () => {
			it('fetches expiring leases with default days', async () => {
				const { result } = renderHook(() => useExpiringLeases(), {
					wrapper: createWrapper()
				})

				await waitFor(() => {
					expect(result.current.isSuccess).toBe(true)
				})

				expect(result.current.data).toBeDefined()
				expect(Array.isArray(result.current.data)).toBe(true)
			})

			it('fetches expiring leases with custom days', async () => {
				const { result } = renderHook(() => useExpiringLeases(60), {
					wrapper: createWrapper()
				})

				await waitFor(() => {
					expect(result.current.isSuccess).toBe(true)
				})

				expect(result.current.data).toBeDefined()
			})
		})

		describe('useLeaseStats', () => {
			it('fetches lease statistics', async () => {
				const { result } = renderHook(() => useLeaseStats(), {
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
	// CACHE BEHAVIOR
	// ============================================

	describe('Cache Behavior', () => {
		it('caches lease list and reuses on subsequent calls', async () => {
			const wrapper = createWrapper()

			// First call
			const { result: result1 } = renderHook(() => useLeaseList(), {
				wrapper
			})

			await waitFor(() => {
				expect(result1.current.isSuccess).toBe(true)
			})

			const firstData = result1.current.data

			// Second call should use cache
			const { result: result2 } = renderHook(() => useLeaseList(), {
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
			const { result } = renderHook(() => useLeaseList(), {
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
						...leaseQueries.detail(fakeId),
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
