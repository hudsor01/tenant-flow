import type { Metadata } from 'next'
import { createPageMetadata } from '#lib/seo/page-metadata'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'
import { JsonLdScript } from '#components/seo/json-ld-script'
import FeaturesClient from './features-client'

export const metadata: Metadata = createPageMetadata({
	title: 'Property Management Features — Document Vault, Lease E-Signing & Maintenance',
	description: 'Per-entity document vault with global search, DocuSeal lease e-signing on Growth and Max, maintenance tracking, and financial reporting — everything landlords need to administer rental properties in one platform.',
	path: '/features'
})

export default function FeaturesPage() {
	return (
		<>
			<JsonLdScript schema={createBreadcrumbJsonLd('/features')} />
			<FeaturesClient />
		</>
	)
}
