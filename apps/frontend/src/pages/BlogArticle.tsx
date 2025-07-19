import React from 'react'
import { useParams, Navigate, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { SEO } from '@/components/seo/SEO'
import { useBlogArticleData } from '@/hooks/useBlogArticleData'
import { useBlogSEO } from '@/hooks/useBlogSEO'
import { Button } from '@/components/ui/button'
import { Clock, User, ArrowLeft, Share2, Calendar, Tag } from 'lucide-react'
import { formatArticleDate } from '@/hooks/useBlogArticleData'
import { Navigation } from '@/components/layout/Navigation'

/**
 * Modern minimalist blog article page inspired by Framer, Resend, and Oxide
 * Features clean typography, generous whitespace, and excellent reading experience
 */
export default function BlogArticle() {
	const { slug } = useParams({ from: "/blog/$slug" })

	// Get article data and validation
	const { article, isValidSlug, processedContent, isLoading } =
		useBlogArticleData({ slug })

	// Get SEO configuration
	const { seoConfig } = useBlogSEO({
		article: article || null,
		slug: slug || ''
	})

	// Animation variants
	const fadeInUp = {
		initial: { opacity: 0, y: 20 },
		animate: { opacity: 1, y: 0 },
		transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
	}

	const staggerChildren = {
		animate: {
			transition: {
				staggerChildren: 0.08
			}
		}
	}

	// Loading state
	if (isLoading) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					className="text-center"
				>
					<div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-muted border-r-primary"></div>
					<p className="mt-4 text-muted-foreground">Loading article...</p>
				</motion.div>
			</div>
		)
	}

	// Handle invalid slugs
	if (!isValidSlug) {
		return <Navigate to="/blog" replace />
	}

	return (
		<>
			<SEO {...seoConfig} />

			<div className="min-h-screen bg-background">
				<Navigation context="public" />

				{/* Article Header */}
				<header className="relative pt-24 pb-16 sm:pt-32 sm:pb-20">
					<div className="mx-auto max-w-4xl px-6 lg:px-8">
						<motion.div
							initial="initial"
							animate="animate"
							variants={staggerChildren}
						>
							{/* Back Navigation */}
							<motion.div variants={fadeInUp} className="mb-8">
								<Link
									to="/blog"
									className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
								>
									<ArrowLeft className="mr-2 h-4 w-4" />
									Back to articles
								</Link>
							</motion.div>

							{/* Category */}
							<motion.div variants={fadeInUp} className="mb-6">
								<span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
									<Tag className="mr-1 h-3 w-3" />
									{article?.category}
								</span>
							</motion.div>

							{/* Title */}
							<motion.h1
								variants={fadeInUp}
								className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl mb-6"
							>
								{article?.title}
							</motion.h1>

							{/* Description */}
							<motion.p
								variants={fadeInUp}
								className="text-xl text-muted-foreground leading-8 mb-8"
							>
								{article?.description}
							</motion.p>

							{/* Meta Information */}
							<motion.div
								variants={fadeInUp}
								className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground border-t border-border pt-6"
							>
								<div className="flex items-center gap-2">
									<User className="h-4 w-4" />
									<span className="font-medium">{article?.author?.name || article?.authorName}</span>
								</div>
								<div className="flex items-center gap-2">
									<Calendar className="h-4 w-4" />
									<time>
										{article?.publishedAt ? formatArticleDate(article.publishedAt) : 'Recent'}
									</time>
								</div>
								<div className="flex items-center gap-2">
									<Clock className="h-4 w-4" />
									<span>{article?.readTime || 5} min read</span>
								</div>
								<Button
									variant="ghost"
									size="sm"
									className="ml-auto text-muted-foreground hover:text-foreground"
								>
									<Share2 className="mr-2 h-4 w-4" />
									Share
								</Button>
							</motion.div>
						</motion.div>
					</div>
				</header>

				{/* Featured Image */}
				{article?.ogImage && (
					<div className="mx-auto max-w-5xl px-6 lg:px-8 mb-16">
						<motion.div
							initial={{ opacity: 0, y: 40 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8, delay: 0.2 }}
							className="aspect-[16/9] overflow-hidden rounded-2xl"
						>
							<img
								src={article.ogImage}
								alt={article.title}
								className="h-full w-full object-cover"
							/>
						</motion.div>
					</div>
				)}

				{/* Article Content */}
				<main className="mx-auto max-w-4xl px-6 lg:px-8 pb-24">
					<motion.article
						initial={{ opacity: 0, y: 40 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.3 }}
						className="prose prose-lg prose-gray max-w-none article-content"
					>
						<div
							dangerouslySetInnerHTML={{ __html: processedContent }}
						/>
					</motion.article>

					{/* Tags */}
					{article?.tags && article.tags.length > 0 && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.4 }}
							className="mt-16 pt-8 border-t border-border"
						>
							<h3 className="text-sm font-medium text-foreground mb-4">Tagged with</h3>
							<div className="flex flex-wrap gap-2">
								{article.tags.map(tag => (
									<span
										key={tag.id}
										className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors cursor-pointer"
									>
										{tag.name}
									</span>
								))}
							</div>
						</motion.div>
					)}

					{/* Call to Action */}
					<motion.div
						initial={{ opacity: 0, y: 40 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.5 }}
						className="mt-20 rounded-3xl bg-muted/50 p-8 sm:p-12 text-center"
					>
						<h2 className="text-2xl font-bold tracking-tight text-foreground mb-4">
							Ready to Streamline Your Property Management?
						</h2>
						<p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
							TenantFlow helps you implement these best practices with automated workflows,
							legal compliance tools, and  communication features.
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Link to="/pricing">
								<Button size="lg" className="px-8 font-semibold">
									Start Free Trial
								</Button>
							</Link>
							<Link to="/lease-generator">
								<Button variant="outline" size="lg" className="px-8 font-semibold">
									Try Lease Generator
								</Button>
							</Link>
						</div>
					</motion.div>

					{/* Newsletter Signup */}
					<motion.div
						initial={{ opacity: 0, y: 40 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.6 }}
						className="mt-20 text-center"
					>
						<h3 className="text-xl font-bold text-foreground mb-4">
							Never miss an update
						</h3>
						<p className="text-muted-foreground mb-6 max-w-md mx-auto">
							Get expert property management insights delivered to your inbox weekly.
						</p>
						<div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
							<input
								type="email"
								placeholder="Enter your email"
								className="flex-1 rounded-lg border-0 bg-background px-4 py-3 text-foreground shadow-sm ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
							/>
							<Button className="px-6 font-semibold">
								Subscribe
							</Button>
						</div>
						<p className="mt-4 text-xs text-muted-foreground">
							No spam. Unsubscribe at any time.
						</p>
					</motion.div>
				</main>
			</div>
		</>
	)
}
