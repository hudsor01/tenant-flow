/**
 * Blog article data utility
 * Provides blog article data and metadata
 */

export interface BlogArticle {
	id: string
	title: string
	slug: string
	excerpt: string
	content: string
	publishedAt: string
	updatedAt: string
	author: {
		name: string
		avatar?: string
	}
	tags: string[]
	readingTime: number
}

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useBlogArticleData(slug: string) {
	return useQuery({
		queryKey: ['blog-article', slug],
		queryFn: async (): Promise<BlogArticle> => {
			const response = await apiClient.get(`/api/v1/blog/articles/${slug}`)
			return response.data
		},
		staleTime: 10 * 60 * 1000, // 10 minutes
		enabled: !!slug
	})
}