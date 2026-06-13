import { getOrganizationJsonLd } from "#lib/generate-metadata";

/**
 * Site-wide JSON-LD emitted from the root layout `<head>`.
 *
 * ONLY the Organization entity — route-neutral brand identity that's
 * correct on every page. The commercial SoftwareApplication + AggregateOffer
 * node is deliberately NOT emitted here: site-wide it competes with each
 * blog post's `Article` schema for the page's primary-entity signal and
 * dilutes it (the reason PR 674 dropped SoftwareApplication from compare
 * pages). It's emitted only on the marketing homepage via `MarketingJsonLd`.
 */
export default function SeoJsonLd() {
	const organization = getOrganizationJsonLd();

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{
				__html: JSON.stringify(organization).replace(/</g, "\\u003c"),
			}}
		/>
	);
}
