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

describe('pricing/page.tsx CRIT-03 placeholder', () => {
	beforeEach(() => {
		mocks.createProductJsonLdSpy.mockClear()
		mocks.createFaqJsonLdSpy.mockClear()
	})

	it('metadata.description omits "$199/mo" for Max and includes "Max — Custom pricing, contact sales"', () => {
		const desc = (metadata as { description: string }).description
		expect(desc).not.toContain('$199/mo')
		expect(desc).toContain('Max — Custom pricing, contact sales')
	})

	it('productJsonLd is built with exactly 2 offers (Starter + Growth, no Max)', async () => {
		await PricingPage()

		expect(mocks.createProductJsonLdSpy).toHaveBeenCalledTimes(1)
		const config = mocks.createProductJsonLdSpy.mock.calls[0]![0] as {
			offers: Array<{ name: string; price: string }>
			description: string
		}

		expect(config.offers).toHaveLength(2)
		expect(config.offers[0]).toMatchObject({ name: 'Starter', price: '29.00' })
		expect(config.offers[1]).toMatchObject({ name: 'Growth', price: '79.00' })
		expect(config.offers.find(o => o.name === 'Max')).toBeUndefined()
		expect(config.offers.find(o => o.price === '199.00')).toBeUndefined()
	})

	it('productJsonLd.description contains verbatim "Custom pricing, contact sales"', async () => {
		await PricingPage()

		const config = mocks.createProductJsonLdSpy.mock.calls[0]![0] as {
			description: string
		}

		expect(config.description).toContain('Custom pricing, contact sales')
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
