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

import { COMPETITORS } from '#app/compare/[competitor]/compare-data'

// ============================================================================
// RESOURCE <-> BLOG MAPPINGS
// ============================================================================

/**
 * Maps resource page route segments to arrays of related blog post slugs.
 * Used by resource pages to display related blog content.
 */
export const RESOURCE_TO_BLOGS: Record<string, string[]> = {
	'seasonal-maintenance-checklist': [
		'preventive-maintenance-checklist-rental-properties-seasonal-guide',
	],
	'landlord-tax-deduction-tracker': [
		'landlord-tax-deductions-missing-2025',
	],
	'security-deposit-reference-card': [
		'security-deposit-laws-by-state-2025',
	],
}

/**
 * Reverse map: blog post slug -> resource route segment.
 * Derived from RESOURCE_TO_BLOGS. Used by blog post pages to show
 * a resource download CTA when the post has a matching resource page.
 */
export const BLOG_TO_RESOURCE: Record<string, string> = Object.fromEntries(
	Object.entries(RESOURCE_TO_BLOGS).flatMap(([resource, blogs]) =>
		blogs.map(blog => [blog, resource])
	)
)

// ============================================================================
// BLOG <-> COMPETITOR MAPPINGS
// ============================================================================

/**
 * Reverse map: blog post slug -> competitor slug.
 * Derived from COMPETITORS (compare-data.ts). Used by blog post detail pages
 * to show a compare CTA when the post is a competitor comparison article.
 */
export const BLOG_TO_COMPETITOR: Record<string, string> = Object.fromEntries(
	Object.values(COMPETITORS)
		.filter((c): c is typeof c & { blogSlug: string } => Boolean(c.blogSlug))
		.map(c => [c.blogSlug, c.slug])
)
