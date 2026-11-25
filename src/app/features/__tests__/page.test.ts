import { describe, expect, it, vi } from "vitest";

/**
 * SEO-02 regression pin: /features names its share card. The card itself is
 * rendered and checked in `src/app/api/og/__tests__/og-cards.test.ts`.
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

// Spy on createPageMetadata so we can assert the card the page names
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
			ogCard?: string;
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
	it('passes ogCard: "features" to createPageMetadata', async () => {
		// Importing the module triggers the top-level createPageMetadata call.
		await import("../page");

		expect(createPageMetadataSpy).toHaveBeenCalled();
		const cfg = createPageMetadataSpy.mock.calls[0]![0];
		expect(cfg.ogCard).toBe("features");
		expect(cfg.path).toBe("/features");
	});
});
