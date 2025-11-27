/**
 * Units CRUD Integration Tests
 * Tests basic unit operations with real API calls
 *
 * Authentication is handled by the global setup (tests/integration/setup.ts)
 * which authenticates once and stores tokens for all test files.
 *
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { describe, it, expect, afterEach } from 'vitest'
import { useUnitList } from '#hooks/api/use-unit'
import { unitQueries } from '#hooks/api/queries/unit-queries'

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

describeIfReady('Units CRUD Integration Tests', () => {
	afterEach(async () => {
		if (sharedQueryClient) {
			sharedQueryClient.clear()
		}
	})

	describe('READ Operations', () => {
		it('fetches unit list', async () => {
			const { result } = renderHook(() => useUnitList(), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			// useUnitList returns Unit[] (select extracts data array)
			expect(Array.isArray(result.current.data)).toBe(true)
		})

		it('returns 404 for non-existent unit', async () => {
			const fakeId = '00000000-0000-0000-0000-000000000000'
			// Use useQuery directly to override retry setting from queryOptions
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
})
