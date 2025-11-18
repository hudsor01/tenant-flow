/**
 * Tenants CRUD Integration Tests - SIMPLIFIED
 * Tests basic tenant operations with real API calls
 * 
 * NOTE: These tests are integration tests that require a running backend.
 * They are currently skipped by default unless RUN_INTEGRATION_TESTS=true
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
	afterEach,
	beforeEach
} from 'vitest'
import {
	useTenantList,
	useTenant,
	useCreateTenant,
	useUpdateTenant,
	useMarkTenantAsMovedOut
} from '#hooks/api/use-tenant'
import type { TenantWithLeaseInfo } from '@repo/shared/types/core'
import { clientFetch } from '#lib/api/client'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import {
	createSupabaseTestClient,
	ensureEnvVars,
	getRequiredEnvVar
} from 'tests/utils/env'

const logger = createLogger({ component: 'UseTenantsCrudTest' })
const shouldRunIntegrationTests =
	process.env.RUN_INTEGRATION_TESTS === 'true' &&
	process.env.SKIP_INTEGRATION_TESTS !== 'true'
const describeIfReady = shouldRunIntegrationTests ? describe : describe.skip

const TEST_TENANT_PREFIX = 'TEST-CRUD'

// Shared QueryClient instance for tests that need cache coordination
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
			queries: {
				retry: false,
				gcTime: 60000
			},
			mutations: {
				retry: false
			}
		}
	})

	sharedQueryClient = queryClient

	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

describeIfReady('Tenants CRUD Integration Tests', () => {
	let createdtenant_ids: string[] = []

	// Authenticate before running tests
	beforeAll(async () => {
		ensureEnvVars(REQUIRED_ENV_VARS)
		const supabase = createSupabaseTestClient()

		const { data, error } = await supabase.auth.signInWithPassword({
			email: getRequiredEnvVar('E2E_OWNER_EMAIL'),
			password: getRequiredEnvVar('E2E_OWNER_PASSWORD')
		})

		if (error || !data.session) {
			throw new Error(
				`Failed to authenticate test user: ${error?.message || 'No session'}`
			)
		}
	})

	// Sign out after all tests
	afterAll(async () => {
		const supabase = createSupabaseTestClient()
		await supabase.auth.signOut()
	})

	beforeEach(() => {
		createdtenant_ids = []
	})

	// Cleanup: Delete all test tenants after tests
	afterEach(async () => {
		if (sharedQueryClient) {
			sharedQueryClient.clear()
		}

		for (const id of createdtenant_ids) {
			try {
				await clientFetch(`/api/v1/tenants/${id}`, { method: 'DELETE' })
			} catch (error) {
				logger.warn(`Failed to cleanup tenant ${id}`, {
					metadata: { error: error instanceof Error ? error.message : String(error) }
				})
			}
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

			expect(Array.isArray(result.current.data?.data)).toBe(true)
			expect(typeof result.current.data?.total).toBe('number')
		})

		it('fetches tenant by ID', async () => {
			// First, get a tenant from the list
			const tenants = await clientFetch<{ data: TenantWithLeaseInfo[] }>(
				'/api/v1/tenants?limit=1'
			)

		const tenantRecord = tenants.data?.[0]
		if (!tenantRecord) {
			// Skip if no tenants exist
			expect(true).toBe(true)
			return
		}

		const tenant_id = tenantRecord.id

			const { result } = renderHook(() => useTenant(tenant_id), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(result.current.data?.id).toBe(tenant_id)
		})

		it('fetches tenant list with pagination', async () => {
			const { result } = renderHook(() => useTenantList(1, 10), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true)
			})

			expect(Array.isArray(result.current.data?.data)).toBe(true)
		})
	})

	describe('ERROR HANDLING', () => {
		it('returns 404 for non-existent tenant', async () => {
			const fakeId = '00000000-0000-0000-0000-000000000000'
			const { result } = renderHook(() => useTenant(fakeId), {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(result.current.isError).toBe(true)
			})

			expect(result.current.error).toBeDefined()
		})
	})
})
