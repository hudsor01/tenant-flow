/**
 * Lease Queries Tests (TDD - Testing CORRECT Behavior)
 *
 * Tests leaseQueries factory for:
 * - Correct query keys generation
 * - Proper queryFn implementation
 * - Filter handling
 * - Cache configuration
 * - Analytics queries
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockResponse } from '#test/unit-setup'
import { leaseQueries, type LeaseFilters } from '../lease-queries'

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock getApiBaseUrl
vi.mock('#lib/api-config', () => ({
	getApiBaseUrl: () => 'http://localhost:4600'
}))

// Mock Supabase client
const mockGetSession = vi.fn()
vi.mock('#utils/supabase/client', () => ({
	createClient: () => ({
		auth: {
			getSession: mockGetSession
		}
	})
}))

describe('leaseQueries', () => {
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
		it('should generate base key for all leases', () => {
			const key = leaseQueries.all()
			expect(key).toEqual(['leases'])
		})

		it('should generate lists key extending base key', () => {
			const key = leaseQueries.lists()
			expect(key).toEqual(['leases', 'list'])
		})

		it('should generate details key extending base key', () => {
			const key = leaseQueries.details()
			expect(key).toEqual(['leases', 'detail'])
		})

		it('should generate list key with empty filters', () => {
			const options = leaseQueries.list()
			expect(options.queryKey).toEqual(['leases', 'list', {}])
		})

		it('should generate list key with filters', () => {
			const filters: LeaseFilters = { status: 'active', limit: 10 }
			const options = leaseQueries.list(filters)
			expect(options.queryKey).toEqual(['leases', 'list', filters])
		})

		it('should generate detail key with lease ID', () => {
			const options = leaseQueries.detail('lease-123')
			expect(options.queryKey).toEqual(['leases', 'detail', 'lease-123'])
		})

		it('should generate stats key', () => {
			const options = leaseQueries.stats()
			expect(options.queryKey).toEqual(['leases', 'stats'])
		})

		it('should generate tenant portal active key', () => {
			const options = leaseQueries.tenantPortalActive()
			expect(options.queryKey).toEqual(['leases', 'tenant-portal', 'active'])
		})

		it('should generate expiring key with default days', () => {
			const options = leaseQueries.expiring()
			expect(options.queryKey).toEqual(['leases', 'expiring', 30])
		})

		it('should generate expiring key with custom days', () => {
			const options = leaseQueries.expiring(60)
			expect(options.queryKey).toEqual(['leases', 'expiring', 60])
		})

		it('should generate signature status key', () => {
			const options = leaseQueries.signatureStatus('lease-123')
			expect(options.queryKey).toEqual(['leases', 'signature-status', 'lease-123'])
		})

		it('should generate analytics performance key', () => {
			const options = leaseQueries.analytics.performance()
			expect(options.queryKey).toEqual(['leases', 'analytics', 'performance'])
		})

		it('should generate analytics duration key', () => {
			const options = leaseQueries.analytics.duration()
			expect(options.queryKey).toEqual(['leases', 'analytics', 'duration'])
		})

		it('should generate analytics turnover key', () => {
			const options = leaseQueries.analytics.turnover()
			expect(options.queryKey).toEqual(['leases', 'analytics', 'turnover'])
		})

		it('should generate analytics revenue key', () => {
			const options = leaseQueries.analytics.revenue()
			expect(options.queryKey).toEqual(['leases', 'analytics', 'revenue'])
		})
	})

	describe('list query', () => {
		it('should call fetch with correct endpoint without filters', async () => {
			const options = leaseQueries.list()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases',
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer test-token'
					})
				})
			)
		})

		it('should call fetch with search params for filters', async () => {
			const filters: LeaseFilters = {
				status: 'active',
				search: 'apartment',
				limit: 10,
				offset: 20
			}
			const options = leaseQueries.list(filters)
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases?status=active&search=apartment&limit=10&offset=20',
				expect.anything()
			)
		})

		it('should only include provided filters in query string', async () => {
			const filters: LeaseFilters = { status: 'active' }
			const options = leaseQueries.list(filters)
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases?status=active',
				expect.anything()
			)
		})

		it('should have proper staleTime configuration', () => {
			const options = leaseQueries.list()
			expect(options.staleTime).toBeDefined()
		})
	})

	describe('detail query', () => {
		it('should call fetch with lease ID in endpoint', async () => {
			mockFetch.mockResolvedValue(createMockResponse({ id: 'lease-123' }))

			const options = leaseQueries.detail('lease-123')
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases/lease-123',
				expect.anything()
			)
		})

		it('should be disabled when ID is empty', () => {
			const options = leaseQueries.detail('')
			expect(options.enabled).toBe(false)
		})

		it('should be enabled when ID is provided', () => {
			const options = leaseQueries.detail('lease-123')
			expect(options.enabled).toBe(true)
		})

		it('should have retry configuration', () => {
			const options = leaseQueries.detail('lease-123')
			expect(options.retry).toBe(2)
		})
	})

	describe('tenantPortalActive query', () => {
		it('should call fetch with correct endpoint', async () => {
			mockFetch.mockResolvedValue(createMockResponse({
				id: 'lease-123',
				metadata: { documentUrl: null }
			}))

			const options = leaseQueries.tenantPortalActive()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/tenants/leases',
				expect.anything()
			)
		})

		it('should have retry configuration', () => {
			const options = leaseQueries.tenantPortalActive()
			expect(options.retry).toBe(2)
		})
	})

	describe('expiring query', () => {
		it('should call fetch with default days parameter', async () => {
			mockFetch.mockResolvedValue(createMockResponse([]))

			const options = leaseQueries.expiring()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases/expiring?days=30',
				expect.anything()
			)
		})

		it('should call fetch with custom days parameter', async () => {
			mockFetch.mockResolvedValue(createMockResponse([]))

			const options = leaseQueries.expiring(60)
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases/expiring?days=60',
				expect.anything()
			)
		})

		it('should have retry configuration', () => {
			const options = leaseQueries.expiring()
			expect(options.retry).toBe(2)
		})
	})

	describe('stats query', () => {
		it('should call fetch with correct endpoint', async () => {
			mockFetch.mockResolvedValue(createMockResponse({
				total: 100,
				active: 80,
				expiring: 10
			}))

			const options = leaseQueries.stats()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases/stats',
				expect.anything()
			)
		})

		it('should have STATS cache times', () => {
			const options = leaseQueries.stats()
			expect(options.staleTime).toBeDefined()
		})
	})

	describe('signatureStatus query', () => {
		it('should call fetch with lease ID', async () => {
			mockFetch.mockResolvedValue(createMockResponse({
				lease_id: 'lease-123',
				status: 'pending',
				owner_signed: false,
				tenant_signed: false
			}))

			const options = leaseQueries.signatureStatus('lease-123')
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases/lease-123/signature-status',
				expect.anything()
			)
		})

		it('should be disabled when ID is empty', () => {
			const options = leaseQueries.signatureStatus('')
			expect(options.enabled).toBe(false)
		})

		it('should be enabled when ID is provided', () => {
			const options = leaseQueries.signatureStatus('lease-123')
			expect(options.enabled).toBe(true)
		})
	})

	describe('analytics queries', () => {
		it('should call fetch for performance analytics', async () => {
			mockFetch.mockResolvedValue(createMockResponse({}))

			const options = leaseQueries.analytics.performance()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases/analytics/performance',
				expect.anything()
			)
		})

		it('should call fetch for duration analytics', async () => {
			mockFetch.mockResolvedValue(createMockResponse({}))

			const options = leaseQueries.analytics.duration()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases/analytics/duration',
				expect.anything()
			)
		})

		it('should call fetch for turnover analytics', async () => {
			mockFetch.mockResolvedValue(createMockResponse({}))

			const options = leaseQueries.analytics.turnover()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases/analytics/turnover',
				expect.anything()
			)
		})

		it('should call fetch for revenue analytics', async () => {
			mockFetch.mockResolvedValue(createMockResponse({}))

			const options = leaseQueries.analytics.revenue()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/leases/analytics/revenue',
				expect.anything()
			)
		})

		it('should have STATS cache times for all analytics', () => {
			expect(leaseQueries.analytics.performance().staleTime).toBeDefined()
			expect(leaseQueries.analytics.duration().staleTime).toBeDefined()
			expect(leaseQueries.analytics.turnover().staleTime).toBeDefined()
			expect(leaseQueries.analytics.revenue().staleTime).toBeDefined()
		})
	})
})
