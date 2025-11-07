'use client'

import dynamic from 'next/dynamic'
import Footer from '#components/layout/footer'
import { Navbar } from '#components/layout/navbar'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger
} from '#components/ui/accordion'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

// ⚡ Dynamic imports: Defer loading heavy visual components (~50KB combined)
const KiboStylePricing = dynamic(
	() =>
		import('#components/pricing/kibo-style-pricing').then(
			mod => mod.KiboStylePricing
		),
	{
		loading: () => (
			<div className="min-h-[600px] flex items-center justify-center">
				<div className="w-full max-w-6xl grid gap-6 md:grid-cols-3 px-4 animate-pulse">
					{[1, 2, 3].map(i => (
						<div key={i} className="h-[500px] rounded-lg border bg-card" />
					))}
				</div>
			</div>
		),
		ssr: false
	}
)

const TestimonialsSection = dynamic(
	() =>
		import('#components/sections/testimonials-section').then(
			mod => mod.TestimonialsSection
		),
	{
		loading: () => (
			<div className="h-[400px] rounded-lg border bg-card shadow-sm animate-pulse" />
		),
		ssr: false
	}
)

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

export default function PricingPage() {
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
		<div className="relative min-h-screen flex flex-col">
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
			<main className="flex-1 pt-20">
				{/* Hero */}
				<section className="relative overflow-hidden py-20 sm:py-24 animate-in fade-in duration-700">
					<div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-transparent" />
					<div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 text-center sm:gap-14 lg:px-8">
						<div className="flex flex-col items-center gap-6">
							<Badge className="rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
								TenantFlow Pricing
							</Badge>
							<div className="space-y-6 text-balance">
								<h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
									Plans built for every portfolio size
								</h1>
								<p className="mx-auto max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground sm:text-xl">
									Launch with the essentials, scale with automation, and switch
									plans whenever you need—without losing the tenants, leases, or
									workflows you already manage in TenantFlow.
								</p>
							</div>
							<div className="flex flex-col items-center gap-3 sm:flex-row">
								<Button size="lg" className="px-8" asChild>
									<Link href="/signup">
										Start 14-day free trial
										<ArrowRight className="ml-2 h-4 w-4" />
									</Link>
								</Button>
								<Button size="lg" variant="outline" className="px-8" asChild>
									<Link href="/contact">Talk with sales</Link>
								</Button>
							</div>
						</div>
						<div className="grid gap-6 text-left sm:grid-cols-3">
							{[
								{
									label: 'Active doors managed',
									value: '35k+',
									description:
										'Trusted by owners and PM teams across North America.'
								},
								{
									label: 'Automation savings',
									value: '20+ hrs/week',
									description:
										'Average time reclaimed per team after moving to TenantFlow.'
								},
								{
									label: 'Customer satisfaction',
									value: '4.9 / 5',
									description:
										'Consistent feedback from monthly NPS and onboarding surveys.'
								}
							].map(stat => (
								<div
									key={stat.label}
									className="rounded-2xl border border-border/60 bg-card/70 p-6 shadow-sm backdrop-blur transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg"
								>
									<p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
										{stat.label}
									</p>
									<p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
										{stat.value}
									</p>
									<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
										{stat.description}
									</p>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* Pricing Section */}
				<section className="relative py-16 sm:py-20 animate-in fade-in duration-700 delay-150">
					<div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 lg:px-8">
						<div className="max-w-3xl text-center sm:mx-auto">
							<h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
								Pick the plan that fits today—upgrade only when you&apos;re
								ready
							</h2>
							<p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
								Transparent pricing with flexible billing. Switch between
								monthly and annual inside the cards, and keep every integration,
								automation, and workflow intact.
							</p>
						</div>
						<KiboStylePricing />
					</div>
				</section>

				{/* Testimonials Section */}
				<section className="py-20 sm:py-24 animate-in fade-in duration-700 delay-200">
					<div className="mx-auto max-w-6xl px-6 lg:px-8">
						<div className="mb-12 text-center">
							<h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
								Loved by property teams who scale with clarity
							</h2>
							<p className="mt-4 text-base text-muted-foreground sm:text-lg">
								Hear from customers who moved their operations, communications,
								and payments into one workspace.
							</p>
						</div>
						<TestimonialsSection />
					</div>
				</section>

				{/* FAQ Section */}
				<section className="py-24 animate-in fade-in duration-700 delay-300">
					<div className="mx-auto max-w-6xl px-6 lg:px-8">
						<div className="rounded-3xl border border-border/60 bg-card/60 p-10 shadow-sm backdrop-blur sm:p-14">
							<div className="mx-auto mb-14 max-w-3xl text-center">
								<h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
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
				<section className="py-24 animate-in fade-in duration-700 delay-400">
					<div className="mx-auto max-w-6xl px-6 lg:px-8">
						<div className="grid gap-10 overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-10 shadow-sm backdrop-blur md:grid-cols-[1.3fr_1fr] md:p-12">
							<div className="space-y-6 text-left">
								<h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
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
										<Link href="/signup">
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
