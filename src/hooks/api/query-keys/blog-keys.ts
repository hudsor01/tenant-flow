/**
 * Blog Query Keys & Options
 *
 * queryOptions() factory for blog queries. Blogs are public content
 * with anon + authenticated RLS -- no getCachedUser() needed.
 *
 * TanStack Query v5 patterns:
 * - queryOptions() for type-safe query configuration
 * - Query key factory for consistent cache management
 * - PostgREST direct via supabase-js (no apiRequest calls)
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type { PaginatedResponse } from '#types/api-contracts'
import type { Database } from '#types/supabase'

// ============================================================================
// TYPES
// ============================================================================

type Blog = Database['public']['Tables']['blogs']['Row']

/** Subset of Blog columns fetched for list views (no content, no heavy fields). */
export type BlogListItem = Pick<
	Blog,
	| 'id'
	| 'title'
	| 'slug'
	| 'excerpt'
	| 'published_at'
	| 'category'
	| 'reading_time'
	| 'featured_image'
	| 'author_user_id'
	| 'status'
	| 'tags'
>

/** Subset of Blog columns fetched for detail view (includes content). */
export type BlogDetail = Pick<
	Blog,
	| 'id'
	| 'title'
	| 'slug'
	| 'excerpt'
	| 'content'
	| 'published_at'
	| 'category'
	| 'reading_time'
	| 'featured_image'
	| 'author_user_id'
	| 'status'
	| 'meta_description'
	| 'tags'
	| 'created_at'
	| 'updated_at'
>

/** Blog category from get_blog_categories RPC. */
export type BlogCategory =
	Database['public']['Functions']['get_blog_categories']['Returns'][number]

/** Filters for blog list queries. */
export interface BlogFilters {
	category?: string
	tag?: string
	limit?: number
	offset?: number
}

/** Parameters for related posts query. */
export interface RelatedPostsParams {
	category: string
	excludeSlug: string
	limit?: number
}

/** Parameters for comparisons query. */
export interface ComparisonParams {
	tag?: string
	limit?: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BLOG_LIST_COLUMNS =
	'id, title, slug, excerpt, published_at, category, reading_time, featured_image, author_user_id, status, tags'

const BLOG_DETAIL_COLUMNS =
	'id, title, slug, excerpt, content, published_at, category, reading_time, featured_image, author_user_id, status, meta_description, tags, created_at, updated_at'

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Blog query factory
 * Colocated queryOptions for use with useQuery, useQueries, prefetch
 */
export const blogQueries = {
	/**
	 * Base key for all blog queries
	 */
	all: () => ['blogs'] as const,

	/**
	 * Base key for all blog lists
	 */
	lists: () => [...blogQueries.all(), 'list'] as const,

	/**
	 * Blog list with optional filters and pagination
	 * Returns PaginatedResponse with exact count and page math
	 */
	list: (filters?: BlogFilters) =>
		queryOptions({
			queryKey: [...blogQueries.lists(), filters ?? {}],
			queryFn: async (): Promise<PaginatedResponse<BlogListItem>> => {
				const supabase = createClient()
				const limit = filters?.limit ?? 9
				const offset = filters?.offset ?? 0

				let q = supabase
					.from('blogs')
					.select(BLOG_LIST_COLUMNS, { count: 'exact' })
					.eq('status', 'published')
					.order('published_at', { ascending: false })

				if (filters?.category) {
					q = q.eq('category', filters.category)
				}
				if (filters?.tag) {
					q = q.contains('tags', [filters.tag])
				}

				q = q.range(offset, offset + limit - 1)

				const { data, error, count } = await q

				if (error) handlePostgrestError(error, 'blogs')

				const total = count ?? 0
				const totalPages = Math.ceil(total / limit)

				return {
					data: (data ?? []) as BlogListItem[],
					total,
					pagination: {
						page: Math.floor(offset / limit) + 1,
						limit,
						total,
						totalPages
					}
				}
			},
			...QUERY_CACHE_TIMES.BLOG
		}),

	/**
	 * Base key for all blog details
	 */
	details: () => [...blogQueries.all(), 'detail'] as const,

	/**
	 * Single blog by slug
	 * Returns null on PGRST116 (not found) -- this is expected, not an error
	 */
	detail: (slug: string) =>
		queryOptions({
			queryKey: [...blogQueries.details(), slug],
			queryFn: async (): Promise<BlogDetail | null> => {
				const supabase = createClient()

				const { data, error } = await supabase
					.from('blogs')
					.select(BLOG_DETAIL_COLUMNS)
					.eq('slug', slug)
					.eq('status', 'published')
					.single()

				if (error) {
					if (error.code === 'PGRST116') {
						return null
					}
					handlePostgrestError(error, 'blogs')
				}

				return data as BlogDetail
			},
			...QUERY_CACHE_TIMES.BLOG,
			enabled: !!slug
		}),

	/**
	 * Blog categories from RPC
	 * Returns name, slug, and post_count for each category
	 */
	categories: () =>
		queryOptions({
			queryKey: [...blogQueries.all(), 'categories'],
			queryFn: async (): Promise<BlogCategory[]> => {
				const supabase = createClient()

				const { data, error } = await supabase.rpc('get_blog_categories')

				if (error) handlePostgrestError(error, 'blog categories')

				return data ?? []
			},
			...QUERY_CACHE_TIMES.BLOG
		}),

	/**
	 * Related posts (same category, excludes current post)
	 * Returns up to `limit` posts (default 3) for sidebar/footer recommendations
	 */
	related: (params: RelatedPostsParams) =>
		queryOptions({
			queryKey: [...blogQueries.all(), 'related', params],
			queryFn: async (): Promise<BlogListItem[]> => {
				const supabase = createClient()

				const { data, error } = await supabase
					.from('blogs')
					.select(BLOG_LIST_COLUMNS)
					.eq('category', params.category)
					.neq('slug', params.excludeSlug)
					.eq('status', 'published')
					.order('published_at', { ascending: false })
					.limit(params.limit ?? 3)

				if (error) handlePostgrestError(error, 'blogs')

				return (data ?? []) as BlogListItem[]
			},
			...QUERY_CACHE_TIMES.BLOG,
			enabled: !!params.category && !!params.excludeSlug
		}),

	/**
	 * Comparison posts filtered by tag
	 * Uses .contains() on the tags array column for tag-based filtering
	 */
	comparisons: (params: ComparisonParams) =>
		queryOptions({
			queryKey: [...blogQueries.all(), 'comparisons', params],
			queryFn: async (): Promise<BlogListItem[]> => {
				const supabase = createClient()

				const { data, error } = await supabase
					.from('blogs')
					.select(BLOG_LIST_COLUMNS)
					.eq('status', 'published')
					.contains('tags', [params.tag ?? 'comparison'])
					.order('published_at', { ascending: false })
					.limit(params.limit ?? 6)

				if (error) handlePostgrestError(error, 'blogs')

				return (data ?? []) as BlogListItem[]
			},
			...QUERY_CACHE_TIMES.BLOG
		})
}
