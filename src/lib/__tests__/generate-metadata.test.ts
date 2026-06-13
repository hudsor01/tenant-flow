/**
 * SEO-03 regression pin for `getJsonLd()`.
 *
 * The site emits both `Organization` and `SoftwareApplication` JSON-LD
 * site-wide via `<SeoJsonLd />` in the root layout. This test pins the
 * exact shape so a refactor cannot drop either entity, regress the E.164
 * vanity-phone fix, or break the `AggregateOffer` shape Google Merchant
 * validates against.
 *
 * Mock `#env` (which `getSiteUrl()` reads) — NOT `#lib/generate-metadata`
 * itself, since `generate-metadata` is the SUT.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("#env", () => ({
	env: {
		NEXT_PUBLIC_APP_URL: "https://tenantflow.app",
		VERCEL_URL: undefined,
	},
}));

import {
	getJsonLd,
	getOrganizationJsonLd,
	getSoftwareApplicationJsonLd,
} from "#lib/generate-metadata";

/** schema-dts readonly result -> plain JSON for assertions */
function toPlain(value: unknown): Record<string, unknown> {
	return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		throw new Error("Expected a plain object");
	}
	return value as Record<string, unknown>;
}

describe("getJsonLd", () => {
	it("returns exactly two JSON-LD entities", () => {
		const result = getJsonLd();
		expect(result).toHaveLength(2);
	});

	it("element 0 is a valid Organization with E.164 contactPoint.telephone", () => {
		const [orgRaw] = getJsonLd();
		const org = toPlain(orgRaw);

		expect(org["@type"]).toBe("Organization");
		expect(org["@context"]).toBe("https://schema.org");
		expect(org.name).toBeTruthy();
		expect(org.url).toBeTruthy();
		expect(org.logo).toBeTruthy();

		// contactPoint may be an object or an array per schema.org — narrow
		// to a single record. Pin the E.164 telephone string exactly to
		// guard against a regression to the rejected vanity format
		// (`+1-888-TENANT-1`) Google's validator failed on.
		const contactPointRaw = org.contactPoint;
		const contactPoint = Array.isArray(contactPointRaw)
			? asRecord(contactPointRaw[0])
			: asRecord(contactPointRaw);
		expect(contactPoint.telephone).toBe("+1-214-843-0779");
	});

	it("element 1 is a valid SoftwareApplication with AggregateOffer + featureList", () => {
		const [, softwareRaw] = getJsonLd();
		const software = toPlain(softwareRaw);

		expect(software["@type"]).toBe("SoftwareApplication");
		expect(software["@context"]).toBe("https://schema.org");
		expect(software.applicationCategory).toBeTruthy();

		const offers = asRecord(software.offers);
		expect(offers["@type"]).toBe("AggregateOffer");

		expect(Array.isArray(software.featureList)).toBe(true);
		const featureList = software.featureList as unknown[];
		expect(featureList.length).toBeGreaterThan(0);
	});
});

describe("granular JSON-LD getters", () => {
	it("getOrganizationJsonLd returns only the Organization entity", () => {
		const org = toPlain(getOrganizationJsonLd());
		expect(org["@type"]).toBe("Organization");
		expect(org["@context"]).toBe("https://schema.org");
		const contactPointRaw = org.contactPoint;
		const contactPoint = Array.isArray(contactPointRaw)
			? asRecord(contactPointRaw[0])
			: asRecord(contactPointRaw);
		expect(contactPoint.telephone).toBe("+1-214-843-0779");
	});

	it("getSoftwareApplicationJsonLd returns only the SoftwareApplication entity", () => {
		const software = toPlain(getSoftwareApplicationJsonLd());
		expect(software["@type"]).toBe("SoftwareApplication");
		expect(software["@context"]).toBe("https://schema.org");
		const offers = asRecord(software.offers);
		expect(offers["@type"]).toBe("AggregateOffer");
	});

	it("getJsonLd composes the two granular getters in [org, software] order", () => {
		const [org, software] = getJsonLd();
		expect(toPlain(org)["@type"]).toBe("Organization");
		expect(toPlain(software)["@type"]).toBe("SoftwareApplication");
	});
});
