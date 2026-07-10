import { describe, expect, it, vi } from "vitest";

/**
 * SEO-02 regression pin — /features Open Graph image wiring.
 *
 * Pins three contracts that together guarantee the /features OG image
 * survives future edits:
 *   1. `createPageMetadata` receives `ogImage: "/api/og/features"`.
 *   2. The `/api/og/features` route exports `runtime = "edge"` (required
 *      by `@vercel/og`) and `revalidate = 3600` (kept in lockstep with
 *      the sibling `/api/og/pricing` route as documentation of the
 *      intended cache horizon — actual caching is driven by the
 *      `Cache-Control` header `@vercel/og` sets on `ImageResponse`).
 *   3. The route uses the canonical 1200x630 OG dimensions.
 *
 * No production code is modified by this test — it asserts shipped state.
 */

vi.mock("#env", () => ({
	env: {
		NEXT_PUBLIC_APP_URL: "https://tenantflow.app",
		VERCEL_URL: undefined,
	},
}));

vi.mock("#lib/generate-metadata", () => ({
	getSiteUrl: () => "https://tenantflow.app",
}));

vi.mock("#lib/seo/breadcrumbs", () => ({
	createBreadcrumbJsonLd: () => ({ "@type": "BreadcrumbList" }),
}));

vi.mock("#components/seo/json-ld-script", () => ({
	JsonLdScript: () => null,
}));

vi.mock("#components/marketing/sticky-conversion-cta", () => ({
	StickyConversionCta: () => null,
}));

vi.mock("../features-client", () => ({
	default: () => null,
}));

// Spy on createPageMetadata so we can assert the ogImage arg the page passes
// (the helper itself is unit-tested elsewhere — this isolates the wiring).
// `vi.hoisted()` keeps the spy initialised before the `vi.mock` factory runs
// (CLAUDE.md testing rules: any mock variable referenced in `vi.mock()` must
// live inside `vi.hoisted()`).
const { createPageMetadataSpy } = vi.hoisted(() => ({
	createPageMetadataSpy: vi.fn(
		(cfg: {
			title: string;
			description: string;
			path: string;
			ogImage?: string;
		}) => ({
			title: cfg.title,
			description: cfg.description,
			__captured: cfg,
		}),
	),
}));

vi.mock("#lib/seo/page-metadata", () => ({
	createPageMetadata: createPageMetadataSpy,
}));

describe("features/page.tsx — SEO-02 OG image wiring", () => {
	it('passes ogImage: "/api/og/features" to createPageMetadata', async () => {
		// Importing the module triggers the top-level createPageMetadata call.
		await import("../page");

		expect(createPageMetadataSpy).toHaveBeenCalled();
		const cfg = createPageMetadataSpy.mock.calls[0]![0];
		expect(cfg.ogImage).toBe("/api/og/features");
		expect(cfg.path).toBe("/features");
	});
});

describe("/api/og/features/route.tsx — SEO-02 OG route contract", () => {
	it('exports runtime = "edge" and revalidate = 3600', async () => {
		const mod = await import("../../api/og/features/route");
		expect(mod.runtime).toBe("edge");
		expect(mod.revalidate).toBe(3600);
	});

	it("declares a 1200x630 OG image (read from source)", async () => {
		const { readFileSync } = await import("node:fs");
		const { resolve } = await import("node:path");
		const source = readFileSync(
			resolve(__dirname, "../../api/og/features/route.tsx"),
			"utf8",
		);
		expect(source).toMatch(/width:\s*1200/);
		expect(source).toMatch(/height:\s*630/);
	});

	it("uses only hsl() color literals — no oklch (satori renders it black), no hex", async () => {
		const { readFileSync } = await import("node:fs");
		const { resolve } = await import("node:path");
		const source = readFileSync(
			resolve(__dirname, "../../api/og/features/route.tsx"),
			"utf8",
		);
		// MKT-01: satori does not support oklch (renders it as solid black), so the
		// OG route must use hsl() literals only.
		expect(source).toMatch(/hsl\(/);
		// no oklch in a style string (comments may mention it) + no hex colors
		expect(source).not.toMatch(/["'`][^"'`]*oklch\(/);
		expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
	});
});
