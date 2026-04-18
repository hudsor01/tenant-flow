import type { Metadata } from 'next'
import { createPageMetadata } from '#lib/seo/page-metadata'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'
import { JsonLdScript } from '#components/seo/json-ld-script'
import FeaturesClient from './features-client'

export const metadata: Metadata = createPageMetadata({
	title: 'Property Management Features — Lease Management, Maintenance Tracking & More',
	description: 'Lease management, maintenance request tracking, tenant screening, document storage, and financial reporting — everything landlords need to administer rental properties in one platform.',
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
