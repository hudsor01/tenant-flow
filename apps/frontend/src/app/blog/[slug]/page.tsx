import { PageLayout } from '#components/layout/page-layout'
import { Button } from '#components/ui/button'

import { getBlogPost, getAllBlogPosts } from '#lib/blog-posts'
import { ArrowLeft, ArrowRight, Clock, User } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'

// Pre-render all blog articles at build time (Next.js 16 static generation)
export async function generateStaticParams() {
	const posts = getAllBlogPosts()
	return posts.map(post => ({ slug: post.slug }))
}

export default async function BlogArticlePage({
	params
}: {
	params: Promise<{ slug: string }>
}) {
	const { slug } = await params
	const post = getBlogPost(slug)

	if (!post) {
		notFound()
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
		</PageLayout>
	)
}
