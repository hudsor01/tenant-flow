import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("#env", () => ({
	env: {
		NEXT_PUBLIC_APP_URL: "https://tenantflow.app",
		VERCEL_URL: undefined,
	},
}));

vi.mock("#lib/generate-metadata", () => ({
	getSiteUrl: () => "https://tenantflow.app",
}));

import { createProductJsonLd } from "../product-schema";

/** Convert schema-dts readonly result to plain JSON for easier assertions */
function toPlain(value: unknown): Record<string, unknown> {
	return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

describe("createProductJsonLd", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-15"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const baseInput = {
		name: "TenantFlow Property Management Software",
		description: "Property management software for landlords",
		offers: [
			{ name: "Starter", price: "29" },
			{ name: "Growth", price: "79" },
			{ name: "Max", price: "199" },
		],
	};

	it("returns object with @type Product", () => {
		const result = toPlain(createProductJsonLd(baseInput));
		expect(result["@type"]).toBe("Product");
	});

	it("product name matches input", () => {
		const result = toPlain(createProductJsonLd(baseInput));
		expect(result.name).toBe("TenantFlow Property Management Software");
	});

	it("description matches input", () => {
		const result = toPlain(createProductJsonLd(baseInput));
		expect(result.description).toBe(
			"Property management software for landlords",
		);
	});

	it("offers array contains correct number of Offer objects", () => {
		const result = toPlain(createProductJsonLd(baseInput));
		const offers = result.offers as Array<Record<string, unknown>>;
		expect(offers).toHaveLength(3);
	});

	it("each offer has @type Offer, priceCurrency USD, and InStock availability", () => {
		const result = toPlain(createProductJsonLd(baseInput));
		const offers = result.offers as Array<Record<string, unknown>>;

		for (const offer of offers) {
			expect(offer["@type"]).toBe("Offer");
			expect(offer.priceCurrency).toBe("USD");
			expect(offer.availability).toBe("https://schema.org/InStock");
		}
	});

	it("priceValidUntil is 1 year from mocked date (2027-06-15)", () => {
		const result = toPlain(createProductJsonLd(baseInput));
		const offers = result.offers as Array<Record<string, unknown>>;

		for (const offer of offers) {
			expect(offer.priceValidUntil).toBe("2027-06-15");
		}
	});

	it("priceValidUntil is not the stale hardcoded date", () => {
		const result = toPlain(createProductJsonLd(baseInput));
		const offers = result.offers as Array<Record<string, unknown>>;

		for (const offer of offers) {
			expect(offer.priceValidUntil).not.toBe("2025-12-31");
		}
	});

	it("offer names match input", () => {
		const result = toPlain(createProductJsonLd(baseInput));
		const offers = result.offers as Array<Record<string, unknown>>;

		expect(offers[0]?.name).toBe("Starter");
		expect(offers[1]?.name).toBe("Growth");
		expect(offers[2]?.name).toBe("Max");
	});

	it("offer prices match input", () => {
		const result = toPlain(createProductJsonLd(baseInput));
		const offers = result.offers as Array<Record<string, unknown>>;

		expect(offers[0]?.price).toBe("29");
		expect(offers[1]?.price).toBe("79");
		expect(offers[2]?.price).toBe("199");
	});

	it("url defaults to getSiteUrl()/pricing", () => {
		const result = toPlain(createProductJsonLd(baseInput));
		expect(result.url).toBe("https://tenantflow.app/pricing");
	});

	it("brand is Organization with name TenantFlow", () => {
		const result = toPlain(createProductJsonLd(baseInput));
		const brand = result.brand as Record<string, unknown>;
		expect(brand["@type"]).toBe("Organization");
		expect(brand.name).toBe("TenantFlow");
	});

	it("image is included when provided", () => {
		const result = toPlain(
			createProductJsonLd({
				...baseInput,
				image: "https://example.com/product.jpg",
			}),
		);
		expect(result.image).toBe("https://example.com/product.jpg");
	});

	it("omits image when not provided", () => {
		const result = toPlain(createProductJsonLd(baseInput));
		expect(result).not.toHaveProperty("image");
	});

	it("offer url defaults to getSiteUrl()/pricing when not provided", () => {
		const result = toPlain(createProductJsonLd(baseInput));
		const offers = result.offers as Array<Record<string, unknown>>;

		for (const offer of offers) {
			expect(offer.url).toBe("https://tenantflow.app/pricing");
		}
	});

	it("offer url uses custom url when provided", () => {
		const result = toPlain(
			createProductJsonLd({
				...baseInput,
				offers: [
					{ name: "Custom", price: "10", url: "https://tenantflow.app/signup" },
				],
			}),
		);
		const offers = result.offers as Array<Record<string, unknown>>;
		expect(offers[0]?.url).toBe("https://tenantflow.app/signup");
	});
});
