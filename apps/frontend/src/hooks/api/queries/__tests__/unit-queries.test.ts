/**
 * Unit Queries Tests (TDD - Testing CORRECT Behavior)
 *
 * Tests unitQueries factory for:
 * - Correct query keys generation
 * - Proper queryFn implementation
 * - Filter handling
 * - Cache configuration
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockResponse } from '#test/unit-setup'
import { unitQueries, type UnitFilters } from '../unit-queries'

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

describe('unitQueries', () => {
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
		it('should generate base key for all units', () => {
			const key = unitQueries.all()
			expect(key).toEqual(['units'])
		})

		it('should generate lists key extending base key', () => {
			const key = unitQueries.lists()
			expect(key).toEqual(['units', 'list'])
		})

		it('should generate details key extending base key', () => {
			const key = unitQueries.details()
			expect(key).toEqual(['units', 'detail'])
		})

		it('should generate list key with empty filters', () => {
			const options = unitQueries.list()
			expect(options.queryKey).toEqual(['units', 'list', {}])
		})

		it('should generate list key with filters', () => {
			const filters: UnitFilters = { status: 'available', limit: 10 }
			const options = unitQueries.list(filters)
			expect(options.queryKey).toEqual(['units', 'list', filters])
		})

		it('should generate detail key with unit ID', () => {
			const options = unitQueries.detail('unit-123')
			expect(options.queryKey).toEqual(['units', 'detail', 'unit-123'])
		})

		it('should generate stats key', () => {
			const options = unitQueries.stats()
			expect(options.queryKey).toEqual(['units', 'stats'])
		})

		it('should generate listByProperty key', () => {
			const options = unitQueries.listByProperty('prop-123')
			expect(options.queryKey).toEqual([
				'units',
				'list',
				'by-property',
				'prop-123'
			])
		})

		it('should generate byProperty key', () => {
			const options = unitQueries.byProperty('prop-123')
			expect(options.queryKey).toEqual(['units', 'by-property', 'prop-123'])
		})
	})

	describe('list query', () => {
		it('should call fetch with correct endpoint without filters', async () => {
			const options = unitQueries.list()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/units',
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer test-token'
					})
				})
			)
		})

		it('should call fetch with search params for filters', async () => {
			const filters: UnitFilters = {
				property_id: 'prop-123',
				status: 'available',
				search: 'unit',
				limit: 10,
				offset: 20
			}
			const options = unitQueries.list(filters)
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/units?property_id=prop-123&status=available&search=unit&limit=10&offset=20',
				expect.anything()
			)
		})

		it('should only include provided filters in query string', async () => {
			const filters: UnitFilters = { status: 'occupied' }
			const options = unitQueries.list(filters)
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/units?status=occupied',
				expect.anything()
			)
		})

		it('should have proper staleTime configuration', () => {
			const options = unitQueries.list()
			expect(options.staleTime).toBeDefined()
		})
	})

	describe('listByProperty query', () => {
		it('should call fetch with property_id in query string', async () => {
			mockFetch.mockResolvedValue(createMockResponse([]))

			const options = unitQueries.listByProperty('prop-123')
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/units?property_id=prop-123',
				expect.anything()
			)
		})

		it('should be disabled when property_id is empty', () => {
			const options = unitQueries.listByProperty('')
			expect(options.enabled).toBe(false)
		})

		it('should be enabled when property_id is provided', () => {
			const options = unitQueries.listByProperty('prop-123')
			expect(options.enabled).toBe(true)
		})
	})

	describe('detail query', () => {
		it('should call fetch with unit ID in endpoint', async () => {
			mockFetch.mockResolvedValue(
				createMockResponse({ id: 'unit-123', unit_number: '101' })
			)

			const options = unitQueries.detail('unit-123')
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/units/unit-123',
				expect.anything()
			)
		})

		it('should be disabled when ID is empty', () => {
			const options = unitQueries.detail('')
			expect(options.enabled).toBe(false)
		})

		it('should be enabled when ID is provided', () => {
			const options = unitQueries.detail('unit-123')
			expect(options.enabled).toBe(true)
		})
	})

	describe('byProperty query', () => {
		it('should call fetch with property ID in endpoint path', async () => {
			mockFetch.mockResolvedValue(createMockResponse([]))

			const options = unitQueries.byProperty('prop-123')
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/units/by-property/prop-123',
				expect.anything()
			)
		})

		it('should be disabled when property_id is empty', () => {
			const options = unitQueries.byProperty('')
			expect(options.enabled).toBe(false)
		})

		it('should be enabled when property_id is provided', () => {
			const options = unitQueries.byProperty('prop-123')
			expect(options.enabled).toBe(true)
		})
	})

	describe('stats query', () => {
		it('should call fetch with correct endpoint', async () => {
			mockFetch.mockResolvedValue(
				createMockResponse({
					total: 50,
					vacant: 10,
					occupied: 35,
					maintenance: 5
				})
			)

			const options = unitQueries.stats()
			await options.queryFn!({} as never)

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:4600/api/v1/units/stats',
				expect.anything()
			)
		})

		it('should have extended gcTime for stats caching', () => {
			const options = unitQueries.stats()
			expect(options.gcTime).toBe(30 * 60 * 1000) // 30 minutes
		})
	})
})
