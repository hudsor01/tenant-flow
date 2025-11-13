'use client'

import Footer from '#components/layout/footer'
import Navbar from '#components/layout/navbar'
import { BlurFade } from '#components/ui/blur-fade'
import { Button } from '#components/ui/button'
import { GridPattern } from '#components/ui/grid-pattern'
import { LazySection } from '#components/ui/lazy-section'
import { SectionSkeleton } from '#components/ui/section-skeleton'
import { cn } from '#lib/utils'
import {
	ArrowRight,
	BarChart3,
	Check,
	ChevronRight,
	Clock,
	Shield,
	Star,
	TrendingUp,
	Users,
	Zap
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function FeaturesPage() {
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tenantflow.app'

	const [currentTestimonial, setCurrentTestimonial] = useState(0)
	const [stickyCtaVisible, setStickyCtaVisible] = useState(false)

	// Sticky CTA visibility on scroll
	useEffect(() => {
		const handleScroll = () => {
			setStickyCtaVisible(window.scrollY > 800)
		}
		window.addEventListener('scroll', handleScroll)
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	// Breadcrumb Schema
	const breadcrumbSchema = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{
				'@type': 'ListItem',
				position: 1,
				name: 'Home',
				item: baseUrl
			},
			{
				'@type': 'ListItem',
				position: 2,
				name: 'Features',
				item: `${baseUrl}/features`
			}
		]
	}

	const testimonials = [
		{
			quote:
				'TenantFlow increased our NOI by 47% in just 6 months. The automation alone saves us 25 hours per week.',
			author: 'Sarah Chen',
			title: 'Portfolio Manager',
			company: 'West Coast Properties',
			avatar: '/tenant-flow-logo.png'
		},
		{
			quote:
				'Best property management decision we&apos;ve made. ROI was clear within 60 days.',
			author: 'Marcus Rodriguez',
			title: 'Director of Operations',
			company: 'Urban Real Estate Group',
			avatar: '/tenant-flow-logo.png'
		},
		{
			quote:
				'The security and compliance features give us complete peace of mind with enterprise-grade protection.',
			author: 'Jennifer Walsh',
			title: 'Chief Technology Officer',
			company: 'Metropolitan Holdings',
			avatar: '/tenant-flow-logo.png'
		}
	]

	// Auto-rotate testimonials
	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentTestimonial(prev => (prev + 1) % testimonials.length)
		}, 5000)
		return () => clearInterval(interval)
	}, [testimonials.length])

	const t = (testimonials[currentTestimonial] ??
		testimonials[0]) as (typeof testimonials)[number]

	return (
		<div className="relative min-h-screen flex flex-col">
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(breadcrumbSchema).replace(/</g, '\\u003c')
				}}
			/>
			{/* Full page grid background */}
			<GridPattern className="fixed inset-0 -z-10" />

			{/* Navigation */}
			<Navbar />

			{/* Sticky CTA */}
			<div
				className={cn(
					'fixed top-4 right-4 z-50 transition-all duration-500 transform',
					stickyCtaVisible
						? 'translate-y-0 opacity-100'
						: '-translate-y-2 opacity-0 pointer-events-none'
				)}
			>
				<Button
					size="lg"
					className="shadow-2xl shadow-primary/25 font-semibold"
					asChild
				>
					<Link href="/signup" aria-label="Get started free">
						Start Free Trial
						<ArrowRight className="size-4 ml-2" />
					</Link>
				</Button>
			</div>

			{/* Hero Section with Modern Background */}
			<section className="relative pt-40 pb-16 overflow-hidden">
				{/* Solid tint background */}
				<div className="absolute inset-0 bg-[color-mix(in_oklch,var(--primary)_5%,transparent)]" />

				{/* Subtle pattern overlay */}
				<div className="absolute inset-0 opacity-[0.015] bg-[radial-gradient(circle_at_1px_1px,var(--foreground)_1px,transparent_0)] bg-size-[32px_32px]" />

				<div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
					<BlurFade delay={0.1} inView>
						<div className="text-center max-w-5xl mx-auto space-y-8">
							{/* Strengthened headline with premium typography */}
							<h1 className="text-5xl lg:text-7xl font-bold tracking-tight leading-tight">
								<span className="text-foreground">Transform your portfolio into a</span>{' '}
								<span className="hero-highlight">profit powerhouse</span>
							</h1>

							{/* Concise, benefit-driven subtext */}
							<p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto text-xl font-medium">
								Join 10,000+ property managers who&apos;ve increased NOI by 40%
								with enterprise-grade automation and AI-powered analytics.{' '}
								<span className="text-foreground font-semibold">
									ROI guaranteed in 90 days.
								</span>
							</p>

							{/* High-contrast, prominent CTAs */}
							<div className="flex flex-col sm:flex-row gap-6 justify-center pt-4">
								<Button
									size="lg"
									className="group relative overflow-hidden shadow-2xl shadow-primary/25 hover:shadow-3xl hover:shadow-primary/40 transform hover:scale-[1.02] transition-all duration-300 text-lg font-semibold px-8 py-4"
									asChild
								>
									<Link href="/signup" aria-label="Start free trial">
										<div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-card/50" />
										<span className="relative z-10 flex items-center">
											Start Free Trial
											<ArrowRight className="size-5 ml-3 transition-transform group-hover:translate-x-1" />
										</span>
									</Link>
								</Button>
								<Button
									size="lg"
									variant="outline"
									className="group border-2 border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 text-lg font-semibold px-8 py-4 transition-all duration-300"
									asChild
								>
									<Link href="/contact" aria-label="See TenantFlow in action">
										<ArrowRight className="size-5 mr-3 opacity-70 group-hover:opacity-100" />
										See it in action
									</Link>
								</Button>
							</div>

							{/* Social proof below CTAs */}
							<p className="text-muted-foreground/80 text-sm font-medium">
								<Check className="size-4 inline text-primary mr-2" />
								Join 10,000+ managers already growing NOI • No credit card
								required
							</p>
						</div>
					</BlurFade>
				</div>
			</section>

			{/* Feature callouts (concise horizontal pills) */}
			<section className="section-spacing-compact">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<div className="grid gap-3 md:grid-cols-3">
						<FeaturePill
							icon={<BarChart3 className="size-5" />}
							title="Reduce Vacancy by 65%"
							description="Smart screening + marketing fill units faster"
						/>
						<FeaturePill
							icon={<Zap className="size-5" />}
							title="Automate 80% of Tasks"
							description="Rent, renewals, and comms on autopilot"
						/>
						<FeaturePill
							icon={<Shield className="size-5" />}
							title="Enterprise Security"
							description="SOC 2, RBAC, and audit logging"
						/>
					</div>
				</div>
			</section>

			{/* Trust Indicators with Customer Testimonials */}
			<LazySection
				fallback={<SectionSkeleton height={400} variant="card" />}
				minHeight={400}
			>
				<section className="section-spacing-compact bg-muted/50">
					<div className="max-w-7xl mx-auto px-6 lg:px-8">
						<BlurFade delay={0.2} inView>
							<div className="text-center space-y-8">
								{/* Press mentions and awards */}
								<div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground/60">
									<div className="flex items-center space-x-2">
										<Star className="size-4 fill-current text-accent" />
										<span className="font-medium">
											Featured in PropTech Today
										</span>
									</div>
									<div className="flex items-center space-x-2">
										<span className="font-medium">99.9% Uptime SLA</span>
									</div>
								</div>

								{/* Rotating testimonial */}
								<div className="max-w-4xl mx-auto">
									<div className="relative rounded-2xl p-8 border border-primary/10 backdrop-blur-sm bg-card/50">
										<>
											<blockquote className="text-xl text-foreground font-medium leading-relaxed mb-6">
												&quot;{t.quote}&quot;
											</blockquote>
											<div className="flex items-center justify-center space-x-4">
												<Image
													src={t.avatar}
													alt={t.author}
													width={48}
													height={48}
													className="size-12 rounded-full"
												/>
												<div className="text-left">
													<div className="font-semibold text-foreground">
														{t.author}
													</div>
													<div className="text-muted-foreground text-sm">
														{t.title}, {t.company}
													</div>
												</div>
											</div>
										</>

										{/* Testimonial dots */}
										<div className="flex justify-center space-x-2 mt-6">
											{testimonials.map((_, index) => (
												<button
													type="button"
													key={index}
													onClick={() => setCurrentTestimonial(index)}
													className={cn(
														'size-2 rounded-full transition-colors duration-300',
														index === currentTestimonial
															? 'bg-primary'
															: 'bg-muted-foreground/30'
													)}
												/>
											))}
										</div>
									</div>
								</div>
							</div>
						</BlurFade>
					</div>
				</section>
			</LazySection>

			{/* Transformation Journey - Redesigned Feature Callouts */}
			<LazySection
				fallback={<SectionSkeleton height={600} variant="grid" />}
				minHeight={600}
			>
				<section className="section-spacing">
					<div className="max-w-7xl mx-auto px-6 lg:px-8">
						<BlurFade delay={0.3} inView>
							<div className="text-center mb-16 space-y-6">
								<h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
									Your 3-step transformation to{' '}
									<span className="hero-highlight">
										maximum profitability
									</span>
								</h2>
								<p className="text-muted-foreground text-lg leading-relaxed max-w-3xl mx-auto">
									See how property managers systematically transform their
									portfolios with our proven methodology
								</p>
							</div>

							{/* Horizontal transformation cards */}
							<div className="grid md:grid-cols-3 gap-8 relative">
								{/* Connection lines for desktop */}
								<div className="hidden md:block absolute top-24 left-1/2 transform translate-x-[-50%] w-full max-w-4xl">
									<div className="flex items-center justify-between px-16">
										<ChevronRight className="size-6 text-primary/40" />
										<ChevronRight className="size-6 text-primary/40" />
									</div>
								</div>

								{/* Step 1: Fill Units Faster */}
								<div className="group relative">
									<div className="rounded-3xl p-8 border transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 group-hover:scale-[1.02] bg-card/60 border-accent/25 dark:bg-muted/60 dark:border-accent/30 hover:border-accent/40 dark:hover:border-accent/50">
										{/* Step indicator */}
										<div className="absolute -top-4 left-8 bg-primary text-primary-foreground text-sm font-bold px-3 py-1 rounded-full">
											Step 1
										</div>

										{/* Icon with enhanced visual metaphor */}
										<div className="size-16 rounded-2xl bg-[color-mix(in_oklch,var(--primary)_15%,transparent)] mx-auto mb-6 flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110">
											<TrendingUp className="size-8 text-primary" />
										</div>

										<h3 className="font-bold text-foreground mb-4 text-xl">
											Fill Units Faster
										</h3>
										<p className="text-muted-foreground mb-6 leading-relaxed">
											Smart tenant screening and automated marketing reduce
											vacancy time by 65%
										</p>

										{/* Key metric highlight */}
										<div
											className={cn(
												'rounded-xl border p-4 mb-4 transition-colors',
												'bg-card/50',
												'dark:bg-muted/50',
												'border-accent/25'
											)}
										>
											<div className="text-2xl font-bold text-accent">65%</div>
											<div className="text-sm text-muted-foreground">
												Faster unit filling
											</div>
										</div>

										<ul className="space-y-2 text-sm">
											<li className="flex items-center">
												<Check className="size-4 text-primary mr-3 shrink-0" />
												AI-powered tenant screening
											</li>
											<li className="flex items-center">
												<Check className="size-4 text-primary mr-3 shrink-0" />
												Automated listing syndication
											</li>
											<li className="flex items-center">
												<Check className="size-4 text-primary mr-3 shrink-0" />
												Quality tenant matching
											</li>
										</ul>
									</div>
								</div>

								{/* Step 2: Automate Tasks */}
								<div className="group relative">
									<div className="rounded-3xl p-8 border transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 group-hover:scale-[1.02] bg-card/60 border-primary/25 dark:bg-muted/60 dark:border-primary/30 hover:border-primary/40 dark:hover:border-primary/50">
										<div className="absolute -top-4 left-8 bg-primary text-primary-foreground text-sm font-bold px-3 py-1 rounded-full">
											Step 2
										</div>

										<div className="size-16 rounded-2xl bg-[color-mix(in_oklch,var(--primary)_15%,transparent)] mx-auto mb-6 flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110">
											<Zap className="size-8 text-primary" />
										</div>

										<h3 className="font-bold text-foreground mb-4 text-xl">
											Automate Operations
										</h3>
										<p className="text-muted-foreground mb-6 leading-relaxed">
											Intelligent workflows handle 80% of daily tasks
											automatically
										</p>

										<div
											className={cn(
												'rounded-xl border p-4 mb-4 transition-colors',
												'bg-card/50',
												'dark:bg-muted/50',
												'border-primary/25'
											)}
										>
											<div className="text-2xl font-bold text-primary">25+</div>
											<div className="text-sm text-muted-foreground">
												Hours saved per week
											</div>
										</div>

										<ul className="space-y-2 text-sm">
											<li className="flex items-center">
												<Check className="size-4 text-primary mr-3 shrink-0" />
												Automated rent collection
											</li>
											<li className="flex items-center">
												<Check className="size-4 text-primary mr-3 shrink-0" />
												Smart lease renewals
											</li>
											<li className="flex items-center">
												<Check className="size-4 text-primary mr-3 shrink-0" />
												Maintenance coordination
											</li>
										</ul>
									</div>
								</div>

								{/* Step 3: Secure Data */}
								<div className="group relative">
									<div className="rounded-3xl p-8 border transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 group-hover:scale-[1.02] bg-card/60 border-border dark:bg-muted/60 hover:border-primary/30">
										<div className="absolute -top-4 left-8 bg-primary text-primary-foreground text-sm font-bold px-3 py-1 rounded-full">
											Step 3
										</div>

										<div className="size-16 rounded-2xl bg-[color-mix(in_oklch,var(--primary)_15%,transparent)] mx-auto mb-6 flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110">
											<Shield className="size-8 text-primary" />
										</div>

										<h3 className="font-bold text-foreground mb-4 text-xl">
											Secure Everything
										</h3>
										<p className="text-muted-foreground mb-6 leading-relaxed">
											Enterprise-grade security protects your data and ensures
											compliance
										</p>

										<div
											className={cn(
												'rounded-xl border p-4 mb-4 transition-colors',
												'bg-card/50',
												'dark:bg-muted/50',
												'border-border'
											)}
										>
											<div className="text-2xl font-bold text-primary">
												SOC 2
											</div>
											<div className="text-sm text-muted-foreground">
												Type II Certified
											</div>
										</div>

										<ul className="space-y-2 text-sm">
											<li className="flex items-center">
												<Check className="size-4 text-primary mr-3 shrink-0" />
												256-bit SSL encryption
											</li>
											<li className="flex items-center">
												<Check className="size-4 text-primary mr-3 shrink-0" />
												Role-based access control
											</li>
											<li className="flex items-center">
												<Check className="size-4 text-primary mr-3 shrink-0" />
												Regular security audits
											</li>
										</ul>
									</div>
								</div>
							</div>
						</BlurFade>
					</div>
				</section>
			</LazySection>

			{/* Results Proof Section */}
			<LazySection
				fallback={<SectionSkeleton height={500} variant="grid" />}
				minHeight={500}
			>
				<section className="section-spacing bg-muted/30">
					<div className="max-w-7xl mx-auto px-6 lg:px-8">
						<BlurFade delay={0.4} inView>
							<div className="text-center mb-16">
								<h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
									Real results from real property managers
								</h2>
								<p className="text-muted-foreground text-lg max-w-3xl mx-auto">
									Our customers consistently achieve these results within 90
									days of implementation
								</p>
							</div>

							{/* Results grid with enhanced visual design */}
							<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
								<div className="text-center group">
									<div className="size-20 rounded-full bg-[color-mix(in_oklch,var(--primary)_15%,transparent)] mx-auto mb-4 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
										<TrendingUp className="size-10 text-primary" />
									</div>
									<div className="text-4xl font-bold text-foreground mb-2">
										40%
									</div>
									<div className="text-muted-foreground">
										Average NOI increase
									</div>
								</div>

								<div className="text-center group">
									<div className="size-20 rounded-full bg-[color-mix(in_oklch,var(--primary)_15%,transparent)] mx-auto mb-4 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
										<Clock className="size-10 text-primary" />
									</div>
									<div className="text-4xl font-bold text-foreground mb-2">
										25+
									</div>
									<div className="text-muted-foreground">
										Hours saved weekly
									</div>
								</div>

								<div className="text-center group">
									<div className="size-20 rounded-full bg-[color-mix(in_oklch,var(--primary)_15%,transparent)] mx-auto mb-4 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
										<Users className="size-10 text-primary" />
									</div>
									<div className="text-4xl font-bold text-foreground mb-2">
										10K+
									</div>
									<div className="text-muted-foreground">Happy customers</div>
								</div>

								<div className="text-center group">
									<div className="size-20 rounded-full bg-[color-mix(in_oklch,var(--primary)_15%,transparent)] mx-auto mb-4 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
										<BarChart3 className="size-10 text-primary" />
									</div>
									<div className="text-4xl font-bold text-foreground mb-2">
										90
									</div>
									<div className="text-muted-foreground">Days to ROI</div>
								</div>
							</div>
						</BlurFade>
					</div>
				</section>
			</LazySection>

			{/* Final CTA Section with Enhanced Design */}
			<LazySection
				fallback={<SectionSkeleton height={400} variant="card" />}
				minHeight={400}
			>
				<section className="section-spacing relative overflow-hidden">
					{/* Enhanced background */}
					<div className="absolute inset-0 bg-muted/40" />

					<div className="max-w-6xl mx-auto px-6 lg:px-8 relative z-10">
						<BlurFade delay={0.5} inView>
							<div className="text-center space-y-8">
								<h2 className="font-bold tracking-tight leading-tight">
									<span className="text-foreground">Start your transformation{' '}</span>
									<span className="hero-highlight">
										today
									</span>
								</h2>

								<p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto text-xl">
									Join 10,000+ property managers who&apos;ve transformed their
									portfolios with TenantFlow.
									<span className="block mt-2 text-foreground font-semibold">
										ROI guaranteed in 90 days or your money back.
									</span>
								</p>

								<div className="flex flex-col sm:flex-row gap-6 justify-center">
									<Button
										size="lg"
										className="group relative overflow-hidden shadow-2xl shadow-primary/25 hover:shadow-3xl hover:shadow-primary/40 transform hover:scale-[1.02] transition-all duration-300 text-lg font-semibold px-10 py-5"
										asChild
									>
										<Link href="/signup" aria-label="Start free trial">
											<div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-card/50" />
											<span className="relative z-10 flex items-center">
												Start Free Trial
												<ArrowRight className="size-5 ml-3 transition-transform group-hover:translate-x-1" />
											</span>
										</Link>
									</Button>
									<Button
										variant="outline"
										size="lg"
										className="group border-2 border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 text-lg font-semibold px-10 py-5 transition-all duration-300"
										asChild
									>
										<Link href="/contact" aria-label="Schedule demo">
											<ArrowRight className="size-5 mr-3 opacity-70 group-hover:opacity-100" />
											Schedule Demo
										</Link>
									</Button>
								</div>

								<div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground/80 text-sm font-medium">
									<div className="flex items-center">
										<Check className="size-4 text-primary mr-2" />
										No setup fees
									</div>
									<div className="flex items-center">
										<Check className="size-4 text-primary mr-2" />
										Enterprise security
									</div>
									<div className="flex items-center">
										<Check className="size-4 text-primary mr-2" />
										99.9% uptime SLA
									</div>
									<div className="flex items-center">
										<Check className="size-4 text-primary mr-2" />
										Cancel anytime
									</div>
								</div>
							</div>
						</BlurFade>
					</div>
				</section>
			</LazySection>

			<Footer />
		</div>
	)
}

function FeaturePill({
	icon,
	title,
	description
}: {
	icon: React.ReactNode
	title: string
	description: string
}) {
	return (
		<div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm px-4 py-3 hover:border-primary/30 transition-colors">
			<div className="size-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
				{icon}
			</div>
			<div>
				<div className="font-semibold text-foreground text-sm">{title}</div>
				<div className="text-muted-foreground text-xs">{description}</div>
			</div>
		</div>
	)
}
