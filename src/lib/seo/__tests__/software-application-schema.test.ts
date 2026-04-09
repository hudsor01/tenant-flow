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

import { createSoftwareApplicationJsonLd } from '../software-application-schema'

/** Convert schema-dts readonly result to plain JSON for easier assertions */
function toPlain(value: unknown): Record<string, unknown> {
	return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
}

describe('createSoftwareApplicationJsonLd', () => {
	it('returns SoftwareApplication with default category and OS', () => {
		const result = toPlain(createSoftwareApplicationJsonLd({
			name: 'TestApp',
			description: 'A test application'
		}))

		expect(result['@type']).toBe('SoftwareApplication')
		expect(result.name).toBe('TestApp')
		expect(result.description).toBe('A test application')
		expect(result.applicationCategory).toBe('BusinessApplication')
		expect(result.operatingSystem).toBe('Web Browser')
	})

	it('includes offers with Offer type and USD default', () => {
		const result = toPlain(createSoftwareApplicationJsonLd({
			name: 'TestApp',
			description: 'Test',
			offers: [{ price: '29' }, { price: '79' }]
		}))

		const offers = result.offers as Array<Record<string, unknown>>
		expect(offers).toHaveLength(2)
		expect(offers[0]!['@type']).toBe('Offer')
		expect(offers[0]!.price).toBe('29')
		expect(offers[0]!.priceCurrency).toBe('USD')
		expect(offers[1]!.price).toBe('79')
	})

	it('omits offers when not provided', () => {
		const result = toPlain(createSoftwareApplicationJsonLd({
			name: 'TestApp',
			description: 'Test'
		}))

		expect(result.offers).toBeUndefined()
	})

	it('uses provided applicationCategory and operatingSystem', () => {
		const result = toPlain(createSoftwareApplicationJsonLd({
			name: 'MobileApp',
			description: 'Test',
			applicationCategory: 'UtilitiesApplication',
			operatingSystem: 'iOS'
		}))

		expect(result.applicationCategory).toBe('UtilitiesApplication')
		expect(result.operatingSystem).toBe('iOS')
	})

	it('includes url when provided and omits when not', () => {
		const withUrl = toPlain(createSoftwareApplicationJsonLd({
			name: 'TestApp',
			description: 'Test',
			url: 'https://example.com'
		}))
		expect(withUrl.url).toBe('https://example.com')

		const withoutUrl = toPlain(createSoftwareApplicationJsonLd({
			name: 'TestApp',
			description: 'Test'
		}))
		expect(withoutUrl.url).toBeUndefined()
	})

	it('uses custom priceCurrency when provided', () => {
		const result = toPlain(createSoftwareApplicationJsonLd({
			name: 'TestApp',
			description: 'Test',
			offers: [{ price: '10', priceCurrency: 'EUR' }]
		}))

		const offers = result.offers as Array<Record<string, unknown>>
		expect(offers[0]!.priceCurrency).toBe('EUR')
	})
})
