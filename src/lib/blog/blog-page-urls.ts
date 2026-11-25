/**
 * Blog listing page URLs (2026-11-24 SEO audit BL1, CT-1).
 *
 * Page 1 of a listing is its bare path (`/blog`, `/blog/category/lease-law`)
 * and page N is `<path>/page/N`. Pagination used to be `?page=N`, and reading
 * the query made `/blog` and every category page render on each request;
 * path segments let those pages render statically. Pure functions, no
 * imports: `next.config.ts` reads the redirects for the old `?page=N` links.
 */

/** The URL of page `page` of the listing whose first page is `basePath`. */
export function blogPageHref(basePath: string, page: number): string {
	return page <= 1 ? basePath : `${basePath}/page/${page}`;
}

/**
 * A `/page/[page]` segment as a page number, or `null` when it isn't one.
 * Only canonical integers count ("2", not "02", "2.0" or "+2"), so one page
 * never has two URLs. `1` is returned for the caller to redirect to the
 * listing's bare path.
 */
export function parseListingPage(raw: string): number | null {
	if (!/^[1-9]\d{0,5}$/.test(raw)) return null;
	return Number(raw);
}

/**
 * A `?page=` value worth redirecting: a canonical page number from 2 up.
 * Next anchors it (`^…$`). Page 1 and junk are left alone, because Next
 * passes the query through to the destination: `/blog?page=1` redirected to
 * `/blog` would arrive as `/blog?page=1` and loop. They serve page 1, whose
 * canonical is the bare path.
 */
const LEGACY_PAGE_VALUE = "(?<n>[2-9]|[1-9]\\d{1,5})";

/**
 * `next.config.ts` redirects for the old `?page=N` listing links: 308 to the
 * page's path. Declarative, so no request-derived redirect lives in code.
 */
export const LEGACY_LISTING_REDIRECTS = [
	{
		source: "/blog",
		has: [{ type: "query" as const, key: "page", value: LEGACY_PAGE_VALUE }],
		destination: "/blog/page/:n",
		permanent: true,
	},
	{
		source: "/blog/category/:category",
		has: [{ type: "query" as const, key: "page", value: LEGACY_PAGE_VALUE }],
		destination: "/blog/category/:category/page/:n",
		permanent: true,
	},
];
