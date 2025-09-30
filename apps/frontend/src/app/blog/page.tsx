'use client'

import Footer from '@/components/layout/footer'
import { HeroSection } from '@/components/sections/hero-section'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GridBackground } from '@/components/ui/grid-background'
import { getAllBlogPosts } from '@/lib/blog-posts'
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
	const blogPosts = getAllBlogPosts()
	return (
		<div className="relative min-h-screen flex flex-col">
			{/* Full page grid background */}
			<GridBackground className="fixed inset-0 -z-10" />

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

			{/* Hero Section */}
			<HeroSection
				trustBadge="50,000+ downloads from property managers"
				title="Free guides to save"
				titleHighlight="$30,000+ annually"
				subtitle="Proven playbooks used by 10,000+ property managers to increase NOI by 40%, cut costs by 32%, and reclaim 20+ hours weekly. No fluff, just results."
				primaryCta={{
					label: 'Get Instant Access to All Guides',
					href: '/signup'
				}}
				secondaryCta={{ label: 'Calculate Your Savings', href: '/pricing' }}
				trustSignals="50,000+ downloads • 40% NOI increase • 32% cost reduction"
				image={{
					src: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=2070&auto=format&fit=crop',
					alt: 'Content creation workspace for property management resources'
				}}
			/>

			{/* Featured Article - High-Converting Content */}
			<section className="section-hero">
				<div className="max-w-6xl mx-auto px-6 lg:px-8">
					<div className="bg-card rounded-2xl p-8 md:p-12 border border-border/50 shadow-lg">
						<div className="grid md:grid-cols-2 gap-8 items-center">
							<div>
								<Badge className="mb-4 bg-primary/10 text-primary">
									<TrendingUp className="w-3 h-3 mr-1" />
									Downloaded 50,000+ Times
								</Badge>
								<h2 className="text-4xl font-bold mb-4">
									The $30,000 Property Management Savings Playbook
								</h2>
								<p className="text-muted-foreground mb-6 text-lg">
									The exact 90-day blueprint our top 1% of users follow to save 
									$2,400+ per property annually. Includes templates, calculators, 
									and step-by-step automation workflows.
								</p>
								<div className="flex items-center gap-6 mb-6">
									<div className="flex items-center gap-2">
										<Clock className="w-4 h-4 text-accent" />
										<span className="text-sm text-muted-foreground">
											15 min to implement
										</span>
									</div>
									<div className="flex items-center gap-2">
										<Users className="w-4 h-4 text-primary" />
										<span className="text-sm text-muted-foreground">
											$2.4M+ saved by readers
										</span>
									</div>
								</div>
								<Button size="lg" className="px-8">
									Read Complete Guide
									<ArrowRight className="w-5 h-5 ml-2" />
								</Button>
							</div>
							<div className="bg-card rounded-xl p-8 border border-border/50 shadow-md">
								<div className="text-center">
									<div className="text-4xl font-bold text-primary mb-2">
										40%
									</div>
									<p className="text-sm text-muted-foreground mb-4">
										Average NOI Increase
									</p>

									<div className="grid grid-cols-2 gap-4 text-sm">
										<div>
											<div className="text-2xl font-bold text-accent mb-1">
												65%
											</div>
											<p className="text-muted-foreground">
												Faster Vacancy Filling
											</p>
										</div>
										<div>
											<div className="text-2xl font-bold text-primary mb-1">
												32%
											</div>
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
			<section className="section-hero bg-muted/20">
				<div className="max-w-6xl mx-auto px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="text-4xl font-bold mb-4">Learn what works</h2>
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
						].map((category, index) => (
							<Link
								key={index}
								href={`/blog/category/${category.name.toLowerCase().replace(' ', '-')}`}
								className="bg-card p-8 rounded-lg border border-border/50 shadow-md transition-all duration-300 text-center group hover:-translate-y-1"
							>
								<div
									className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${category.color.replace('text-primary', 'bg-primary/10').replace('text-accent', 'bg-accent/10')}`}
								>
									<category.icon
										className={`w-8 h-8 ${category.color.split(' ')[1]}`}
									/>
								</div>
								<h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
									{category.name}
								</h3>
								<p className="text-muted-foreground text-sm mb-4">
									{category.description}
								</p>
								<Badge className={category.color}>
									{category.count} guides
								</Badge>
							</Link>
						))}
					</div>
				</div>
			</section>

			{/* High-Converting Articles */}
			<section className="section-hero">
				<div className="max-w-6xl mx-auto px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="text-4xl font-bold mb-4">
							Latest strategies that work
						</h2>
						<p className="text-xl text-muted-foreground">
							Proven techniques being used by successful property managers today
						</p>
					</div>

					<div className="grid md:grid-cols-3 gap-8">
						{blogPosts.map((post) => (
							<Link
								key={post.slug}
								href={`/blog/${post.slug}`}
								className="bg-card rounded-xl p-8 border border-border/50 shadow-md transition-all duration-300 group hover:-translate-y-1"
							>
								<div className="flex items-center justify-between mb-4">
									<Badge className="bg-primary/10 text-primary">{post.category}</Badge>
									<div className="text-sm text-muted-foreground">
										{post.readTime}
									</div>
								</div>

								<h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors leading-tight">
									{post.title}
								</h3>

								<p className="text-muted-foreground mb-4 leading-relaxed">
									{post.excerpt}
								</p>

								<div className="flex items-center justify-between">
									<div className="text-sm font-semibold text-primary">
										Read Article
									</div>
									<div className="text-sm text-muted-foreground">
										{post.date}
									</div>
								</div>
							</Link>
						))}
					</div>

					<div className="text-center mt-16">
						<Button
							size="lg"
							variant="outline"
							className="px-8"
						>
							View All Success Strategies
							<ArrowRight className="w-5 h-5 ml-2" />
						</Button>
					</div>
				</div>
			</section>

			{/* Newsletter with Strong Value Prop */}
			<section className="section-content bg-primary">
				<div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
					<h2 className="text-4xl font-bold text-primary-foreground mb-4">
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
			</main>

			<Footer />
		</div>
	)
}
