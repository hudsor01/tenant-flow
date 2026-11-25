/**
 * Blog listing page URLs (2026-11-24 SEO audit BL1, CT-1): page 1 is the bare
 * path, page N is `<path>/page/N`, and the old `?page=N` links redirect.
 */

import { describe, expect, it } from "vitest";
import {
	blogPageHref,
	LISTING_REDIRECTS,
	parseListingPage,
} from "#lib/blog/blog-page-urls";

describe("blogPageHref", () => {
	it.each([
		["/blog", 1, "/blog"],
		["/blog", 2, "/blog/page/2"],
		["/blog/category/tax-prep", 0, "/blog/category/tax-prep"],
		["/blog/category/tax-prep", 4, "/blog/category/tax-prep/page/4"],
	])("%s page %i is %s", (base, page, href) => {
		expect(blogPageHref(base, page)).toBe(href);
	});
});

describe("parseListingPage", () => {
	it.each([
		["2", 2],
		["37", 37],
		["999999", 999999],
	])("reads %s as %i", (raw, page) => {
		expect(parseListingPage(raw)).toBe(page);
	});

	it.each(["1", "0", "02", "2.0", "+2", "-1", "x", "", "1e3", "9999999"])(
		"rejects %j: page 1 is the bare listing, and one page has one URL",
		(raw) => {
			expect(parseListingPage(raw)).toBeNull();
		},
	);
});

describe("LISTING_REDIRECTS", () => {
	const [hubPageOne, categoryPageOne, hub, category] = LISTING_REDIRECTS;

	it("sends /page/1 to the bare listing from config, never a render", () => {
		// A permanentRedirect from the on-demand page answered a cache miss with
		// the Location header twice.
		expect(hubPageOne).toEqual({
			source: "/blog/page/1",
			destination: "/blog",
			permanent: true,
		});
		expect(categoryPageOne).toEqual({
			source: "/blog/category/:category/page/1",
			destination: "/blog/category/:category",
			permanent: true,
		});
	});

	/** Next anchors a `has` value and reads its named groups. */
	const match = (value: string) =>
		new RegExp(`^${hub?.has?.[0]?.value}$`).exec(value)?.groups?.n ?? null;

	it("sends ?page=N, from 2 up, to the page's path for good", () => {
		expect(hub).toMatchObject({
			source: "/blog",
			destination: "/blog/page/:n",
			permanent: true,
		});
		expect(category).toMatchObject({
			source: "/blog/category/:category",
			destination: "/blog/category/:category/page/:n",
			permanent: true,
		});
		expect(category?.has).toEqual(hub?.has);
		expect(match("2")).toBe("2");
		expect(match("12")).toBe("12");
	});

	it.each(["1", "0", "02", "x", "2.5", "1234567"])(
		"leaves ?page=%s alone: Next keeps the query, so a redirect would loop",
		(value) => {
			expect(match(value)).toBeNull();
		},
	);
});
