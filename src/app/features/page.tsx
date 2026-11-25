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
	title: "Property Management Features for Landlords",
	description:
		"Document vault, lease e-signing, maintenance tracking, rent ledger, and financial reports. Everything a landlord needs to run rentals, in one place.",
	path: "/features",
	ogCard: "features",
});

export default function FeaturesPage() {
	// SoftwareApplication — the product entity, scoped to commercial pages
	// (homepage + /pricing + /features) and kept off /blog/* so it doesn't
	// dilute the BlogPosting schema there.
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
