import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type {
	BlogArticleWithDetails,
	BlogArticleListItem,
	BlogFilters,
	BlogPagination,
	BlogSEOData
} from '@/types/blog'

// Query keys for cache management
export const blogQueryKeys = {
	all: ['blog'] as const,
	articles: () => [...blogQueryKeys.all, 'articles'] as const,
	article: (slug: string) => [...blogQueryKeys.articles(), slug] as const,
	list: (filters: BlogFilters, pagination: BlogPagination) =>
		[...blogQueryKeys.articles(), 'list', filters, pagination] as const,
	featured: () => [...blogQueryKeys.articles(), 'featured'] as const,
	related: (articleId: string, category: string) =>
		[...blogQueryKeys.articles(), 'related', articleId, category] as const,
	tags: () => [...blogQueryKeys.all, 'tags'] as const,
	categories: () => [...blogQueryKeys.all, 'categories'] as const
}

/**
 * Hook for fetching a single blog article by slug
 */
export function useBlogArticle(slug: string) {
	return useQuery({
		queryKey: blogQueryKeys.article(slug),
		queryFn: async (): Promise<BlogArticleWithDetails | null> => {
			if (!slug) return null

			const { data, error } = await supabase
				.from('BlogArticle')
				.select(`
					*,
					author:User(id, name, avatarUrl),
					tags:BlogTag(*)
				`)
				.eq('slug', slug)
				.eq('status', 'PUBLISHED')
				.single()

			if (error) {
				if (error.code === 'PGRST116') return null // Not found
				throw new Error(`Failed to fetch article: ${error.message}`)
			}

// Increment view count asynchronously (fire and forget)
if (data?.id) {
void supabase
.from('BlogArticle')
.update({ viewCount: (data.viewCount || 0) + 1 })
.eq('id', data.id)
}

			return data
		},
		enabled: !!slug,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000 // 10 minutes (renamed from cacheTime)
	})
}

/**
 * Hook for fetching list of blog articles with filtering and pagination
 */
export function useBlogArticles(
	filters: BlogFilters = {},
	pagination: BlogPagination = { page: 1, limit: 10 }
) {
	return useQuery({
		queryKey: blogQueryKeys.list(filters, pagination),
		queryFn: async () => {
			let query = supabase
				.from('BlogArticle')
				.select(`
					id,
					title,
					slug,
					description,
					excerpt,
					authorName,
					category,
					status,
					featured,
					publishedAt,
					readTime,
					viewCount,
					ogImage,
					createdAt,
					updatedAt,
					tags:BlogTag(id, name, slug, color)
				`, { count: 'exact' })
				.eq('status', 'PUBLISHED')
				.order('publishedAt', { ascending: false })

			// Apply filters
			if (filters.category) {
				query = query.eq('category', filters.category)
			}

			if (filters.featured !== undefined) {
				query = query.eq('featured', filters.featured)
			}

			if (filters.search) {
				query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
			}

			if (filters.dateFrom) {
				query = query.gte('publishedAt', filters.dateFrom)
			}

			if (filters.dateTo) {
				query = query.lte('publishedAt', filters.dateTo)
			}

			// Apply pagination
			const from = (pagination.page - 1) * pagination.limit
			const to = from + pagination.limit - 1
			query = query.range(from, to)

			const { data, error, count } = await query

			if (error) {
				throw new Error(`Failed to fetch articles: ${error.message}`)
			}

			return {
				articles: data as BlogArticleListItem[],
				total: count || 0,
				hasMore: (count || 0) > pagination.page * pagination.limit
			}
		},
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 5 * 60 * 1000 // 5 minutes
	})
}

/**
 * Hook for fetching featured blog articles
 */
export function useFeaturedBlogArticles(limit = 3) {
	return useQuery({
		queryKey: [...blogQueryKeys.featured(), limit],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('BlogArticle')
				.select(`
					id,
					title,
					slug,
					description,
					excerpt,
					authorName,
					category,
					featured,
					publishedAt,
					readTime,
					ogImage,
					tags:BlogTag(id, name, slug, color)
				`)
				.eq('status', 'PUBLISHED')
				.eq('featured', true)
				.order('publishedAt', { ascending: false })
				.limit(limit)

			if (error) {
				throw new Error(`Failed to fetch featured articles: ${error.message}`)
			}

			return data as BlogArticleListItem[]
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000 // 10 minutes
	})
}

/**
 * Hook for fetching related articles
 */
export function useRelatedBlogArticles(articleId: string, category: string, limit = 2) {
	return useQuery({
		queryKey: [...blogQueryKeys.related(articleId, category), limit],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('BlogArticle')
				.select(`
					id,
					title,
					slug,
					description,
					excerpt,
					authorName,
					category,
					publishedAt,
					readTime,
					ogImage
				`)
				.eq('status', 'PUBLISHED')
				.eq('category', category)
				.neq('id', articleId)
				.order('publishedAt', { ascending: false })
				.limit(limit)

			if (error) {
				throw new Error(`Failed to fetch related articles: ${error.message}`)
			}

			return data as BlogArticleListItem[]
		},
		enabled: !!articleId && !!category,
		staleTime: 10 * 60 * 1000, // 10 minutes
		gcTime: 20 * 60 * 1000 // 20 minutes
	})
}

/**
 * Hook for fetching blog tags
 */
export function useBlogTags() {
	return useQuery({
		queryKey: blogQueryKeys.tags(),
		queryFn: async () => {
			const { data, error } = await supabase
				.from('BlogTag')
				.select('*')
				.order('name')

			if (error) {
				throw new Error(`Failed to fetch blog tags: ${error.message}`)
			}

			return data
		},
		staleTime: 30 * 60 * 1000, // 30 minutes (tags don't change often)
		gcTime: 60 * 60 * 1000 // 1 hour
	})
}

interface UseBlogArticleDataProps {
	slug?: string
}

/**
 * Enhanced hook for managing blog article data and content processing
 * Replaces hardcoded data with database-driven content
 */
export function useBlogArticleData({ slug }: UseBlogArticleDataProps) {
	const queryClient = useQueryClient()
	
	// Fetch article data
	const { data: article, isLoading, error, isError } = useBlogArticle(slug || '')
	
	// Fetch related articles if we have an article
	const { data: relatedArticles } = useRelatedBlogArticles(
		article?.id || '',
		article?.category || '',
		2
	)

	// Validate article exists and is published
	const isValidSlug = useMemo(() => {
		return slug && article !== null && !isError
	}, [slug, article, isError])

	// Process article content for HTML rendering
	const processedContent = useMemo(() => {
		if (!article?.content) return ''

		let content = article.content

		// Check if content is already HTML (contains HTML tags)
		const isHtml = /<[a-z][\s\S]*>/i.test(content)
		
		if (isHtml) {
			// Content is already HTML, return as-is
			return content
		}

		// Content is Markdown, convert to HTML
		// Process headers
		content = content.replace(/^# (.+)$/gm, '<h1>$1</h1>')
		content = content.replace(/^## (.+)$/gm, '<h2>$1</h2>')
		content = content.replace(/^### (.+)$/gm, '<h3>$1</h3>')
		content = content.replace(/^#### (.+)$/gm, '<h4>$1</h4>')
		content = content.replace(/^##### (.+)$/gm, '<h5>$1</h5>')
		content = content.replace(/^###### (.+)$/gm, '<h6>$1</h6>')

		// Process bold and italic
		content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
		content = content.replace(/\*(.*?)\*/g, '<em>$1</em>')

		// Process inline code
		content = content.replace(/`([^`]+)`/g, '<code>$1</code>')

		// Process blockquotes
		content = content.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')

		// Process horizontal rules
		content = content.replace(/^---$/gm, '<hr>')

		// Process links
		content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

		// Process lists (simplified)
		content = content.replace(/^\* (.+)$/gm, '<li>$1</li>')
		content = content.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')

		// Wrap consecutive li elements in ul/ol
		content = content.replace(/(<li>.*<\/li>\s*)+/gs, (match) => {
			return `<ul>${match}</ul>`
		})

		// Process paragraphs
		const paragraphs = content.split('\n\n')
		content = paragraphs
			.map(paragraph => {
				const trimmed = paragraph.trim()
				if (!trimmed) return ''

				// Skip already processed elements
				if (
					trimmed.startsWith('<h') ||
					trimmed.startsWith('<ul') ||
					trimmed.startsWith('<ol') ||
					trimmed.startsWith('<blockquote') ||
					trimmed.startsWith('<hr') ||
					trimmed.startsWith('<div')
				) {
					return trimmed
				}

				// Don't wrap if it contains line breaks (likely a list or complex content)
				if (trimmed.includes('\n')) {
					return trimmed.replace(/\n/g, '<br />')
				}

				return `<p>${trimmed}</p>`
			})
			.join('\n\n')

		return content
	}, [article?.content])

	// Generate SEO data
	const seoData = useMemo((): BlogSEOData | null => {
		if (!article) return null

		return {
			title: article.metaTitle || article.title,
			description: article.metaDescription || article.description,
			keywords: article.searchKeywords || [],
			ogImage: article.ogImage || undefined,
			canonicalUrl: `/blog/${article.slug}`,
			publishedAt: article.publishedAt || undefined,
			updatedAt: article.updatedAt,
			author: article.authorName,
			category: article.category,
			readTime: article.readTime || undefined
		}
	}, [article])

	// Animation configuration
	const fadeInUp = {
		initial: { opacity: 0, y: 20 },
		animate: { opacity: 1, y: 0 },
		transition: { duration: 0.6 }
	}

// Prefetch related articles for better UX
const prefetchRelatedArticles = () => {
relatedArticles?.forEach(relatedArticle => {
queryClient.prefetchQuery({
queryKey: blogQueryKeys.article(relatedArticle.slug),
queryFn: async () => {
const { data, error } = await supabase
.from('BlogArticle')
.select(`
*,
author:User(id, name, avatarUrl),
tags:BlogTag(*)
`)
.eq('slug', relatedArticle.slug)
.eq('status', 'PUBLISHED')
.single()

if (error) {
if (error.code === 'PGRST116') return null
throw new Error(`Failed to fetch article: ${error.message}`)
}

return data
},
staleTime: 5 * 60 * 1000
})
})
}

	return {
		// Article data
		article,
		relatedArticles: relatedArticles || [],
		
		// State
		isLoading,
		isError,
		error,
		isValidSlug,
		
		// Processed content
		processedContent,
		seoData,
		
		// Utils
		fadeInUp,
		prefetchRelatedArticles
	}
}

/**
 * Helper function to format article date
 */
export function formatArticleDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	})
}

/**
 * Helper function to calculate estimated read time
 */
export function calculateReadTime(content: string): number {
	const wordsPerMinute = 200
	const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length
	return Math.ceil(words / wordsPerMinute)
}

/**
 * Helper function to generate article excerpt
 */
export function generateExcerpt(content: string, maxLength = 160): string {
	const text = content.replace(/<[^>]*>/g, '').trim()
	if (text.length <= maxLength) return text
	
	const truncated = text.substring(0, maxLength)
	const lastSpace = truncated.lastIndexOf(' ')
	
	return lastSpace > 0 
		? truncated.substring(0, lastSpace) + '...'
		: truncated + '...'
}
