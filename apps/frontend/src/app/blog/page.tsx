import Footer from '@/components/layout/footer'
import { Navbar } from '@/components/layout/navbar'
import { HeroAuthority } from '@/components/marketing/hero-authority'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
	return (
		<main className="min-h-screen bg-background">
			<Navbar />

			{/* Hero Section */}
			<HeroAuthority
				title={<>Master property management with expert insights</>}
				subtitle={
					<>
						Learn the proven strategies that help property managers increase NOI
						by 40%, reduce costs by 32%, and automate 80% of daily tasks.
					</>
				}
				primaryCta={{
					label: 'Start 14-day transformation',
					href: '/auth/sign-up'
				}}
				secondaryCta={{ label: 'Get ROI calculator', href: '/pricing' }}
			/>

			{/* Featured Article - High-Converting Content */}
			<section className="section-hero">
				<div className="container mx-auto px-6 max-w-6xl">
					<div className="card-elevated-authority rounded-2xl card-padding md:p-12">
						<div className="grid md:grid-cols-2 gap-8 items-center">
							<div>
								<Badge className="mb-4 bg-primary/10 text-primary">
									<TrendingUp className="w-3 h-3 mr-1" />
									Most Popular Guide
								</Badge>
								<h2 className="text-4xl font-bold mb-4">
									How to Increase Your NOI by 40% in 90 Days
								</h2>
								<p className="text-muted-foreground mb-6 text-lg">
									The complete step-by-step guide used by 10,000+ property
									managers to dramatically increase their net operating income
									with TenantFlow's proven automation strategies.
								</p>
								<div className="flex items-center gap-6 mb-6">
									<div className="flex items-center gap-2">
										<Clock className="w-4 h-4 text-accent" />
										<span className="text-sm text-muted-foreground">
											12 min read
										</span>
									</div>
									<div className="flex items-center gap-2">
										<Users className="w-4 h-4 text-primary" />
										<span className="text-sm text-muted-foreground">
											50K+ readers
										</span>
									</div>
								</div>
								<Button size="lg" className="px-8 btn-gradient-primary">
									Read Complete Guide
									<ArrowRight className="w-5 h-5 ml-2" />
								</Button>
							</div>
							<div className="card-elevated-authority rounded-xl card-padding">
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
				<div className="container mx-auto px-6 max-w-6xl">
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
								className="card-elevated-authority card-padding rounded-lg transition-all duration-300 text-center group hover:-translate-y-1"
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
				<div className="container mx-auto px-6 max-w-6xl">
					<div className="text-center mb-16">
						<h2 className="text-4xl font-bold mb-4">
							Latest strategies that work
						</h2>
						<p className="text-xl text-muted-foreground">
							Proven techniques being used by successful property managers today
						</p>
					</div>

					<div className="grid md:grid-cols-3 gap-8">
						{[
							{
								title:
									'Cut Maintenance Costs by 32% with Smart Vendor Management',
								excerpt:
									'Learn the exact vendor automation strategies that top property managers use to reduce maintenance costs while improving response times by 75%.',
								category: 'Cost Reduction',
								readTime: '8 min read',
								date: 'Mar 15, 2024',
								results: '32% cost savings',
								color: 'text-primary',
								badge: 'bg-primary/10 text-primary'
							},
							{
								title:
									'Reduce Vacancy Time by 65%: The Complete Tenant Placement System',
								excerpt:
									'The step-by-step process for faster tenant screening and placement that reduces vacancy periods from weeks to days.',
								category: 'Revenue Growth',
								readTime: '10 min read',
								date: 'Mar 12, 2024',
								results: '65% faster filling',
								color: 'text-accent',
								badge: 'bg-accent/10 text-accent'
							},
							{
								title:
									'Save 20+ Hours Per Week: Complete Task Automation Blueprint',
								excerpt:
									'How property managers automate maintenance tracking, lease renewals, and tenant communications to reclaim their time and scale operations.',
								category: 'Automation',
								readTime: '12 min read',
								date: 'Mar 10, 2024',
								results: '20+ hours saved',
								color: 'text-primary',
								badge: 'bg-primary/10 text-primary'
							}
						].map((article, index) => (
							<Link
								key={index}
								href={`/blog/${article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
								className="card-elevated-authority rounded-xl card-padding transition-all duration-300 group hover:-translate-y-1"
							>
								<div className="flex items-center justify-between mb-4">
									<Badge className={article.badge}>{article.category}</Badge>
									<div className="text-sm text-muted-foreground">
										{article.readTime}
									</div>
								</div>

								<h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors leading-tight">
									{article.title}
								</h3>

								<p className="text-muted-foreground mb-4 leading-relaxed">
									{article.excerpt}
								</p>

								<div className="flex items-center justify-between">
									<div className={`text-sm font-semibold ${article.color}`}>
										✓ {article.results}
									</div>
									<div className="text-sm text-muted-foreground">
										{article.date}
									</div>
								</div>
							</Link>
						))}
					</div>

					<div className="text-center mt-16">
						<Button
							size="lg"
							variant="outline"
							className="px-8 btn-gradient-primary"
						>
							View All Success Strategies
							<ArrowRight className="w-5 h-5 ml-2" />
						</Button>
					</div>
				</div>
			</section>

			{/* Newsletter with Strong Value Prop */}
			<section className="section-content gradient-authority">
				<div className="container mx-auto px-6 text-center max-w-4xl">
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

			<Footer />
		</main>
	)
}
