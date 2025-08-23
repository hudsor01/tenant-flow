/**
 * Blog SEO Hook
 * Provides SEO metadata for blog articles
 */

import { useBlogArticleData } from './blog-data'

export interface BlogSEOData {
	title: string
	description: string
	keywords: string[]
	ogImage?: string
	author?: string
	publishedTime?: string
	modifiedTime?: string
	category?: string
	tags?: string[]
}

export function useBlogSEO(slug?: string) {
	const { getArticleBySlug } = useBlogArticleData()

	if (!slug) {
		// Default blog page SEO
		return {
			title: 'TenantFlow Blog - Property Management Insights',
			description:
				'Expert tips, industry insights, and best practices for property managers and landlords. Learn how to maximize returns and streamline operations.',
			keywords: [
				'property management',
				'landlord tips',
				'rental property',
				'tenant management',
				'real estate investing',
				'maintenance',
				'tenant screening'
			],
			ogImage: '/og-blog.png'
		}
	}

	const article = getArticleBySlug(slug)

	if (!article) {
		return {
			title: 'Article Not Found - TenantFlow Blog',
			description: 'The article you are looking for could not be found.',
			keywords: ['blog', 'property management'],
			ogImage: '/og-blog.png'
		}
	}

	return {
		title: `${article.title} - TenantFlow Blog`,
		description: article.excerpt,
		keywords: [
			...article.tags,
			article.category.toLowerCase(),
			'property management',
			'tenantflow'
		],
		ogImage: article.image || '/og-blog.png',
		author: article.author,
		publishedTime: article.date,
		modifiedTime: article.date,
		category: article.category,
		tags: article.tags
	}
}

export function generateBlogStructuredData(seoData: BlogSEOData, url: string) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		headline: seoData.title,
		description: seoData.description,
		image: seoData.ogImage,
		author: {
			'@type': 'Person',
			name: seoData.author || 'TenantFlow Team'
		},
		publisher: {
			'@type': 'Organization',
			name: 'TenantFlow',
			logo: {
				'@type': 'ImageObject',
				url: 'https://tenantflow.app/logo.png'
			}
		},
		datePublished: seoData.publishedTime,
		dateModified: seoData.modifiedTime,
		mainEntityOfPage: {
			'@type': 'WebPage',
			'@id': url
		},
		keywords: seoData.keywords?.join(', '),
		articleSection: seoData.category
	}
}
