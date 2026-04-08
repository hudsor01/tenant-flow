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

/** Convert schema-dts readonly result to plain JSON for easier assertions */
function toPlain(value: unknown): Record<string, unknown> {
	return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
}

function getItems(result: ReturnType<typeof createBreadcrumbJsonLd>): Array<Record<string, unknown>> {
	const plain = toPlain(result)
	return plain.itemListElement as Array<Record<string, unknown>>
}

describe('createBreadcrumbJsonLd', () => {
	it('returns BreadcrumbList with Home + FAQ items for /faq', () => {
		const result = createBreadcrumbJsonLd('/faq')
		const plain = toPlain(result)

		expect(plain['@type']).toBe('BreadcrumbList')
		expect(plain.itemListElement).toHaveLength(2)
	})

	it('first item is Home with site URL', () => {
		const items = getItems(createBreadcrumbJsonLd('/faq'))

		expect(items[0]).toMatchObject({
			'@type': 'ListItem',
			position: 1,
			name: 'Home',
			item: 'https://tenantflow.app'
		})
	})

	it('last breadcrumb item omits the item URL (per Schema.org spec)', () => {
		const items = getItems(createBreadcrumbJsonLd('/faq'))

		expect(items[1]).toMatchObject({
			'@type': 'ListItem',
			position: 2,
			name: 'Faq'
		})
		expect(items[1]).not.toHaveProperty('item')
	})

	it('overrides slug label when provided', () => {
		const items = getItems(
			createBreadcrumbJsonLd('/blog/my-post', {
				'my-post': 'My Blog Post'
			})
		)

		expect(items).toHaveLength(3)
		expect(items[2]).toMatchObject({
			'@type': 'ListItem',
			position: 3,
			name: 'My Blog Post'
		})
	})

	it('handles multi-segment paths correctly', () => {
		const items = getItems(createBreadcrumbJsonLd('/resources/guides'))

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
		const items = getItems(createBreadcrumbJsonLd('/a/b/c'))

		expect(items).toHaveLength(4)
		items.forEach((listItem, index) => {
			expect(listItem.position).toBe(index + 1)
		})
	})
})
