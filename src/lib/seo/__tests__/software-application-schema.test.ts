import { describe, expect, it } from "vitest";
import { createSoftwareApplicationJsonLd } from "../software-application-schema";

/** Convert schema-dts readonly result to plain JSON for easier assertions */
function toPlain(value: unknown): Record<string, unknown> {
	return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

describe("createSoftwareApplicationJsonLd", () => {
	it("returns SoftwareApplication with default category and OS", () => {
		const result = toPlain(
			createSoftwareApplicationJsonLd({
				name: "TestApp",
				description: "A test application",
			}),
		);

		expect(result["@type"]).toBe("SoftwareApplication");
		expect(result.name).toBe("TestApp");
		expect(result.description).toBe("A test application");
		expect(result.applicationCategory).toBe("BusinessApplication");
		expect(result.operatingSystem).toBe("Web Browser");
	});

	it("a single tier emits a plain Offer with USD default", () => {
		const result = toPlain(
			createSoftwareApplicationJsonLd({
				name: "TestApp",
				description: "Test",
				offers: [{ price: "29" }],
			}),
		);

		const offer = result.offers as Record<string, unknown>;
		expect(offer["@type"]).toBe("Offer");
		expect(offer.price).toBe("29");
		expect(offer.priceCurrency).toBe("USD");
	});

	it("multiple tiers collapse to an AggregateOffer price range", () => {
		const result = toPlain(
			createSoftwareApplicationJsonLd({
				name: "TestApp",
				description: "Test",
				// Deliberately unsorted to prove lowPrice/highPrice are computed,
				// not positional.
				offers: [{ price: "49.00" }, { price: "149.00" }, { price: "19.00" }],
			}),
		);

		const offer = result.offers as Record<string, unknown>;
		expect(offer["@type"]).toBe("AggregateOffer");
		expect(offer.lowPrice).toBe("19.00");
		expect(offer.highPrice).toBe("149.00");
		expect(offer.priceCurrency).toBe("USD");
		expect(offer.offerCount).toBe(3);
	});

	it("throws on a non-numeric price in a multi-tier set", () => {
		expect(() =>
			createSoftwareApplicationJsonLd({
				name: "TestApp",
				description: "Test",
				offers: [{ price: "19.00" }, { price: "not-a-number" }],
			}),
		).toThrow(/invalid price/);
	});

	it("throws on a price with trailing junk (parseFloat would accept the prefix)", () => {
		expect(() =>
			createSoftwareApplicationJsonLd({
				name: "TestApp",
				description: "Test",
				offers: [{ price: "19.00" }, { price: "19abc" }],
			}),
		).toThrow(/invalid price/);
	});

	it("throws on a negative price", () => {
		expect(() =>
			createSoftwareApplicationJsonLd({
				name: "TestApp",
				description: "Test",
				offers: [{ price: "19.00" }, { price: "-5" }],
			}),
		).toThrow(/invalid price/);
	});

	it("throws on a malformed lone price", () => {
		expect(() =>
			createSoftwareApplicationJsonLd({
				name: "TestApp",
				description: "Test",
				offers: [{ price: "$19" }],
			}),
		).toThrow(/invalid price/);
	});

	it("throws on a mixed-currency multi-tier set", () => {
		expect(() =>
			createSoftwareApplicationJsonLd({
				name: "TestApp",
				description: "Test",
				offers: [{ price: "19.00" }, { price: "49.00", priceCurrency: "EUR" }],
			}),
		).toThrow(/single priceCurrency/);
	});

	it("omits offers when not provided", () => {
		const result = toPlain(
			createSoftwareApplicationJsonLd({
				name: "TestApp",
				description: "Test",
			}),
		);

		expect(result.offers).toBeUndefined();
	});

	it("uses provided applicationCategory and operatingSystem", () => {
		const result = toPlain(
			createSoftwareApplicationJsonLd({
				name: "MobileApp",
				description: "Test",
				applicationCategory: "UtilitiesApplication",
				operatingSystem: "iOS",
			}),
		);

		expect(result.applicationCategory).toBe("UtilitiesApplication");
		expect(result.operatingSystem).toBe("iOS");
	});

	it("includes url when provided and omits when not", () => {
		const withUrl = toPlain(
			createSoftwareApplicationJsonLd({
				name: "TestApp",
				description: "Test",
				url: "https://example.com",
			}),
		);
		expect(withUrl.url).toBe("https://example.com");

		const withoutUrl = toPlain(
			createSoftwareApplicationJsonLd({
				name: "TestApp",
				description: "Test",
			}),
		);
		expect(withoutUrl.url).toBeUndefined();
	});

	it("uses custom priceCurrency when provided", () => {
		const result = toPlain(
			createSoftwareApplicationJsonLd({
				name: "TestApp",
				description: "Test",
				offers: [{ price: "10", priceCurrency: "EUR" }],
			}),
		);

		const offer = result.offers as Record<string, unknown>;
		expect(offer.priceCurrency).toBe("EUR");
	});
});
