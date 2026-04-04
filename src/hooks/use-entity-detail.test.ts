import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUseQuery = vi.hoisted(() => vi.fn())
const mockUseQueryClient = vi.hoisted(() => vi.fn())
const mockGetQueriesData = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', () => ({
	useQuery: mockUseQuery,
	useQueryClient: mockUseQueryClient
}))

import { useEntityDetail } from './use-entity-detail'

interface TestEntity {
	id: string
	name: string
}

describe('useEntityDetail', () => {
	const mockQueryClient = { getQueriesData: mockGetQueriesData }

	beforeEach(() => {
		vi.clearAllMocks()
		mockUseQueryClient.mockReturnValue(mockQueryClient)
		mockUseQuery.mockReturnValue({ data: undefined, isLoading: true })
	})

	it('returns useQuery result when called with queryOptions and id (no listQueryKey)', () => {
		const queryOpts = {
			queryKey: ['test', 'detail', '1'],
			queryFn: vi.fn()
		}

		useEntityDetail<TestEntity>({
			queryOptions: queryOpts,
			id: '1'
		})

		expect(mockUseQuery).toHaveBeenCalledWith(
			expect.objectContaining({
				queryKey: ['test', 'detail', '1']
			})
		)
		// No placeholderData when listQueryKey is omitted
		const callArg = mockUseQuery.mock.calls[0]?.[0] as
			| Record<string, unknown>
			| undefined
		expect(callArg).toBeDefined()
		expect(callArg).not.toHaveProperty('placeholderData')
	})

	it('returns placeholderData from list cache when item exists in PaginatedResponse shape', () => {
		const entity: TestEntity = { id: '1', name: 'Test' }
		mockGetQueriesData.mockReturnValue([
			[['test', 'list'], { data: [entity] }]
		])

		const queryOpts = {
			queryKey: ['test', 'detail', '1'],
			queryFn: vi.fn()
		}

		useEntityDetail<TestEntity>({
			queryOptions: queryOpts,
			listQueryKey: ['test', 'list'],
			id: '1'
		})

		const callArg = mockUseQuery.mock.calls[0]?.[0] as
			| Record<string, unknown>
			| undefined
		expect(callArg).toHaveProperty('placeholderData')

		const placeholderFn = callArg?.placeholderData as () => TestEntity | undefined
		const result = placeholderFn()
		expect(result).toEqual(entity)
	})

	it('returns placeholderData from list cache when item exists in plain array shape', () => {
		const entity: TestEntity = { id: '2', name: 'Array Item' }
		mockGetQueriesData.mockReturnValue([
			[['test', 'list'], [entity]]
		])

		const queryOpts = {
			queryKey: ['test', 'detail', '2'],
			queryFn: vi.fn()
		}

		useEntityDetail<TestEntity>({
			queryOptions: queryOpts,
			listQueryKey: ['test', 'list'],
			id: '2'
		})

		const callArg = mockUseQuery.mock.calls[0]?.[0] as
			| Record<string, unknown>
			| undefined
		const placeholderFn = callArg?.placeholderData as () => TestEntity | undefined
		const result = placeholderFn()
		expect(result).toEqual(entity)
	})

	it('returns undefined placeholderData when item not found in any cache', () => {
		mockGetQueriesData.mockReturnValue([
			[['test', 'list'], { data: [{ id: '999', name: 'Other' }] }]
		])

		const queryOpts = {
			queryKey: ['test', 'detail', '1'],
			queryFn: vi.fn()
		}

		useEntityDetail<TestEntity>({
			queryOptions: queryOpts,
			listQueryKey: ['test', 'list'],
			id: '1'
		})

		const callArg = mockUseQuery.mock.calls[0]?.[0] as
			| Record<string, unknown>
			| undefined
		const placeholderFn = callArg?.placeholderData as () => TestEntity | undefined
		const result = placeholderFn()
		expect(result).toBeUndefined()
	})

	it('spreads all queryOptions properties through to useQuery', () => {
		const queryOpts = {
			queryKey: ['test', 'detail', '1'],
			queryFn: vi.fn(),
			staleTime: 5000,
			enabled: false
		}

		useEntityDetail<TestEntity>({
			queryOptions: queryOpts,
			id: '1'
		})

		expect(mockUseQuery).toHaveBeenCalledWith(
			expect.objectContaining({
				queryKey: ['test', 'detail', '1'],
				staleTime: 5000,
				enabled: false
			})
		)
	})
})
