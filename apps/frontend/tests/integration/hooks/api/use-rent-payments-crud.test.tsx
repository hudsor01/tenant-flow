/**
 * Rent Payments Integration Tests
 * Tests rent payment creation and history with real API calls
 *
 * NOTE: Rent payments require Stripe integration and specific API contracts.
 * These tests are simplified until the rent payments API is updated.
 *
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { describe, it, expect, afterEach } from 'vitest'
import { createClient } from '#utils/supabase/client'
import { getApiBaseUrl } from '#lib/api-config'
import { rentPaymentKeys } from '#hooks/api/use-rent-payments'

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

describeIfReady('Rent Payments Integration Tests', () => {
	afterEach(async () => {
		if (sharedQueryClient) {
			sharedQueryClient.clear()
		}
	})

	describe('API Contract', () => {
		it('returns paginated rent payments list', async () => {
			const { result } = renderHook(
				() =>
					useQuery({
						queryKey: rentPaymentKeys.list(),
						queryFn: async () => {
							const supabase = createClient()
							const { data: { session } } = await supabase.auth.getSession()
							const res = await fetch(`${getApiBaseUrl()}/api/v1/rent-payments`, {
								headers: { Authorization: `Bearer ${session?.access_token}` }
							})
							if (!res.ok) throw new Error(`API Error: ${res.status}`)
							return res.json() as Promise<{ data: unknown[]; total: number }>
						}
					}),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(result.current.data).toBeDefined()
			expect(Array.isArray(result.current.data?.data)).toBe(true)
			expect(result.current.data?.data).toHaveLength(0)
			expect(typeof result.current.data?.total).toBe('number')
		})
	})
})
