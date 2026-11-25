import type { Metadata } from "next";

import { ContactForm } from "#components/contact/contact-form";
import { PageLayout } from "#components/layout/page-layout";
import { JsonLdScript } from "#components/seo/json-ld-script";
import { createBreadcrumbJsonLd } from "#lib/seo/breadcrumbs";
import { createOrganizationPageJsonLd } from "#lib/seo/collection-schema";
import { createPageMetadata } from "#lib/seo/page-metadata";

export const metadata: Metadata = createPageMetadata({
	title: "Contact TenantFlow | Support for Landlords",
	description:
		"Reach our team for help with setup, features, and growing your portfolio. We respond during US business hours, Monday through Friday.",
	path: "/contact",
	ogCard: "contact",
});

export default function ContactPage() {
	return (
		<PageLayout>
			<JsonLdScript schema={createBreadcrumbJsonLd("/contact")} />
			<JsonLdScript
				schema={createOrganizationPageJsonLd("ContactPage", {
					name: "Contact TenantFlow",
					path: "/contact",
				})}
			/>
			<ContactForm />
		</PageLayout>
	);
}
