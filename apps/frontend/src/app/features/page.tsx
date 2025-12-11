'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { PageLayout } from '#components/layout/page-layout'
import { BlurFade } from '#components/ui/blur-fade'
import { Button } from '#components/ui/button'

import { LazySection } from '#components/ui/lazy-section'
import { SectionSkeleton } from '#components/ui/section-skeleton'
import { LogoCloud } from '#components/sections/logo-cloud'
import { ComparisonTable } from '#components/sections/comparison-table'
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
	Building,
	FileText,
	Home,
	Wrench,
	CreditCard,
	PieChart
} from 'lucide-react'
import Link from 'next/link'
import { BentoCard, BentoGrid } from '#components/ui/bento-grid'

// Animated background: Property Management Grid
const PropertyGrid = () => (
	<div className="absolute inset-x-0 top-0 bottom-[45%] p-4">
		<div className="grid grid-cols-2 gap-2 h-full opacity-70">
			{[
				{ name: '123 Oak St', units: 4, occupancy: '100%' },
				{ name: '456 Maple Ave', units: 8, occupancy: '87%' },
				{ name: '789 Pine Rd', units: 12, occupancy: '92%' },
				{ name: '321 Cedar Ln', units: 6, occupancy: '100%' }
			].map((property, i) => (
				<div
					key={property.name}
					className="card-standard p-3 flex flex-col justify-between"
					style={{ animationDelay: `${i * 100}ms` }}
				>
					<div className="flex items-center gap-2">
						<div className="icon-container-sm bg-primary/10 text-primary">
							<Home className="size-3" />
						</div>
						<span className="text-xs font-medium text-foreground truncate">{property.name}</span>
					</div>
					<div className="flex justify-between text-xs mt-2">
						<span className="text-muted-foreground">{property.units} units</span>
						<span className="text-success font-medium">{property.occupancy}</span>
					</div>
				</div>
			))}
		</div>
	</div>
)

// Animated background: Rent Collection Dashboard
const RentCollection = () => (
	<div className="absolute inset-x-0 top-0 bottom-[30%] p-4 overflow-hidden">
		<div className="space-y-3 opacity-70">
			{/* Progress bar */}
			<div className="card-standard p-3">
				<div className="flex justify-between text-xs mb-2">
					<span className="text-muted-foreground">December Rent</span>
					<span className="text-foreground font-medium">$48,250 / $52,000</span>
				</div>
				<div className="h-2 bg-muted rounded-full overflow-hidden">
					<div className="h-full bg-success rounded-full" style={{ width: '93%' }} />
				</div>
			</div>
			{/* Recent payments */}
			<div className="space-y-2">
				{[
					{ tenant: 'Sarah Johnson', amount: '$1,850', status: 'Paid' },
					{ tenant: 'Michael Chen', amount: '$2,200', status: 'Paid' },
					{ tenant: 'Emily Davis', amount: '$1,650', status: 'Pending' }
				].map((payment) => (
					<div key={payment.tenant} className="card-standard p-2 flex-between">
						<span className="text-xs text-foreground">{payment.tenant}</span>
						<div className="flex items-center gap-2">
							<span className="text-xs font-medium text-foreground">{payment.amount}</span>
							<span className={cn(
								'text-xs px-2 py-0.5 rounded-full',
								payment.status === 'Paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
							)}>
								{payment.status}
							</span>
						</div>
					</div>
				))}
			</div>
		</div>
	</div>
)

// Animated background: Tenant Management
const TenantList = () => (
	<div className="absolute inset-x-0 top-0 bottom-[45%] p-4 overflow-hidden">
		<div className="space-y-2 opacity-70">
			{[
				{ name: 'Alex Thompson', unit: 'Unit 2A', lease: 'Active', rent: '$1,800' },
				{ name: 'Jessica Miller', unit: 'Unit 3B', lease: 'Renewing', rent: '$2,100' },
				{ name: 'David Wilson', unit: 'Unit 1C', lease: 'Active', rent: '$1,650' },
				{ name: 'Rachel Green', unit: 'Unit 4D', lease: 'Active', rent: '$1,950' }
			].map((tenant) => (
				<div key={tenant.name} className="card-standard p-3 flex-between">
					<div className="flex items-center gap-3">
						<div className="size-8 rounded-full bg-primary/10 flex-center text-primary text-xs font-medium">
							{tenant.name.split(' ').map(n => n[0]).join('')}
						</div>
						<div>
							<div className="text-xs font-medium text-foreground">{tenant.name}</div>
							<div className="text-xs text-muted-foreground">{tenant.unit}</div>
						</div>
					</div>
					<div className="text-right">
						<div className="text-xs font-medium text-foreground">{tenant.rent}</div>
						<span className={cn(
							'text-xs',
							tenant.lease === 'Renewing' ? 'text-warning' : 'text-success'
						)}>
							{tenant.lease}
						</span>
					</div>
				</div>
			))}
		</div>
	</div>
)

// Animated background: Maintenance Requests
const MaintenanceBoard = () => (
	<div className="absolute inset-x-0 top-0 bottom-[45%] p-4 overflow-hidden">
		<div className="grid grid-cols-3 gap-2 h-full opacity-70">
			{/* Open */}
			<div className="space-y-2">
				<div className="text-xs font-medium text-muted-foreground px-1">Open</div>
				<div className="card-standard p-2 border-l-2 border-l-warning">
					<div className="text-xs font-medium text-foreground">Leaky Faucet</div>
					<div className="text-xs text-muted-foreground">Unit 2A</div>
				</div>
			</div>
			{/* In Progress */}
			<div className="space-y-2">
				<div className="text-xs font-medium text-muted-foreground px-1">In Progress</div>
				<div className="card-standard p-2 border-l-2 border-l-info">
					<div className="text-xs font-medium text-foreground">HVAC Repair</div>
					<div className="text-xs text-muted-foreground">Unit 3B</div>
				</div>
				<div className="card-standard p-2 border-l-2 border-l-info">
					<div className="text-xs font-medium text-foreground">Window Fix</div>
					<div className="text-xs text-muted-foreground">Unit 1C</div>
				</div>
			</div>
			{/* Completed */}
			<div className="space-y-2">
				<div className="text-xs font-medium text-muted-foreground px-1">Done</div>
				<div className="card-standard p-2 border-l-2 border-l-success">
					<div className="text-xs font-medium text-foreground">Paint Touch-up</div>
					<div className="text-xs text-muted-foreground">Unit 4D</div>
				</div>
			</div>
		</div>
	</div>
)

// Animated background: Analytics Charts
const AnalyticsPreview = () => (
	<div className="absolute inset-x-0 top-0 bottom-[40%] p-4 overflow-hidden">
		<div className="space-y-3 opacity-70">
			{/* Revenue chart bars */}
			<div className="card-standard p-3">
				<div className="flex-between mb-2">
					<span className="text-xs text-muted-foreground">Monthly Revenue</span>
					<span className="text-xs font-medium text-success">+12.5%</span>
				</div>
				<div className="flex items-end gap-1 h-16">
					{[45, 52, 48, 61, 55, 70, 65, 78, 72, 85, 80, 92].map((height, i) => (
						<div
							key={i}
							className="bg-primary/70 rounded-sm flex-1 transition-all duration-300"
							style={{ height: `${height}%` }}
						/>
					))}
				</div>
			</div>
			{/* Metrics */}
			<div className="grid grid-cols-2 gap-2">
				<div className="card-standard p-2 text-center">
					<div className="text-lg font-bold text-foreground">96.2%</div>
					<div className="text-xs text-muted-foreground">Occupancy</div>
				</div>
				<div className="card-standard p-2 text-center">
					<div className="text-lg font-bold text-foreground">$2,450</div>
					<div className="text-xs text-muted-foreground">Avg. Rent</div>
				</div>
			</div>
		</div>
	</div>
)

// Animated background: Lease Documents
const LeaseDocuments = () => (
	<div className="absolute inset-x-0 top-0 bottom-[45%] p-4 overflow-hidden">
		<div className="space-y-2 opacity-70">
			{[
				{ name: 'Lease Agreement - Unit 2A', status: 'Signed', date: 'Dec 1, 2024' },
				{ name: 'Renewal Notice - Unit 3B', status: 'Pending', date: 'Dec 15, 2024' },
				{ name: 'Move-in Inspection', status: 'Signed', date: 'Nov 28, 2024' },
				{ name: 'Pet Addendum - Unit 1C', status: 'Signed', date: 'Nov 20, 2024' }
			].map((doc) => (
				<div key={doc.name} className="card-standard p-3 flex-between">
					<div className="flex items-center gap-3">
						<div className="icon-container-sm bg-primary/10 text-primary">
							<FileText className="size-3" />
						</div>
						<div>
							<div className="text-xs font-medium text-foreground">{doc.name}</div>
							<div className="text-xs text-muted-foreground">{doc.date}</div>
						</div>
					</div>
					<span className={cn(
						'text-xs px-2 py-0.5 rounded-full',
						doc.status === 'Signed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
					)}>
						{doc.status}
					</span>
				</div>
			))}
		</div>
	</div>
)

export default function FeaturesPage() {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
		(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000')

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
				'Best property management decision we\'ve made. ROI was clear within 60 days.',
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
		<PageLayout>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(breadcrumbSchema).replace(/</g, '\\u003c')
				}}
			/>

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

			{/* Hero Section */}
			<section className="relative pb-16 overflow-hidden page-offset-navbar">
				<div className="absolute inset-0 bg-[color-mix(in_oklch,var(--color-primary)_5%,transparent)]" />
				<div className="absolute inset-0 opacity-[0.015] bg-[radial-gradient(circle_at_1px_1px,var(--color-foreground)_1px,transparent_0)] bg-size-[32px_32px]" />

				<div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
					<BlurFade delay={0.1} inView>
						<div className="text-center max-w-5xl mx-auto space-y-8">
							<h1 className="text-5xl lg:text-7xl font-bold tracking-tight leading-tight">
								<span className="text-foreground">Transform your portfolio into a</span>{' '}
								<span className="hero-highlight">profit powerhouse</span>
							</h1>

							<p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto text-xl font-medium">
								Join 10,000+ property managers who&apos;ve increased NOI by 40%
								with enterprise-grade automation and AI-powered analytics.{' '}
								<span className="text-foreground font-semibold">
									ROI guaranteed in 90 days.
								</span>
							</p>

							<div className="flex flex-col sm:flex-row gap-6 justify-center pt-4">
								<Button
									size="lg"
									className="group relative overflow-hidden shadow-2xl shadow-primary/25 hover:shadow-3xl hover:shadow-primary/40 transform hover:scale-[1.02] transition-all duration-300 typography-large px-8 py-4"
									asChild
								>
									<Link href="/pricing" aria-label="Start free trial">
										<span className="relative z-10 flex items-center">
											Start Free Trial
											<ArrowRight className="size-5 ml-3 transition-transform group-hover:translate-x-1" />
										</span>
									</Link>
								</Button>
								<Button
									size="lg"
									variant="outline"
									className="group border-2 border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 typography-large px-8 py-4 transition-all duration-300"
									asChild
								>
									<Link href="/contact" aria-label="See TenantFlow in action">
										<ArrowRight className="size-5 mr-3 opacity-70 group-hover:opacity-100" />
										See it in action
									</Link>
								</Button>
							</div>

							<p className="text-muted-foreground/80 typography-small">
								<Check className="size-4 inline text-primary mr-2" />
								Join 10,000+ managers already growing NOI • No credit card required
							</p>
						</div>
					</BlurFade>
				</div>
			</section>

			{/* Feature callouts */}
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
								<div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground/60">
									<div className="flex items-center space-x-2">
										<Star className="size-4 fill-current text-accent" />
										<span className="font-medium">Featured in PropTech Today</span>
									</div>
									<div className="flex items-center space-x-2">
										<span className="font-medium">99.9% Uptime SLA</span>
									</div>
								</div>

								<div className="max-w-4xl mx-auto">
									<div className="testimonial-card">
										<blockquote className="text-xl text-foreground font-medium leading-relaxed mb-6">
											&quot;{t.quote}&quot;
										</blockquote>
										<div className="flex-center space-x-4">
											{/* Initial avatar instead of photo */}
											<div className="size-12 rounded-full bg-primary/10 flex-center text-primary font-bold">
												{t.author.split(' ').map(n => n[0]).join('')}
											</div>
											<div className="text-left">
												<div className="font-semibold text-foreground">{t.author}</div>
												<div className="text-muted-foreground text-sm">
													{t.title}, {t.company}
												</div>
											</div>
										</div>

										<div className="flex justify-center space-x-2 mt-6">
											{testimonials.map((testimonial, index) => (
												<button
													type="button"
													key={testimonial.author}
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

			{/* Feature Showcase - BentoGrid */}
			<LazySection
				fallback={<SectionSkeleton height={600} variant="grid" />}
				minHeight={600}
			>
				<section className="section-spacing">
					<div className="max-w-7xl mx-auto px-6 lg:px-8">
						<BlurFade delay={0.3} inView>
							<div className="text-center mb-16 space-y-6">
								<h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
									Everything you need to{' '}
									<span className="hero-highlight">manage properties</span>
								</h2>
								<p className="text-muted-foreground text-lg leading-relaxed max-w-3xl mx-auto">
									From rent collection to maintenance tracking, TenantFlow gives you
									complete control over your property portfolio
								</p>
							</div>

							<BentoGrid>
								{/* Row 1: Large left (2 cols), Small right (1 col) */}
								<BentoCard
									name="Property Management"
									className="md:col-span-2"
									background={<PropertyGrid />}
									Icon={Building}
									description="Manage unlimited properties and units with real-time occupancy tracking and portfolio analytics"
									href="/properties"
									cta="Manage Properties"
								/>
								<BentoCard
									name="Rent Collection"
									className="md:col-span-1 md:row-span-2"
									background={<RentCollection />}
									Icon={CreditCard}
									description="Automated ACH payments, late fee calculations, and Stripe integration"
									href="/financials/billing"
									cta="Collect Rent"
								/>
								{/* Row 2: Small left (1 col), continues with tall rent card */}
								<BentoCard
									name="Tenant Portal"
									className="md:col-span-1"
									background={<TenantList />}
									Icon={Users}
									description="Self-service portal for payments and maintenance requests"
									href="/tenants"
									cta="View Tenants"
								/>
								<BentoCard
									name="Maintenance Tracking"
									className="md:col-span-1"
									background={<MaintenanceBoard />}
									Icon={Wrench}
									description="Kanban-style board with photo uploads and vendor assignment"
									href="/maintenance"
									cta="Track Maintenance"
								/>
								{/* Row 3: Small left (1 col), Large right (2 cols) */}
								<BentoCard
									name="Lease Management"
									className="md:col-span-1"
									background={<LeaseDocuments />}
									Icon={FileText}
									description="Digital signing with DocuSeal and Texas-compliant templates"
									href="/leases"
									cta="Manage Leases"
								/>
								<BentoCard
									name="Financial Analytics"
									className="md:col-span-2"
									background={<AnalyticsPreview />}
									Icon={PieChart}
									description="Real-time revenue tracking, NOI calculations, and exportable financial reports for your entire portfolio"
									href="/analytics/financial"
									cta="View Analytics"
								/>
							</BentoGrid>
						</BlurFade>
					</div>
				</section>
			</LazySection>

			{/* Logo Cloud - Integrations */}
			<LogoCloud
				title="Powered by best-in-class integrations"
				subtitle="Seamlessly connect with the tools you already use"
			/>

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

							<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
								<div className="text-center group">
									<div className="icon-container-lg bg-primary/10 text-primary mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
										<TrendingUp className="size-8" />
									</div>
									<div className="typography-h1 text-foreground mb-2">40%</div>
									<div className="text-muted-foreground">Average NOI increase</div>
								</div>

								<div className="text-center group">
									<div className="icon-container-lg bg-primary/10 text-primary mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
										<Clock className="size-8" />
									</div>
									<div className="typography-h1 text-foreground mb-2">25+</div>
									<div className="text-muted-foreground">Hours saved weekly</div>
								</div>

								<div className="text-center group">
									<div className="icon-container-lg bg-primary/10 text-primary mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
										<Users className="size-8" />
									</div>
									<div className="typography-h1 text-foreground mb-2">10K+</div>
									<div className="text-muted-foreground">Happy customers</div>
								</div>

								<div className="text-center group">
									<div className="icon-container-lg bg-primary/10 text-primary mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
										<BarChart3 className="size-8" />
									</div>
									<div className="typography-h1 text-foreground mb-2">90</div>
									<div className="text-muted-foreground">Days to ROI</div>
								</div>
							</div>
						</BlurFade>
					</div>
				</section>
			</LazySection>

			{/* Comparison Table */}
			<LazySection
				fallback={<SectionSkeleton height={600} variant="grid" />}
				minHeight={600}
			>
				<ComparisonTable />
			</LazySection>

			{/* Final CTA Section */}
			<LazySection
				fallback={<SectionSkeleton height={400} variant="card" />}
				minHeight={400}
			>
				<section className="section-spacing relative overflow-hidden">
					<div className="absolute inset-0 bg-muted/40" />

					<div className="max-w-6xl mx-auto px-6 lg:px-8 relative z-10">
						<BlurFade delay={0.5} inView>
							<div className="text-center space-y-8">
								<h2 className="font-bold tracking-tight leading-tight">
									<span className="text-foreground">Start your transformation </span>
									<span className="hero-highlight">today</span>
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
										className="group relative overflow-hidden shadow-2xl shadow-primary/25 hover:shadow-3xl hover:shadow-primary/40 transform hover:scale-[1.02] transition-all duration-300 typography-large px-10 py-5"
										asChild
									>
										<Link href="/pricing" aria-label="Start free trial">
											<span className="relative z-10 flex items-center">
												Start Free Trial
												<ArrowRight className="size-5 ml-3 transition-transform group-hover:translate-x-1" />
											</span>
										</Link>
									</Button>
									<Button
										variant="outline"
										size="lg"
										className="group border-2 border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 typography-large px-10 py-5 transition-all duration-300"
										asChild
									>
										<Link href="/contact" aria-label="Schedule demo">
											<ArrowRight className="size-5 mr-3 opacity-70 group-hover:opacity-100" />
											Schedule Demo
										</Link>
									</Button>
								</div>

								<div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground/80 typography-small">
									<div className="flex-start">
										<Check className="size-4 text-primary mr-2" />
										No setup fees
									</div>
									<div className="flex-start">
										<Check className="size-4 text-primary mr-2" />
										Enterprise security
									</div>
									<div className="flex-start">
										<Check className="size-4 text-primary mr-2" />
										99.9% uptime SLA
									</div>
									<div className="flex-start">
										<Check className="size-4 text-primary mr-2" />
										Cancel anytime
									</div>
								</div>
							</div>
						</BlurFade>
					</div>
				</section>
			</LazySection>

					</PageLayout>
	)
}

function FeaturePill({
	icon,
	title,
	description
}: {
	icon: ReactNode
	title: string
	description: string
}) {
	return (
		<div className="flex items-center gap-3 card-standard px-4 py-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
			<div className="icon-container-md icon-container-primary">
				{icon}
			</div>
			<div>
				<div className="font-semibold text-foreground text-sm">{title}</div>
				<div className="text-muted-foreground text-xs">{description}</div>
			</div>
		</div>
	)
}
