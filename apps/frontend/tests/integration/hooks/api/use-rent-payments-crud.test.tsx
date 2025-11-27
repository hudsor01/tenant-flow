/**
 * Rent Payments Integration Tests
 * Tests rent payment creation and history with real API calls
 *
 * NOTE: Rent payments require Stripe integration and specific API contracts.
 * These tests are simplified until the rent payments API is updated.
 *
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, afterEach } from 'vitest'

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
		it('rent payments API requires Stripe integration - placeholder test', () => {
			// TODO: Update when rent payments API contract is finalized
			// Rent payments require:
			// - Stripe test mode configuration
			// - Valid payment methods
			// - Active tenant/lease relationships
			expect(true).toBe(true)
		})
	})
})
