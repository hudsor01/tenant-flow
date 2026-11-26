import type { WebPage, WithContext } from "schema-dts";

import { getSiteUrl, organizationRef } from "#lib/generate-metadata";

/**
 * A free resource page's `WebPage` node, with the date it was first
 * published and the date its facts were last reviewed (2026-11-24 SEO audit
 * X9, D4). Both are YYYY-MM-DD.
 */
export function createResourcePageJsonLd(config: {
	name: string;
	path: string;
	description: string;
	datePublished: string;
	dateModified: string;
}): WithContext<WebPage> {
	return {
		"@context": "https://schema.org",
		"@type": "WebPage",
		name: config.name,
		url: `${getSiteUrl()}${config.path}`,
		description: config.description,
		datePublished: config.datePublished,
		dateModified: config.dateModified,
		publisher: organizationRef(),
	};
}
