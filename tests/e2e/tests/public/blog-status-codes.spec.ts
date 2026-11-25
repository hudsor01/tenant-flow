import { expect, test } from "@playwright/test";

// The HTTP status Google reads for each kind of blog URL (Search Console,
// 2026-11-23: 132 soft 404s). A soft 404 is a page that says "not found" with a
// 200, or a redirect to a page on another topic; both are pinned out here.
//
//  - /blog and /blog/category/<slug> must answer a real 404 for a page or
//    category that does not exist. A route-level loading.tsx used to stream
//    these with a 200 before notFound() ran. Page N lives at
//    <listing>/page/N since the listings went static (2026-11-24 SEO audit
//    BL1); an old ?page=N link 308s there first.
//  - A deleted post with no same-topic page answers 410 Gone, with the site's
//    404 page as its body (next.config.ts rewrites() and
//    src/app/api/blog-gone/route.ts).
//  - A deleted post with a same-topic page redirects there (308).
//
// maxRedirects: 0 inspects each response itself, not where it leads.

test.describe("Blog status codes (no soft 404s)", () => {
	test("/blog answers 200", async ({ page }) => {
		const response = await page.request.get("/blog", { maxRedirects: 0 });
		expect(response.status()).toBe(200);
	});

	test("/blog/page/99 (past the last page) answers 404", async ({ page }) => {
		const response = await page.request.get("/blog/page/99", {
			maxRedirects: 0,
		});
		expect(response.status()).toBe(404);
	});

	test("an old /blog?page=99 link redirects to /blog/page/99, which is a 404", async ({
		page,
	}) => {
		const response = await page.request.get("/blog?page=99", {
			maxRedirects: 0,
		});
		expect(response.status()).toBe(308);
		expect(response.headers().location).toMatch(/^\/blog\/page\/99(\?|$)/);
		const landed = await page.request.get("/blog?page=99");
		expect(landed.status()).toBe(404);
	});

	test("/blog/page/1 redirects to /blog, its one URL", async ({ page }) => {
		const response = await page.request.get("/blog/page/1", {
			maxRedirects: 0,
		});
		expect(response.status()).toBe(308);
		expect(response.headers().location).toBe("/blog");
	});

	test("an unknown blog category answers 404", async ({ page }) => {
		const response = await page.request.get("/blog/category/no-such-category", {
			maxRedirects: 0,
		});
		expect(response.status()).toBe(404);
	});

	test("a deleted post with no same-topic page answers 410 with the 404 page", async ({
		page,
	}) => {
		const response = await page.request.get(
			"/blog/ac-condensate-line-clog-prevention-rentals",
			{ maxRedirects: 0 },
		);
		expect(response.status()).toBe(410);
		expect(response.headers()["content-type"]).toContain("text/html");
		expect(await response.text()).toContain("</html>");
	});

	test("an error-<timestamp> post answers 410", async ({ page }) => {
		const response = await page.request.get("/blog/error-1773361842137", {
			maxRedirects: 0,
		});
		expect(response.status()).toBe(410);
	});

	test("a deleted state deposit-law post redirects to the deposit reference card", async ({
		page,
	}) => {
		const response = await page.request.get(
			"/blog/alabama-security-deposit-law-one-month-cap-60-day-return",
			{ maxRedirects: 0 },
		);
		expect([301, 308]).toContain(response.status());
		expect(response.headers().location).toBe(
			"/resources/security-deposit-reference-card",
		);
	});
});
