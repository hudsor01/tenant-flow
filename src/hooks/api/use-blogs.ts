/**
 * Blog API Hooks
 * Fetches blog posts from Supabase database
 */

import { useQuery } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import type { Database } from '#shared/types/supabase'

type Blog = Database['public']['Tables']['blogs']['Row']

/** Subset of Blog columns fetched for list views (no content, no heavy fields). */
type BlogListItem = Pick<Blog, 'id' | 'title' | 'slug' | 'excerpt' | 'published_at' | 'category' | 'reading_time' | 'featured_image' | 'author_user_id' | 'status' | 'tags'>

/** Subset of Blog columns fetched for detail view (no quality_score, word_count). */
type BlogDetail = Pick<Blog, 'id' | 'title' | 'slug' | 'excerpt' | 'content' | 'published_at' | 'category' | 'reading_time' | 'featured_image' | 'author_user_id' | 'status' | 'meta_description' | 'tags' | 'created_at' | 'updated_at'>

export const blogKeys = {
	all: ['blogs'] as const,
	detail: (slug: string) => [...blogKeys.all, slug] as const,
	category: (category: string) => [...blogKeys.all, 'category', category] as const,
	featured: (limit: number) => [...blogKeys.all, 'featured', limit] as const
}

const BLOG_LIST_COLUMNS =
	'id, title, slug, excerpt, published_at, category, reading_time, featured_image, author_user_id, status, tags'

/**
 * Fetch all published blogs, sorted by published_at descending
 */
export function useBlogs() {
	return useQuery({
		queryKey: blogKeys.all,
		queryFn: async (): Promise<BlogListItem[]> => {
			const supabase = createClient()

			const { data, error } = await supabase
				.from('blogs')
				.select(BLOG_LIST_COLUMNS)
				.eq('status', 'published')
				.order('published_at', { ascending: false })
				.limit(20)

			if (error) {
				throw new Error(`Failed to fetch blogs: ${error.message}`)
			}

			return data || []
		},
		staleTime: 5 * 60 * 1000 // 5 minutes - blogs don't change frequently
	})
}

/**
 * Fetch a single blog by slug
 */
export function useBlogBySlug(slug: string) {
	return useQuery({
		queryKey: blogKeys.detail(slug),
		queryFn: async (): Promise<BlogDetail | null> => {
			const supabase = createClient()

			const { data, error } = await supabase
				.from('blogs')
				.select('id, title, slug, excerpt, content, published_at, category, reading_time, featured_image, author_user_id, status, meta_description, tags, created_at, updated_at')
				.eq('slug', slug)
				.eq('status', 'published')
				.single()

			if (error) {
				if (error.code === 'PGRST116') {
					// No rows returned
					return null
				}
				throw new Error(`Failed to fetch blog: ${error.message}`)
			}

			return data
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		enabled: !!slug // Only run query if slug is provided
	})
}

/**
 * Fetch blogs by category
 */
export function useBlogsByCategory(category: string) {
	return useQuery({
		queryKey: blogKeys.category(category),
		queryFn: async (): Promise<BlogListItem[]> => {
			const supabase = createClient()

			const { data, error } = await supabase
				.from('blogs')
				.select(BLOG_LIST_COLUMNS)
				.eq('category', category)
				.eq('status', 'published')
				.order('published_at', { ascending: false })
				.limit(20)

			if (error) {
				throw new Error(`Failed to fetch blogs by category: ${error.message}`)
			}

			return data || []
		},
		staleTime: 5 * 60 * 1000,
		enabled: !!category
	})
}

/**
 * Fetch featured/recent blogs for homepage (limited)
 */
export function useFeaturedBlogs(limit: number = 3) {
	return useQuery({
		queryKey: blogKeys.featured(limit),
		queryFn: async (): Promise<BlogListItem[]> => {
			const supabase = createClient()

			const { data, error } = await supabase
				.from('blogs')
				.select(BLOG_LIST_COLUMNS)
				.eq('status', 'published')
				.order('published_at', { ascending: false })
				.limit(limit)

			if (error) {
				throw new Error(`Failed to fetch featured blogs: ${error.message}`)
			}

			return data || []
		},
		staleTime: 5 * 60 * 1000
	})
}
