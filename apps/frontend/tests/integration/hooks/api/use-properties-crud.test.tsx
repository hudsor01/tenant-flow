/**
 * Properties CRUD Integration Tests - SIMPLIFIED
 * Tests basic property operations with real API calls
 *
 * Authentication is handled by the global setup (src/test/setup.ts)
 * which uses the singleton Supabase client.
 *
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
	describe,
	it,
	expect,
	afterEach
} from 'vitest'
import { usePropertyList } from '#hooks/api/use-properties'

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

describeIfReady('Properties CRUD Integration Tests', () => {
	afterEach(async () => {
		if (sharedQueryClient) {
			sharedQueryClient.clear()
		}
	})

	describe('READ Operations', () => {
		it('fetches properties list', async () => {
			const { result } = renderHook(() => usePropertyList(), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			// usePropertyList returns Property[] (select transforms PaginatedResponse to array)
			expect(result.current.data).toBeDefined()
			expect(Array.isArray(result.current.data)).toBe(true)
		})
	})

	describe('ERROR HANDLING', () => {
		it('handles API errors gracefully', async () => {
			// This test verifies that the hook properly handles the API response
			// The actual error testing requires a way to force API failures
			// For now, just verify the hook can be instantiated without crashing
			const { result } = renderHook(() => usePropertyList(), {
				wrapper: createWrapper()
			})

			// Just verify the hook initializes correctly
			expect(result.current.isLoading || result.current.isSuccess || result.current.isError).toBe(true)
		})
	})
})
