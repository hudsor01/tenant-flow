import { cache, Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '#lib/supabase/server'
import { createPageMetadata } from '#lib/seo/page-metadata'
import { JsonLdScript } from '#components/seo/json-ld-script'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'
import { BlogLoadingSkeleton } from '#components/shared/blog-loading-skeleton'
import BlogCategoryClient from './blog-category-client'

interface CategoryPageProps {
	params: Promise<{ category: string }>
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Deduplicated category validation — shared by generateMetadata and Page */
const getValidCategory = cache(async (slug: string): Promise<{ name: string; slug: string } | null> => {
	const supabase = await createClient()
	const { data } = await supabase.rpc('get_blog_categories')
	return (data ?? []).find((c: { slug: string }) => c.slug === slug) ?? null
})

export async function generateMetadata({ params, searchParams }: CategoryPageProps): Promise<Metadata> {
	const { category } = await params
	const search = await searchParams
	const page = Number(search.page) || 1

	const validCategory = await getValidCategory(category)
	if (!validCategory) {
		return { title: 'Category Not Found | TenantFlow' }
	}

	return createPageMetadata({
		title: `${validCategory.name} Articles & Guides`,
		description: `Browse TenantFlow blog posts about ${validCategory.name.toLowerCase()}. Expert insights and practical guides for property owners and operators.`,
		path: `/blog/category/${category}`,
		noindex: page > 1
	})
}

export default async function BlogCategoryPage({ params }: CategoryPageProps) {
	const { category } = await params
	const validCategory = await getValidCategory(category)

	if (!validCategory) {
		notFound()
	}

	return (
		<>
			<JsonLdScript schema={createBreadcrumbJsonLd(`/blog/category/${category}`, { [category]: validCategory.name })} />
			<Suspense fallback={<BlogLoadingSkeleton />}>
				<BlogCategoryClient />
			</Suspense>
		</>
	)
}
