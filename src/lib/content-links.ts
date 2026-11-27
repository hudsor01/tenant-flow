/**
 * Content Links — Static Bidirectional Mapping Config
 *
 * Provides compile-time slug mappings for internal cross-linking between
 * blog posts, resource pages, and competitor comparison pages.
 *
 * Three exported maps:
 * - RESOURCE_TO_BLOGS: resource route segment -> related blog post slugs
 * - BLOG_TO_RESOURCE: blog slug -> resource route segment (reverse of above)
 * - BLOG_TO_COMPETITOR: blog slug -> competitor slug (derived from compare-data.ts)
 */

import { COMPETITORS } from "#app/compare/[competitor]/compare-data";

/**
 * The post that walks a new owner through what to set up first. The empty
 * dashboard links to it, and so do the trial's first emails
 * (`supabase/functions/_shared/trial-lifecycle.ts`, held to this slug by
 * `trial-lifecycle.test.ts`). It must be published
 * (tests/integration/content-links-slugs.test.ts).
 */
export const TRIAL_SETUP_POST_SLUG =
	"what-to-set-up-first-during-your-tenantflow-14-day-free-trial";

/**
 * Maps resource page route segments to arrays of related blog post slugs.
 * Every slug must be published (tests/integration/content-links-slugs.test.ts).
 * The security deposit reference card has no published post on its topic, so
 * it has no entry and shows no related posts.
 */
export const RESOURCE_TO_BLOGS: Record<string, string[]> = {
	"seasonal-maintenance-checklist": [
		"tenantflow-the-simple-way-to-run-move-in-and-move-out-inspections",
	],
	"landlord-tax-deduction-tracker": [
		"how-tenantflow-simplifies-tax-season-for-independent-landlords",
		"how-tenantflow-s-rent-ledger-brings-order-to-your-rental-income",
	],
};

/**
 * Reverse map: blog post slug -> resource route segment.
 */
export const BLOG_TO_RESOURCE: Record<string, string> = Object.fromEntries(
	Object.entries(RESOURCE_TO_BLOGS).flatMap(([resource, blogs]) =>
		blogs.map((blog) => [blog, resource]),
	),
);

/**
 * Reverse map: blog post slug -> competitor slug.
 */
export const BLOG_TO_COMPETITOR: Record<string, string> = Object.fromEntries(
	Object.values(COMPETITORS)
		.filter((c): c is typeof c & { blogSlug: string } => Boolean(c.blogSlug))
		.map((c) => [c.blogSlug, c.slug]),
);
