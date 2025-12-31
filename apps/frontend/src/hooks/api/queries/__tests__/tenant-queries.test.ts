/**
 * Tenant Queries Tests (TDD - Testing CORRECT Behavior)
 *
 * Tests tenantQueries factory for:
 * - Correct query keys generation
 * - Proper queryFn implementation
 * - Filter handling
 * - Cache configuration
 * - Polling behavior
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockResponse } from '#test/unit-setup'
import { tenantQueries } from '../tenant-queries'
import type { TenantFilters } from '@repo/shared/types/api-contracts'

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock getApiBaseUrl
vi.mock('#lib/api-config', () => ({
	getApiBaseUrl: () => 'http://localhost:4600'
}))

// Mock Supabase client
const mockGetSession = vi.fn()
vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({
		auth: {
			getSession: mockGetSession
		}
	})
}))

describe('tenantQueries', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockFetch.mockReset()
		mockGetSession.mockReset()

		// Setup default session mock
		mockGetSession.mockResolvedValue({
			data: { session: { access_token: 'test-token' } }
		})

		// Setup default fetch mock
		mockFetch.mockResolvedValue(createMockResponse({ data: [], total: 0 }))
	})

	describe('query keys', () => {
		it('should generate base key for all tenants', () => {
			const key = tenantQueries.all()
			expect(key).toEqual(['tenants'])
		})

		it('should generate lists key extending base key', () => {
			const key = tenantQueries.lists()
			expect(key).toEqual(['tenants', 'list'])
		})

		it('should generate details key extending base key', () => {
			const key = tenantQueries.details()
			expect(key).toEqual(['tenants', 'detail'])
		})

		it('should generate list key with empty filters', () => {
			const options = tenantQueries.list()
			expect(options.queryKey).toEqual(['tenants', 'list', {}])
		})

		it('should generate list key with filters', () => {
			const filters: TenantFilters = { status: 'active', limit: 10 }
			const options = tenantQueries.list(filters)
			expect(options.queryKey).toEqual(['tenants', 'list', filters])
		})

		it('should generate detail key with tenant ID', () => {
			const options = tenantQueries.detail('tenant-123')
			expect(options.queryKey).toEqual(['tenants', 'detail', 'tenant-123'])
		})

		it('should generate stats key', () => {
			const options = tenantQueries.stats()
			expect(options.queryKey).toEqual(['tenants', 'stats'])
		})

		it('should generate invitations key', () => {
			const key = tenantQueries.invitations()
			expect(key).toEqual(['tenants', 'invitations'])
		})

		it('should generate allTenants key', () => {
			const options = tenantQueries.allTenants()
			expect(options.queryKey).toEqual(['tenants', 'list', 'all'])
		})

		it('should generate withLease key', () => {
			const options = tenantQueries.withLease('tenant-123')
			expect(options.queryKey).toEqual(['tenants', 'with-lease', 'tenant-123'])
		})

		it('should generate polling key', () => {
			const options = tenantQueries.polling('tenant-123')
			expect(options.queryKey).toEqual([
				'tenants',
				'detail',
				'tenant-123',
				'polling'
			])
		})

		it('should generate notification preferences key', () => {
			const options = tenantQueries.notificationPreferences('tenant-123')
			expect(options.queryKey).toEqual([
				'tenants',
				'detail',
				'tenant-123',
				'notification-preferences'
			])
		})

		it('should generate invitation list key', () => {
			const options = tenantQueries.invitationList()
			expect(options.queryKey).toEqual(['tenants', 'invitations'])
		})
	})

	describe('list query', () => {
		it('should call fetch with correct endpoint without filters', async () => {
			const options = tenantQueries.list()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenants',
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer test-token'
					})
				})
			)
		})

		it('should call fetch with search params for filters', async () => {
			const filters: TenantFilters = {
				status: 'active',
				property_id: 'prop-123',
				search: 'John',
				limit: 10,
				offset: 20
			}
			const options = tenantQueries.list(filters)
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenants?status=active&property_id=prop-123&search=John&limit=10&offset=20',
				expect.anything()
			)
		})

		it('should only include provided filters in query string', async () => {
			const filters: TenantFilters = { status: 'active' }
			const options = tenantQueries.list(filters)
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenants?status=active',
				expect.anything()
			)
		})

		it('should have proper staleTime configuration', () => {
			const options = tenantQueries.list()
			expect(options.staleTime).toBeDefined()
		})
	})

	describe('detail query', () => {
		it('should call fetch with tenant ID in endpoint', async () => {
			mockFetch.mockResolvedValue(
				createMockResponse({ id: 'tenant-123', first_name: 'John' })
			)

			const options = tenantQueries.detail('tenant-123')
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenants/tenant-123',
				expect.anything()
			)
		})

		it('should be disabled when ID is empty', () => {
			const options = tenantQueries.detail('')
			expect(options.enabled).toBe(false)
		})

		it('should be enabled when ID is provided', () => {
			const options = tenantQueries.detail('tenant-123')
			expect(options.enabled).toBe(true)
		})
	})

	describe('withLease query', () => {
		it('should call fetch with correct endpoint', async () => {
			mockFetch.mockResolvedValue(
				createMockResponse({
					id: 'tenant-123',
					first_name: 'John',
					lease: { id: 'lease-1' }
				})
			)

			const options = tenantQueries.withLease('tenant-123')
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenants/tenant-123/with-lease',
				expect.anything()
			)
		})

		it('should be disabled when ID is empty', () => {
			const options = tenantQueries.withLease('')
			expect(options.enabled).toBe(false)
		})

		it('should be enabled when ID is provided', () => {
			const options = tenantQueries.withLease('tenant-123')
			expect(options.enabled).toBe(true)
		})
	})

	describe('stats query', () => {
		it('should call fetch with correct endpoint', async () => {
			mockFetch.mockResolvedValue(
				createMockResponse({
					total: 50,
					active: 45,
					inactive: 5
				})
			)

			const options = tenantQueries.stats()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenants/stats',
				expect.anything()
			)
		})

		it('should have extended gcTime for stats caching', () => {
			const options = tenantQueries.stats()
			expect(options.gcTime).toBe(30 * 60 * 1000) // 30 minutes
		})
	})

	describe('allTenants query', () => {
		it('should call fetch with correct endpoint', async () => {
			mockFetch.mockResolvedValue(createMockResponse([]))

			const options = tenantQueries.allTenants()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenants',
				expect.anything()
			)
		})

		it('should have extended gcTime for dropdown data', () => {
			const options = tenantQueries.allTenants()
			expect(options.gcTime).toBe(30 * 60 * 1000) // 30 minutes
		})

		it('should have retry configuration', () => {
			const options = tenantQueries.allTenants()
			expect(options.retry).toBe(3)
		})

		it('should have structural sharing enabled', () => {
			const options = tenantQueries.allTenants()
			expect(options.structuralSharing).toBe(true)
		})
	})

	describe('polling query', () => {
		it('should call fetch with tenant ID', async () => {
			mockFetch.mockResolvedValue(createMockResponse({ id: 'tenant-123' }))

			const options = tenantQueries.polling('tenant-123')
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenants/tenant-123',
				expect.anything()
			)
		})

		it('should be disabled when ID is empty', () => {
			const options = tenantQueries.polling('')
			expect(options.enabled).toBe(false)
		})

		it('should have refetch interval configured (5 min fallback, SSE is primary)', () => {
			const options = tenantQueries.polling('tenant-123')
			expect(options.refetchInterval).toBe(5 * 60 * 1000) // 5 minutes fallback
		})

		it('should not refetch in background', () => {
			const options = tenantQueries.polling('tenant-123')
			expect(options.refetchIntervalInBackground).toBe(false)
		})

		it('should refetch on window focus', () => {
			const options = tenantQueries.polling('tenant-123')
			expect(options.refetchOnWindowFocus).toBe(true)
		})

		it('should have staleTime of 30 seconds', () => {
			const options = tenantQueries.polling('tenant-123')
			expect(options.staleTime).toBe(30_000) // 30 seconds
		})
	})

	describe('notification preferences query', () => {
		it('should call fetch with correct endpoint', async () => {
			mockFetch.mockResolvedValue(
				createMockResponse({
					emailNotifications: true,
					smsNotifications: false,
					maintenanceUpdates: true,
					paymentReminders: true
				})
			)

			const options = tenantQueries.notificationPreferences('tenant-123')
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenants/tenant-123/notification-preferences',
				expect.anything()
			)
		})

		it('should be disabled when tenant_id is empty', () => {
			const options = tenantQueries.notificationPreferences('')
			expect(options.enabled).toBe(false)
		})

		it('should have custom gcTime', () => {
			const options = tenantQueries.notificationPreferences('tenant-123')
			expect(options.gcTime).toBe(10 * 60 * 1000) // 10 minutes
		})
	})

	describe('invitation list query', () => {
		it('should call fetch with correct endpoint', async () => {
			const options = tenantQueries.invitationList()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenants/invitations',
				expect.anything()
			)
		})

		it('should use LIST cache times', () => {
			const options = tenantQueries.invitationList()
			expect(options.staleTime).toBeDefined()
		})
	})
})
