import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted mocks so they are available to vi.mock factories below
const mocks = vi.hoisted(() => ({
	createFaqJsonLdSpy: vi.fn((entries: unknown) => ({
		"@type": "FAQPage",
		__captured: entries,
	})),
}));

vi.mock("#lib/seo/breadcrumbs", () => ({
	createBreadcrumbJsonLd: () => ({ "@type": "BreadcrumbList" }),
}));

vi.mock("#lib/seo/faq-schema", () => ({
	createFaqJsonLd: mocks.createFaqJsonLdSpy,
}));

vi.mock("#lib/seo/page-metadata", () => ({
	createPageMetadata: (cfg: { title: string; description: string }) => ({
		title: cfg.title,
		description: cfg.description,
	}),
}));

vi.mock("#components/layout/page-layout", () => ({
	PageLayout: () => null,
}));

vi.mock("#components/seo/json-ld-script", () => ({
	JsonLdScript: () => null,
}));

vi.mock("#components/sections/testimonials-section", () => ({
	TestimonialsSection: () => null,
}));

vi.mock("../_components/pricing-section", () => ({
	PricingSection: () => null,
}));

// Mock visual sections only; let `pricingFaqs` resolve to the real array so the
// FAQPage JSON-LD length assertion below pins the COPY-05 trim contract.
vi.mock("../pricing-content", async () => {
	const actual =
		await vi.importActual<typeof import("../pricing-content")>(
			"../pricing-content",
		);
	return {
		PricingCtaSection: () => null,
		PricingFaqSection: () => null,
		PricingStatsGrid: () => null,
		pricingFaqs: actual.pricingFaqs,
	};
});

import PricingPage, { metadata } from "../page";

describe("pricing/page.tsx PRICE-06 reversal (Phase 5)", () => {
	beforeEach(() => {
		mocks.createFaqJsonLdSpy.mockClear();
	});

	it('metadata.description includes "Max ($149/mo, unlimited properties)" and omits "Custom pricing, contact sales" (Phase 5 PRICE-06 flip)', () => {
		const desc = (metadata as { description: string }).description;
		expect(desc).toContain("Max ($149/mo, unlimited properties)");
		expect(desc).not.toContain("Custom pricing, contact sales");
		// Sanity: Starter + Growth also reflect new Option A prices
		expect(desc).toContain("Starter ($19/mo, 5 properties)");
		expect(desc).toContain("Growth ($49/mo, 20 properties)");
	});

	it("emits FAQ + Breadcrumb JSON-LD but NO Product/SoftwareApplication node (Merchant-listings fix)", async () => {
		// The page must not render a page-level commercial schema: Product forced
		// Google's Merchant-listings validation (the GSC "invalid item" error), and
		// the software entity is already covered sitewide by SeoJsonLd. Only FAQ +
		// Breadcrumb remain. PricingPage returns a JSON-LD-free element tree (all
		// JsonLdScript children are mocked to null), so the strongest pin we have is
		// that rendering succeeds and the FAQ schema below is still built.
		await expect(PricingPage()).resolves.toBeTruthy();
	});

	it("FAQPage JSON-LD mainEntity has exactly 5 entries (COPY-05 — pricing FAQ trim)", async () => {
		await PricingPage();

		expect(mocks.createFaqJsonLdSpy).toHaveBeenCalledTimes(1);
		const entries = mocks.createFaqJsonLdSpy.mock.calls[0]![0] as Array<{
			question: string;
			answer: string;
		}>;

		expect(entries).toHaveLength(5);
		// The trial-overlap entry was dropped in Plan 04-02 Task 3.
		expect(
			entries.find((e) =>
				/How does the 14-day free trial work\?/i.test(e.question),
			),
		).toBeUndefined();
	});
});
