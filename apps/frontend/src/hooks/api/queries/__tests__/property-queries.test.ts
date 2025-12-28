/**
 * Property Queries Tests (TDD - Testing CORRECT Behavior)
 *
 * Tests propertyQueries factory for:
 * - Correct query keys generation
 * - Proper queryFn implementation
 * - Filter handling
 * - Cache configuration
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockResponse } from '#test/unit-setup'
import { propertyQueries, type PropertyFilters } from '../property-queries'

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock getApiBaseUrl
vi.mock('#lib/api-config', () => ({
	getApiBaseUrl: () => 'http://localhost:4600'
}))

// Mock Supabase client
const mockSupabaseSelect = vi.fn()
const mockSupabaseFrom = vi.fn(() => ({
	select: mockSupabaseSelect
}))
const mockSupabaseEq = vi.fn()
const mockSupabaseOrder = vi.fn()
const mockGetSession = vi.fn()

vi.mock('#utils/supabase/client', () => ({
	createClient: () => ({
		from: mockSupabaseFrom,
		auth: {
			getSession: mockGetSession
		}
	})
}))

describe('propertyQueries', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockFetch.mockReset()
		mockSupabaseFrom.mockReset()
		mockSupabaseSelect.mockReset()
		mockSupabaseEq.mockReset()
		mockSupabaseOrder.mockReset()
		mockGetSession.mockReset()

		// Setup default session mock
		mockGetSession.mockResolvedValue({
			data: { session: { access_token: 'test-token' } }
		})

		// Setup default fetch mock
		mockFetch.mockResolvedValue(createMockResponse({ data: [], total: 0 }))

		// Setup default Supabase chain
		mockSupabaseFrom.mockReturnValue({
			select: mockSupabaseSelect
		})
		mockSupabaseSelect.mockReturnValue({
			eq: mockSupabaseEq
		})
		mockSupabaseEq.mockReturnValue({
			order: mockSupabaseOrder
		})
	})

	describe('query keys', () => {
		it('should generate base key for all properties', () => {
			const key = propertyQueries.all()
			expect(key).toEqual(['properties'])
		})

		it('should generate lists key extending base key', () => {
			const key = propertyQueries.lists()
			expect(key).toEqual(['properties', 'list'])
		})

		it('should generate details key extending base key', () => {
			const key = propertyQueries.details()
			expect(key).toEqual(['properties', 'detail'])
		})

		it('should generate list key with empty filters', () => {
			const options = propertyQueries.list()
			expect(options.queryKey).toEqual(['properties', 'list', {}])
		})

		it('should generate list key with filters', () => {
			const filters: PropertyFilters = { status: 'active', limit: 10 }
			const options = propertyQueries.list(filters)
			expect(options.queryKey).toEqual(['properties', 'list', filters])
		})

		it('should generate detail key with property ID', () => {
			const options = propertyQueries.detail('prop-123')
			expect(options.queryKey).toEqual(['properties', 'detail', 'prop-123'])
		})

		it('should generate stats key', () => {
			const options = propertyQueries.stats()
			expect(options.queryKey).toEqual(['properties', 'stats'])
		})

		it('should generate performance key', () => {
			const options = propertyQueries.performance()
			expect(options.queryKey).toEqual(['properties', 'performance'])
		})

		it('should generate analytics occupancy key', () => {
			const options = propertyQueries.analytics.occupancy()
			expect(options.queryKey).toEqual(['properties', 'analytics', 'occupancy'])
		})

		it('should generate analytics financial key', () => {
			const options = propertyQueries.analytics.financial()
			expect(options.queryKey).toEqual(['properties', 'analytics', 'financial'])
		})

		it('should generate analytics maintenance key', () => {
			const options = propertyQueries.analytics.maintenance()
			expect(options.queryKey).toEqual([
				'properties',
				'analytics',
				'maintenance'
			])
		})

		it('should generate images key extending detail key', () => {
			const options = propertyQueries.images('prop-123')
			expect(options.queryKey).toEqual([
				'properties',
				'detail',
				'prop-123',
				'images'
			])
		})

		it('should generate withUnits key', () => {
			const options = propertyQueries.withUnits()
			expect(options.queryKey).toEqual(['properties', 'with-units'])
		})
	})

	describe('list query', () => {
		it('should call fetch with correct endpoint without filters', async () => {
			const options = propertyQueries.list()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/properties',
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer test-token'
					})
				})
			)
		})

		it('should call fetch with search params for filters', async () => {
			const filters: PropertyFilters = {
				status: 'active',
				property_type: 'APARTMENT',
				search: 'Downtown',
				limit: 10,
				offset: 20
			}
			const options = propertyQueries.list(filters)
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/properties?status=active&property_type=APARTMENT&search=Downtown&limit=10&offset=20',
				expect.anything()
			)
		})

		it('should only include provided filters in query string', async () => {
			const filters: PropertyFilters = { status: 'active' }
			const options = propertyQueries.list(filters)
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/properties?status=active',
				expect.anything()
			)
		})

		it('should have proper staleTime configuration', () => {
			const options = propertyQueries.list()
			// DETAIL cache time from QUERY_CACHE_TIMES
			expect(options.staleTime).toBeDefined()
		})
	})

	describe('detail query', () => {
		it('should call fetch with property ID in endpoint', async () => {
			mockFetch.mockResolvedValue(
				createMockResponse({ id: 'prop-123', name: 'Test' })
			)

			const options = propertyQueries.detail('prop-123')
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/properties/prop-123',
				expect.anything()
			)
		})

		it('should be disabled when ID is empty', () => {
			const options = propertyQueries.detail('')
			expect(options.enabled).toBe(false)
		})

		it('should be enabled when ID is provided', () => {
			const options = propertyQueries.detail('prop-123')
			expect(options.enabled).toBe(true)
		})
	})

	describe('withUnits query', () => {
		it('should call fetch with correct endpoint', async () => {
			const options = propertyQueries.withUnits()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/properties/with-units',
				expect.anything()
			)
		})
	})

	describe('stats query', () => {
		it('should call fetch with correct endpoint', async () => {
			mockFetch.mockResolvedValue(
				createMockResponse({
					total: 10,
					occupied: 8,
					vacant: 2,
					occupancyRate: 80
				})
			)

			const options = propertyQueries.stats()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/properties/stats',
				expect.anything()
			)
		})

		it('should have extended gcTime for stats caching', () => {
			const options = propertyQueries.stats()
			expect(options.gcTime).toBe(30 * 60 * 1000) // 30 minutes
		})
	})

	describe('performance query', () => {
		it('should call fetch with correct endpoint', async () => {
			const options = propertyQueries.performance()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/property-performance',
				expect.anything()
			)
		})
	})

	describe('analytics queries', () => {
		it('should call fetch for occupancy analytics', async () => {
			const options = propertyQueries.analytics.occupancy()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/properties/analytics/occupancy',
				expect.anything()
			)
		})

		it('should call fetch for financial analytics', async () => {
			const options = propertyQueries.analytics.financial()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/properties/analytics/financial',
				expect.anything()
			)
		})

		it('should call fetch for maintenance analytics', async () => {
			const options = propertyQueries.analytics.maintenance()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/properties/analytics/maintenance',
				expect.anything()
			)
		})
	})

	describe('images query', () => {
		it('should use Supabase client directly for images', async () => {
			const mockImages = [
				{
					id: 'img-1',
					property_id: 'prop-123',
					image_url: 'https://example.com/img1.jpg'
				}
			]
			mockSupabaseOrder.mockResolvedValue({ data: mockImages, error: null })

			const options = propertyQueries.images('prop-123')
			const result = await options.queryFn!({} as never)

			expect(mockSupabaseFrom).toHaveBeenCalledWith('property_images')
			expect(mockSupabaseSelect).toHaveBeenCalledWith('*')
			expect(mockSupabaseEq).toHaveBeenCalledWith('property_id', 'prop-123')
			expect(mockSupabaseOrder).toHaveBeenCalledWith('display_order', {
				ascending: true
			})
			expect(result).toEqual(mockImages)
		})

		it('should throw error when Supabase returns error', async () => {
			mockSupabaseOrder.mockResolvedValue({
				data: null,
				error: { message: 'Database error' }
			})

			const options = propertyQueries.images('prop-123')

			await expect(options.queryFn!({} as never)).rejects.toThrow(
				'Database error'
			)
		})

		it('should be disabled when property_id is empty', () => {
			const options = propertyQueries.images('')
			expect(options.enabled).toBe(false)
		})

		it('should be enabled when property_id is provided', () => {
			const options = propertyQueries.images('prop-123')
			expect(options.enabled).toBe(true)
		})
	})
})
