/**
 * @vitest-environment node
 *
 * Every page's share card (2026-11-24 SEO audit S3, S4, H5 and the per-page
 * OG findings). The cards are rendered for real: each is a 1200x630 PNG whose
 * background is the brand blue, which is the property satori breaks when a
 * color it can't read (oklch) turns the card black. The blog covers share the
 * fonts and are checked the same way.
 */

import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("#lib/generate-metadata", () => ({
	getSiteUrl: () => "https://tenantflow.app",
}));

import { COMPETITORS } from "#app/compare/[competitor]/compare-data";
import { CATEGORY_LABELS } from "#lib/seo/blog-categories";
import {
	blogCategoryCard,
	blogCategoryOgImage,
	compareCard,
	OG_CARD_KEYS,
	OG_CARDS,
	ogCardAlt,
} from "#lib/seo/og-cards";
import { createPageMetadata } from "#lib/seo/page-metadata";
import { blogCoverResponse } from "../_shared/blog-cover";
import { readOgFonts } from "../_shared/og-fonts";
import * as pageRoute from "../[page]/route";
import { GET as blogGet } from "../blog/[slug]/route";
import * as categoryRoute from "../blog/category/[category]/route";
import { GET as compareGet } from "../compare/[competitor]/route";

function params<T>(value: T): { params: Promise<T> } {
	return { params: Promise.resolve(value) };
}

/** Width, height and the RGB of a pixel near the top-left corner. */
async function inspect(res: Response) {
	const png = Buffer.from(await res.arrayBuffer());
	const { data, info } = await sharp(png)
		.raw()
		.toBuffer({ resolveWithObject: true });
	const offset = (20 * info.width + 20) * info.channels;
	return {
		width: info.width,
		height: info.height,
		rgb: [data[offset], data[offset + 1], data[offset + 2]],
	};
}

function expectBrandBlue([r = 0, g = 0, b = 0]: (number | undefined)[]) {
	expect(b).toBeGreaterThan(180);
	expect(b).toBeGreaterThan(r + 60);
	expect(g).toBeLessThan(b);
}

describe("the /api/og/[page] cards", () => {
	it("prerenders one card per catalog key and 404s any other", () => {
		expect(pageRoute.dynamic).toBe("force-static");
		expect(pageRoute.dynamicParams).toBe(false);
		expect(pageRoute.generateStaticParams()).toEqual(
			OG_CARD_KEYS.map((page) => ({ page })),
		);
	});

	it.each(OG_CARD_KEYS)(
		"renders %s as a 1200x630 brand-blue PNG",
		async (key) => {
			const res = await pageRoute.GET(
				new Request("https://x"),
				params({ page: key }),
			);
			expect(res.status).toBe(200);
			expect(res.headers.get("content-type")).toBe("image/png");
			const image = await inspect(res);
			expect([image.width, image.height]).toEqual([1200, 630]);
			expectBrandBlue(image.rgb);
		},
	);

	it.each(["unknown", "toString", "__proto__"])("404s %s", async (page) => {
		const res = await pageRoute.GET(new Request("https://x"), params({ page }));
		expect(res.status).toBe(404);
	});
});

describe("the blog category cards (CT-4)", () => {
	it("prerenders one card per known category", () => {
		expect(categoryRoute.dynamicParams).toBe(false);
		expect(categoryRoute.generateStaticParams()).toEqual(
			Object.keys(CATEGORY_LABELS).map((category) => ({ category })),
		);
	});

	it("renders a known category and 404s any other", async () => {
		const ok = await categoryRoute.GET(
			new Request("https://x"),
			params({ category: "maintenance" }),
		);
		expect(ok.status).toBe(200);
		expectBrandBlue((await inspect(ok)).rgb);
		const missing = await categoryRoute.GET(
			new Request("https://x"),
			params({ category: "constructor" }),
		);
		expect(missing.status).toBe(404);
	});

	it("points a category page at its own card, and an unlisted one at the blog card", () => {
		expect(blogCategoryOgImage("maintenance")).toEqual({
			path: "/api/og/blog/category/maintenance",
			alt: ogCardAlt(blogCategoryCard("Maintenance")),
		});
		expect(blogCategoryOgImage("not-listed")).toEqual({
			path: "/api/og/blog-index",
			alt: ogCardAlt(OG_CARDS["blog-index"]),
		});
	});
});

describe("the compare cards", () => {
	it("renders every competitor in the shared layout", async () => {
		for (const competitor of Object.keys(COMPETITORS)) {
			const res = await compareGet(
				new Request("https://x"),
				params({ competitor }),
			);
			expect(res.status).toBe(200);
			expectBrandBlue((await inspect(res)).rgb);
		}
	});

	it("names every competitor on the comparisons card", () => {
		for (const { name } of Object.values(COMPETITORS)) {
			expect(OG_CARDS["compare-overview"].headline).toContain(name);
		}
		expect(compareCard("Buildium").headline).toBe("TenantFlow vs Buildium");
	});
});

describe("card text", () => {
	// The layout fits a headline on two lines and a subline on one; longer text
	// wraps into the next block.
	it.each(OG_CARD_KEYS)("%s fits the layout", (key) => {
		const card = OG_CARDS[key];
		expect(card.eyebrow.length).toBeLessThanOrEqual(32);
		expect(card.headline.length).toBeLessThanOrEqual(56);
		expect(card.subline.length).toBeLessThanOrEqual(62);
	});

	it("fits the layout for every category card", () => {
		for (const label of Object.values(CATEGORY_LABELS)) {
			expect(blogCategoryCard(label).headline.length).toBeLessThanOrEqual(56);
		}
	});
});

describe("createPageMetadata share images (S4, H5)", () => {
	const base = { title: "FAQ", description: "Answers", path: "/faq" };

	it("gives a page with no card the site card, described rather than titled", () => {
		const og = createPageMetadata(base).openGraph as {
			images: { url: string; alt: string }[];
		};
		expect(og.images[0]).toMatchObject({
			url: "https://tenantflow.app/api/og/site",
			width: 1200,
			height: 630,
			alt: ogCardAlt(OG_CARDS.site),
		});
		expect(og.images[0]?.alt).not.toContain("FAQ");
	});

	it("uses the named card for og:image and twitter:image", () => {
		const meta = createPageMetadata({ ...base, ogCard: "faq" });
		const og = meta.openGraph as { images: { url: string; alt: string }[] };
		const twitter = meta.twitter as { images: { url: string; alt: string }[] };
		const expected = {
			url: "https://tenantflow.app/api/og/faq",
			alt: ogCardAlt(OG_CARDS.faq),
		};
		expect(og.images[0]).toMatchObject(expected);
		expect(twitter.images[0]).toEqual(expected);
	});

	it("takes an image outside the catalog with its own alt", () => {
		const og = createPageMetadata({
			...base,
			ogImage: { path: "/api/og/blog/category/tax-prep", alt: "A card" },
		}).openGraph as { images: { url: string; alt: string }[] };
		expect(og.images[0]).toMatchObject({
			url: "https://tenantflow.app/api/og/blog/category/tax-prep",
			alt: "A card",
		});
	});
});

describe("the OG fonts", () => {
	// satori measures a word one character at a time, unkerned, then draws it
	// kerned, so a font with GPOS kerning leaves a gap after words like
	// "TenantFlow". The fonts load with that table hidden.
	it("load Geist Medium and Bold with no GPOS table", async () => {
		const fonts = await readOgFonts();
		expect(fonts.map((font) => font.weight)).toEqual([500, 700]);
		for (const { data } of fonts) {
			const tags = Array.from({ length: data.readUInt16BE(4) }, (_, i) =>
				data.toString("latin1", 12 + i * 16, 16 + i * 16),
			);
			expect(tags).toContain("glyf");
			expect(tags).not.toContain("GPOS");
		}
	});
});

describe("the blog cover", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	it("renders a 1200x630 PNG in the category's palette", async () => {
		const amber = await inspect(
			await blogCoverResponse({
				title: "TenantFlow: Move-In Inspections",
				category: "maintenance",
				slug: "move-in",
			}),
		);
		expect([amber.width, amber.height]).toEqual([1200, 630]);
		const [r = 0, , b = 0] = amber.rgb;
		expect(r).toBeGreaterThan(b + 100);

		const unlisted = await inspect(
			await blogCoverResponse({ title: "A post", category: null, slug: "a" }),
		);
		expectBrandBlue(unlisted.rgb);
	});

	it("draws a published post and 404s a slug with no post", async () => {
		vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://db.example");
		vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "key");
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				Response.json([{ title: "A post", category: "lease-law" }]),
			)
			.mockResolvedValueOnce(Response.json([]));
		vi.stubGlobal("fetch", fetchMock);

		const found = await blogGet(
			new Request("https://x"),
			params({ slug: "a" }),
		);
		expect(found.status).toBe(200);
		expect(found.headers.get("content-type")).toBe("image/png");

		const missing = await blogGet(
			new Request("https://x"),
			params({ slug: "gone" }),
		);
		expect(missing.status).toBe(404);
		expect(String(fetchMock.mock.calls[1]?.[0])).toContain("slug=eq.gone");
	});
});
