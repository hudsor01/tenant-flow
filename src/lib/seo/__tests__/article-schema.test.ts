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

import { createArticleJsonLd } from '../article-schema'

/** Convert schema-dts readonly result to plain JSON for easier assertions */
function toPlain(value: unknown): Record<string, unknown> {
	return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
}

describe('createArticleJsonLd', () => {
	const baseInput = {
		title: 'Test Article',
		slug: 'test-article',
		datePublished: '2026-01-15T10:00:00Z',
		dateModified: '2026-01-16T10:00:00Z',
		authorName: 'Richard Hudson',
		image: 'https://example.com/image.jpg',
		wordCount: 1500,
		keywords: ['property management', 'landlord tips'],
		description: 'A test article about property management.',
		timeRequired: 'PT5M'
	}

	it('returns object with @type Article', () => {
		const result = toPlain(createArticleJsonLd(baseInput))
		expect(result['@type']).toBe('Article')
	})

	it('headline matches input title', () => {
		const result = toPlain(createArticleJsonLd(baseInput))
		expect(result.headline).toBe('Test Article')
	})

	it('datePublished is ISO string from input', () => {
		const result = toPlain(createArticleJsonLd(baseInput))
		expect(result.datePublished).toBe('2026-01-15T10:00:00Z')
	})

	it('dateModified is included when provided', () => {
		const result = toPlain(createArticleJsonLd(baseInput))
		expect(result.dateModified).toBe('2026-01-16T10:00:00Z')
	})

	it('author is a Person object with name', () => {
		const result = toPlain(createArticleJsonLd(baseInput))
		const author = result.author as Record<string, unknown>
		expect(author['@type']).toBe('Person')
		expect(author.name).toBe('Richard Hudson')
	})

	it('wordCount is included when provided', () => {
		const result = toPlain(createArticleJsonLd(baseInput))
		expect(result.wordCount).toBe(1500)
	})

	it('keywords are joined as comma-separated string', () => {
		const result = toPlain(createArticleJsonLd(baseInput))
		expect(result.keywords).toBe('property management, landlord tips')
	})

	it('mainEntityOfPage URL is constructed from getSiteUrl() + slug', () => {
		const result = toPlain(createArticleJsonLd(baseInput))
		expect(result.mainEntityOfPage).toBe('https://tenantflow.app/blog/test-article')
	})

	it('publisher is Organization with name TenantFlow and logo', () => {
		const result = toPlain(createArticleJsonLd(baseInput))
		const publisher = result.publisher as Record<string, unknown>
		expect(publisher['@type']).toBe('Organization')
		expect(publisher.name).toBe('TenantFlow')
		const logo = publisher.logo as Record<string, unknown>
		expect(logo['@type']).toBe('ImageObject')
		expect(logo.url).toBe('https://tenantflow.app/tenant-flow-logo.png')
	})

	it('omits dateModified when not provided', () => {
		const { dateModified: _, ...inputWithoutModified } = baseInput
		const result = toPlain(createArticleJsonLd(inputWithoutModified))
		expect(result).not.toHaveProperty('dateModified')
	})

	it('omits image when not provided', () => {
		const { image: _, ...inputWithoutImage } = baseInput
		const result = toPlain(createArticleJsonLd(inputWithoutImage))
		expect(result).not.toHaveProperty('image')
	})

	it('omits wordCount when not provided', () => {
		const { wordCount: _, ...inputWithoutWordCount } = baseInput
		const result = toPlain(createArticleJsonLd(inputWithoutWordCount))
		expect(result).not.toHaveProperty('wordCount')
	})

	it('omits keywords when not provided', () => {
		const { keywords: _, ...inputWithoutKeywords } = baseInput
		const result = toPlain(createArticleJsonLd(inputWithoutKeywords))
		expect(result).not.toHaveProperty('keywords')
	})

	it('description matches input', () => {
		const result = toPlain(createArticleJsonLd(baseInput))
		expect(result.description).toBe('A test article about property management.')
	})

	it('timeRequired is included when provided', () => {
		const result = toPlain(createArticleJsonLd(baseInput))
		expect(result.timeRequired).toBe('PT5M')
	})

	it('omits timeRequired when not provided', () => {
		const { timeRequired: _, ...inputWithoutTimeRequired } = baseInput
		const result = toPlain(createArticleJsonLd(inputWithoutTimeRequired))
		expect(result).not.toHaveProperty('timeRequired')
	})
})
