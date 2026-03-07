/**
 * Blog API Hooks
 *
 * Thin hook wrappers consuming blogQueries factory from blog-keys.ts.
 * keepPreviousData applied here (not in factory) for paginated hooks.
 * Blogs are public content -- no auth dependency.
 */

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { blogQueries } from './query-keys/blog-keys'

export type { BlogListItem, BlogDetail, BlogFilters, BlogCategory } from './query-keys/blog-keys'

/**
 * Fetch paginated published blogs
 * Returns PaginatedResponse with page math and keepPreviousData for flash-free pagination
 */
export function useBlogs(page: number = 1, limit: number = 9) {
	const offset = (page - 1) * limit
	return useQuery({
		...blogQueries.list({ limit, offset }),
		placeholderData: keepPreviousData
	})
}

/**
 * Fetch a single blog by slug
 * Returns BlogDetail or null (PGRST116 handling preserved in factory)
 */
export function useBlogBySlug(slug: string) {
	return useQuery({
		...blogQueries.detail(slug)
	})
}

/**
 * Fetch paginated blogs by category
 * Returns PaginatedResponse with keepPreviousData for flash-free pagination
 */
export function useBlogsByCategory(
	category: string,
	page: number = 1,
	limit: number = 9
) {
	const offset = (page - 1) * limit
	return useQuery({
		...blogQueries.list({ category, limit, offset }),
		placeholderData: keepPreviousData
	})
}

/**
 * Fetch blog categories from RPC
 * Returns array of { name, slug, post_count }
 */
export function useBlogCategories() {
	return useQuery({
		...blogQueries.categories()
	})
}

/**
 * Fetch related posts (same category, excludes current post)
 * Returns up to `limit` BlogListItem posts
 */
export function useRelatedPosts(
	category: string,
	excludeSlug: string,
	limit: number = 3
) {
	return useQuery({
		...blogQueries.related({ category, excludeSlug, limit })
	})
}

/**
 * Fetch comparison posts filtered by tag
 * Uses .contains() on the tags array column
 */
export function useComparisonPosts(tag: string = 'comparison', limit: number = 6) {
	return useQuery({
		...blogQueries.comparisons({ tag, limit })
	})
}
