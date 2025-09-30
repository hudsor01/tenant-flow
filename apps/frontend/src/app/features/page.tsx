'use client'

import Footer from '@/components/layout/footer'
import { BlurFade } from '@/components/magicui/blur-fade'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GridBackground } from '@/components/ui/grid-background'
import { cn } from '@/lib/utils'
import
  {
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

// (Video dialog removed — no video assets available)

export default function FeaturesPage() {
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
				"Best property management decision we've made. ROI was clear within 60 days.",
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

	const customerLogos = [
		{ name: 'Greystar', logo: '/tenant-flow-logo.png' },
		{ name: 'Avalon Bay', logo: '/tenant-flow-logo.png' },
		{ name: 'Camden', logo: '/tenant-flow-logo.png' },
		{ name: 'Essex', logo: '/tenant-flow-logo.png' },
		{ name: 'BRE Properties', logo: '/tenant-flow-logo.png' },
		{ name: 'Lincoln Property', logo: '/tenant-flow-logo.png' }
	]

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
					<a href="/signup" aria-label="Get started free">
						Start Free Trial
						<ArrowRight className="w-4 h-4 ml-2" />
					</a>
				</Button>
			</div>

			{/* Hero Section with Modern Background */}
			<section className="relative page-content pb-16 overflow-hidden">
				{/* Modern gradient background */}
				<div className="absolute inset-0 bg-gradient-to-br from-background via-primary/[0.02] to-background">
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)_/_0.05),transparent_50%)] bg-[length:100%_100%]" />
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--accent)_/_0.03),transparent_50%)] bg-[length:100%_100%]" />
				</div>

				{/* Subtle pattern overlay */}
				<div className="absolute inset-0 opacity-[0.015] bg-[radial-gradient(circle_at_1px_1px,hsl(var(--foreground))_1px,transparent_0)] bg-[size:32px_32px]" />

				<div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
					<BlurFade delay={0.1} inView>
						<div className="text-center max-w-5xl mx-auto space-y-8">
							{/* Trust Band - Moved to prominent position */}
							<div className="flex flex-col items-center space-y-6">
								<Badge
									variant="secondary"
									className="px-4 py-2 text-sm font-medium bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 transition-colors"
								>
									<Star className="w-4 h-4 mr-2 fill-current" />
									Trusted by 10,000+ property managers worldwide
								</Badge>

								{/* Customer Logos */}
								<div className="flex flex-wrap items-center justify-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-700">
									{customerLogos.slice(0, 4).map(customer => (
										<div key={customer.name} className="h-8 flex items-center">
											<Image
												src={customer.logo}
												alt={customer.name}
												width={120}
												height={40}
												className="h-8 w-auto object-contain opacity-70 hover:opacity-100 transition-opacity"
											/>
										</div>
									))}
								</div>
							</div>

							{/* Strengthened headline with premium typography */}
							<h1
								className="text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-foreground"
							>
								Transform your portfolio into a{' '}
								<span className="relative inline-block">
									<span className="bg-gradient-to-r from-primary via-primary/90 to-accent bg-clip-text text-transparent">
										profit powerhouse
									</span>
									<div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 to-accent/60 rounded-full" />
								</span>
							</h1>

							{/* Concise, benefit-driven subtext */}
							<p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto text-xl font-medium">
								Join 10,000+ property managers who've increased NOI by 40% with
								enterprise-grade automation and AI-powered analytics.{' '}
								<span className="text-foreground font-semibold">
									ROI guaranteed in 90 days.
								</span>
							</p>

							{/* High-contrast, prominent CTAs */}
							<div className="flex flex-col sm:flex-row gap-6 justify-center pt-4">
								<Button
									size="lg"
									className="group relative overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:from-primary/90 hover:via-primary/80 hover:to-primary/70 shadow-2xl shadow-primary/25 hover:shadow-3xl hover:shadow-primary/40 transform hover:scale-[1.02] transition-all duration-300 text-lg font-semibold px-8 py-4"
									asChild
								>
									<a href="/signup" aria-label="Start free trial">
										<div
											className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-card/50"
										/>
										<span className="relative z-10 flex items-center">
											Start Free Trial
											<ArrowRight className="w-5 h-5 ml-3 transition-transform group-hover:translate-x-1" />
										</span>
									</a>
								</Button>
								<Button
									size="lg"
									variant="outline"
									className="group border-2 border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 text-lg font-semibold px-8 py-4 transition-all duration-300"
									asChild
								>
									<a href="/contact" aria-label="See TenantFlow in action">
										<ArrowRight className="w-5 h-5 mr-3 opacity-70 group-hover:opacity-100" />
										See it in action
									</a>
								</Button>
							</div>

							{/* Social proof below CTAs */}
							<p className="text-muted-foreground/80 text-sm font-medium">
								<Check className="w-4 h-4 inline text-primary mr-2" />
								Join 10,000+ managers already growing NOI • No credit card
								required
							</p>
						</div>
					</BlurFade>
				</div>
			</section>

			{/* Video demo removed (no assets). Keeping streamlined journey below. */}

			{/* Feature callouts (concise horizontal pills) */}
			<section className="pb-10">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<div className="grid gap-3 md:grid-cols-3">
						<FeaturePill
							icon={<BarChart3 className="w-5 h-5" />}
							title="Reduce Vacancy by 65%"
							description="Smart screening + marketing fill units faster"
						/>
						<FeaturePill
							icon={<Zap className="w-5 h-5" />}
							title="Automate 80% of Tasks"
							description="Rent, renewals, and comms on autopilot"
						/>
						<FeaturePill
							icon={<Shield className="w-5 h-5" />}
							title="Enterprise Security"
							description="SOC 2, RBAC, and audit logging"
						/>
					</div>
				</div>
			</section>

			{/* Trust Indicators with Customer Testimonials */}
			<section className="section-compact bg-gradient-to-r from-primary/[0.02] via-background to-primary/[0.02]">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<BlurFade delay={0.2} inView>
						<div className="text-center space-y-8">
							{/* Press mentions and awards */}
							<div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground/60">
								<div className="flex items-center space-x-2">
									<Star className="w-4 h-4 fill-current text-accent" />
									<span className="font-medium">
										Featured in PropTech Today
									</span>
								</div>
								<div className="flex items-center space-x-2">
									<Badge variant="outline" className="text-xs">
										SOC 2 Certified
									</Badge>
								</div>
								<div className="flex items-center space-x-2">
									<span className="font-medium">99.9% Uptime SLA</span>
								</div>
							</div>

							{/* Rotating testimonial */}
							<div className="max-w-4xl mx-auto">
								<div
									className="relative rounded-2xl p-8 border border-primary/10 backdrop-blur-sm bg-card/50"
								>
									<>
										<blockquote className="text-xl text-foreground font-medium leading-relaxed mb-6">
											"{t.quote}"
										</blockquote>
										<div className="flex items-center justify-center space-x-4">
											<Image
												src={t.avatar}
												alt={t.author}
												width={48}
												height={48}
												className="w-12 h-12 rounded-full"
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
												key={index}
												onClick={() => setCurrentTestimonial(index)}
												className={cn(
													'w-2 h-2 rounded-full transition-colors duration-300',
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

			{/* Canonical Bento features grid - Removed: Component deleted during refactoring */}

			{/* Transformation Journey - Redesigned Feature Callouts */}
			<section className="section-content">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<BlurFade delay={0.3} inView>
						<div className="text-center mb-16 space-y-6">
							<h2
								className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
								
							>
								Your 3-step transformation to{' '}
								<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
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
							<div className="hidden md:block absolute top-24 left-1/2 transform -translate-x-1/2 w-full max-w-4xl">
								<div className="flex items-center justify-between px-16">
									<ChevronRight className="w-6 h-6 text-primary/40" />
									<ChevronRight className="w-6 h-6 text-primary/40" />
								</div>
							</div>

							{/* Step 1: Fill Units Faster */}
							<div className="group relative">
								<div className="bg-gradient-to-br from-accent/5 to-accent/10 dark:from-accent/10 dark:to-accent/20 rounded-3xl p-8 border border-accent/20 dark:border-accent/30 hover:border-accent/40 dark:hover:border-accent/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 group-hover:scale-[1.02]">
									{/* Step indicator */}
									<div className="absolute -top-4 left-8 bg-primary text-primary-foreground text-sm font-bold px-3 py-1 rounded-full">
										Step 1
									</div>

									{/* Icon with enhanced visual metaphor */}
									<div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-primary to-accent mx-auto mb-6 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
										<TrendingUp className="w-8 h-8 text-primary-foreground" />
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
											<Check className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
											AI-powered tenant screening
										</li>
										<li className="flex items-center">
											<Check className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
											Automated listing syndication
										</li>
										<li className="flex items-center">
											<Check className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
											Quality tenant matching
										</li>
									</ul>
								</div>
							</div>

							{/* Step 2: Automate Tasks */}
							<div className="group relative">
								<div className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 rounded-3xl p-8 border border-primary/20 dark:border-primary/30 hover:border-primary/40 dark:hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 group-hover:scale-[1.02]">
									<div className="absolute -top-4 left-8 bg-primary text-primary-foreground text-sm font-bold px-3 py-1 rounded-full">
										Step 2
									</div>

									<div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-primary to-primary/80 mx-auto mb-6 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
										<Zap className="w-8 h-8 text-primary-foreground" />
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
											<Check className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
											Automated rent collection
										</li>
										<li className="flex items-center">
											<Check className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
											Smart lease renewals
										</li>
										<li className="flex items-center">
											<Check className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
											Maintenance coordination
										</li>
									</ul>
								</div>
							</div>

							{/* Step 3: Secure Data */}
							<div className="group relative">
								<div className="bg-gradient-to-br from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10 rounded-3xl p-8 border border-border hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 group-hover:scale-[1.02]">
									<div className="absolute -top-4 left-8 bg-primary text-primary-foreground text-sm font-bold px-3 py-1 rounded-full">
										Step 3
									</div>

									<div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-primary to-primary/80 mx-auto mb-6 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
										<Shield className="w-8 h-8 text-primary-foreground" />
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
										<div className="text-2xl font-bold text-primary">SOC 2</div>
										<div className="text-sm text-muted-foreground">
											Type II Certified
										</div>
									</div>

									<ul className="space-y-2 text-sm">
										<li className="flex items-center">
											<Check className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
											256-bit SSL encryption
										</li>
										<li className="flex items-center">
											<Check className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
											Role-based access control
										</li>
										<li className="flex items-center">
											<Check className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
											Regular security audits
										</li>
									</ul>
								</div>
							</div>
						</div>
					</BlurFade>
				</div>
			</section>

			{/* Results Proof Section */}
			<section className="section-content bg-gradient-to-br from-primary/[0.02] via-background to-accent/[0.02]">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<BlurFade delay={0.4} inView>
						<div className="text-center mb-16">
							<h2
								className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-6" >
								Real results from real property managers
							</h2>
							<p className="text-muted-foreground text-lg max-w-3xl mx-auto">
								Our customers consistently achieve these results within 90 days
								of implementation
							</p>
						</div>

						{/* Results grid with enhanced visual design */}
						<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
							<div className="text-center group">
								<div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-accent/80 mx-auto mb-4 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
									<TrendingUp className="w-10 h-10 text-primary-foreground" />
								</div>
								<div className="text-4xl font-bold text-foreground mb-2">
									40%
								</div>
								<div className="text-muted-foreground">
									Average NOI increase
								</div>
							</div>

							<div className="text-center group">
								<div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/80 mx-auto mb-4 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
									<Clock className="w-10 h-10 text-primary-foreground" />
								</div>
								<div className="text-4xl font-bold text-foreground mb-2">
									25+
								</div>
								<div className="text-muted-foreground">Hours saved weekly</div>
							</div>

							<div className="text-center group">
								<div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/80 mx-auto mb-4 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
									<Users className="w-10 h-10 text-primary-foreground" />
								</div>
								<div className="text-4xl font-bold text-foreground mb-2">
									10K+
								</div>
								<div className="text-muted-foreground">Happy customers</div>
							</div>

							<div className="text-center group">
								<div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-accent/80 mx-auto mb-4 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
									<BarChart3 className="w-10 h-10 text-primary-foreground" />
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

			{/* Final CTA Section with Enhanced Design */}
			<section className="section-content relative overflow-hidden">
				{/* Enhanced background */}
				<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5">
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)_/_0.1),transparent_70%)]" />
				</div>

				<div className="max-w-6xl mx-auto px-6 lg:px-8 relative z-10">
					<BlurFade delay={0.5} inView>
						<div className="text-center space-y-8">
							<h2
								className="font-bold tracking-tight leading-tight"
								
							>
								Start your transformation{' '}
								<span className="bg-gradient-to-r from-primary via-primary/90 to-accent bg-clip-text text-transparent">
									today
								</span>
							</h2>

							<p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto text-xl">
								Join 10,000+ property managers who've transformed their
								portfolios with TenantFlow.
								<span className="block mt-2 text-foreground font-semibold">
									ROI guaranteed in 90 days or your money back.
								</span>
							</p>

							<div className="flex flex-col sm:flex-row gap-6 justify-center">
								<Button
									size="lg"
									className="group relative overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:from-primary/90 hover:via-primary/80 hover:to-primary/70 shadow-2xl shadow-primary/25 hover:shadow-3xl hover:shadow-primary/40 transform hover:scale-[1.02] transition-all duration-300 text-lg font-semibold px-10 py-5"
									asChild
								>
									<a href="/signup" aria-label="Start free trial">
										<div
											className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-card/50"
										/>
										<span className="relative z-10 flex items-center">
											Start Free Trial
											<ArrowRight className="w-5 h-5 ml-3 transition-transform group-hover:translate-x-1" />
										</span>
									</a>
								</Button>
								<Button
									variant="outline"
									size="lg"
									className="group border-2 border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 text-lg font-semibold px-10 py-5 transition-all duration-300"
									asChild
								>
									<a href="/contact" aria-label="Schedule demo">
										<ArrowRight className="w-5 h-5 mr-3 opacity-70 group-hover:opacity-100" />
										Schedule Demo
									</a>
								</Button>
							</div>

							<div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground/80 text-sm font-medium">
								<div className="flex items-center">
									<Check className="w-4 h-4 text-primary mr-2" />
									No setup fees
								</div>
								<div className="flex items-center">
									<Check className="w-4 h-4 text-primary mr-2" />
									Enterprise security
								</div>
								<div className="flex items-center">
									<Check className="w-4 h-4 text-primary mr-2" />
									99.9% uptime SLA
								</div>
								<div className="flex items-center">
									<Check className="w-4 h-4 text-primary mr-2" />
									Cancel anytime
								</div>
							</div>
						</div>
					</BlurFade>
				</div>
			</section>

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
			<div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
				{icon}
			</div>
			<div>
				<div className="font-semibold text-foreground text-sm">{title}</div>
				<div className="text-muted-foreground text-xs">{description}</div>
			</div>
		</div>
	)
}
