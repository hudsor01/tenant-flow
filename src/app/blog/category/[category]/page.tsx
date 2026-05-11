import { cache } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '#lib/supabase/server'
import { createPageMetadata } from '#lib/seo/page-metadata'
import { JsonLdScript } from '#components/seo/json-ld-script'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'
import { PageLayout } from '#components/layout/page-layout'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '#components/ui/breadcrumb'
import { BlogCard } from '#components/blog/blog-card'
import { BlogPagination } from '#components/blog/blog-pagination'
import { BlogEmptyState } from '#components/shared/blog-empty-state'
import { NewsletterSignup } from '#components/blog/newsletter-signup'
import type { BlogListItem } from '#hooks/api/query-keys/blog-keys'

const PAGE_LIMIT = 9

const BLOG_LIST_COLUMNS =
	'id, title, slug, excerpt, published_at, category, reading_time, featured_image, author_user_id, status, tags'

interface CategoryPageProps {
	params: Promise<{ category: string }>
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

interface ValidCategory {
	name: string
	slug: string
	post_count: number
}

/** Deduplicated category validation — shared by generateMetadata and Page */
const getValidCategory = cache(
	async (slug: string): Promise<ValidCategory | null> => {
		const supabase = await createClient()
		const { data } = await supabase.rpc('get_blog_categories')
		return (
			((data ?? []) as ValidCategory[]).find(c => c.slug === slug) ?? null
		)
	}
)

export async function generateMetadata({
	params,
	searchParams,
}: CategoryPageProps): Promise<Metadata> {
	const { category } = await params
	const search = await searchParams
	const page = Number(search.page) || 1

	const validCategory = await getValidCategory(category)
	if (!validCategory) {
		return { title: 'Category Not Found | TenantFlow' }
	}

	return createPageMetadata({
		title: `${validCategory.name} Articles & Guides`,
		description: `Browse TenantFlow blog posts about ${validCategory.name.toLowerCase()}. Expert insights and practical guides for landlords.`,
		path: `/blog/category/${category}`,
		noindex: page > 1,
	})
}

export default async function BlogCategoryPage({
	params,
	searchParams,
}: CategoryPageProps) {
	const { category } = await params
	const search = await searchParams
	const page = Math.max(1, Number(search.page) || 1)
	const offset = (page - 1) * PAGE_LIMIT

	const validCategory = await getValidCategory(category)
	if (!validCategory) {
		notFound()
	}

	const supabase = await createClient()
	const postsResult = await supabase
		.from('blogs')
		.select(BLOG_LIST_COLUMNS, { count: 'exact' })
		.eq('status', 'published')
		.eq('category', validCategory.name)
		.order('published_at', { ascending: false })
		.range(offset, offset + PAGE_LIMIT - 1)

	const posts = (postsResult.data ?? []) as BlogListItem[]
	const total = postsResult.count ?? 0
	const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))

	return (
		<PageLayout>
			<JsonLdScript
				schema={createBreadcrumbJsonLd(`/blog/category/${category}`, {
					[category]: validCategory.name,
				})}
			/>

			<div className="container mx-auto max-w-6xl px-6 lg:px-8 pt-8">
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink asChild>
								<Link href="/">Home</Link>
							</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbLink asChild>
								<Link href="/blog">Blog</Link>
							</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>{validCategory.name}</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</div>

			<section className="section-spacing">
				<div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
					<h1 className="text-responsive-display-xl font-bold tracking-tight">
						{validCategory.name}
					</h1>
					<p className="mt-4 text-lg text-muted-foreground">
						{total} article{total === 1 ? '' : 's'} on{' '}
						{validCategory.name.toLowerCase()}.
					</p>
				</div>
			</section>

			<section className="section-spacing">
				<div className="mx-auto max-w-6xl px-6 lg:px-8">
					{posts.length === 0 ? (
						<BlogEmptyState message="No posts in this category yet." />
					) : (
						<>
							<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
								{posts.map(post => (
									<BlogCard key={post.id} post={post} />
								))}
							</div>
							{totalPages > 1 && (
								<BlogPagination
									totalPages={totalPages}
									className="mt-8"
								/>
							)}
						</>
					)}
				</div>
			</section>

			<section className="section-spacing">
				<div className="mx-auto max-w-2xl px-6 lg:px-8">
					<NewsletterSignup className="shadow-sm" />
				</div>
			</section>
		</PageLayout>
	)
}
