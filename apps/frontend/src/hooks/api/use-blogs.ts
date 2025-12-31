/**
 * Blog API Hooks
 * Fetches blog posts from Supabase database
 */

import { useQuery } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import type { Database } from '@repo/shared/types/supabase'

type Blog = Database['public']['Tables']['blogs']['Row']

/**
 * Fetch all published blogs, sorted by published_at descending
 */
export function useBlogs() {
	return useQuery({
		queryKey: ['blogs'],
		queryFn: async (): Promise<Blog[]> => {
			const supabase = createClient()

			const { data, error } = await supabase
				.from('blogs')
				.select('*')
				.eq('status', 'published')
				.order('published_at', { ascending: false })

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
		queryKey: ['blog', slug],
		queryFn: async (): Promise<Blog | null> => {
			const supabase = createClient()

			const { data, error } = await supabase
				.from('blogs')
				.select('*')
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
		queryKey: ['blogs', 'category', category],
		queryFn: async (): Promise<Blog[]> => {
			const supabase = createClient()

			const { data, error } = await supabase
				.from('blogs')
				.select('*')
				.eq('category', category)
				.eq('status', 'published')
				.order('published_at', { ascending: false })

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
		queryKey: ['blogs', 'featured', limit],
		queryFn: async (): Promise<Blog[]> => {
			const supabase = createClient()

			const { data, error } = await supabase
				.from('blogs')
				.select('*')
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
