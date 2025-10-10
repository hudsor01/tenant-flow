'use client'

import Footer from '@/components/layout/footer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GridPattern } from '@/components/magicui/grid-pattern'
import { getBlogPost } from '@/lib/blog-posts'
import { ArrowLeft, ArrowRight, Clock, User } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default function BlogArticlePage({
	params
}: {
	params: { slug: string }
}) {
	const post = getBlogPost(params.slug)

	if (!post) {
		notFound()
	}

	return (
		<div className="relative min-h-screen flex flex-col">
			{/* Full page grid background */}
			<GridPattern className="fixed inset-0 -z-10" />

			{/* Navigation */}
			<nav className="fixed top-6 left-1/2 z-50 w-auto -translate-x-1/2 transform rounded-full px-8 py-4 backdrop-blur-xl border border-border shadow-lg bg-background/90">
				<div className="flex items-center justify-between gap-12">
					<Link
						href="/"
						className="flex items-center space-x-3 hover:opacity-80 transition-opacity duration-200"
					>
						<div className="w-8 h-8 rounded-lg overflow-hidden bg-primary border border-border flex items-center justify-center">
							<svg
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								className="w-5 h-5 text-primary-foreground"
							>
								<path
									d="M3 21L21 21M5 21V7L12 3L19 7V21M9 12H15M9 16H15"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</div>
						<span className="text-xl font-bold text-foreground tracking-tight">
							TenantFlow
						</span>
					</Link>

					<div className="hidden md:flex items-center space-x-1">
						<Link
							href="/features"
							className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium text-sm rounded-xl hover:bg-accent transition-all duration-200"
						>
							Features
						</Link>
						<Link
							href="/pricing"
							className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium text-sm rounded-xl hover:bg-accent transition-all duration-200"
						>
							Pricing
						</Link>
						<Link
							href="/about"
							className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium text-sm rounded-xl hover:bg-accent transition-all duration-200"
						>
							About
						</Link>
						<Link
							href="/blog"
							className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium text-sm rounded-xl hover:bg-accent transition-all duration-200"
						>
							Blog
						</Link>
						<Link
							href="/faq"
							className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium text-sm rounded-xl hover:bg-accent transition-all duration-200"
						>
							FAQ
						</Link>
						<Link
							href="/contact"
							className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium text-sm rounded-xl hover:bg-accent transition-all duration-200"
						>
							Contact
						</Link>
					</div>

					<div className="flex items-center space-x-3">
						<Link
							href="/login"
							className="hidden sm:flex px-4 py-2 text-foreground rounded-xl hover:bg-accent transition-all duration-300 font-medium"
						>
							Sign In
						</Link>
						<Link
							href="/login"
							className="flex items-center px-6 py-2.5 bg-primary text-primary-foreground font-medium text-sm rounded-xl hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl"
						>
							Get Started
							<ArrowRight className="ml-2 h-4 w-4" />
						</Link>
					</div>
				</div>
			</nav>

			<main className="flex-1">
				{/* Back to Blog */}
				<div className="container mx-auto px-6 page-content pb-8 max-w-4xl">
					<Link
						href="/blog"
						className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors duration-200"
					>
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to Blog
					</Link>
				</div>

				{/* Article Header */}
				<article className="container mx-auto px-6 pb-16 max-w-4xl">
					<header className="mb-12">
						<Badge className="mb-4 bg-primary/10 text-primary">
							{post.category}
						</Badge>

						<h1 className="text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
							{post.title}
						</h1>

						<p className="text-xl text-muted-foreground leading-relaxed mb-8">
							{post.excerpt}
						</p>

						<div className="flex items-center gap-6 text-sm text-muted-foreground border-t border-b border-border py-4">
							<div className="flex items-center gap-2">
								<User className="w-4 h-4" />
								<span>{post.author}</span>
							</div>
							<div className="flex items-center gap-2">
								<Clock className="w-4 h-4" />
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
								__html: post.content.replace(/\n/g, '<br />')
							}}
						/>
					</div>

					{/* Tags */}
					<div className="mt-12 pt-8 border-t border-border">
						<div className="flex flex-wrap gap-2">
							{post.tags.map(tag => (
								<Badge key={tag} variant="outline" className="text-sm">
									{tag}
								</Badge>
							))}
						</div>
					</div>

					{/* CTA Section */}
					<div className="mt-16 p-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl text-center">
						<h3 className="text-2xl font-bold text-foreground mb-4">
							Ready to transform your property management?
						</h3>
						<p className="text-muted-foreground mb-6">
							Join 10,000+ property managers using TenantFlow
						</p>
						<Button size="lg" className="px-8" asChild>
							<Link href="/login">
								Start Free Trial
								<ArrowRight className="w-5 h-5 ml-2" />
							</Link>
						</Button>
					</div>
				</article>
			</main>

			<Footer />
		</div>
	)
}