'use client'

import Footer from '#components/layout/footer'
import Navbar from '#components/layout/navbar'
import { Button } from '#components/ui/button'
import { GridPattern } from '#components/ui/grid-pattern'
import { getBlogPost } from '#lib/blog-posts'
import DOMPurify from 'dompurify'
import { ArrowLeft, ArrowRight, Clock, User } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { useMemo } from 'react'

export default function BlogArticlePage({
	params
}: {
	params: { slug: string }
}) {
	const post = getBlogPost(params.slug)

	if (!post) {
		notFound()
	}

	const sanitizedContent = useMemo(() => {
		// SSR guard: DOMPurify requires window object
		if (typeof window === 'undefined') {
			return post.content.replace(/\n/g, '<br />')
		}

		return DOMPurify.sanitize(post.content.replace(/\n/g, '<br />'), {
			ALLOWED_TAGS: [
				'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br',
				'strong', 'em', 'a', 'ul', 'ol', 'li',
				'blockquote', 'code', 'pre', 'b', 'i', 'img'
			],
			ALLOWED_ATTR: [
				'href', 'target', 'rel',
				'src', 'alt', 'width', 'height',
				'srcset', 'sizes', 'loading', 'decoding',
				'class', 'title'
			]
		})
	}, [post.content])

	return (
		<div className="relative min-h-screen flex flex-col">
			{/* Full page grid background */}
			<GridPattern className="fixed inset-0 -z-10" />

			{/* Navigation */}
			<Navbar />

			<main className="flex-1">
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

						<div className="flex items-center gap-6 text-sm text-muted-foreground border-t border-b border-border py-4">
							<div className="flex items-center gap-2">
								<User className="size-4" />
								<span>{post.author}</span>
							</div>
							<div className="flex items-center gap-2">
								<Clock className="size-4" />
								<span>{post.readTime}</span>
							</div>
							<div>{post.date}</div>
						</div>
					</header>

					{/* Article Content */}
					<div className="prose prose-lg prose-slate dark:prose-invert max-w-none">
						<div
							className="
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
								[&>img]:rounded-lg [&>img]:my-8 [&>img]:shadow-lg
							"
							dangerouslySetInnerHTML={{
								__html: sanitizedContent
							}}
						/>
					</div>

					{/* CTA Section */}
					<div className="mt-16 p-8 bg-linear-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl text-center">
						<h3 className="text-2xl font-bold text-foreground mb-4">
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
			</main>

			<Footer />
		</div>
	)
}
