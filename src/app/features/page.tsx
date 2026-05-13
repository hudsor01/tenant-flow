import type { Metadata } from 'next'
import { createPageMetadata } from '#lib/seo/page-metadata'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'
import { JsonLdScript } from '#components/seo/json-ld-script'
import { StickyConversionCta } from '#components/marketing/sticky-conversion-cta'
import FeaturesClient from './features-client'

// ISR — feature copy is static; 1h revalidate keeps content edits live
// without a full redeploy.
export const revalidate = 3600

export const metadata: Metadata = createPageMetadata({
	title: 'Property Management Features | Document Vault, Lease E-Signing & Maintenance',
	description: 'Per-entity document vault with global search, lease e-signing on Growth and Max, maintenance tracking, and financial reporting — everything landlords need to administer rental properties in one platform.',
	path: '/features'
})

export default function FeaturesPage() {
	return (
		<>
			<JsonLdScript schema={createBreadcrumbJsonLd('/features')} />
			<FeaturesClient />
			<StickyConversionCta />
		</>
	)
}
