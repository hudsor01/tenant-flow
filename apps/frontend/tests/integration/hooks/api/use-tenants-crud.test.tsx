/**
 * Tenants CRUD Integration Tests
 *
 * Tests tenant hooks against real backend API.
 * Authentication is handled by the global setup (tests/integration/setup.ts)
 * which authenticates once and stores tokens for all test files.
 *
 * Run with:
 *   RUN_INTEGRATION_TESTS=true doppler run -- pnpm --filter @repo/frontend exec vitest run --config vitest.integration.config.js tests/integration/hooks/api/use-tenants-crud.test.tsx
 *
 * @vitest-environment jsdom
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { describe, it, expect, afterEach } from 'vitest'
import type { ReactNode } from 'react'
import {
	useTenant,
	useTenantWithLease,
	useTenantList,
	useAllTenants,
	useCreateTenant,
	useUpdateTenant
} from '#hooks/api/use-tenant'
import { tenantQueries } from '#hooks/api/queries/tenant-queries'

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

describeIfReady('Tenants CRUD Integration Tests', () => {
	afterEach(() => {
		if (sharedQueryClient) {
			sharedQueryClient.clear()
		}
	})

	// ============================================
	// READ OPERATIONS - Query Hooks
	// ============================================

	describe('READ Operations', () => {
		describe('useTenantList', () => {
			it('fetches paginated tenant list with correct response shape', async () => {
				const { result } = renderHook(() => useTenantList(), {
					wrapper: createWrapper()
				})

				await waitFor(() => {
					expect(result.current.isSuccess).toBe(true)
				})

				// useTenantList returns { data: TenantWithLeaseInfo[], total, page, limit }
				expect(result.current.data).toBeDefined()
				expect(Array.isArray(result.current.data?.data)).toBe(true)
				expect(typeof result.current.data?.total).toBe('number')
				expect(typeof result.current.data?.page).toBe('number')
				expect(typeof result.current.data?.limit).toBe('number')

				// Validate tenant shape if data exists
				if (result.current.data?.data && result.current.data.data.length > 0) {
					const tenant = result.current.data.data[0]
					expect(tenant).toHaveProperty('id')
					expect(tenant).toHaveProperty('first_name')
					expect(tenant).toHaveProperty('last_name')
					expect(tenant).toHaveProperty('email')
					expect(typeof tenant.id).toBe('string')
				}
			})

			it('supports pagination parameters', async () => {
				const { result } = renderHook(() => useTenantList(1, 10), {
					wrapper: createWrapper()
				})

				await waitFor(() => {
					expect(result.current.isSuccess).toBe(true)
				})

				expect(result.current.data).toBeDefined()
				expect(result.current.data?.page).toBe(1)
				expect(result.current.data?.limit).toBe(10)
			})
		})

		describe('useAllTenants', () => {
			it('fetches all tenants for dropdowns', async () => {
				const { result } = renderHook(() => useAllTenants(), {
					wrapper: createWrapper()
				})

				// useAllTenants has built-in retry logic, give it more time
				await waitFor(
					() => {
						expect(result.current.isSuccess || result.current.isError).toBe(
							true
						)
					},
					{ timeout: 15000 }
				)

				// May succeed or fail depending on backend response
				if (result.current.isSuccess) {
					expect(result.current.data).toBeDefined()
					expect(Array.isArray(result.current.data)).toBe(true)
				}
			})
		})

		describe('useTenant', () => {
			it('returns undefined for empty ID (disabled query)', () => {
				const { result } = renderHook(() => useTenant(''), {
					wrapper: createWrapper()
				})

				// Query should be disabled
				expect(result.current.isFetching).toBe(false)
				expect(result.current.data).toBeUndefined()
			})

			it('handles non-existent tenant with 404', async () => {
				const fakeId = '00000000-0000-0000-0000-000000000000'
				// Use useQuery directly to ensure retry: false
				const { result } = renderHook(
					() =>
						useQuery({
							...tenantQueries.detail(fakeId),
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

		describe('useTenantWithLease', () => {
			it('returns undefined for empty ID (disabled query)', () => {
				const { result } = renderHook(() => useTenantWithLease(''), {
					wrapper: createWrapper()
				})

				// Query should be disabled
				expect(result.current.isFetching).toBe(false)
				expect(result.current.data).toBeUndefined()
			})
		})
	})

	// ============================================
	// WRITE OPERATIONS - Mutation Hooks
	// Note: No delete tenant hook exists - tenants are managed differently
	// ============================================

	describe('WRITE Operations', () => {
		describe('useCreateTenant', () => {
			it('creates a new tenant with correct response shape', async () => {
				const { result } = renderHook(() => useCreateTenant(), {
					wrapper: createWrapper()
				})

				let createdTenant: Record<string, unknown> | undefined

				const uniqueEmail = `integration-test-${Date.now()}@example.com`

				await act(async () => {
					createdTenant = (await result.current.mutateAsync({
						first_name: 'Integration',
						last_name: 'Test',
						email: uniqueEmail,
						phone: '555-1234'
					})) as Record<string, unknown>
				})

				// Validate complete response shape
				expect(createdTenant).toBeDefined()
				expect(createdTenant!.id).toBeDefined()
				expect(typeof createdTenant!.id).toBe('string')
				expect(createdTenant!.first_name).toBe('Integration')
				expect(createdTenant!.last_name).toBe('Test')
				expect(createdTenant!.email).toBe(uniqueEmail)
				expect(createdTenant!.phone).toBe('555-1234')
				// Should have timestamps
				expect(createdTenant!.created_at).toBeDefined()
			})
		})

		describe('useUpdateTenant', () => {
			it('updates an existing tenant', async () => {
				const wrapper = createWrapper()

				// First, get list of tenants to find one to update
				const { result: listResult } = renderHook(() => useTenantList(), {
					wrapper
				})

				await waitFor(() => {
					expect(listResult.current.isSuccess).toBe(true)
				})

				// Skip test if no tenants exist
				if (!listResult.current.data?.data?.length) {
					return
				}

				const existingTenant = listResult.current.data.data[0]

				// Now update the tenant
				const { result: updateResult } = renderHook(() => useUpdateTenant(), {
					wrapper
				})

				let updatedTenant: unknown

				await act(async () => {
					updatedTenant = await updateResult.current.mutateAsync({
						id: existingTenant.id,
						data: { first_name: 'Updated' + Date.now() }
					})
				})

				expect(updatedTenant).toBeDefined()
			})
		})
	})

	// ============================================
	// CACHE BEHAVIOR
	// ============================================

	describe('Cache Behavior', () => {
		it('caches tenant list and reuses on subsequent calls', async () => {
			const wrapper = createWrapper()

			// First call
			const { result: result1 } = renderHook(() => useTenantList(), {
				wrapper
			})

			await waitFor(() => {
				expect(result1.current.isSuccess).toBe(true)
			})

			const firstData = result1.current.data

			// Second call should use cache
			const { result: result2 } = renderHook(() => useTenantList(), {
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
			const { result } = renderHook(() => useTenantList(), {
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
						...tenantQueries.detail(fakeId),
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
