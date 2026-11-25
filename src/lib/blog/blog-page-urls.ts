/**
 * Blog listing page URLs (2026-11-24 SEO audit BL1, CT-1).
 *
 * Page 1 of a listing is its bare path (`/blog`, `/blog/category/lease-law`)
 * and page N is `<path>/page/N`. Pagination used to be `?page=N`, and reading
 * the query made `/blog` and every category page render on each request;
 * path segments let those pages render statically. Pure functions, no
 * imports: `next.config.ts` reads `LISTING_REDIRECTS`.
 */

/** The URL of page `page` of the listing whose first page is `basePath`. */
export function blogPageHref(basePath: string, page: number): string {
	return page <= 1 ? basePath : `${basePath}/page/${page}`;
}

/** A page number from 2 up, written canonically ("2", not "02" or "+2"). */
const PAGE_FROM_TWO = "[2-9]|[1-9]\\d{1,5}";

/**
 * A `/page/[page]` segment as a page number from 2 up, or `null`. Only
 * canonical integers count, so one page never has two URLs. `/page/1` never
 * reaches a page: `LISTING_REDIRECTS` sends it to the bare listing first.
 */
export function parseListingPage(raw: string): number | null {
	if (!new RegExp(`^(?:${PAGE_FROM_TWO})$`).test(raw)) return null;
	return Number(raw);
}

/**
 * A `?page=` value worth redirecting, captured as `n`. Next anchors it
 * (`^…$`). Page 1 and junk are left alone, because Next passes the query
 * through to the destination: `/blog?page=1` redirected to `/blog` would
 * arrive as `/blog?page=1` and loop. They serve page 1, whose canonical is the
 * bare path.
 */
const LEGACY_PAGE_VALUE = `(?<n>${PAGE_FROM_TWO})`;

/**
 * `next.config.ts` redirects for the listings, all 308s, declared rather than
 * coded so no request-derived redirect lives in code:
 * - `/page/1` goes to the bare listing, its one URL. A `permanentRedirect`
 *   from the on-demand page sent the Location header twice on a cache miss
 *   ("/blog, /blog"); a config redirect never renders.
 * - an old `?page=N` link goes to the page's path.
 */
export const LISTING_REDIRECTS = [
	{ source: "/blog/page/1", destination: "/blog", permanent: true },
	{
		source: "/blog/category/:category/page/1",
		destination: "/blog/category/:category",
		permanent: true,
	},
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
