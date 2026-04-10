'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { parseAsInteger, useQueryState } from 'nuqs'
import { ArrowLeft } from 'lucide-react'
import { PageLayout } from '#components/layout/page-layout'
import { BlogCard } from '#components/blog/blog-card'
import { BlogPagination } from '#components/blog/blog-pagination'
import { NewsletterSignup } from '#components/blog/newsletter-signup'
import { BlogEmptyState } from '#components/shared/blog-empty-state'
import { BlogLoadingSkeleton } from '#components/shared/blog-loading-skeleton'
import { useBlogCategories, useBlogsByCategory } from '#hooks/api/use-blogs'

export default function BlogCategoryClient() {
	const params = useParams()
	const categorySlug = String(params.category)
	const router = useRouter()
	const [page] = useQueryState('page', parseAsInteger.withDefault(1))

	const { data: categories, isLoading: categoriesLoading } = useBlogCategories()
	const category = categories?.find(c => c.slug === categorySlug)

	// Redirect unknown slugs ONLY after categories finish loading
	useEffect(() => {
		if (!categoriesLoading && categories && !category) {
			router.replace('/blog')
		}
	}, [categoriesLoading, categories, category, router])

	// Use resolved display name for blog query
	const { data: blogData, isLoading: blogsLoading } = useBlogsByCategory(
		category?.name ?? '',
		page
	)

	// Show loading skeleton while data resolves
	if (categoriesLoading || (blogsLoading && category)) {
		return (
			<PageLayout>
				<div className="container mx-auto px-6 page-content pb-8 max-w-6xl">
					<Link
						href="/blog"
						className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors duration-200"
					>
						<ArrowLeft className="size-4 mr-2" />
						Back to Blog
					</Link>
				</div>
				<div className="container mx-auto px-6 pb-16 max-w-6xl">
					<BlogLoadingSkeleton />
				</div>
			</PageLayout>
		)
	}

	// Unknown category -- redirect handled by useEffect
	if (!category) {
		return null
	}

	return (
		<PageLayout>
			{/* Back to Blog */}
			<div className="container mx-auto px-6 page-content pb-8 max-w-6xl">
				<Link
					href="/blog"
					className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors duration-200"
				>
					<ArrowLeft className="size-4 mr-2" />
					Back to Blog
				</Link>
			</div>

			{/* Category Header */}
			<section className="container mx-auto px-6 pb-12 max-w-6xl">
				<h1 className="text-3xl font-bold">{category.name}</h1>
				<p className="text-muted-foreground">{blogData?.total ?? 0} articles</p>
			</section>

			{/* Blog Grid */}
			<section className="container mx-auto px-6 pb-16 max-w-6xl">
				{!blogsLoading && blogData?.data.length === 0 ? (
					<BlogEmptyState />
				) : (
					<>
						<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
							{blogData?.data.map(post => (
								<BlogCard key={post.id} post={post} />
							))}
						</div>
						{blogData && blogData.pagination.totalPages > 1 && (
							<BlogPagination
								totalPages={blogData.pagination.totalPages}
								className="mt-8"
							/>
						)}
					</>
				)}
			</section>

			{/* Newsletter */}
			<NewsletterSignup className="mt-16 container mx-auto px-6 max-w-6xl" />
		</PageLayout>
	)
}
