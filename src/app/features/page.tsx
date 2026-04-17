import type { Metadata } from 'next'
import { createPageMetadata } from '#lib/seo/page-metadata'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'
import { JsonLdScript } from '#components/seo/json-ld-script'
import FeaturesClient from './features-client'

export const metadata: Metadata = createPageMetadata({
	title: 'Property Management Features — Online Rent Collection, Maintenance Tracking & More',
	description: 'Automated rent collection, maintenance request tracking, tenant screening, lease management, and financial reporting — everything landlords need to manage rental properties in one platform.',
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
