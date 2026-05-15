import type { MetadataRoute } from "next";
import { env } from "#env";
import { createLogger } from "#lib/frontend-logger";
import { createClient } from "#lib/supabase/server";

// Cache sitemap for 24h via ISR — crawlers never hit a live DB call.
export const revalidate = 86400;

const logger = createLogger({ component: "Sitemap" });

// Real "Last Updated" dates pulled from the visible page bodies. Keeping
// these in sync with the sitemap matters: a `lastmod` that disagrees with
// what a crawler sees in the rendered page is the textbook signal Google
// uses to decide a sitemap is unreliable. Update both this constant and
// the page when the document actually changes.
//
// Source: src/app/{terms,privacy,security-policy}/page.tsx visible
// "Last Updated" line.
const TERMS_LAST_UPDATED = "2026-05-11";
const PRIVACY_LAST_UPDATED = "2026-05-11";
const SECURITY_POLICY_LAST_UPDATED = "2026-05-11";

// `changeFrequency` is no longer consulted by Google as of 2023, and the
// `lastmod` field is the only freshness signal that still affects crawl
// scheduling. We omit `changeFrequency` from every entry below — emitting
// it would be ~30% more bytes for zero crawler effect.
//
// Per https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
// (last updated 2025-12-10): "Google uses the `<lastmod>` value if it's
// consistently and verifiably (for example by comparing to the last
// modification of the page) accurate."
//
// Rule of thumb in this file: only emit `lastModified` when we can point
// to a real timestamp on the underlying entity (database row, document
// constant). For a static marketing page that hasn't materially changed
// since launch, we omit `lastModified` rather than fake it — Google
// handles missing lastmod gracefully (it falls back to its own
// last-crawled timestamp). Faking "now" on every revalidation teaches
// Google to ignore the entire sitemap's freshness signal.

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const baseUrl = env.NEXT_PUBLIC_APP_URL || "https://tenantflow.app";

	// High-priority marketing pages. No `lastModified` — content is
	// hand-edited and the file's mtime would not reflect copy edits made
	// in the same commit as a code-only change. The hub pages below DO
	// derive lastmod from the most recent post; static landing pages
	// don't have an equivalent signal.
	const marketingPages: MetadataRoute.Sitemap = [
		{ url: baseUrl, priority: 1.0 },
		{ url: `${baseUrl}/features`, priority: 0.9 },
		{ url: `${baseUrl}/pricing`, priority: 0.9 },
	];

	// Comparison and resource detail pages — same reasoning. The
	// per-competitor copy lives in `compare-data.ts`; if anyone touches
	// it they should also bump a constant here. For now, omit lastmod.
	const comparePages: MetadataRoute.Sitemap = [
		"buildium",
		"appfolio",
		"rentredi",
	].map((competitor) => ({
		url: `${baseUrl}/compare/${competitor}`,
		priority: 0.8,
	}));

	const resourcePages: MetadataRoute.Sitemap = [
		"seasonal-maintenance-checklist",
		"landlord-tax-deduction-tracker",
		"security-deposit-reference-card",
	].map((resource) => ({
		url: `${baseUrl}/resources/${resource}`,
		priority: 0.7,
	}));

	const companyPages: MetadataRoute.Sitemap = [
		{ url: `${baseUrl}/about`, priority: 0.7 },
		{ url: `${baseUrl}/contact`, priority: 0.7 },
		{ url: `${baseUrl}/faq`, priority: 0.6 },
		{ url: `${baseUrl}/help`, priority: 0.6 },
		{ url: `${baseUrl}/support`, priority: 0.6 },
	];

	// Legal pages — real lastmod from constants above. The visible
	// "Last Updated" line in each page body is the canonical source; this
	// const tracks it so the sitemap doesn't drift out of sync.
	const legalPages: MetadataRoute.Sitemap = [
		{
			url: `${baseUrl}/terms`,
			lastModified: TERMS_LAST_UPDATED,
			priority: 0.3,
		},
		{
			url: `${baseUrl}/privacy`,
			lastModified: PRIVACY_LAST_UPDATED,
			priority: 0.3,
		},
		{
			url: `${baseUrl}/security-policy`,
			lastModified: SECURITY_POLICY_LAST_UPDATED,
			priority: 0.3,
		},
	];

	// Dynamic blog posts and categories from database.
	let blogPages: MetadataRoute.Sitemap = [];
	let blogCategoryPages: MetadataRoute.Sitemap = [];
	let blogHubLastModified: string | undefined;
	let resourcesHubLastModified: string | undefined;
	try {
		const supabase = await createClient();

		const timeout = new Promise<never>((_, reject) =>
			setTimeout(
				() => reject(new Error("Sitemap DB query timed out after 5s")),
				5000,
			),
		);

		const query = supabase
			.from("blogs")
			.select("slug, published_at, updated_at, category")
			.eq("status", "published")
			.order("published_at", { ascending: false });

		const blogResult = await Promise.race([query, timeout]);
		const { data: blogPosts, error } = blogResult;

		if (error) {
			throw new Error(`Failed to fetch blog posts: ${error.message}`);
		}

		const posts = blogPosts ?? [];

		logger.info("Generating blog sitemap entries", {
			action: "generateBlogSitemap",
			route: "/sitemap.xml",
			metadata: { postCount: posts.length },
		});

		blogPages = posts.map((post) => ({
			url: `${baseUrl}/blog/${post.slug}`,
			// Honest signal: prefer `updated_at` if the row was edited,
			// otherwise the publish date.
			lastModified: post.updated_at ?? post.published_at ?? undefined,
			priority: 0.7,
		}));

		// Hub lastmod derives from the most recent post — that's the
		// honest "what changed on this URL" signal. If no posts exist,
		// omit lastmod entirely.
		blogHubLastModified =
			posts[0]?.updated_at ?? posts[0]?.published_at ?? undefined;
		// `/resources` is the same hub-y pattern as `/blog` — its content
		// is the link list to resource detail pages. Use the same most-
		// recent-post timestamp as a proxy for hub freshness.
		resourcesHubLastModified = blogHubLastModified;

		// Category hub lastmod = the most recent post within that
		// category. Group then take max(published_at|updated_at).
		const categoryFreshness = new Map<string, string>();
		for (const post of posts) {
			if (!post.category) continue;
			const stamp = post.updated_at ?? post.published_at;
			if (!stamp) continue;
			const slug = String(post.category).toLowerCase().replace(/\s+/g, "-");
			const current = categoryFreshness.get(slug);
			if (!current || stamp > current) {
				categoryFreshness.set(slug, stamp);
			}
		}
		blogCategoryPages = Array.from(categoryFreshness.entries()).map(
			([slug, stamp]) => ({
				url: `${baseUrl}/blog/category/${slug}`,
				lastModified: stamp,
				priority: 0.6,
			}),
		);
	} catch (error) {
		logger.error("Failed to generate blog sitemap entries", {
			action: "generateBlogSitemap",
			route: "/sitemap.xml",
			timestamp: new Date().toISOString(),
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			},
		});
		// Continue with static pages only. `blogHubLastModified` and
		// `resourcesHubLastModified` stay undefined → the hub URLs ship
		// without `lastModified`, which is the documented intent: emit
		// no signal rather than a stale or fake one. The trade-off in
		// the failure path is that a transient DB outage drops every
		// blog freshness signal until the next ISR rebuild succeeds.
	}

	const contentHubs: MetadataRoute.Sitemap = [
		{
			url: `${baseUrl}/blog`,
			lastModified: blogHubLastModified,
			priority: 0.8,
		},
		{
			url: `${baseUrl}/resources`,
			lastModified: resourcesHubLastModified,
			priority: 0.7,
		},
	];

	const allPages = [
		...marketingPages,
		...contentHubs,
		...comparePages,
		...resourcePages,
		...companyPages,
		...legalPages,
		...blogPages,
		...blogCategoryPages,
	];

	logger.info("Generated sitemap", {
		action: "generateSitemap",
		route: "/sitemap.xml",
		metadata: {
			totalEntries: allPages.length,
			staticEntries:
				allPages.length - blogPages.length - blogCategoryPages.length,
			blogEntries: blogPages.length,
			categoryEntries: blogCategoryPages.length,
		},
	});

	return allPages;
}
