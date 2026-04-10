import type { Metadata } from 'next'
import { createPageMetadata } from '#lib/seo/page-metadata'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'
import { JsonLdScript } from '#components/seo/json-ld-script'
import FeaturesClient from './features-client'

export const metadata: Metadata = createPageMetadata({
	title: 'Property Management Features & Tools',
	description: 'Explore TenantFlow features: automated rent collection, maintenance tracking, tenant screening, financial reporting, and lease management in one platform.',
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
