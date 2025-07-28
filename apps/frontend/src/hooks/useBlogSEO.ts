import { useMemo } from 'react'
import type { BlogArticleWithDetails } from '@tenantflow/shared/types/blog'
import { generateBlogSEO } from '@/lib/utils/seo-utils'

interface UseBlogSEOProps {
	article: BlogArticleWithDetails | null
	slug: string
}

/**
 * Custom hook for managing blog article SEO data
 * Uses optimized SEO utility functions for better search performance
 */
export function useBlogSEO({ article, slug }: UseBlogSEOProps) {
	// Generate optimized SEO data using utility function
	const seoConfig = useMemo(() => {
		const seoArticle = article ? {
			title: article.metaTitle || article.title,
			description: article.metaDescription || article.description,
			publishedAt: (article.publishedAt || article.createdAt)?.toISOString(),
			author: article.authorName,
			category: article.category,
			tags: [],
			image: article.ogImage || undefined
		} : null
		const seoData = generateBlogSEO(seoArticle, slug)
		return {
			title: seoData.title,
			description: seoData.description,
			keywords: seoData.keywords,
			image: seoData.image,
			type: 'article' as const,
			canonical: seoData.canonical,
			structuredData: seoData.structuredData,
			breadcrumb: seoData.breadcrumb
		}
	}, [article, slug])

	return {
		structuredData: seoConfig.structuredData,
		breadcrumb: seoConfig.breadcrumb,
		seoConfig
	}
}

/**
 * Helper function to generate article URL
 */
export function getArticleUrl(slug: string): string {
	return `${window.location.origin}/blog/${slug}`
}

/**
 * Helper function to generate social sharing URLs
 */
export function getSocialShareUrls(article: BlogArticleWithDetails, slug: string) {
	const url = encodeURIComponent(getArticleUrl(slug))
	const title = encodeURIComponent(article.title)
	const description = encodeURIComponent(article.description)

	return {
		twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
		facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
		linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
		email: `mailto:?subject=${title}&body=${description}%0A%0A${url}`
	}
}
