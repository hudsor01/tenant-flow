import type {
	AboutPage,
	Blog,
	CollectionPage,
	ContactPage,
	ItemList,
	WithContext,
} from "schema-dts";

import { getSiteUrl, organizationRef } from "#lib/generate-metadata";

// Page-level JSON-LD for the pages that list other pages, and for the about
// and contact pages (2026-11-24 SEO audit C2, RS2, CT-3, BL3, AB9, CT3).
// Each points at the Organization node by `@id` where it names TenantFlow.

/** A page in a list: its name and its site-relative path. */
export interface ListedPage {
	name: string;
	path: string;
}

/** An `ItemList` of pages, in the order shown. */
export function createItemListJsonLd(
	pages: readonly ListedPage[],
): WithContext<ItemList> {
	return { "@context": "https://schema.org", ...itemList(pages) };
}

function itemList(pages: readonly ListedPage[]): ItemList {
	const siteUrl = getSiteUrl();
	return {
		"@type": "ItemList",
		itemListElement: pages.map((page, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: page.name,
			url: `${siteUrl}${page.path}`,
		})),
	};
}

/** A `CollectionPage` whose main entity is the list of pages it shows. */
export function createCollectionPageJsonLd(config: {
	name: string;
	path: string;
	description: string;
	pages: readonly ListedPage[];
}): WithContext<CollectionPage> {
	return {
		"@context": "https://schema.org",
		"@type": "CollectionPage",
		name: config.name,
		url: `${getSiteUrl()}${config.path}`,
		description: config.description,
		mainEntity: itemList(config.pages),
	};
}

/** A post as the blog hub lists it. */
export interface ListedPost {
	title: string;
	slug: string;
	publishedAt: string | null;
	image: string | null;
}

/** The blog hub's `Blog`, with a `BlogPosting` for each post on the page. */
export function createBlogJsonLd(config: {
	path: string;
	description: string;
	posts: readonly ListedPost[];
}): WithContext<Blog> {
	const siteUrl = getSiteUrl();
	return {
		"@context": "https://schema.org",
		"@type": "Blog",
		name: "TenantFlow Blog",
		url: `${siteUrl}${config.path}`,
		description: config.description,
		publisher: organizationRef(),
		inLanguage: "en-US",
		blogPost: config.posts.map((post) => ({
			"@type": "BlogPosting",
			headline: post.title,
			url: `${siteUrl}/blog/${encodeURIComponent(post.slug)}`,
			...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
			...(post.image ? { image: post.image } : {}),
		})),
	};
}

/**
 * An `AboutPage` or `ContactPage` whose main entity is the Organization. The
 * about page names no founder until the owner supplies one (D-09).
 */
export function createOrganizationPageJsonLd(
	type: "AboutPage" | "ContactPage",
	config: { name: string; path: string },
): WithContext<AboutPage> | WithContext<ContactPage> {
	return {
		"@context": "https://schema.org",
		"@type": type,
		name: config.name,
		url: `${getSiteUrl()}${config.path}`,
		mainEntity: organizationRef(),
	};
}
