'use client'

import Footer from '@/components/layout/footer'
import { GridPattern } from '@/components/magicui/grid-pattern'
import { HeroSection } from '@/components/sections/hero-section'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardLayout } from '@/components/ui/card-layout'

import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemSeparator,
	ItemTitle
} from '@/components/ui/item'
import {
	ArrowRight,
	Book,
	Clock,
	Mail,
	MessageCircle,
	Phone,
	TrendingUp,
	Users
} from 'lucide-react'
import Link from 'next/link'

export default function HelpPage() {
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
							href="/signup"
							className="hidden sm:flex px-4 py-2 text-foreground rounded-xl hover:bg-accent transition-all duration-300 font-medium"
						>
							Sign In
						</Link>
						<Link
							href="/signup"
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
					trustBadge="Expert support team standing by"
					title="We guarantee your success"
					titleHighlight="or your money back"
					subtitle="Get white-glove support from property management experts who&apos;ve helped 10,000+ managers save $30,000+ annually. Average response time: 90 seconds. Success rate: 98.7%."
					primaryCta={{
						label: 'Get Instant Expert Help',
						href: '/signup'
					}}
					secondaryCta={{ label: 'Schedule Success Call', href: '/contact' }}
					trustSignals="24/7 Expert Support • 90-second response • 98.7% success rate"
					image={{
						src: 'https://images.unsplash.com/photo-155676175-b413da4baf72?q=80&w=2074&auto=format&fit=crop',
						alt: 'Professional customer support team helping property managers'
					}}
				/>

				{/* Support Options */}
				<section className="section-hero">
					<div className="max-w-6xl mx-auto px-6 lg:px-8">
						<div className="text-center mb-16">
							<h2 className="text-4xl font-bold mb-4">
								Your success team is standing by
							</h2>
							<p className="text-xl text-muted-foreground">
								Average customer saves $30,000 in year one with our expert
								guidance
							</p>
						</div>

						<ItemGroup>
							<Item variant="outline">
								<ItemMedia variant="icon">
									<MessageCircle />
								</ItemMedia>
								<ItemContent>
									<ItemTitle>Live Expert Chat</ItemTitle>
									<ItemDescription>
										Instant answers from property management specialists
									</ItemDescription>
									<div className="mt-2 space-y-2">
										<Badge
											variant="outline"
											className="text-success border-success/30"
										>
											<div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
											Online Now
										</Badge>
										<p className="text-sm text-muted-foreground">
											Average response: 90 seconds
										</p>
									</div>
								</ItemContent>
								<ItemActions>
									<Button className="w-full">Start Chat</Button>
								</ItemActions>
							</Item>

							<ItemSeparator />

							<Item variant="outline">
								<ItemMedia variant="icon">
									<Phone />
								</ItemMedia>
								<ItemContent>
									<ItemTitle>ROI Consultation</ItemTitle>
									<ItemDescription>
										Free 30-minute call with automation expert
									</ItemDescription>
									<div className="mt-2">
										<p className="text-sm text-muted-foreground">
											Get custom ROI projection for your portfolio
										</p>
									</div>
								</ItemContent>
								<ItemActions>
									<Button className="w-full" variant="outline">
										Schedule Call
									</Button>
								</ItemActions>
							</Item>

							<ItemSeparator />

							<Item variant="outline">
								<ItemMedia variant="icon">
									<Book />
								</ItemMedia>
								<ItemContent>
									<ItemTitle>Success Guides</ItemTitle>
									<ItemDescription>
										Step-by-step guides to maximize your results
									</ItemDescription>
									<div className="mt-2">
										<p className="text-sm text-muted-foreground">
											Learn proven strategies from top property managers
										</p>
									</div>
								</ItemContent>
								<ItemActions>
									<Button className="w-full" variant="outline">
										Browse Guides
									</Button>
								</ItemActions>
							</Item>

							<ItemSeparator />

							<Item variant="outline">
								<ItemMedia variant="icon">
									<Mail />
								</ItemMedia>
								<ItemContent>
									<ItemTitle>Priority Support</ItemTitle>
									<ItemDescription>
										Detailed help via email within 4 hours
									</ItemDescription>
									<div className="mt-2">
										<p className="text-sm text-muted-foreground">
											support@tenantflow.app
										</p>
									</div>
								</ItemContent>
								<ItemActions>
									<Button className="w-full" variant="outline">
										Send Email
									</Button>
								</ItemActions>
							</Item>
						</ItemGroup>
					</div>
				</section>

				{/* Success Stories */}
				<section className="section-hero bg-muted/20">
					<div className="max-w-6xl mx-auto px-6 lg:px-8">
						<div className="text-center mb-16">
							<h2 className="text-4xl font-bold mb-4">
								Success stories from our clients
							</h2>
							<p className="text-xl text-muted-foreground">
								See how TenantFlow&apos;s support team helped property managers
								achieve amazing results
							</p>
						</div>

						<div className="grid md:grid-cols-3 gap-8">
							<CardLayout
								title="Sarah M."
								description="Portfolio Manager"
								className="bg-card border border-border/50 shadow-md"
							>
								<div className="flex items-center mb-4">
									<TrendingUp className="w-8 h-8 text-primary mr-3" />
									<div>
										<h3 className="font-semibold">Sarah M.</h3>
										<p className="text-sm text-muted-foreground">
											Portfolio Manager
										</p>
									</div>
								</div>
								<p className="text-muted-foreground mb-4">
									&quot;TenantFlow&apos;s support team helped me implement automation that
									increased my NOI by 45% in just 60 days. Their expertise made
									all the difference.&quot;
								</p>
								<div className="text-sm font-semibold text-primary">
									Result: 45% NOI increase in 60 days
								</div>
							</CardLayout>

							<CardLayout
								title="Michael R."
								description="Real Estate Investor"
								className="bg-card border border-border/50 shadow-md"
							>
								<div className="flex items-center mb-4">
									<Clock className="w-8 h-8 text-accent mr-3" />
									<div>
										<h3 className="font-semibold">Michael R.</h3>
										<p className="text-sm text-muted-foreground">
											Real Estate Investor
										</p>
									</div>
								</div>
								<p className="text-muted-foreground mb-4">
									&quot;The onboarding team had me fully automated within 24 hours. I
									now save 25+ hours per week and my vacancy rates dropped by
									70%.&quot;
								</p>
								<div className="text-sm font-semibold text-accent">
									Result: 25+ hours saved per week
								</div>
							</CardLayout>

							<CardLayout
								title="David L."
								description="Property Management Company"
								className="bg-card border border-border/50 shadow-md"
							>
								<div className="flex items-center mb-4">
									<Users className="w-8 h-8 text-primary mr-3" />
									<div>
										<h3 className="font-semibold">David L.</h3>
										<p className="text-sm text-muted-foreground">
											Property Management Company
										</p>
									</div>
								</div>
								<p className="text-muted-foreground mb-4">
									&quot;TenantFlow&apos;s customer success manager helped us scale from 50
									to 500 properties seamlessly. Our maintenance costs dropped
									35%.&quot;
								</p>
								<div className="text-sm font-semibold text-primary">
									Result: Scaled to 50 properties, 35% cost reduction
								</div>
							</CardLayout>
						</div>
					</div>
				</section>

				{/* Popular Resources */}
				<section className="section-hero">
					<div className="max-w-4xl mx-auto px-6 lg:px-8">
						<div className="text-center mb-16">
							<h2 className="text-4xl font-bold mb-4">Popular resources</h2>
							<p className="text-xl text-muted-foreground">
								Quick access to the most requested help topics
							</p>
						</div>

						<div className="grid md:grid-cols-2 gap-6">
							{[
								{
									title: 'How to increase NOI by 40% in 90 days',
									description:
										'Step-by-step guide to implementing the strategies that deliver guaranteed results',
									badge: 'Most Popular',
									badgeColor: 'bg-primary/10 text-primary'
								},
								{
									title: 'Automating 80% of daily tasks',
									description:
										'Complete setup guide for workflow automation that saves 20+ hours per week',
									badge: 'Implementation Guide',
									badgeColor: 'bg-accent/10 text-accent'
								},
								{
									title: 'Reducing vacancy time by 65%',
									description:
										'Proven techniques for faster tenant placement and reduced revenue loss',
									badge: 'Quick Win',
									badgeColor: 'bg-primary/10 text-primary'
								},
								{
									title: 'Cutting maintenance costs by 32%',
									description:
										'Smart vendor management and predictive maintenance strategies',
									badge: 'Cost Savings',
									badgeColor: 'bg-accent/10 text-accent'
								}
							].map((resource, index) => (
								<CardLayout
									key={index}
									title={resource.title}
									description={resource.description}
									className="bg-card border border-border/50 shadow-md transition-shadow"
								>
									<div className="flex items-start justify-between mb-4">
										<h3 className="font-semibold text-lg leading-tight pr-4">
											{resource.title}
										</h3>
										<Badge className={resource.badgeColor}>
											{resource.badge}
										</Badge>
									</div>
									<p className="text-muted-foreground mb-4">
										{resource.description}
									</p>
									<Button variant="outline" className="w-full">
										Read Guide
										<ArrowRight className="w-4 h-4 ml-2" />
									</Button>
								</CardLayout>
							))}
						</div>
					</div>
				</section>

				{/* CTA Section */}
				<section className="section-content bg-primary">
					<div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
						<h2 className="text-4xl font-bold text-primary-foreground mb-4">
							Ready to stop losing money?
						</h2>
						<p className="text-xl text-primary-foreground/90 mb-8">
							Join 10,000+ property managers who have increased their NOI by 40%
							with TenantFlow. Our experts are standing by to help you get
							started.
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Button size="lg" variant="secondary" className="px-8">
								Start 14-day transformation
								<ArrowRight className="w-5 h-5 ml-2" />
							</Button>
							<Button size="lg" variant="outline" className="px-8">
								Talk to an Expert
							</Button>
						</div>
					</div>
				</section>
			</main>

			<Footer />
		</div>
	)
}
