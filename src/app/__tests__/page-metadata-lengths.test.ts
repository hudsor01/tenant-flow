/**
 * Every indexed marketing page's `<title>` fits a search result and its
 * description is written to length (2026-11-24 SEO audit, Phase 4 exit
 * check): a title of at most 60 characters once the " | TenantFlow" template
 * applies, and a description of 120 to 155. Google cuts longer ones off, and
 * shorter descriptions get replaced with page text.
 *
 * The pages' real `metadata` exports are read, so a text change anywhere is
 * measured as rendered.
 */

import type { Metadata } from "next";
import { describe, expect, it, vi } from "vitest";

vi.mock("#lib/generate-metadata", async (importOriginal) => ({
	...(await importOriginal<typeof import("#lib/generate-metadata")>()),
	getSiteUrl: () => "https://tenantflow.app",
}));

// The blog hub's metadata counts posts first; with reads unavailable it skips
// the count and returns the same text.
vi.mock("#lib/blog/blog-queries", async (importOriginal) => ({
	...(await importOriginal<typeof import("#lib/blog/blog-queries")>()),
	blogReadsUnavailable: () => true,
}));

/** The `<title>` Next renders: a plain string goes through the root template. */
function renderedTitle(metadata: Metadata): string {
	const { title } = metadata;
	if (typeof title === "string") return `${title} | TenantFlow`;
	if (title && typeof title === "object" && "absolute" in title) {
		return title.absolute;
	}
	throw new Error("page metadata has no title");
}

const STATIC_PAGES: [string, () => Promise<{ metadata: Metadata }>][] = [
	["/", () => import("../page")],
	["/features", () => import("../features/page")],
	["/pricing", () => import("../pricing/page")],
	["/compare", () => import("../compare/page")],
	["/resources", () => import("../resources/page")],
	[
		"/resources/seasonal-maintenance-checklist",
		() => import("../resources/seasonal-maintenance-checklist/page"),
	],
	[
		"/resources/landlord-tax-deduction-tracker",
		() => import("../resources/landlord-tax-deduction-tracker/page"),
	],
	[
		"/resources/security-deposit-reference-card",
		() => import("../resources/security-deposit-reference-card/page"),
	],
	["/about", () => import("../about/page")],
	["/contact", () => import("../contact/page")],
	["/faq", () => import("../faq/page")],
	["/help", () => import("../help/page")],
	["/terms", () => import("../terms/page")],
	["/privacy", () => import("../privacy/page")],
	["/security-policy", () => import("../security-policy/page")],
];

function expectFits(metadata: Metadata) {
	expect(renderedTitle(metadata).length).toBeLessThanOrEqual(60);
	const description = metadata.description ?? "";
	expect(description.length).toBeGreaterThanOrEqual(120);
	expect(description.length).toBeLessThanOrEqual(155);
}

describe("marketing page titles and descriptions fit a search result", () => {
	it.each(STATIC_PAGES)("%s", async (_path, load) => {
		expectFits((await load()).metadata);
	});

	it.each(["buildium", "appfolio", "rentredi"])(
		"/compare/%s",
		async (competitor) => {
			const { generateMetadata } = await import("../compare/[competitor]/page");
			const metadata = await generateMetadata({
				params: Promise.resolve({ competitor }),
			});
			expectFits(metadata);
		},
	);

	it("/blog", async () => {
		const { blogIndexMetadata } = await import("../blog/blog-index");
		expectFits(await blogIndexMetadata(1));
	});
});
