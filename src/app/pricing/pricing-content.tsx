import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger
} from '#components/ui/accordion'
import { Button } from '#components/ui/button'
import { Card } from '#components/ui/card'
import { ArrowRight, Building, CheckCircle2, Clock, Star } from 'lucide-react'
import Link from 'next/link'
import { SOCIAL_PROOF } from '#config/social-proof'

const STATS = [
	{
		label: 'Active Properties',
		value: SOCIAL_PROOF.propertiesManaged,
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
]

const FAQS = [
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

export function PricingStatsGrid() {
	return (
		<section className="section-spacing animate-in fade-in duration-700 delay-150">
			<div className="mx-auto max-w-7xl px-6 lg:px-8">
				<div className="grid gap-8 text-left sm:grid-cols-3">
					{STATS.map((stat, index) => (
						<Card
							key={stat.label}
							variant="stat"
							style={{ animationDelay: `${index * 150}ms` }}
						>
							<div className="relative">
								<div className="mb-4 typography-h2 text-primary">
									<stat.icon className="h-8 w-8" />
								</div>
								<p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground text-sm-foreground mb-2">
									{stat.label}
								</p>
								<p className="mb-3 typography-h1 tracking-tight text-foreground">
									{stat.value}
								</p>
								<p className="text-sm leading-relaxed text-muted-foreground text-sm-foreground">
									{stat.description}
								</p>
							</div>
						</Card>
					))}
				</div>
			</div>
		</section>
	)
}

export function PricingFaqSection() {
	return (
		<section className="section-spacing-spacious animate-in fade-in duration-700 delay-300">
			<div className="mx-auto max-w-6xl px-6 lg:px-8">
				<div className="rounded-3xl border border-border/60 bg-card/60 p-10 shadow-sm backdrop-blur sm:p-14">
					<div className="mx-auto mb-14 max-w-3xl text-center">
						<h2 className="text-section-title tracking-tight text-foreground">
							Frequently asked questions
						</h2>
						<p className="mt-4 text-base text-muted-foreground text-sm-foreground sm:text-lg">
							Details on trials, billing, switching plans, and how access works
							for teams and tenants.
						</p>
					</div>
					<div className="grid gap-4 lg:grid-cols-2">
						{FAQS.map((faq, index) => (
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
									<AccordionContent className="pb-5 text-sm leading-6 text-muted-foreground text-sm-foreground sm:text-base sm:leading-7">
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
							<p className="text-sm text-muted-foreground text-sm-foreground sm:text-base">
								Our team can walk through your portfolio and recommend the right
								setup.
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
	)
}

export function PricingCtaSection() {
	return (
		<section className="section-spacing-spacious animate-in fade-in duration-700 delay-400">
			<div className="mx-auto max-w-6xl px-6 lg:px-8">
				<div className="grid gap-10 overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-10 shadow-sm backdrop-blur md:grid-cols-[1.3fr_1fr] md:p-12">
					<div className="space-y-6 text-left">
						<h2 className="text-section-title tracking-tight text-foreground">
							Ready to centralize your portfolio and automate the busywork?
						</h2>
						<p className="text-base leading-relaxed text-muted-foreground text-sm-foreground sm:text-lg">
							Start with the workflow templates built for self-managing owners,
							then add teammates, vendors, and integrations as your units grow.
							Your data and automations stay intact across every plan.
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
						{[
							{
								title: '14-day trial, all features',
								desc: 'Add properties, send invites, test automations--keep everything when you subscribe.'
							},
							{
								title: 'Billing that flexes with you',
								desc: 'Switch plans whenever you want. Monthly and annual billing are available on every tier.'
							},
							{
								title: 'Guided onboarding',
								desc: 'Our implementation team and resource hub help migrate leases, payments, and documents in days.'
							}
						].map(item => (
							<div key={item.title} className="flex items-start gap-3">
								<CheckCircle2 className="mt-1 h-5 w-5 text-success" />
								<div>
									<p className="font-medium text-foreground">{item.title}</p>
									<p className="text-muted-foreground text-sm">{item.desc}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	)
}

export { FAQS as pricingFaqs }
