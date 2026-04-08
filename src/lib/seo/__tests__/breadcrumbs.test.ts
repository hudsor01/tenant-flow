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

import { createBreadcrumbJsonLd } from '../breadcrumbs'

describe('createBreadcrumbJsonLd', () => {
	it('returns BreadcrumbList with Home + FAQ items for /faq', () => {
		const result = createBreadcrumbJsonLd('/faq')

		expect(result['@type']).toBe('BreadcrumbList')
		expect(result.itemListElement).toHaveLength(2)
	})

	it('first item is Home with site URL', () => {
		const result = createBreadcrumbJsonLd('/faq')
		const items = result.itemListElement as Array<Record<string, unknown>>

		expect(items[0]).toMatchObject({
			'@type': 'ListItem',
			position: 1,
			name: 'Home',
			item: 'https://tenantflow.app'
		})
	})

	it('last breadcrumb item omits the item URL (per Schema.org spec)', () => {
		const result = createBreadcrumbJsonLd('/faq')
		const items = result.itemListElement as Array<Record<string, unknown>>

		expect(items[1]).toMatchObject({
			'@type': 'ListItem',
			position: 2,
			name: 'Faq'
		})
		expect(items[1]).not.toHaveProperty('item')
	})

	it('overrides slug label when provided', () => {
		const result = createBreadcrumbJsonLd('/blog/my-post', {
			'my-post': 'My Blog Post'
		})
		const items = result.itemListElement as Array<Record<string, unknown>>

		expect(items).toHaveLength(3)
		expect(items[2]).toMatchObject({
			'@type': 'ListItem',
			position: 3,
			name: 'My Blog Post'
		})
	})

	it('handles multi-segment paths correctly', () => {
		const result = createBreadcrumbJsonLd('/resources/guides')
		const items = result.itemListElement as Array<Record<string, unknown>>

		expect(items).toHaveLength(3)
		expect(items[0]).toMatchObject({ position: 1, name: 'Home' })
		expect(items[1]).toMatchObject({
			position: 2,
			name: 'Resources',
			item: 'https://tenantflow.app/resources'
		})
		expect(items[2]).toMatchObject({ position: 3, name: 'Guides' })
		expect(items[2]).not.toHaveProperty('item')
	})

	it('position numbering starts at 1 and increments', () => {
		const result = createBreadcrumbJsonLd('/a/b/c')
		const items = result.itemListElement as Array<Record<string, unknown>>

		expect(items).toHaveLength(4)
		items.forEach((listItem, index) => {
			expect(listItem.position).toBe(index + 1)
		})
	})
})
