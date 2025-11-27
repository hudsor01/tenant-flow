/**
 * Tenants CRUD Integration Tests
 * Tests basic tenant operations with real API calls
 *
 * Authentication is handled by the global setup (tests/integration/setup.ts)
 * which authenticates once and stores tokens for all test files.
 *
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { describe, it, expect, afterEach } from 'vitest'
import { useTenantList } from '#hooks/api/use-tenant'
import { tenantQueries } from '#hooks/api/queries/tenant-queries'

const shouldRunIntegrationTests =
	process.env.RUN_INTEGRATION_TESTS === 'true' &&
	process.env.SKIP_INTEGRATION_TESTS !== 'true'
const describeIfReady = shouldRunIntegrationTests ? describe : describe.skip

let sharedQueryClient: QueryClient | null = null

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 60000 },
			mutations: { retry: false }
		}
	})
	sharedQueryClient = queryClient
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

describeIfReady('Tenants CRUD Integration Tests', () => {
	afterEach(async () => {
		if (sharedQueryClient) {
			sharedQueryClient.clear()
		}
	})

	describe('READ Operations', () => {
		it('fetches tenant list', async () => {
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
		})

		it('returns 404 for non-existent tenant', async () => {
			const fakeId = '00000000-0000-0000-0000-000000000000'
			// Use useQuery directly to override retry setting from queryOptions
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
})
