'use client'

import { PageLayout } from '#components/layout/page-layout'
import { HeroSection } from '#components/sections/hero-section'
import { Button } from '#components/ui/button'
import { useBlogs } from '#hooks/api/use-blogs'
import {
	ArrowRight,
	BarChart3,
	Building2,
	Clock,
	TrendingUp,
	Users,
	Zap
} from 'lucide-react'
import Link from 'next/link'

export default function BlogPage() {
	const { data: blogPosts = [], isLoading } = useBlogs()
	return (
		<PageLayout>
			{/* Hero Section */}
			<HeroSection
				title="Free guides to save"
				titleHighlight="$30,000+ annually"
				subtitle="Proven playbooks used by 10,000+ property managers to increase NOI by 40%, cut costs by 32%, and reclaim 20+ hours weekly. No fluff, just results."
				primaryCta={{
					label: 'Get Instant Access to All Guides',
					href: '/pricing'
				}}
				secondaryCta={{ label: 'Calculate Your Savings', href: '/pricing' }}
				trustSignals="50,000+ downloads • 40% NOI increase • 32% cost reduction"
				image={{
					src: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=2070&auto=format&fit=crop',
					alt: 'Content creation workspace for property management resources'
				}}
			/>

			{/* Featured Article - High-Converting Content */}
			<section className="section-spacing">
				<div className="max-w-6xl mx-auto px-6 lg:px-8">
					<div className="bg-card rounded-2xl p-8 md:p-12 border border-border/50 shadow-lg">
						<div className="grid md:grid-cols-2 gap-8 items-center">
							<div>
								<h2 className="typography-h1 mb-4">
									The $30,000 Property Management Savings Playbook
								</h2>
								<p className="text-muted-foreground mb-6 text-lg">
									The exact 90-day blueprint our top 1% of users follow to save
									$2,400+ per property annually. Includes templates,
									calculators, and step-by-step automation workflows.
								</p>
								<div className="flex items-center gap-6 mb-6">
									<div className="flex items-center gap-2">
										<Clock className="size-4 text-accent" />
										<span className="text-muted">15 min to implement</span>
									</div>
									<div className="flex items-center gap-2">
										<Users className="size-4 text-primary" />
										<span className="text-muted">$2.4M+ saved by readers</span>
									</div>
								</div>
								<Button size="lg" className="px-8">
									Read Complete Guide
									<ArrowRight className="size-5 ml-2" />
								</Button>
							</div>
							<div className="bg-card rounded-xl p-8 border border-border/50 shadow-md">
								<div className="text-center">
									<div className="typography-h1 text-primary mb-2">40%</div>
									<p className="text-muted mb-4">Average NOI Increase</p>

									<div className="grid grid-cols-2 gap-4 text-sm">
										<div>
											<div className="typography-h3 text-accent mb-1">65%</div>
											<p className="text-muted-foreground">
												Faster Vacancy Filling
											</p>
										</div>
										<div>
											<div className="typography-h3 text-primary mb-1">32%</div>
											<p className="text-muted-foreground">Cost Reduction</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Results-Focused Categories */}
			<section className="section-spacing bg-muted/20">
				<div className="max-w-6xl mx-auto px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="typography-h1 mb-4">Learn what works</h2>
						<p className="text-xl text-muted-foreground">
							Browse strategies proven to deliver results for property managers
						</p>
					</div>

					<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
						{[
							{
								name: 'ROI Maximization',
								count: 15,
								icon: TrendingUp,
								description: 'Strategies to increase NOI by 40%+',
								color: 'bg-primary/10 text-primary'
							},
							{
								name: 'Task Automation',
								count: 22,
								icon: Zap,
								description: 'Automate 80% of daily operations',
								color: 'bg-accent/10 text-accent'
							},
							{
								name: 'Cost Reduction',
								count: 18,
								icon: BarChart3,
								description: 'Cut operational costs by 32%',
								color: 'bg-primary/10 text-primary'
							},
							{
								name: 'Success Stories',
								count: 12,
								icon: Building2,
								description: 'Real results from property managers',
								color: 'bg-accent/10 text-accent'
							}
						].map(category => (
							<Link
								key={category.name}
								href={`/blog/category/${category.name.toLowerCase().replace(' ', '-')}`}
								className="bg-card p-8 rounded-lg border border-border/50 shadow-md transition-all duration-300 text-center group hover:-translate-y-1"
							>
								<div
									className={`size-16 rounded-2xl flex-center mx-auto mb-4 ${category.color.replace('text-primary', 'bg-primary/10').replace('text-accent', 'bg-accent/10')}`}
								>
									<category.icon
										className={`size-8 ${category.color.split(' ')[1]}`}
									/>
								</div>
								<h3 className="typography-h4 mb-2 group-hover:text-primary transition-colors">
									{category.name}
								</h3>
								<p className="text-muted-foreground text-sm mb-4">
									{category.description}
								</p>
							</Link>
						))}
					</div>
				</div>
			</section>

			{/* High-Converting Articles */}
			<section className="section-spacing">
				<div className="max-w-6xl mx-auto px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="typography-h1 mb-4">Latest strategies that work</h2>
						<p className="text-xl text-muted-foreground">
							Proven techniques being used by successful property managers today
						</p>
					</div>

					{isLoading ? (
						<div className="grid md:grid-cols-3 gap-8">
							{[1, 2, 3].map(i => (
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
						<div className="text-center text-muted-foreground">
							<p>No blog posts available yet. Check back soon!</p>
						</div>
					) : (
						<div className="grid md:grid-cols-3 gap-8">
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

									<p className="text-muted-foreground mb-4 leading-relaxed">
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
					)}

					<div className="text-center mt-16">
						<Button size="lg" variant="outline" className="px-8">
							View All Success Strategies
							<ArrowRight className="size-5 ml-2" />
						</Button>
					</div>
				</div>
			</section>

			{/* Newsletter with Strong Value Prop */}
			<section className="section-spacing bg-primary">
				<div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
					<h2 className="typography-h1 text-primary-foreground mb-4">
						Get the strategies that increase NOI by 40%
					</h2>
					<p className="text-xl text-primary-foreground/90 mb-8">
						Join 10,000+ property managers who get our weekly insights on
						automation, cost reduction, and revenue optimization delivered to
						their inbox.
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
						Free weekly insights • Unsubscribe anytime • 10,000+ subscribers
					</p>
				</div>
			</section>
		</PageLayout>
	)
}
