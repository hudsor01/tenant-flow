import { describe, expect, it, vi } from "vitest";

vi.mock("#env", () => ({
	env: {
		NEXT_PUBLIC_APP_URL: "https://tenantflow.app",
		VERCEL_URL: undefined,
	},
}));

vi.mock("#lib/generate-metadata", () => ({
	getSiteUrl: () => "https://tenantflow.app",
}));

import { createPageMetadata } from "../page-metadata";

describe("createPageMetadata", () => {
	it("returns Metadata with correct title", () => {
		const result = createPageMetadata({
			title: "FAQ",
			description: "Frequently asked questions",
			path: "/faq",
		});

		expect(result.title).toBe("FAQ");
	});

	it("canonical URL is getSiteUrl() + path", () => {
		const result = createPageMetadata({
			title: "FAQ",
			description: "Frequently asked questions",
			path: "/faq",
		});

		expect(result.alternates?.canonical).toBe("https://tenantflow.app/faq");
	});

	it("OG title is brand-suffixed; description matches input", () => {
		// openGraph.title doesn't inherit `title.template`, so we brand-suffix
		// it in createPageMetadata to match the rendered doc title across all
		// routes. AUDIT-1 (2026-05-18) caught the prior bare og:title on the
		// homepage; the fix applies uniformly to every page.
		const result = createPageMetadata({
			title: "FAQ",
			description: "Frequently asked questions",
			path: "/faq",
		});

		const og = result.openGraph as Record<string, unknown>;
		expect(og.title).toBe("FAQ | TenantFlow");
		expect(og.description).toBe("Frequently asked questions");
	});

	it("absoluteTitle emits title.absolute with brand suffix (root segment)", () => {
		// Root segment (`src/app/page.tsx`) sits at the same depth as the root
		// layout, so `title.template` is NOT applied. Pages on the root
		// segment opt into `absoluteTitle: true` to get the brand suffix
		// rendered into <title>.
		const result = createPageMetadata({
			title: "Property Management Software for Independent Landlords",
			description: "desc",
			path: "/",
			absoluteTitle: true,
		});

		expect(result.title).toEqual({
			absolute:
				"Property Management Software for Independent Landlords | TenantFlow",
		});
		const og = result.openGraph as Record<string, unknown>;
		expect(og.title).toBe(
			"Property Management Software for Independent Landlords | TenantFlow",
		);
	});

	it("OG url matches canonical", () => {
		const result = createPageMetadata({
			title: "FAQ",
			description: "desc",
			path: "/faq",
		});

		const og = result.openGraph as Record<string, unknown>;
		expect(og.url).toBe("https://tenantflow.app/faq");
	});

	it("Twitter card is summary_large_image", () => {
		const result = createPageMetadata({
			title: "FAQ",
			description: "desc",
			path: "/faq",
		});

		const twitter = result.twitter as Record<string, unknown>;
		expect(twitter.card).toBe("summary_large_image");
	});

	it("noindex option sets robots to noindex, follow", () => {
		const result = createPageMetadata({
			title: "Private",
			description: "desc",
			path: "/private",
			noindex: true,
		});

		expect(result.robots).toBe("noindex, follow");
	});

	it("default OG image URL contains property-management-og.jpg", () => {
		const result = createPageMetadata({
			title: "FAQ",
			description: "desc",
			path: "/faq",
		});

		const og = result.openGraph as { images?: Array<{ url: string }> };
		const firstImage = og.images?.[0];
		expect(firstImage?.url).toContain("/images/property-management-og.jpg");
	});

	it("normalizes path missing leading slash", () => {
		const result = createPageMetadata({
			title: "FAQ",
			description: "desc",
			path: "faq",
		});

		expect(result.alternates?.canonical).toBe("https://tenantflow.app/faq");
		const og = result.openGraph as Record<string, unknown>;
		expect(og.url).toBe("https://tenantflow.app/faq");
	});

	it("titles already containing 'TenantFlow' are NOT brand-suffixed (no duplicate)", () => {
		// Defense-in-depth: if a future caller passes a title like
		// "Contact TenantFlow Support", appending " | TenantFlow" would
		// produce "Contact TenantFlow Support | TenantFlow" with a duplicate
		// brand token. The helper detects the embedded brand and skips the
		// suffix on og/twitter/image alt. Caught by AUDIT-1 cycle-2 review
		// (2026-05-18).
		const result = createPageMetadata({
			title: "TenantFlow vs Buildium",
			description: "desc",
			path: "/compare/buildium",
		});

		const og = result.openGraph as Record<string, unknown>;
		expect(og.title).toBe("TenantFlow vs Buildium");
		const twitter = result.twitter as Record<string, unknown>;
		expect(twitter.title).toBe("TenantFlow vs Buildium");
		const ogImages = (result.openGraph as { images?: Array<{ alt: string }> })
			.images;
		expect(ogImages?.[0]?.alt).toBe("TenantFlow vs Buildium");
	});

	it("absoluteTitle + already-branded title: no duplicate brand in title.absolute", () => {
		// Edge interaction: a hypothetical root-segment page whose title
		// already contains "TenantFlow" should NOT double-brand. suffixed
		// resolves to the bare title; title.absolute carries the bare
		// title; doc title renders the bare brand mention without a
		// trailing " | TenantFlow". Not exercised by any current caller
		// but pinned so the guard interaction stays correct.
		const result = createPageMetadata({
			title: "TenantFlow vs Buildium",
			description: "desc",
			path: "/",
			absoluteTitle: true,
		});

		expect(result.title).toEqual({ absolute: "TenantFlow vs Buildium" });
		const og = result.openGraph as Record<string, unknown>;
		expect(og.title).toBe("TenantFlow vs Buildium");
	});

	it("custom ogImage overrides default", () => {
		const result = createPageMetadata({
			title: "FAQ",
			description: "desc",
			path: "/faq",
			ogImage: "https://tenantflow.app/images/custom.jpg",
		});

		const og = result.openGraph as { images?: Array<{ url: string }> };
		const firstImage = og.images?.[0];
		expect(firstImage?.url).toBe("https://tenantflow.app/images/custom.jpg");
	});
});
