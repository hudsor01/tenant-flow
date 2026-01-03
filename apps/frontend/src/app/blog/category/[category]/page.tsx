'use client'

import { PageLayout } from '#components/layout/page-layout'
import { Button } from '#components/ui/button'
import { useBlogsByCategory } from '#hooks/api/use-blogs'
import { ArrowLeft, ArrowRight, BarChart3, Building2, TrendingUp, Zap } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'

// Map URL slugs to display names and icons
const categoryConfig: Record<string, { name: string; icon: LucideIcon; description: string; color: string }> = {
	'roi-maximization': {
		name: 'ROI Maximization',
		icon: TrendingUp,
		description: 'Strategies to increase your NOI by 40% or more',
		color: 'text-primary'
	},
	'task-automation': {
		name: 'Task Automation',
		icon: Zap,
		description: 'Automate 80% of your daily operations',
		color: 'text-accent'
	},
	'cost-reduction': {
		name: 'Cost Reduction',
		icon: BarChart3,
		description: 'Cut operational costs by 32%',
		color: 'text-primary'
	},
	'success-stories': {
		name: 'Success Stories',
		icon: Building2,
		description: 'Real results from property managers like you',
		color: 'text-accent'
	}
}

export default function BlogCategoryPage() {
	const params = useParams()
	const categorySlug = params.category as string

	// Get category config or use fallback
	const config = categoryConfig[categorySlug] || {
		name: categorySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
		icon: Building2,
		description: 'Browse articles in this category',
		color: 'text-primary'
	}

	// The database stores category as the display name (e.g., "ROI Maximization")
	const { data: blogPosts = [], isLoading } = useBlogsByCategory(config.name)

	const CategoryIcon = config.icon

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
				<div className="flex items-center gap-4 mb-4">
					<div className={`size-16 rounded-2xl bg-muted flex-center ${config.color}`}>
						<CategoryIcon className="size-8" />
					</div>
					<div>
						<h1 className="typography-h1">{config.name}</h1>
						<p className="text-xl text-muted-foreground">{config.description}</p>
					</div>
				</div>
			</section>

			{/* Blog Posts Grid */}
			<section className="section-spacing bg-muted/20">
				<div className="max-w-6xl mx-auto px-6 lg:px-8">
					{isLoading ? (
						<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
							{[1, 2, 3, 4, 5, 6].map(i => (
								<div
									key={i}
									className="bg-card rounded-xl p-8 border border-border/50 shadow-md"
								>
									<div className="h-4 bg-muted rounded w-20 mb-4 animate-pulse" />
									<div className="h-6 bg-muted rounded w-full mb-3 animate-pulse" />
									<div className="h-4 bg-muted rounded w-full mb-2 animate-pulse" />
									<div className="h-4 bg-muted rounded w-3/4 mb-4 animate-pulse" />
									<div className="flex-between">
										<div className="h-4 bg-muted rounded w-24 animate-pulse" />
										<div className="h-4 bg-muted rounded w-20 animate-pulse" />
									</div>
								</div>
							))}
						</div>
					) : blogPosts.length === 0 ? (
						<div className="text-center py-16">
							<CategoryIcon className={`size-16 mx-auto mb-4 ${config.color} opacity-50`} />
							<h2 className="typography-h3 mb-2">No articles yet</h2>
							<p className="text-muted-foreground mb-8">
								We're working on content for this category. Check back soon!
							</p>
							<Button asChild>
								<Link href="/blog">
									<ArrowLeft className="size-4 mr-2" />
									Browse All Articles
								</Link>
							</Button>
						</div>
					) : (
						<>
							<div className="mb-8">
								<p className="text-muted-foreground">
									{blogPosts.length} article{blogPosts.length !== 1 ? 's' : ''} in this category
								</p>
							</div>
							<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
								{blogPosts.map(post => (
									<Link
										key={post.id}
										href={`/blog/${post.slug}`}
										className="bg-card rounded-xl p-8 border border-border/50 shadow-md transition-all duration-300 group hover:-translate-y-1"
									>
										<div className="flex-between mb-4">
											<div className="text-muted">
												{post.reading_time} min read
											</div>
										</div>

										<h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors leading-tight">
											{post.title}
										</h3>

										<p className="text-muted-foreground mb-4 leading-relaxed line-clamp-3">
											{post.excerpt}
										</p>

										<div className="flex-between">
											<div className="text-sm font-semibold text-primary">
												Read Article
											</div>
											<div className="text-muted">
												{post.published_at
													? new Date(post.published_at).toLocaleDateString(
															'en-US',
															{ month: 'short', day: 'numeric', year: 'numeric' }
														)
													: ''}
											</div>
										</div>
									</Link>
								))}
							</div>
						</>
					)}

					{/* CTA Section */}
					{blogPosts.length > 0 && (
						<div className="text-center mt-16">
							<Button size="lg" variant="outline" className="px-8" asChild>
								<Link href="/blog">
									View All Articles
									<ArrowRight className="size-5 ml-2" />
								</Link>
							</Button>
						</div>
					)}
				</div>
			</section>

			{/* Newsletter CTA */}
			<section className="section-spacing bg-primary">
				<div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
					<h2 className="typography-h1 text-primary-foreground mb-4">
						Get more {config.name.toLowerCase()} tips
					</h2>
					<p className="text-xl text-primary-foreground/90 mb-8">
						Join 10,000+ property managers who get our weekly insights delivered to their inbox.
					</p>
					<div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
						<input
							type="email"
							placeholder="Enter your email address"
							className="flex-1 px-4 py-3 border-0 rounded-lg text-foreground placeholder:text-muted-foreground"
						/>
						<Button size="lg" variant="secondary" className="px-6">
							Get Free Insights
						</Button>
					</div>
					<p className="text-sm text-primary-foreground/80 mt-4">
						Free weekly insights • Unsubscribe anytime
					</p>
				</div>
			</section>
		</PageLayout>
	)
}
