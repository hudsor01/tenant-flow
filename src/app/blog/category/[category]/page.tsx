import type { Metadata } from 'next'
import { createPageMetadata } from '#lib/seo/page-metadata'
import { JsonLdScript } from '#components/seo/json-ld-script'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'
import BlogCategoryClient from './blog-category-client'

interface CategoryPageProps {
	params: Promise<{ category: string }>
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params, searchParams }: CategoryPageProps): Promise<Metadata> {
	const { category } = await params
	const search = await searchParams
	const page = Number(search.page) || 1

	const categoryName = category
		.split('-')
		.map(w => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ')

	return createPageMetadata({
		title: `${categoryName} Articles & Guides`,
		description: `Browse TenantFlow blog posts about ${categoryName.toLowerCase()}. Expert insights and practical guides for property managers and landlords.`,
		path: `/blog/category/${category}`,
		noindex: page > 1
	})
}

export default async function BlogCategoryPage({ params }: CategoryPageProps) {
	const { category } = await params
	const categoryName = category
		.split('-')
		.map(w => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ')

	return (
		<>
			<JsonLdScript schema={createBreadcrumbJsonLd(`/blog/category/${category}`, { [category]: categoryName })} />
			<BlogCategoryClient />
		</>
	)
}
