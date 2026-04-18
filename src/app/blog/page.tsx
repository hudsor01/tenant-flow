import { Suspense } from 'react'
import type { Metadata } from 'next'
import { createPageMetadata } from '#lib/seo/page-metadata'
import { JsonLdScript } from '#components/seo/json-ld-script'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'
import { BlogLoadingSkeleton } from '#components/shared/blog-loading-skeleton'
import BlogClient from './blog-client'

interface BlogPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ searchParams }: BlogPageProps): Promise<Metadata> {
	const params = await searchParams
	const page = Number(params.page) || 1

	return createPageMetadata({
		title: 'Property Management Blog — Tips for Landlords & Property Managers',
		description: 'Landlord tips, rental property administration guides, and software comparisons. Learn how to manage leases, handle maintenance, screen tenants, and grow your rental portfolio.',
		path: '/blog',
		noindex: page > 1
	})
}

export default function BlogPage() {
	return (
		<>
			<JsonLdScript schema={createBreadcrumbJsonLd('/blog')} />
			<Suspense fallback={<BlogLoadingSkeleton />}>
				<BlogClient />
			</Suspense>
		</>
	)
}
