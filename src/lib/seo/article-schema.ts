import type { Article } from 'schema-dts'

import { getSiteUrl } from '#lib/generate-metadata'

interface ArticleJsonLdConfig {
	title: string
	slug: string
	datePublished: string
	dateModified?: string
	authorName: string
	image?: string
	wordCount?: number
	keywords?: string[]
	description?: string
}

/**
 * Create an Article JSON-LD schema for blog posts.
 * Produces schema-dts typed output for use with JsonLdScript component.
 */
export function createArticleJsonLd(config: ArticleJsonLdConfig): Article {
	const siteUrl = getSiteUrl()
	const {
		title,
		slug,
		datePublished,
		dateModified,
		authorName,
		image,
		wordCount,
		keywords,
		description
	} = config

	return {
		'@type': 'Article',
		headline: title,
		description,
		datePublished,
		...(dateModified ? { dateModified } : {}),
		author: {
			'@type': 'Person',
			name: authorName
		},
		publisher: {
			'@type': 'Organization',
			name: 'TenantFlow',
			logo: {
				'@type': 'ImageObject',
				url: `${siteUrl}/tenant-flow-logo.png`
			}
		},
		mainEntityOfPage: `${siteUrl}/blog/${slug}`,
		...(image ? { image } : {}),
		...(wordCount ? { wordCount } : {}),
		...(keywords && keywords.length > 0
			? { keywords: keywords.join(', ') }
			: {})
	}
}
