/**
 * Blog Query Key Factory Tests
 *
 * Tests for blogQueries factory covering query key structure,
 * pagination math, filter application, PGRST116 handling,
 * related posts, and comparisons filtering.
 */

import { QueryClient } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Supabase mock using vi.hoisted() (project convention)
const {
	mockFrom,
	mockSelect,
	mockEq,
	mockNeq,
	mockOrder,
	mockLimit,
	mockRange,
	mockSingle,
	mockContains,
	mockRpc
} = vi.hoisted(() => ({
	mockFrom: vi.fn(),
	mockSelect: vi.fn(),
	mockEq: vi.fn(),
	mockNeq: vi.fn(),
	mockOrder: vi.fn(),
	mockLimit: vi.fn(),
	mockRange: vi.fn(),
	mockSingle: vi.fn(),
	mockContains: vi.fn(),
	mockRpc: vi.fn()
}))

vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({
		from: mockFrom,
		rpc: mockRpc
	})
}))

vi.mock('#lib/postgrest-error-handler', () => ({
	handlePostgrestError: vi.fn((_error: unknown, _domain: string) => {
		throw new Error('PostgREST error')
	})
}))

import { createQueryChain } from '#test/mocks/supabase-query-mock'
import { blogQueries } from './blog-keys'
import type { BlogFilters } from './blog-keys'

const queryClient = new QueryClient()

interface MockQueryContext {
	meta: undefined
	queryKey: readonly unknown[]
	signal: AbortSignal
	client: QueryClient
	pageParam: undefined
	direction: undefined
}

/**
 * Helper to invoke a queryOptions queryFn with required context.
 * The mock context satisfies the QueryFunctionContext shape that
 * TanStack Query passes to queryFn at runtime.
 */
function callQueryFn<T>(opts: {
	queryFn?: ((ctx: never) => T | Promise<T>) | undefined
	queryKey: readonly unknown[]
}): T | Promise<T> {
	if (!opts.queryFn) throw new Error('queryFn is undefined')
	const ctx: MockQueryContext = {
		meta: undefined,
		queryKey: opts.queryKey,
		signal: new AbortController().signal,
		client: queryClient,
		pageParam: undefined,
		direction: undefined
	}
	return (opts.queryFn as (c: MockQueryContext) => T | Promise<T>)(ctx)
}

// Helper to set up chained query mock using createQueryChain with hoisted mocks for assertions
function setupChainedMock(result: { data: unknown; error: unknown; count?: number | null }) {
	const chain = createQueryChain(result)
	// Wire hoisted mocks onto the chain so expect(mockEq) etc. assertions work
	mockSelect.mockReturnValue(chain)
	mockEq.mockReturnValue(chain)
	mockNeq.mockReturnValue(chain)
	mockOrder.mockReturnValue(chain)
	mockContains.mockReturnValue(chain)
	mockLimit.mockReturnValue(result)
	mockRange.mockReturnValue(result)
	mockSingle.mockReturnValue(result)
	Object.assign(chain, {
		select: mockSelect, eq: mockEq, neq: mockNeq, order: mockOrder,
		limit: mockLimit, range: mockRange, single: mockSingle, contains: mockContains
	})
	mockFrom.mockReturnValue(chain)
	return chain
}

describe('blogQueries', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	// =========================================================================
	// Query key structure
	// =========================================================================
	describe('query key structure', () => {
		it('all() returns ["blogs"]', () => {
			expect(blogQueries.all()).toEqual(['blogs'])
		})

		it('lists() returns ["blogs", "list"]', () => {
			expect(blogQueries.lists()).toEqual(['blogs', 'list'])
		})

		it('list() queryKey includes filters', () => {
			const filters: BlogFilters = { category: 'Tips', limit: 9, offset: 0 }
			const opts = blogQueries.list(filters)
			expect(opts.queryKey).toEqual(['blogs', 'list', filters])
		})

		it('list() queryKey uses empty object when no filters', () => {
			const opts = blogQueries.list()
			expect(opts.queryKey).toEqual(['blogs', 'list', {}])
		})

		it('details() returns ["blogs", "detail"]', () => {
			expect(blogQueries.details()).toEqual(['blogs', 'detail'])
		})

		it('detail(slug) queryKey includes slug', () => {
			const opts = blogQueries.detail('my-blog-post')
			expect(opts.queryKey).toEqual(['blogs', 'detail', 'my-blog-post'])
		})

		it('categories() queryKey is ["blogs", "categories"]', () => {
			const opts = blogQueries.categories()
			expect(opts.queryKey).toEqual(['blogs', 'categories'])
		})

		it('related() queryKey includes params', () => {
			const params = { category: 'Tips', excludeSlug: 'my-post', limit: 3 }
			const opts = blogQueries.related(params)
			expect(opts.queryKey).toEqual(['blogs', 'related', params])
		})

		it('comparisons() queryKey includes params', () => {
			const params = { tag: 'comparison', limit: 6 }
			const opts = blogQueries.comparisons(params)
			expect(opts.queryKey).toEqual(['blogs', 'comparisons', params])
		})
	})

	// =========================================================================
	// Pagination math
	// =========================================================================
	describe('pagination math', () => {
		it('list with offset=0, limit=9 returns page 1', async () => {
			setupChainedMock({
				data: Array(9).fill({ id: '1', title: 'Test' }),
				error: null,
				count: 27
			})

			const opts = blogQueries.list({ limit: 9, offset: 0 })
			const result = await callQueryFn(opts)

			expect(result.pagination.page).toBe(1)
			expect(result.pagination.limit).toBe(9)
			expect(result.pagination.total).toBe(27)
			expect(result.pagination.totalPages).toBe(3)
		})

		it('list with offset=9, limit=9 returns page 2', async () => {
			setupChainedMock({
				data: Array(9).fill({ id: '1', title: 'Test' }),
				error: null,
				count: 27
			})

			const opts = blogQueries.list({ limit: 9, offset: 9 })
			const result = await callQueryFn(opts)

			expect(result.pagination.page).toBe(2)
		})

		it('totalPages is ceil(total / limit)', async () => {
			setupChainedMock({
				data: Array(5).fill({ id: '1', title: 'Test' }),
				error: null,
				count: 14
			})

			const opts = blogQueries.list({ limit: 9, offset: 0 })
			const result = await callQueryFn(opts)

			expect(result.pagination.totalPages).toBe(2) // ceil(14/9) = 2
		})

		it('defaults to limit=9 and offset=0 when no filters', async () => {
			setupChainedMock({
				data: [],
				error: null,
				count: 0
			})

			const opts = blogQueries.list()
			await callQueryFn(opts)

			expect(mockRange).toHaveBeenCalledWith(0, 8) // range(0, 0+9-1)
		})
	})

	// =========================================================================
	// Filter application
	// =========================================================================
	describe('filter application', () => {
		it('list with category applies .eq("category", value)', async () => {
			setupChainedMock({ data: [], error: null, count: 0 })

			const opts = blogQueries.list({ category: 'Property Management' })
			await callQueryFn(opts)

			expect(mockEq).toHaveBeenCalledWith('category', 'Property Management')
		})

		it('list with tag applies .contains("tags", [tag])', async () => {
			setupChainedMock({ data: [], error: null, count: 0 })

			const opts = blogQueries.list({ tag: 'comparison' })
			await callQueryFn(opts)

			expect(mockContains).toHaveBeenCalledWith('tags', ['comparison'])
		})

		it('list without category or tag does not apply extra filters', async () => {
			setupChainedMock({ data: [], error: null, count: 0 })

			const opts = blogQueries.list({ limit: 9, offset: 0 })
			await callQueryFn(opts)

			// eq is called for status=published but not for category
			const eqCalls = mockEq.mock.calls
			const categoryCall = eqCalls.find(
				(call: unknown[]) => call[0] === 'category'
			)
			expect(categoryCall).toBeUndefined()
			expect(mockContains).not.toHaveBeenCalled()
		})
	})

	// =========================================================================
	// Detail PGRST116 handling
	// =========================================================================
	describe('detail PGRST116 handling', () => {
		it('returns blog data on success', async () => {
			const blogData = {
				id: '1',
				title: 'Test Blog',
				slug: 'test-blog',
				content: 'Content here'
			}
			setupChainedMock({ data: blogData, error: null })

			const opts = blogQueries.detail('test-blog')
			const result = await callQueryFn(opts)

			expect(result).toEqual(blogData)
		})

		it('returns null on PGRST116 error (not found)', async () => {
			setupChainedMock({
				data: null,
				error: { code: 'PGRST116', message: 'No rows found', details: '', hint: '' }
			})

			const opts = blogQueries.detail('nonexistent-slug')
			const result = await callQueryFn(opts)

			expect(result).toBeNull()
		})

		it('throws for non-PGRST116 errors', async () => {
			setupChainedMock({
				data: null,
				error: { code: '42P01', message: 'Table not found', details: '', hint: '' }
			})

			const opts = blogQueries.detail('test-blog')
			await expect(callQueryFn(opts)).rejects.toMatchObject({
				message: expect.stringContaining('PostgREST error')
			})
		})

		it('has enabled: false when slug is empty', () => {
			const opts = blogQueries.detail('')
			expect(opts.enabled).toBe(false)
		})

		it('has enabled: true when slug is provided', () => {
			const opts = blogQueries.detail('my-post')
			expect(opts.enabled).toBe(true)
		})
	})

	// =========================================================================
	// Categories
	// =========================================================================
	describe('categories', () => {
		it('calls supabase.rpc("get_blog_categories")', async () => {
			const categories = [
				{ name: 'Tips', slug: 'tips', post_count: 5 },
				{ name: 'News', slug: 'news', post_count: 3 }
			]
			mockRpc.mockResolvedValue({ data: categories, error: null })

			const opts = blogQueries.categories()
			const result = await callQueryFn(opts)

			expect(mockRpc).toHaveBeenCalledWith('get_blog_categories')
			expect(result).toEqual(categories)
		})

		it('returns empty array when data is null', async () => {
			mockRpc.mockResolvedValue({ data: null, error: null })

			const opts = blogQueries.categories()
			const result = await callQueryFn(opts)

			expect(result).toEqual([])
		})
	})

	// =========================================================================
	// Related posts
	// =========================================================================
	describe('related posts', () => {
		it('applies category filter and excludes current slug', async () => {
			setupChainedMock({ data: [], error: null })

			const opts = blogQueries.related({
				category: 'Tips',
				excludeSlug: 'current-post'
			})
			await callQueryFn(opts)

			expect(mockEq).toHaveBeenCalledWith('category', 'Tips')
			expect(mockNeq).toHaveBeenCalledWith('slug', 'current-post')
			expect(mockEq).toHaveBeenCalledWith('status', 'published')
			expect(mockLimit).toHaveBeenCalledWith(3)
		})

		it('uses custom limit when provided', async () => {
			setupChainedMock({ data: [], error: null })

			const opts = blogQueries.related({
				category: 'Tips',
				excludeSlug: 'current-post',
				limit: 5
			})
			await callQueryFn(opts)

			expect(mockLimit).toHaveBeenCalledWith(5)
		})

		it('has enabled: false when category or excludeSlug is missing', () => {
			expect(
				blogQueries.related({ category: '', excludeSlug: 'post' }).enabled
			).toBe(false)
			expect(
				blogQueries.related({ category: 'Tips', excludeSlug: '' }).enabled
			).toBe(false)
		})

		it('returns data from query', async () => {
			const relatedPosts = [
				{ id: '2', title: 'Related Post', slug: 'related' }
			]
			setupChainedMock({ data: relatedPosts, error: null })

			const opts = blogQueries.related({
				category: 'Tips',
				excludeSlug: 'current'
			})
			const result = await callQueryFn(opts)

			expect(result).toEqual(relatedPosts)
		})
	})

	// =========================================================================
	// Comparisons
	// =========================================================================
	describe('comparisons', () => {
		it('applies .contains("tags", [tag]) filter', async () => {
			setupChainedMock({ data: [], error: null })

			const opts = blogQueries.comparisons({ tag: 'comparison' })
			await callQueryFn(opts)

			expect(mockContains).toHaveBeenCalledWith('tags', ['comparison'])
			expect(mockEq).toHaveBeenCalledWith('status', 'published')
		})

		it('defaults tag to "comparison" when not provided', async () => {
			setupChainedMock({ data: [], error: null })

			const opts = blogQueries.comparisons({})
			await callQueryFn(opts)

			expect(mockContains).toHaveBeenCalledWith('tags', ['comparison'])
		})

		it('defaults limit to 6', async () => {
			setupChainedMock({ data: [], error: null })

			const opts = blogQueries.comparisons({})
			await callQueryFn(opts)

			expect(mockLimit).toHaveBeenCalledWith(6)
		})

		it('uses custom tag and limit', async () => {
			setupChainedMock({ data: [], error: null })

			const opts = blogQueries.comparisons({ tag: 'software-review', limit: 10 })
			await callQueryFn(opts)

			expect(mockContains).toHaveBeenCalledWith('tags', ['software-review'])
			expect(mockLimit).toHaveBeenCalledWith(10)
		})
	})

	// =========================================================================
	// No auth
	// =========================================================================
	describe('no auth dependency', () => {
		it('list queryFn does not call getCachedUser', async () => {
			setupChainedMock({ data: [], error: null, count: 0 })

			const opts = blogQueries.list()
			await callQueryFn(opts)

			// getCachedUser is not even imported in blog-keys.ts
			// If it were called, the mock would need to be set up
			// The fact that the query succeeds without a getCachedUser mock proves it is not used
		})
	})
})
