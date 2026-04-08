'use client'

import { BlogCard } from '#components/blog/blog-card'
import { BlogPagination } from '#components/blog/blog-pagination'
import { NewsletterSignup } from '#components/blog/newsletter-signup'
import { PageLayout } from '#components/layout/page-layout'
import { BlogEmptyState } from '#components/shared/blog-empty-state'
import { BlogLoadingSkeleton } from '#components/shared/blog-loading-skeleton'
import {
	useBlogs,
	useBlogCategories,
	useComparisonPosts,
} from '#hooks/api/use-blogs'
import { parseAsInteger, useQueryState } from 'nuqs'
import Link from 'next/link'

export default function BlogClient() {
	const [page] = useQueryState('page', parseAsInteger.withDefault(1))
	const { data: categories, isLoading: categoriesLoading } =
		useBlogCategories()
	const { data: comparisons, isLoading: comparisonsLoading } =
		useComparisonPosts()
	const { data: blogData, isLoading: blogsLoading } = useBlogs(page)

	return (
		<PageLayout>
			{/* Hero -- simplified title + subtitle */}
			<section className="section-spacing">
				<div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
					<h1 className="text-responsive-display-xl font-bold tracking-tight">
						TenantFlow Blog
					</h1>
					<p className="mt-4 text-lg text-muted-foreground">
						Property management insights, software comparisons, and
						actionable guides to help you run a better business.
					</p>
				</div>
			</section>

			{/* Category pills */}
			<section className="pb-8">
				<div className="mx-auto max-w-6xl px-6 lg:px-8">
					<div className="flex flex-wrap items-center gap-2">
						{categoriesLoading ? (
							<>
								{[1, 2, 3].map(i => (
									<div
										key={i}
										className="h-8 w-32 animate-pulse rounded-full bg-muted"
									/>
								))}
							</>
						) : (
							categories?.map(cat => (
								<Link
									key={cat.slug}
									href={`/blog/category/${cat.slug}`}
									className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
								>
									{cat.name}
									<span className="text-muted-foreground">
										({cat.post_count})
									</span>
								</Link>
							))
						)}
					</div>
				</div>
			</section>

			{/* Software Comparisons zone -- horizontal scroll */}
			{comparisonsLoading ? (
				<section className="section-spacing">
					<div className="mx-auto max-w-6xl px-6 lg:px-8">
						<h2 className="mb-6 text-2xl font-bold">
							Software Comparisons
						</h2>
						<BlogLoadingSkeleton />
					</div>
				</section>
			) : comparisons && comparisons.length > 0 ? (
				<section className="section-spacing">
					<div className="mx-auto max-w-6xl px-6 lg:px-8">
						<h2 className="mb-6 text-2xl font-bold">
							Software Comparisons
						</h2>
						<div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
							{comparisons.map(post => (
								<BlogCard
									key={post.id}
									post={post}
									className="min-w-[280px] flex-shrink-0 snap-start md:min-w-[320px]"
								/>
							))}
						</div>
					</div>
				</section>
			) : null}

			{/* Insights & Guides zone -- paginated grid */}
			<section className="section-spacing">
				<div className="mx-auto max-w-6xl px-6 lg:px-8">
					<h2 className="mb-6 text-2xl font-bold">
						Insights & Guides
					</h2>
					{blogsLoading ? (
						<BlogLoadingSkeleton />
					) : !blogData || blogData.data.length === 0 ? (
						<BlogEmptyState message="No articles yet. Check back soon." />
					) : (
						<>
							<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
								{blogData.data.map(post => (
									<BlogCard key={post.id} post={post} />
								))}
							</div>
							<BlogPagination
								totalPages={blogData.pagination.totalPages}
								className="mt-8"
							/>
						</>
					)}
				</div>
			</section>

			{/* Newsletter signup -- pre-footer */}
			<section className="section-spacing">
				<div className="mx-auto max-w-2xl px-6 lg:px-8">
					<NewsletterSignup className="shadow-sm" />
				</div>
			</section>
		</PageLayout>
	)
}
