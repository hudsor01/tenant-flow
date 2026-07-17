import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("#env", () => ({
	env: { NEXT_PUBLIC_APP_URL: "https://tenantflow.app" },
}));

vi.mock("#lib/frontend-logger", () => ({
	createLogger: () => ({
		info: vi.fn(),
		error: vi.fn(),
	}),
}));

// The sitemap now derives blog category hub URLs (and their freshness)
// from the same posts query used to build per-post URLs — the old
// separate `category`-only query is gone. Mock posts include the
// category field so the dedup logic and category-hub branch are
// exercised.
type MockBlogPost = {
	slug: string;
	published_at: string | null;
	updated_at: string | null;
	category: string;
};

// Production code only orders by `published_at` today. If a future
// sitemap change orders by another column, add it to this union and
// update the fixture; the typed key parameter then forces compile-time
// awareness of the new sort dimension.
type SortableColumn = "published_at" | "updated_at";

const mockBlogPosts: MockBlogPost[] = [
	{
		slug: "post-one",
		published_at: "2026-01-15T00:00:00Z",
		updated_at: "2026-01-20T00:00:00Z",
		category: "Property Management",
	},
	{
		slug: "post-two",
		published_at: "2026-02-20T00:00:00Z",
		updated_at: null,
		category: "Tenant Tips",
	},
	{
		slug: "post-three",
		published_at: "2026-02-10T00:00:00Z",
		updated_at: null,
		category: "Property Management", // duplicate to test dedup
	},
	{
		slug: "post-four",
		published_at: "2026-01-05T00:00:00Z",
		updated_at: null,
		category: "Legal",
	},
];

/**
 * Build a Supabase query-builder mock that honors `.order(column, opts)`.
 *
 * Production code calls `.order('published_at', { ascending: false })`,
 * so the mock has to actually sort the data — otherwise tests pass even
 * when the implementation degrades to "use posts[0] verbatim". Sorting
 * the fixture inside the mock means the test asserts the same shape
 * production would emit, not the array order in the test file.
 */
function makeQueryBuilder() {
	let working: MockBlogPost[] = [...mockBlogPosts];
	const result = () => ({ data: working, error: null });
	const builder: {
		select: (...args: unknown[]) => typeof builder;
		eq: (...args: unknown[]) => typeof builder;
		order: (
			column: SortableColumn,
			opts?: { ascending?: boolean },
		) => typeof builder;
		then: (
			resolve: (v: ReturnType<typeof result>) => unknown,
			reject?: (e: unknown) => unknown,
		) => Promise<unknown>;
	} = {
		select: vi.fn().mockImplementation(() => builder),
		eq: vi.fn().mockImplementation(() => builder),
		order: vi
			.fn()
			.mockImplementation(
				(column: SortableColumn, opts?: { ascending?: boolean }) => {
					const ascending = opts?.ascending ?? true;
					working = [...working].sort((a, b) => {
						const av = a[column] ?? "";
						const bv = b[column] ?? "";
						if (av === bv) return 0;
						if (ascending) return av < bv ? -1 : 1;
						return av < bv ? 1 : -1;
					});
					return builder;
				},
			),
		then: (
			resolve: (v: ReturnType<typeof result>) => unknown,
			reject?: (e: unknown) => unknown,
		) => Promise.resolve(result()).then(resolve, reject),
	};
	return builder;
}

vi.mock("#lib/supabase/server", () => ({
	createClient: vi.fn().mockResolvedValue({
		from: vi.fn().mockImplementation(() => makeQueryBuilder()),
	}),
}));

// sitemap.ts uses blogAnonClient() from #lib/blog/blog-queries, not the server client.
// Mock it to return the same query builder so blog queries work in tests.
vi.mock("#lib/blog/blog-queries", () => ({
	blogAnonClient: vi.fn().mockReturnValue({
		from: vi.fn().mockImplementation(() => makeQueryBuilder()),
	}),
}));

describe("sitemap()", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it("Test 1: includes /support URL in entries", async () => {
		const { default: sitemap } = await import("./sitemap");
		const entries = await sitemap();
		const urls = entries.map((e) => e.url);
		expect(urls).toContain("https://tenantflow.app/support");
	});

	it("Test 2: includes /security-policy URL in entries", async () => {
		const { default: sitemap } = await import("./sitemap");
		const entries = await sitemap();
		const urls = entries.map((e) => e.url);
		expect(urls).toContain("https://tenantflow.app/security-policy");
	});

	it("Test 3: includes blog category entries matching /blog/category/ pattern", async () => {
		const { default: sitemap } = await import("./sitemap");
		const entries = await sitemap();
		const categoryUrls = entries.filter((e) =>
			e.url.includes("/blog/category/"),
		);
		expect(categoryUrls.length).toBeGreaterThan(0);
		for (const entry of categoryUrls) {
			expect(entry.url).toMatch(/\/blog\/category\//);
		}
	});

	it("Test 4: static landing pages share STATIC_PAGES_LAST_UPDATED lastmod", async () => {
		// Battle-test Session 5 (P3) flagged 16/19 sitemap URLs missing
		// lastmod — sparse coverage looked unintentional. The marketing/
		// company/compare/resource pages now share a manually-maintained
		// `STATIC_PAGES_LAST_UPDATED` constant. Bumped together with each
		// copy-refresh wave to stay verifiable.
		const { default: sitemap } = await import("./sitemap");
		const entries = await sitemap();

		const sharedLastmodUrls = [
			"https://tenantflow.app",
			"https://tenantflow.app/features",
			"https://tenantflow.app/pricing",
			"https://tenantflow.app/about",
			"https://tenantflow.app/contact",
			"https://tenantflow.app/faq",
			"https://tenantflow.app/help",
			"https://tenantflow.app/support",
			// SEO-13: the /compare hub must be listed (not just its children).
			"https://tenantflow.app/compare",
			"https://tenantflow.app/compare/buildium",
			"https://tenantflow.app/compare/appfolio",
			"https://tenantflow.app/compare/rentredi",
			"https://tenantflow.app/resources/seasonal-maintenance-checklist",
			"https://tenantflow.app/resources/landlord-tax-deduction-tracker",
			"https://tenantflow.app/resources/security-deposit-reference-card",
		];

		const firstLastmod = entries.find(
			(e) => e.url === "https://tenantflow.app",
		)?.lastModified;
		expect(firstLastmod, "homepage lastmod must be set").toBeDefined();
		expect(String(firstLastmod)).toMatch(/^\d{4}-\d{2}-\d{2}$/);

		for (const url of sharedLastmodUrls) {
			const entry = entries.find((e) => e.url === url);
			expect(entry, `entry for ${url} should exist`).toBeDefined();
			expect(
				entry!.lastModified,
				`${url} should share the static lastmod`,
			).toBe(firstLastmod);
		}
	});

	it('Test 4b: legal pages use real "Last Updated" dates from page bodies', async () => {
		const { default: sitemap } = await import("./sitemap");
		const entries = await sitemap();

		const terms = entries.find((e) => e.url === "https://tenantflow.app/terms");
		expect(terms?.lastModified).toBe("2026-05-11");

		const privacy = entries.find(
			(e) => e.url === "https://tenantflow.app/privacy",
		);
		expect(privacy?.lastModified).toBe("2026-07-15");

		const securityPolicy = entries.find(
			(e) => e.url === "https://tenantflow.app/security-policy",
		);
		expect(securityPolicy?.lastModified).toBe("2026-05-11");
	});

	it("Test 5: blog post entries prefer updated_at then published_at", async () => {
		const { default: sitemap } = await import("./sitemap");
		const entries = await sitemap();

		const postOne = entries.find(
			(e) => e.url === "https://tenantflow.app/blog/post-one",
		);
		expect(postOne, "post-one should be in sitemap").toBeDefined();
		// post-one has updated_at; that wins over published_at
		expect(postOne!.lastModified).toBe("2026-01-20T00:00:00Z");

		const postTwo = entries.find(
			(e) => e.url === "https://tenantflow.app/blog/post-two",
		);
		expect(postTwo, "post-two should be in sitemap").toBeDefined();
		// post-two has no updated_at; fall back to published_at
		expect(postTwo!.lastModified).toBe("2026-02-20T00:00:00Z");
	});

	it("Test 6: compare pages for buildium, appfolio, rentredi are present", async () => {
		const { default: sitemap } = await import("./sitemap");
		const entries = await sitemap();
		const urls = entries.map((e) => e.url);
		expect(urls).toContain("https://tenantflow.app/compare/buildium");
		expect(urls).toContain("https://tenantflow.app/compare/appfolio");
		expect(urls).toContain("https://tenantflow.app/compare/rentredi");
	});

	it("Test 7: resource pages are present", async () => {
		const { default: sitemap } = await import("./sitemap");
		const entries = await sitemap();
		const urls = entries.map((e) => e.url);
		expect(urls).toContain(
			"https://tenantflow.app/resources/seasonal-maintenance-checklist",
		);
		expect(urls).toContain(
			"https://tenantflow.app/resources/landlord-tax-deduction-tracker",
		);
		expect(urls).toContain(
			"https://tenantflow.app/resources/security-deposit-reference-card",
		);
	});

	it("deduplicates blog categories and uses the most recent post timestamp", async () => {
		const { default: sitemap } = await import("./sitemap");
		const entries = await sitemap();
		const categoryUrls = entries.filter((e) =>
			e.url.includes("/blog/category/"),
		);
		// Property Management appears twice in posts but only one hub URL.
		const pmUrls = categoryUrls.filter((e) =>
			e.url.includes("property-management"),
		);
		expect(pmUrls).toHaveLength(1);
		// Three unique categories: property-management, tenant-tips, legal.
		expect(categoryUrls).toHaveLength(3);
		// The Property Management hub uses the most recent post in that
		// category (post-one's updated_at, 2026-01-20, beats post-three's
		// 2026-02-10? No — 2026-02-10 > 2026-01-20. The freshest is
		// post-three's published_at).
		const pmEntry = pmUrls[0];
		expect(pmEntry?.lastModified).toBe("2026-02-10T00:00:00Z");
	});

	it("content hub /blog uses the most recent post timestamp", async () => {
		const { default: sitemap } = await import("./sitemap");
		const entries = await sitemap();
		const blogHub = entries.find(
			(e) => e.url === "https://tenantflow.app/blog",
		);
		expect(blogHub).toBeDefined();
		// Production query is `.order('published_at', desc)` — the
		// mock now honors that order. The freshest post is post-two
		// (published_at 2026-02-20, no updated_at), so its
		// published_at is what the hub gets.
		expect(blogHub!.lastModified).toBe("2026-02-20T00:00:00Z");
	});
});

/**
 * Drift guard: the sitemap's hardcoded "Last Updated" date constants
 * must match the visible date in each legal page body. The comment in
 * sitemap.ts says "update both this constant and the page when the
 * document actually changes" — that's a manual discipline rule. This
 * test catches the case where one is updated and the other isn't.
 *
 * Reads the .tsx files as raw text and greps for "Last Updated: <Month
 * Day, Year>" (the format used in the page bodies). Asserts the
 * resulting ISO date matches the constant the sitemap emits.
 */
describe("sitemap legal-page lastmod drift guard", () => {
	const repoRoot = resolve(__dirname, "..", "..");

	function readVisibleDate(relPath: string): string {
		const source = readFileSync(resolve(repoRoot, relPath), "utf8");
		// Match "Last Updated: October 5, 2025" (longform month name) on
		// any line of the source. Use a non-greedy match for the date
		// itself so trailing JSX or HTML doesn't leak in.
		const match = source.match(
			/Last Updated:?\s*(?<date>[A-Z][a-z]+ \d{1,2}, \d{4})/,
		);
		const dateStr = match?.groups?.date;
		if (!dateStr) {
			throw new Error(
				`Couldn't find "Last Updated:" line in ${relPath}. ` +
					`Either the page format changed or the constant lookup needs updating.`,
			);
		}
		// Convert "October 5, 2025" → "2025-10-05" via Date roundtrip,
		// then format with YYYY-MM-DD slice.
		const d = new Date(dateStr);
		if (Number.isNaN(d.getTime())) {
			throw new Error(`Couldn't parse visible date "${dateStr}" in ${relPath}`);
		}
		// `toISOString()` is UTC; the date portion is what we want.
		return d.toISOString().slice(0, 10);
	}

	it("TERMS_LAST_UPDATED matches src/app/terms/page.tsx visible date", async () => {
		const { default: sitemap } = await import("./sitemap");
		const entries = await sitemap();
		const terms = entries.find((e) => e.url === "https://tenantflow.app/terms");
		const visible = readVisibleDate("src/app/terms/page.tsx");
		expect(terms?.lastModified).toBe(visible);
	});

	it("PRIVACY_LAST_UPDATED matches src/app/privacy/page.tsx visible date", async () => {
		const { default: sitemap } = await import("./sitemap");
		const entries = await sitemap();
		const privacy = entries.find(
			(e) => e.url === "https://tenantflow.app/privacy",
		);
		const visible = readVisibleDate("src/app/privacy/page.tsx");
		expect(privacy?.lastModified).toBe(visible);
	});

	it("SECURITY_POLICY_LAST_UPDATED matches src/app/security-policy/page.tsx visible date", async () => {
		const { default: sitemap } = await import("./sitemap");
		const entries = await sitemap();
		const securityPolicy = entries.find(
			(e) => e.url === "https://tenantflow.app/security-policy",
		);
		const visible = readVisibleDate("src/app/security-policy/page.tsx");
		expect(securityPolicy?.lastModified).toBe(visible);
	});
});

/**
 * DB-failure test — isolated describe so the override mock can't leak
 * into the main suite. `sitemap.ts` deliberately RE-THROWS when the blog
 * query fails (see the catch block in sitemap.ts) so ISR serves the
 * last-good cached sitemap (stale-if-error) instead of baking a
 * blog-less sitemap for 24h. Mock `#lib/blog/blog-queries` — the actual
 * module `sitemap.ts` calls via `blogAnonClient()` — not
 * `#lib/supabase/server`, which sitemap.ts never touches.
 */
describe("sitemap() — DB-failure fallback", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.doMock("#lib/blog/blog-queries", () => ({
			blogAnonClient: vi.fn().mockReturnValue({
				from: vi.fn().mockImplementation(() => {
					throw new Error("Simulated DB outage");
				}),
			}),
		}));
	});

	afterEach(() => {
		// Defense-in-depth: this describe is currently the last in the
		// file, but unmocking here keeps the "isolated" claim literally
		// true if a future describe is appended below.
		vi.doUnmock("#lib/blog/blog-queries");
	});

	it("rethrows when the blog query fails, so ISR serves the last-good cached sitemap instead of a blog-less one", async () => {
		const { default: sitemap } = await import("./sitemap");
		await expect(sitemap()).rejects.toThrow("Simulated DB outage");
	});

	it("swallows the failure on the placeholder-env CI build and emits the static sitemap", async () => {
		// The CI `checks` build runs `next build` against the unresolvable
		// placeholder Supabase host; that build is never deployed, so the blog
		// query failure must NOT fail the build — the static pages still emit.
		vi.doMock("#env", () => ({
			env: {
				NEXT_PUBLIC_APP_URL: "https://tenantflow.app",
				NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co",
			},
		}));
		const { default: sitemap } = await import("./sitemap");
		const entries = await sitemap();
		expect(entries.some((e) => e.url === "https://tenantflow.app")).toBe(true);
		expect(entries.some((e) => e.url.includes("/blog/"))).toBe(false);
		vi.doUnmock("#env");
	});
});
