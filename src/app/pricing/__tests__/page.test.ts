import { beforeEach, describe, expect, it, vi } from 'vitest'

// Hoisted mocks so they are available to vi.mock factories below
const mocks = vi.hoisted(() => ({
	createProductJsonLdSpy: vi.fn((cfg: unknown) => ({
		'@type': 'Product',
		__captured: cfg
	})),
	createFaqJsonLdSpy: vi.fn((entries: unknown) => ({
		'@type': 'FAQPage',
		__captured: entries
	}))
}))

vi.mock('#env', () => ({
	env: {
		NEXT_PUBLIC_APP_URL: 'https://tenantflow.app',
		VERCEL_URL: undefined
	}
}))

vi.mock('#lib/generate-metadata', () => ({
	getSiteUrl: () => 'https://tenantflow.app'
}))

vi.mock('#lib/seo/product-schema', () => ({
	createProductJsonLd: mocks.createProductJsonLdSpy
}))

vi.mock('#lib/seo/breadcrumbs', () => ({
	createBreadcrumbJsonLd: () => ({ '@type': 'BreadcrumbList' })
}))

vi.mock('#lib/seo/faq-schema', () => ({
	createFaqJsonLd: mocks.createFaqJsonLdSpy
}))

vi.mock('#lib/seo/page-metadata', () => ({
	createPageMetadata: (cfg: { title: string; description: string }) => ({
		title: cfg.title,
		description: cfg.description
	})
}))

vi.mock('#components/layout/page-layout', () => ({
	PageLayout: () => null
}))

vi.mock('#components/seo/json-ld-script', () => ({
	JsonLdScript: () => null
}))

vi.mock('#components/sections/testimonials-section', () => ({
	TestimonialsSection: () => null
}))

vi.mock('../_components/pricing-section', () => ({
	PricingSection: () => null
}))

// Mock visual sections only; let `pricingFaqs` resolve to the real array so the
// FAQPage JSON-LD length assertion below pins the COPY-05 trim contract.
vi.mock('../pricing-content', async () => {
	const actual = await vi.importActual<typeof import('../pricing-content')>(
		'../pricing-content'
	)
	return {
		PricingCtaSection: () => null,
		PricingFaqSection: () => null,
		PricingStatsGrid: () => null,
		pricingFaqs: actual.pricingFaqs
	}
})

import PricingPage, { metadata } from '../page'

describe('pricing/page.tsx PRICE-06 reversal (Phase 5)', () => {
	beforeEach(() => {
		mocks.createProductJsonLdSpy.mockClear()
		mocks.createFaqJsonLdSpy.mockClear()
	})

	it('metadata.description includes "Max ($149/mo, unlimited properties)" and omits "Custom pricing, contact sales" (Phase 5 PRICE-06 flip)', () => {
		const desc = (metadata as { description: string }).description
		expect(desc).toContain('Max ($149/mo, unlimited properties)')
		expect(desc).not.toContain('Custom pricing, contact sales')
		// Sanity: Starter + Growth also reflect new Option A prices
		expect(desc).toContain('Starter ($19/mo, 5 properties)')
		expect(desc).toContain('Growth ($49/mo, 20 properties)')
	})

	it('productJsonLd is built with exactly 3 offers (Starter + Growth + Max — Phase 5 PRICE-06 flip)', async () => {
		await PricingPage()

		expect(mocks.createProductJsonLdSpy).toHaveBeenCalledTimes(1)
		const config = mocks.createProductJsonLdSpy.mock.calls[0]![0] as {
			offers: Array<{ name: string; price: string }>
			description: string
		}

		expect(config.offers).toHaveLength(3)
		expect(config.offers[0]).toMatchObject({ name: 'Starter', price: '19.00' })
		expect(config.offers[1]).toMatchObject({ name: 'Growth', price: '49.00' })
		expect(config.offers[2]).toMatchObject({ name: 'Max', price: '149.00' })
		// Stale-price regression guards (the old $29/$79/$199 trio must not reappear)
		expect(config.offers.find(o => o.price === '29.00')).toBeUndefined()
		expect(config.offers.find(o => o.price === '79.00')).toBeUndefined()
		expect(config.offers.find(o => o.price === '199.00')).toBeUndefined()
	})

	it('productJsonLd.description contains "Max $149/mo (unlimited properties)" and omits the CRIT-03 placeholder (Phase 5 PRICE-06 flip)', async () => {
		await PricingPage()

		const config = mocks.createProductJsonLdSpy.mock.calls[0]![0] as {
			description: string
		}

		expect(config.description).toContain('Max $149/mo (unlimited properties)')
		expect(config.description).not.toContain('Custom pricing, contact sales')
	})

	it('FAQPage JSON-LD mainEntity has exactly 5 entries (COPY-05 — pricing FAQ trim)', async () => {
		await PricingPage()

		expect(mocks.createFaqJsonLdSpy).toHaveBeenCalledTimes(1)
		const entries = mocks.createFaqJsonLdSpy.mock.calls[0]![0] as Array<{
			question: string
			answer: string
		}>

		expect(entries).toHaveLength(5)
		// The trial-overlap entry was dropped in Plan 04-02 Task 3.
		expect(
			entries.find(e => /How does the 14-day free trial work\?/i.test(e.question))
		).toBeUndefined()
	})
})
