import type { Metadata } from "next";
import type { SoftwareApplication, WithContext } from "schema-dts";
import { StickyConversionCta } from "#components/marketing/sticky-conversion-cta";
import { JsonLdScript } from "#components/seo/json-ld-script";
import { getSoftwareApplicationJsonLd } from "#lib/generate-metadata";
import { createBreadcrumbJsonLd } from "#lib/seo/breadcrumbs";
import { createPageMetadata } from "#lib/seo/page-metadata";
import FeaturesClient from "./features-client";

// ISR — feature copy is static; 1h revalidate keeps content edits live
// without a full redeploy.
export const revalidate = 3600;

export const metadata: Metadata = createPageMetadata({
	title:
		"Property Management Features | Document Vault, Lease E-Signing & Maintenance",
	description:
		"Per-entity document vault with global search, lease e-signing on Growth and Max, maintenance tracking, and financial reporting — everything landlords need to administer rental properties in one platform.",
	path: "/features",
	ogImage: "/api/og/features",
});

export default function FeaturesPage() {
	// SoftwareApplication — the product entity, scoped to commercial pages
	// (homepage + /pricing + /features) and kept off /blog/* so it doesn't
	// dilute the Article schema there.
	const softwareJsonLd =
		getSoftwareApplicationJsonLd() as WithContext<SoftwareApplication>;
	return (
		<>
			<JsonLdScript schema={softwareJsonLd} />
			<JsonLdScript schema={createBreadcrumbJsonLd("/features")} />
			<FeaturesClient />
			<StickyConversionCta />
		</>
	);
}
