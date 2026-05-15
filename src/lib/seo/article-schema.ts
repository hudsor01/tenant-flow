import type { Article } from "schema-dts";

import { getSiteUrl } from "#lib/generate-metadata";

interface ArticleJsonLdConfig {
	title: string;
	slug: string;
	datePublished: string;
	dateModified?: string;
	authorName: string;
	/**
	 * Author entity type. Schema.org's `Person` is for actual humans;
	 * a brand byline like "TenantFlow Team" is semantically an
	 * `Organization`. Defaults to `Person` for back-compat with callers
	 * that pass a real human name; pass `'Organization'` for team or
	 * brand bylines so the JSON-LD type matches the entity.
	 */
	authorType?: "Person" | "Organization";
	image?: string;
	wordCount?: number;
	keywords?: string[] | undefined;
	description?: string | undefined;
	timeRequired?: string | undefined;
}

/**
 * Create an Article JSON-LD schema for blog posts.
 * Produces schema-dts typed output for use with JsonLdScript component.
 */
export function createArticleJsonLd(config: ArticleJsonLdConfig): Article {
	const siteUrl = getSiteUrl();
	const {
		title,
		slug,
		datePublished,
		dateModified,
		authorName,
		authorType = "Person",
		image,
		wordCount,
		keywords,
		description,
		timeRequired,
	} = config;

	return {
		"@type": "Article",
		headline: title,
		...(description ? { description } : {}),
		datePublished,
		...(dateModified ? { dateModified } : {}),
		author: {
			"@type": authorType,
			name: authorName,
		},
		publisher: {
			"@type": "Organization",
			name: "TenantFlow",
			logo: {
				"@type": "ImageObject",
				url: `${siteUrl}/tenant-flow-logo.png`,
			},
		},
		mainEntityOfPage: `${siteUrl}/blog/${encodeURIComponent(slug)}`,
		...(image ? { image } : {}),
		...(wordCount ? { wordCount } : {}),
		...(keywords && keywords.length > 0
			? { keywords: keywords.join(", ") }
			: {}),
		...(timeRequired ? { timeRequired } : {}),
	};
}
