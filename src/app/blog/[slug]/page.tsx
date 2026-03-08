'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Clock, User } from 'lucide-react'
import { cn } from '#lib/utils'
import { PageLayout } from '#components/layout/page-layout'
import { Button } from '#components/ui/button'
import { BlogCard } from '#components/blog/blog-card'
import { BlogLoadingSkeleton } from '#components/shared/blog-loading-skeleton'
import { useBlogBySlug, useBlogCategories, useRelatedPosts } from '#hooks/api/use-blogs'

const MarkdownContent = dynamic(() => import('./markdown-content'), {
	ssr: false,
	loading: () => <BlogLoadingSkeleton />
})

export default function BlogArticlePage() {
	const params = useParams()
	const slug = params.slug as string
	const [imageLoaded, setImageLoaded] = useState(false)

	const { data: post, isLoading } = useBlogBySlug(slug)
	const { data: categories } = useBlogCategories()
	const { data: relatedPosts } = useRelatedPosts(
		post?.category ?? '',
		slug,
		3
	)

	if (isLoading) {
		return (
			<PageLayout>
				<div className="container mx-auto px-6 page-content pb-8 max-w-4xl">
					<div className="h-4 bg-muted rounded w-32 mb-8 animate-pulse" />
				</div>
				<article className="container mx-auto px-6 pb-16 max-w-4xl">
					<header className="mb-12">
						<div className="h-12 bg-muted rounded w-3/4 mb-6 animate-pulse" />
						<div className="h-6 bg-muted rounded w-full mb-2 animate-pulse" />
						<div className="h-6 bg-muted rounded w-2/3 mb-8 animate-pulse" />
						<div className="flex items-center gap-6 border-t border-b border-border py-4">
							<div className="h-4 bg-muted rounded w-24 animate-pulse" />
							<div className="h-4 bg-muted rounded w-20 animate-pulse" />
							<div className="h-4 bg-muted rounded w-24 animate-pulse" />
						</div>
					</header>
					<div className="space-y-4">
						{[1, 2, 3, 4, 5].map(i => (
							<div
								key={i}
								className="h-4 bg-muted rounded w-full animate-pulse"
							/>
						))}
					</div>
				</article>
			</PageLayout>
		)
	}

	if (!post) {
		return (
			<PageLayout>
				<div className="container mx-auto px-6 py-16 max-w-4xl text-center">
					<h1 className="text-4xl font-bold mb-4">Blog Post Not Found</h1>
					<p className="text-muted-foreground mb-8">
						The blog post you're looking for doesn't exist or has been removed.
					</p>
					<Button asChild>
						<Link href="/blog">
							<ArrowLeft className="size-4 mr-2" />
							Back to Blog
						</Link>
					</Button>
				</div>
			</PageLayout>
		)
	}

	const markdownContent = post.content.trim()

	// Resolve category slug from database categories
	const postCategory = post.category ?? ''
	const categoryMatch = categories?.find(c => c.name === postCategory)
	const categorySlug = categoryMatch?.slug ?? postCategory.toLowerCase().replace(/\s+/g, '-')

	return (
		<PageLayout>
			{/* Back to Blog */}
			<div className="container mx-auto px-6 page-content pb-8 max-w-4xl">
				<Link
					href="/blog"
					className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors duration-200"
				>
					<ArrowLeft className="size-4 mr-2" />
					Back to Blog
				</Link>
			</div>

			{/* Featured Image */}
			{post.featured_image && (
				<div className="relative aspect-video max-w-4xl mx-auto overflow-hidden rounded-lg mb-8">
					<Image
						src={post.featured_image}
						alt={post.title}
						fill
						sizes="(max-width: 768px) 100vw, 896px"
						priority
						className={cn(
							'object-cover transition-all duration-700 ease-out',
							imageLoaded ? 'blur-0 opacity-100 scale-100' : 'blur-sm opacity-0 scale-105'
						)}
						onLoad={() => setImageLoaded(true)}
					/>
				</div>
			)}

			{/* Article */}
			<article className="container mx-auto px-6 pb-16 max-w-4xl">
				<header className="mb-12">
					<h1 className="text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
						{post.title}
					</h1>

					<p className="text-xl text-muted-foreground leading-relaxed mb-8">
						{post.excerpt}
					</p>

					<div className="flex flex-wrap items-center gap-6 text-muted-foreground border-t border-b border-border py-4">
						<div className="flex items-center gap-2">
							<User className="size-4" />
							<span>TenantFlow Team</span>
						</div>
						<div className="flex items-center gap-2">
							<Clock className="size-4" />
							<span>{post.reading_time} min read</span>
						</div>
						<div>
							{post.published_at
								? new Date(post.published_at).toLocaleDateString('en-US', {
										month: 'long',
										day: 'numeric',
										year: 'numeric'
									})
								: ''}
						</div>
						{postCategory && (
							<Link
								href={`/blog/category/${categorySlug}`}
								className="text-primary hover:text-primary/80 transition-colors"
							>
								{postCategory}
							</Link>
						)}
					</div>
				</header>

				{/* Article Content -- simplified prose */}
				<div className="prose prose-lg dark:prose-invert max-w-none prose-blockquote:border-primary">
					<MarkdownContent content={markdownContent} />
				</div>

				{/* CTA Section */}
				<div className="mt-16 p-8 bg-linear-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl text-center">
					<h3 className="typography-h3 text-foreground mb-4">
						Ready to transform your property management?
					</h3>
					<p className="text-muted-foreground mb-6">
						Join 10,000+ property managers using TenantFlow
					</p>
					<Button size="lg" className="px-8" asChild>
						<Link href="/login">
							Start Free Trial
							<ArrowRight className="size-5 ml-2" />
						</Link>
					</Button>
				</div>

				{/* Related Articles */}
				{relatedPosts && relatedPosts.length > 0 && (
					<section className="mt-16">
						<h2 className="text-2xl font-bold mb-6">Related Articles</h2>
						<div className="grid md:grid-cols-3 gap-6">
							{relatedPosts.map(rp => (
								<BlogCard key={rp.id} post={rp} />
							))}
						</div>
					</section>
				)}
			</article>
		</PageLayout>
	)
}
