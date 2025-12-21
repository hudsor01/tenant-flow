'use client'

import { PageLayout } from '#components/layout/page-layout'
import { Button } from '#components/ui/button'
import { useBlogBySlug } from '#hooks/api/use-blogs'
import { ArrowLeft, ArrowRight, Clock, User } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'

export default function BlogArticlePage() {
	const params = useParams()
	const slug = params.slug as string
	const { data: post, isLoading } = useBlogBySlug(slug)

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
							<div key={i} className="h-4 bg-muted rounded w-full animate-pulse" />
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

				{/* Article Header */}
				<article className="container mx-auto px-6 pb-16 max-w-4xl">
					<header className="mb-12">
						<h1 className="text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
							{post.title}
						</h1>

						<p className="text-xl text-muted-foreground leading-relaxed mb-8">
							{post.excerpt}
						</p>

						<div className="flex items-center gap-6 text-muted border-t border-b border-border py-4">
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
						</div>
					</header>

					{/* Article Content */}
					<div className="prose prose-lg prose-slate dark:prose-invert max-w-none
						[&>h1]:text-4xl [&>h1]:font-bold [&>h1]:mt-12 [&>h1]:mb-6 [&>h1]:text-foreground
						[&>h2]:text-3xl [&>h2]:font-bold [&>h2]:mt-10 [&>h2]:mb-5 [&>h2]:text-foreground
						[&>h3]:text-2xl [&>h3]:font-semibold [&>h3]:mt-8 [&>h3]:mb-4 [&>h3]:text-foreground
						[&>p]:text-lg [&>p]:text-muted-foreground [&>p]:leading-relaxed [&>p]:mb-6
						[&>ul]:text-lg [&>ul]:text-muted-foreground [&>ul]:mb-6 [&>ul]:ml-6
						[&>ol]:text-lg [&>ol]:text-muted-foreground [&>ol]:mb-6 [&>ol]:ml-6
						[&>li]:mb-2
						[&>blockquote]:border-l-4 [&>blockquote]:border-primary [&>blockquote]:pl-6 [&>blockquote]:py-4 [&>blockquote]:my-8 [&>blockquote]:italic [&>blockquote]:text-foreground [&>blockquote]:bg-primary/5 [&>blockquote]:rounded-r-lg
						[&>pre]:bg-muted [&>pre]:p-6 [&>pre]:rounded-lg [&>pre]:overflow-x-auto [&>pre]:my-8
						[&>code]:bg-muted [&>code]:px-2 [&>code]:py-1 [&>code]:rounded [&>code]:text-sm [&>code]:text-foreground
						[&>a]:text-primary [&>a]:underline [&>a]:hover:text-primary/80
						[&>img]:rounded-lg [&>img]:my-8 [&>img]:shadow-lg">
						<ReactMarkdown
							remarkPlugins={[remarkGfm]}
							rehypePlugins={[rehypeRaw, rehypeSanitize]}
						>
							{markdownContent}
						</ReactMarkdown>
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
				</article>
		</PageLayout>
	)
}
