import { describe, expect, it, vi } from 'vitest'

vi.mock('#env', () => ({
	env: {
		NEXT_PUBLIC_APP_URL: 'https://tenantflow.app',
		VERCEL_URL: undefined
	}
}))

vi.mock('#lib/generate-metadata', () => ({
	getSiteUrl: () => 'https://tenantflow.app'
}))

import { createPageMetadata } from '../page-metadata'

describe('createPageMetadata', () => {
	it('returns Metadata with correct title', () => {
		const result = createPageMetadata({
			title: 'FAQ',
			description: 'Frequently asked questions',
			path: '/faq'
		})

		expect(result.title).toBe('FAQ')
	})

	it('canonical URL is getSiteUrl() + path', () => {
		const result = createPageMetadata({
			title: 'FAQ',
			description: 'Frequently asked questions',
			path: '/faq'
		})

		expect(result.alternates?.canonical).toBe('https://tenantflow.app/faq')
	})

	it('OG title and description match input', () => {
		const result = createPageMetadata({
			title: 'FAQ',
			description: 'Frequently asked questions',
			path: '/faq'
		})

		const og = result.openGraph as Record<string, unknown>
		expect(og.title).toBe('FAQ')
		expect(og.description).toBe('Frequently asked questions')
	})

	it('OG url matches canonical', () => {
		const result = createPageMetadata({
			title: 'FAQ',
			description: 'desc',
			path: '/faq'
		})

		const og = result.openGraph as Record<string, unknown>
		expect(og.url).toBe('https://tenantflow.app/faq')
	})

	it('Twitter card is summary_large_image', () => {
		const result = createPageMetadata({
			title: 'FAQ',
			description: 'desc',
			path: '/faq'
		})

		const twitter = result.twitter as Record<string, unknown>
		expect(twitter.card).toBe('summary_large_image')
	})

	it('noindex option sets robots to noindex, follow', () => {
		const result = createPageMetadata({
			title: 'Private',
			description: 'desc',
			path: '/private',
			noindex: true
		})

		expect(result.robots).toBe('noindex, follow')
	})

	it('default OG image URL contains property-management-og.jpg', () => {
		const result = createPageMetadata({
			title: 'FAQ',
			description: 'desc',
			path: '/faq'
		})

		const og = result.openGraph as { images?: Array<{ url: string }> }
		const firstImage = og.images?.[0]
		expect(firstImage?.url).toContain('/images/property-management-og.jpg')
	})

	it('normalizes path missing leading slash', () => {
		const result = createPageMetadata({
			title: 'FAQ',
			description: 'desc',
			path: 'faq'
		})

		expect(result.alternates?.canonical).toBe('https://tenantflow.app/faq')
		const og = result.openGraph as Record<string, unknown>
		expect(og.url).toBe('https://tenantflow.app/faq')
	})

	it('custom ogImage overrides default', () => {
		const result = createPageMetadata({
			title: 'FAQ',
			description: 'desc',
			path: '/faq',
			ogImage: 'https://tenantflow.app/images/custom.jpg'
		})

		const og = result.openGraph as { images?: Array<{ url: string }> }
		const firstImage = og.images?.[0]
		expect(firstImage?.url).toBe('https://tenantflow.app/images/custom.jpg')
	})
})
