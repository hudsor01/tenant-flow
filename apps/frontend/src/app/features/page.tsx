'use client'
'use client'

import { useState, useEffect } from 'react'
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
	Clock,
	Shield,
	Star,
	TrendingUp,
	Users,
	Zap,
	Bell,
	Share2,
	Building,
	DollarSign,
	FileText
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { BentoCard, BentoGrid } from '#components/ui/bento-grid'

// Animated background components for bento grid
const FileMarquee = () => (
	<div className="absolute inset-0 overflow-hidden">
		<div className="absolute top-4 left-4 space-y-2 animate-pulse">
			<div className="flex items-center space-x-2 bg-card/80 rounded-lg p-2 shadow-sm">
				<FileText className="size-4 text-primary" />
				<span className="text-xs font-medium">Lease_Agreement.pdf</span>
			</div>
			<div className="flex items-center space-x-2 bg-card/80 rounded-lg p-2 shadow-sm animate-delay-100">
				<FileText className="size-4 text-primary" />
				<span className="text-xs font-medium">Tenant_Application.docx</span>
			</div>
			<div className="flex items-center space-x-2 bg-card/80 rounded-lg p-2 shadow-sm animate-delay-200">
				<FileText className="size-4 text-primary" />
				<span className="text-xs font-medium">Maintenance_Report.xlsx</span>
			</div>
		</div>
	</div>
)

const NotificationList = () => (
	<div className="absolute inset-0 overflow-hidden">
		<div className="absolute top-4 right-4 space-y-2">
			{[
				"Rent payment received - $2,450",
				"Maintenance request submitted",
				"Lease renewal reminder sent",
				"New tenant application"
			].map((notification, i) => (
				<div
					key={i}
					className="flex items-center space-x-2 bg-card/90 rounded-lg p-2 shadow-sm animate-fade-in"
					style={{ animationDelay: `${i * 0.5}s` }}
				>
					<Bell className="size-3 text-primary animate-bounce" />
					<span className="text-xs">{notification}</span>
				</div>
			))}
		</div>
	</div>
)

const FinancialDashboard = () => (
	<div className="absolute inset-0 overflow-hidden">
		<div className="absolute top-4 left-4 right-4 space-y-3">
			{/* Revenue Chart */}
			<div className="bg-card/90 rounded-lg p-3 shadow-sm">
				<div className="flex items-center justify-between mb-2">
					<span className="text-sm font-medium">Monthly Revenue</span>
					<DollarSign className="size-4 text-primary" />
				</div>
				<div className="flex items-end space-x-1 h-12">
					{[40, 60, 45, 80, 65, 90, 75, 85, 95, 88, 92, 98].map((height, i) => (
						<div
							key={i}
							className="bg-primary/80 rounded-sm flex-1 animate-pulse"
							style={{
								height: `${height}%`,
								animationDelay: `${i * 0.1}s`
							}}
						/>
					))}
				</div>
				<div className="text-xs text-muted-foreground mt-1">$124,500</div>
			</div>

			{/* Key Metrics */}
			<div className="grid grid-cols-2 gap-2">
				<div className="bg-card/90 rounded-lg p-2 shadow-sm">
					<div className="text-xs text-muted-foreground">Occupancy</div>
					<div className="text-lg font-bold text-primary animate-pulse">96.2%</div>
				</div>
				<div className="bg-card/90 rounded-lg p-2 shadow-sm">
					<div className="text-xs text-muted-foreground">Avg. Rent</div>
					<div className="text-lg font-bold text-primary animate-pulse">$2,450</div>
				</div>
			</div>
		</div>
	</div>
)

const IntegrationBeam = () => (
	<div className="absolute inset-0 overflow-hidden">
		<div className="absolute inset-0 flex items-center justify-center">
			<div className="relative">
				{/* Central hub */}
				<div className="size-8 bg-primary rounded-full flex items-center justify-center animate-pulse">
					<Building className="size-4 text-primary-foreground" />
				</div>
				{/* Connecting beams */}
				{[
					{ angle: 0, icon: DollarSign, label: "Stripe" },
					{ angle: 90, icon: Share2, label: "Supabase" },
					{ angle: 180, icon: Bell, label: "Resend" },
					{ angle: 270, icon: Shield, label: "Auth" }
				].map(({ angle, icon: Icon, label }, i) => (
					<div
						key={i}
						className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
						style={{
							transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(60px)`
						}}
					>
						<div className="flex flex-col items-center space-y-1 animate-fade-in" style={{ animationDelay: `${i * 0.3}s` }}>
							<div className="size-6 bg-card rounded-full flex items-center justify-center shadow-sm border">
								<Icon className="size-3 text-primary" />
							</div>
							<span className="text-xs font-medium transform -rotate-90 whitespace-nowrap">{label}</span>
						</div>
					</div>
				))}
			</div>
		</div>
	</div>
)

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
		<div className="relative min-h-screen flex flex-col marketing-page">
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
					<Link href="/pricing" aria-label="Get started free">
						Start Free Trial
						<ArrowRight className="size-4 ml-2" />
					</Link>
				</Button>
			</div>

			{/* Hero Section with Modern Background */}
			<section className="relative pb-16 overflow-hidden">
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
									<Link href="/pricing" aria-label="Start free trial">
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

			{/* Animated Feature Showcase */}
			<LazySection
				fallback={<SectionSkeleton height={600} variant="grid" />}
				minHeight={600}
			>
				<section className="section-spacing">
					<div className="max-w-7xl mx-auto px-6 lg:px-8">
						<BlurFade delay={0.3} inView>
							<div className="text-center mb-16 space-y-6">
								<h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
									See TenantFlow in action -{' '}
									<span className="hero-highlight">
										live & interactive
									</span>
								</h2>
								<p className="text-muted-foreground text-lg leading-relaxed max-w-3xl mx-auto">
									Experience our platform&apos;s power through animated demonstrations
									of real property management workflows
								</p>
							</div>

							<BentoGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
								<BentoCard
									name="Smart Document Processing"
									background={<FileMarquee />}
									Icon={FileText}
									description="AI-powered document analysis and automated lease processing with real-time file previews"
									href="/features/documents"
									cta="Explore Documents"
								/>
								<BentoCard
									name="Real-Time Notifications"
									background={<NotificationList />}
									Icon={Bell}
									description="Intelligent notification system that keeps you updated on all property activities and deadlines"
									href="/features/notifications"
									cta="View Notifications"
								/>
								<BentoCard
									name="Financial Analytics"
									background={<FinancialDashboard />}
									Icon={TrendingUp}
									description="Real-time revenue tracking, occupancy metrics, and financial insights to maximize your NOI"
									href="/features/analytics"
									cta="View Analytics"
								/>
								<BentoCard
									name="Seamless Integrations"
									background={<IntegrationBeam />}
									Icon={Building}
									description="Connect with Stripe, Supabase, and more for a unified property management ecosystem"
									href="/features/integrations"
									cta="See Integrations"
								/>
							</BentoGrid>
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
										<Link href="/pricing" aria-label="Start free trial">
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