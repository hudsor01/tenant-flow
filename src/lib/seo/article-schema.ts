import type { BlogPosting, TechArticle, WithContext } from "schema-dts";

import { getSiteUrl, organizationRef } from "#lib/generate-metadata";

interface BlogPostingJsonLdConfig {
	title: string;
	slug: string;
	datePublished: string;
	dateModified?: string;
	image?: string;
	wordCount?: number;
	description?: string | undefined;
	timeRequired?: string | undefined;
	/** The category's label ("Tax Prep"), as `articleSection`. */
	section?: string | undefined;
}

/**
 * A blog post's `BlogPosting` JSON-LD (2026-11-24 SEO audit PT-5, PT-6).
 *
 * The author and publisher are the Organization node itself (`@id`, S6), not
 * a same-named copy: posts are written as TenantFlow, under the "TenantFlow
 * Team" byline, and the owner names no individual author (D-09). There are
 * no `keywords`: the tags they came from were boilerplate, and no search
 * engine ranks on them.
 */
export function createBlogPostingJsonLd(
	config: BlogPostingJsonLdConfig,
): BlogPosting {
	const siteUrl = getSiteUrl();
	const {
		title,
		slug,
		datePublished,
		dateModified,
		image,
		wordCount,
		description,
		timeRequired,
		section,
	} = config;

	return {
		"@type": "BlogPosting",
		headline: title,
		...(description ? { description } : {}),
		datePublished,
		...(dateModified ? { dateModified } : {}),
		author: organizationRef(),
		publisher: organizationRef(),
		mainEntityOfPage: `${siteUrl}/blog/${encodeURIComponent(slug)}`,
		inLanguage: "en-US",
		...(section ? { articleSection: section } : {}),
		...(image ? { image } : {}),
		...(wordCount ? { wordCount } : {}),
		...(timeRequired ? { timeRequired } : {}),
	};
}

/**
 * A help article's `TechArticle` JSON-LD (2026-11-24 SEO audit HC7): written
 * and published by the Organization, dated by its last review.
 */
export function createHelpArticleJsonLd(config: {
	title: string;
	slug: string;
	description: string;
	datePublished: string;
	dateModified: string;
}): WithContext<TechArticle> {
	return {
		"@context": "https://schema.org",
		"@type": "TechArticle",
		headline: config.title,
		description: config.description,
		datePublished: config.datePublished,
		dateModified: config.dateModified,
		author: organizationRef(),
		publisher: organizationRef(),
		mainEntityOfPage: `${getSiteUrl()}/help/${config.slug}`,
		inLanguage: "en-US",
	};
}
