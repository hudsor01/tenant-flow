import type { Metadata } from 'next'

import { getSiteUrl } from '#lib/generate-metadata'

interface PageMetadataConfig {
	title: string
	description: string
	path: string
	noindex?: boolean
	ogImage?: string
}

/**
 * Create consistent Next.js Metadata for a public page.
 * Generates canonical URL, OG tags, and Twitter card from minimal config.
 */
export function createPageMetadata(config: PageMetadataConfig): Metadata {
	const { title, description, path, noindex, ogImage } = config
	const siteUrl = getSiteUrl()
	const canonicalUrl = `${siteUrl}${path}`
	const imageUrl = ogImage ?? `${siteUrl}/images/property-management-og.jpg`

	return {
		title,
		description,
		alternates: {
			canonical: canonicalUrl
		},
		openGraph: {
			title,
			description,
			url: canonicalUrl,
			siteName: 'TenantFlow',
			type: 'website',
			locale: 'en_US',
			images: [
				{
					url: imageUrl,
					width: 1200,
					height: 630,
					alt: `${title} | TenantFlow`
				}
			]
		},
		twitter: {
			card: 'summary_large_image',
			title,
			description,
			images: [imageUrl]
		},
		...(noindex ? { robots: 'noindex, follow' } : {})
	}
}
