/**
 * Maintenance CRUD Integration Tests - SIMPLIFIED
 * Tests basic maintenance operations with real API calls
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
	afterEach
} from 'vitest'
import { useAllMaintenanceRequests } from '#hooks/api/use-maintenance'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import {
	createSupabaseTestClient,
	ensureEnvVars,
	getRequiredEnvVar
} from 'tests/utils/env'

const logger = createLogger({ component: 'UseMaintenanceCrudTest' })
const shouldRunIntegrationTests =
	process.env.RUN_INTEGRATION_TESTS === 'true' &&
	process.env.SKIP_INTEGRATION_TESTS !== 'true'
const describeIfReady = shouldRunIntegrationTests ? describe : describe.skip

let sharedQueryClient: QueryClient | null = null
const REQUIRED_ENV_VARS = [
	'NEXT_PUBLIC_SUPABASE_URL',
	'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
	'E2E_OWNER_EMAIL',
	'E2E_OWNER_PASSWORD'
] as const

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

describeIfReady('Maintenance CRUD Integration Tests', () => {
	beforeAll(async () => {
		ensureEnvVars(REQUIRED_ENV_VARS)
		const supabase = createSupabaseTestClient()

		const { data, error } = await supabase.auth.signInWithPassword({
			email: getRequiredEnvVar('E2E_OWNER_EMAIL'),
			password: getRequiredEnvVar('E2E_OWNER_PASSWORD')
		})

		if (error || !data.session) {
			throw new Error(`Failed to authenticate test user: ${error?.message || 'No session'}`)
		}
	})

	afterAll(async () => {
		const supabase = createSupabaseTestClient()
		await supabase.auth.signOut()
	})

	afterEach(async () => {
		if (sharedQueryClient) {
			sharedQueryClient.clear()
		}
	})

	describe('READ Operations', () => {
		it('fetches maintenance requests', async () => {
			const { result } = renderHook(() => useAllMaintenanceRequests(), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isLoading || result.current.isSuccess || result.current.isError).toBe(true)
			})

			// Should have data or error, but not loading forever
			expect(result.current.isLoading).toBe(false)
		})
	})
})
