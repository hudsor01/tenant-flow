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

/**
 * Walk a returned React element tree and collect every `schema["@type"]` carried
 * by a `<JsonLdScript schema={...} />` node. Lets the test assert exactly WHICH
 * JSON-LD nodes the page emits — `JsonLdScript` is mocked to `() => null`, but
 * the `schema` prop lives on the element regardless of render. Uses `unknown` +
 * type guards (no `any`, no double assertion).
 */
function collectSchemaTypes(node: unknown): string[] {
	if (!node || typeof node !== "object") return [];
	const types: string[] = [];
	const props = (node as { props?: unknown }).props;
	if (props && typeof props === "object") {
		const schema = (props as { schema?: unknown }).schema;
		if (schema && typeof schema === "object" && "@type" in schema) {
			const type = (schema as Record<string, unknown>)["@type"];
			if (typeof type === "string") types.push(type);
		}
		const children = (props as { children?: unknown }).children;
		const childList = Array.isArray(children) ? children : [children];
		for (const child of childList) types.push(...collectSchemaTypes(child));
	}
	return types;
}

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

	it("emits SoftwareApplication + FAQ + Breadcrumb JSON-LD and NEVER a Product node (Merchant-listings fix)", async () => {
		// SoftwareApplication is now emitted per-page (homepage + /pricing +
		// /features) because it was scoped OUT of the sitewide SeoJsonLd to keep
		// it off /blog/* Article pages. The Merchant-listings guard is specific to
		// PRODUCT: a Product node forced Google's Merchant validation (the GSC
		// "invalid item" error). SoftwareApplication is the rich-result-eligible
		// commercial entity and must be present; Product must never appear.
		const tree = await PricingPage();
		const schemaTypes = collectSchemaTypes(tree);

		expect(schemaTypes).toEqual([
			"SoftwareApplication",
			"FAQPage",
			"BreadcrumbList",
		]);
		expect(schemaTypes).not.toContain("Product");
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
