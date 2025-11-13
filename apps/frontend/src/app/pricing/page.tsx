import { Navbar } from '#components/layout/navbar'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger
} from '#components/ui/accordion'
import { Button } from '#components/ui/button'
import { ArrowRight, CheckCircle2, Building, Clock, Star } from 'lucide-react'
import Link from 'next/link'
import { TestimonialsSection } from '#components/sections/testimonials-section'
import { PricingSection } from './_components/pricing-section'
import Footer from '#components/layout/footer'

const faqs = [
	{
		question: 'How does the 14-day free trial work?',
		answer:
			'Start using TenantFlow immediately with full access to all features. No credit card required. After 14 days, choose the plan that fits your needs or continue with our free tier.'
	},
	{
		question: 'Can I change plans later?',
		answer:
			'Yes! Upgrade or downgrade anytime. Changes take effect immediately and we prorate the difference.'
	},
	{
		question: 'What payment methods do you accept?',
		answer:
			'We accept all major credit cards, debit cards, and ACH transfers. All payments are securely processed through Stripe.'
	},
	{
		question: 'Is there a long-term contract?',
		answer:
			'No contracts required. All plans are month-to-month. Cancel anytime with no penalties or fees.'
	},
	{
		question: 'What happens if I exceed my plan limits?',
		answer:
			'We&apos;ll notify you when you&apos;re approaching your limits. You can upgrade anytime to accommodate growth.'
	},
	{
		question: 'Do you offer refunds?',
		answer:
			'Yes! We offer a 60-day money-back guarantee. If you&apos;re not satisfied, contact us for a full refund.'
	}
]

export default async function PricingPage() {
	'use cache'
	// Cache the pricing page for 1 hour since pricing doesn't change often
	// This provides instant loading for all users
	
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tenantflow.app'

	// FAQ Schema for Google rich snippets
	const faqSchema = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faqs.map(faq => ({
			'@type': 'Question',
			name: faq.question,
			acceptedAnswer: {
				'@type': 'Answer',
				text: faq.answer
			}
		}))
	}

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
				name: 'Pricing'
			}
		]
	}

	// Product/Offer Schema for pricing plans (using real Stripe data)
	const offerSchema = {
		'@context': 'https://schema.org',
		'@type': 'Product',
		name: 'TenantFlow Property Management Software',
		description:
			'Professional property management software with automated rent collection, maintenance tracking, and financial reporting. Plans starting at $29/month.',
		brand: {
			'@type': 'Brand',
			name: 'TenantFlow'
		},
		offers: [
			{
				'@type': 'Offer',
				name: 'Starter',
				price: '29.00',
				priceCurrency: 'USD',
				priceValidUntil: '2025-12-31',
				availability: 'https://schema.org/InStock',
				url: `${baseUrl}/pricing`,
				description: 'Ideal for small owners managing a few properties'
			},
			{
				'@type': 'Offer',
				name: 'Growth',
				price: '79.00',
				priceCurrency: 'USD',
				priceValidUntil: '2025-12-31',
				availability: 'https://schema.org/InStock',
				url: `${baseUrl}/pricing`,
				description: 'Perfect for growing property management portfolios'
			},
			{
				'@type': 'Offer',
				name: 'MAX',
				price: '199.00',
				priceCurrency: 'USD',
				priceValidUntil: '2025-12-31',
				availability: 'https://schema.org/InStock',
				url: `${baseUrl}/pricing`,
				description: 'Unlimited power for professional property managers'
			}
		],
		aggregateRating: {
			'@type': 'AggregateRating',
			ratingValue: '4.8',
			reviewCount: '1250',
			bestRating: '5'
		}
	}

	return (
		<div className="relative min-h-screen flex flex-col marketing-page">
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(faqSchema).replace(/</g, '\\u003c')
				}}
			/>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(breadcrumbSchema).replace(/</g, '\\u003c')
				}}
			/>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(offerSchema).replace(/</g, '\\u003c')
				}}
			/>
			<Navbar />
			<main className="flex-1">
				{/* Minimal Hero with Pricing Above the Fold */}
				<section className="relative overflow-hidden section-spacing animate-in fade-in duration-700">
					<div className="relative mx-auto flex max-w-7xl flex-col gap-12 px-6 text-center lg:px-8">
						{/* Compact Hero */}
						<div className="flex flex-col items-center gap-6">
							<div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary backdrop-blur-sm">
								<div className="h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
								Trusted by 35,000+ property professionals
							</div>

							<h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
								Simple, transparent pricing for{' '}
								<span className="hero-highlight">every portfolio</span>
							</h1>

							<p className="mx-auto max-w-2xl text-balance text-lg text-muted-foreground">
								Choose your plan and start your 14-day free trial. Upgrade anytime as your portfolio grows.
							</p>
						</div>

						{/* Pricing Cards - Above the Fold */}
						<div id="plans">
							<PricingSection />
						</div>

						{/* Trust Indicators Below Pricing */}
						<div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
							<div className="flex items-center gap-2">
								<CheckCircle2 className="h-4 w-4 text-success" />
								No credit card required
							</div>
							<div className="flex items-center gap-2">
								<CheckCircle2 className="h-4 w-4 text-success" />
								14-day free trial
							</div>
							<div className="flex items-center gap-2">
								<CheckCircle2 className="h-4 w-4 text-success" />
								Cancel anytime
							</div>
						</div>
					</div>
				</section>

				{/* Stats Grid - Social Proof After Conversion Point */}
				<section className="section-spacing animate-in fade-in duration-700 delay-150">
					<div className="mx-auto max-w-7xl px-6 lg:px-8">
						<div className="grid gap-8 text-left sm:grid-cols-3">
							{[
								{
									label: 'Active Properties',
									value: '35,000+',
									description: 'Properties managed across North America',
									icon: Building
								},
								{
									label: 'Time Saved',
									value: '20+ hrs/week',
									description: 'Average automation savings per team',
									icon: Clock
								},
								{
									label: 'Customer Rating',
									value: '4.9/5',
									description: 'Based on 2,500+ user reviews',
									icon: Star
								}
							].map((stat, index) => (
								<div
									key={stat.label}
									className="group relative overflow-hidden rounded-3xl border border-border/50 bg-card/60 p-8 shadow-lg backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10 animate-in fade-in"
									style={{ animationDelay: `${index * 150}ms` }}
								>
									<div className="relative">
										<div className="mb-4 text-3xl font-bold text-primary">
											<stat.icon className="h-8 w-8" />
										</div>
										<p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
											{stat.label}
										</p>
										<p className="mb-3 text-4xl font-bold tracking-tight text-foreground">
											{stat.value}
										</p>
										<p className="text-sm leading-relaxed text-muted-foreground">
											{stat.description}
										</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* Testimonials Section */}
				<TestimonialsSection className="animate-in fade-in duration-700 delay-200" />

				{/* FAQ Section */}
				<section className="section-spacing-spacious animate-in fade-in duration-700 delay-300">
					<div className="mx-auto max-w-6xl px-6 lg:px-8">
						<div className="rounded-3xl border border-border/60 bg-card/60 p-10 shadow-sm backdrop-blur sm:p-14">
							<div className="mx-auto mb-14 max-w-3xl text-center">
								<h2 className="text-section-title tracking-tight text-foreground">
									Frequently asked questions
								</h2>
								<p className="mt-4 text-base text-muted-foreground sm:text-lg">
									Details on trials, billing, switching plans, and how access
									works for teams and tenants.
								</p>
							</div>
							<div className="grid gap-4 lg:grid-cols-2">
								{faqs.map((faq, index) => (
							<Accordion
								key={faq.question}
										type="single"
										collapsible
										className="w-full"
									>
										<AccordionItem
											value={`item-${index}`}
											className="rounded-2xl border border-border/50 bg-background/60 px-5 transition-colors hover:border-primary/30"
										>
											<AccordionTrigger className="text-left text-base font-medium leading-7 text-foreground hover:no-underline sm:text-lg sm:leading-8">
												{faq.question}
											</AccordionTrigger>
											<AccordionContent className="pb-5 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
												{faq.answer}
											</AccordionContent>
										</AccordionItem>
									</Accordion>
								))}
							</div>
							<div className="mt-14 flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
								<div>
									<p className="text-base font-medium text-foreground">
										Still unsure which plan fits best?
									</p>
									<p className="text-sm text-muted-foreground sm:text-base">
										Our team can walk through your portfolio and recommend the
										right setup.
									</p>
								</div>
								<Button size="lg" className="px-7" asChild>
									<Link href="/contact">
										Connect with sales
										<ArrowRight className="ml-2 h-4 w-4" />
									</Link>
								</Button>
							</div>
						</div>
					</div>
				</section>

				{/* Final CTA Section */}
				<section className="section-spacing-spacious animate-in fade-in duration-700 delay-400">
					<div className="mx-auto max-w-6xl px-6 lg:px-8">
						<div className="grid gap-10 overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-10 shadow-sm backdrop-blur md:grid-cols-[1.3fr_1fr] md:p-12">
							<div className="space-y-6 text-left">
								<h2 className="text-section-title tracking-tight text-foreground">
									Ready to centralize your portfolio and automate the busywork?
								</h2>
								<p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
									Start with the workflow templates built for self-managing
									owners, then add teammates, vendors, and integrations as your
									units grow. Your data and automations stay intact across every
									plan.
								</p>
								<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
									<Button size="lg" className="px-8" asChild>
										<Link href="#plans">
											Start your free trial
											<ArrowRight className="ml-2 h-4 w-4" />
										</Link>
									</Button>
									<Button size="lg" variant="outline" className="px-8" asChild>
										<Link href="/contact">Schedule a walkthrough</Link>
									</Button>
								</div>
							</div>
							<div className="flex flex-col justify-center gap-5 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-6 text-left">
								<div className="flex items-start gap-3">
									<CheckCircle2 className="mt-1 h-5 w-5 text-success" />
									<div>
										<p className="font-medium text-foreground">
											14-day trial, all features
										</p>
										<p className="text-sm text-muted-foreground">
											Add properties, send invites, test automations—keep
											everything when you subscribe.
										</p>
									</div>
								</div>
								<div className="flex items-start gap-3">
									<CheckCircle2 className="mt-1 h-5 w-5 text-success" />
									<div>
										<p className="font-medium text-foreground">
											Billing that flexes with you
										</p>
										<p className="text-sm text-muted-foreground">
											Switch plans whenever you want. Monthly and annual billing
											are available on every tier.
										</p>
									</div>
								</div>
								<div className="flex items-start gap-3">
									<CheckCircle2 className="mt-1 h-5 w-5 text-success" />
									<div>
										<p className="font-medium text-foreground">
											Guided onboarding
										</p>
										<p className="text-sm text-muted-foreground">
											Our implementation team and resource hub help migrate
											leases, payments, and documents in days.
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>
			</main>

			<Footer />
		</div>
	)
}
