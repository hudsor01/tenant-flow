import type { BreadcrumbList, ListItem } from "schema-dts";

import { getSiteUrl } from "#lib/generate-metadata";
import { categoryLabel } from "#lib/seo/blog-categories";

/**
 * Create a BreadcrumbList JSON-LD schema from a route path.
 * @param path - The route path (e.g., '/blog/my-post')
 * @param overrides - Optional map of path segments to display labels (e.g., \{ 'my-post': 'My Blog Post' \})
 */
export function createBreadcrumbJsonLd(
	path: string,
	overrides?: Record<string, string>,
): BreadcrumbList {
	const siteUrl = getSiteUrl();
	const segments = path.split("/").filter(Boolean);

	const items: ListItem[] = [
		{
			"@type": "ListItem" as const,
			position: 1,
			name: "Home",
			item: siteUrl,
		},
	];

	let currentPath = "";
	segments.forEach((segment, index) => {
		currentPath += `/${segment}`;
		const isLast = index === segments.length - 1;
		const rawName = overrides?.[segment] ?? formatSegment(segment);
		const name = stripHtmlTags(rawName);

		const listItem: ListItem = {
			"@type": "ListItem" as const,
			position: index + 2,
			name,
			...(isLast ? {} : { item: `${siteUrl}${currentPath}` }),
		};
		items.push(listItem);
	});

	return {
		"@type": "BreadcrumbList" as const,
		itemListElement: items,
	};
}

/**
 * Build a BreadcrumbList for a single blog post.
 *
 * Emits exactly: Home > Blog (`/blog`) > {category label}
 * (`/blog/category/<categorySlug>`) > {post title} (no `item` — the last
 * node is the current page). Built explicitly rather than via the generic
 * path splitter so it never mints a `/blog/category` node (no slug — that
 * URL 404s) and so the category node carries the human label, not the raw
 * kebab slug. The visible `<BlogPostBreadcrumb>` mirrors these segments —
 * search engines penalize visible-vs-schema drift.
 */
export function createBlogPostBreadcrumbJsonLd(
	categorySlug: string,
	postTitle: string,
): BreadcrumbList {
	const siteUrl = getSiteUrl();
	const items: ListItem[] = [
		{ "@type": "ListItem" as const, position: 1, name: "Home", item: siteUrl },
		{
			"@type": "ListItem" as const,
			position: 2,
			name: "Blog",
			item: `${siteUrl}/blog`,
		},
	];

	let position = 3;
	if (categorySlug) {
		items.push({
			"@type": "ListItem" as const,
			position,
			name: categoryLabel(categorySlug),
			item: `${siteUrl}/blog/category/${categorySlug}`,
		});
		position += 1;
	}

	items.push({
		"@type": "ListItem" as const,
		position,
		name: stripHtmlTags(postTitle),
	});

	return {
		"@type": "BreadcrumbList" as const,
		itemListElement: items,
	};
}

/**
 * Strip HTML tags from a breadcrumb display name. Loops to a fixpoint so a
 * single pass cannot leave a reconstructable tag (e.g. `<scr<script>ipt>`) —
 * a plain one-shot `.replace(/<[^>]*>/g, "")` is an incomplete multi-character
 * sanitizer (CodeQL js/incomplete-multi-character-sanitization). The JSON-LD
 * renderers additionally escape "<" to its unicode form at serialization, so
 * this is defense-in-depth for the plain-text `name` field.
 */
function stripHtmlTags(input: string): string {
	let out = input;
	let prev: string;
	do {
		prev = out;
		out = out.replace(/<[^>]*>/g, "");
	} while (out !== prev);
	return out;
}

/** Capitalize first letter of each word and replace hyphens with spaces */
function formatSegment(segment: string): string {
	return segment
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}
