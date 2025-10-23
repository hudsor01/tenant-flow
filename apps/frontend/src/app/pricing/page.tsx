'use client'

import Footer from '@/components/layout/footer'
import { Navbar } from '@/components/layout/navbar'
import { StripePricingTable } from '@/components/pricing/stripe-pricing-table'
import { TestimonialsSection } from '@/components/sections/testimonials-section'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

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
	const navItems = [
		{ name: 'Features', href: '/features' },
		{ name: 'Pricing', href: '/pricing' },
		{ name: 'About', href: '/about' },
		{ name: 'Blog', href: '/blog' },
		{ name: 'FAQ', href: '/faq' },
		{ name: 'Contact', href: '/contact' }
	]

	return (
		<div className="relative min-h-screen flex flex-col">
			<Navbar navItems={navItems} ctaText="Get Started" ctaHref="/signup" />
			<main className="flex-1 pt-20">
				{/* Simple Header */}
				<section className="relative py-12">
					<div className="max-w-7xl mx-auto px-6 lg:px-8">
						<div className="max-w-4xl mx-auto text-center space-y-4">
							<h1 className="text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
								Pricing that scales with you
							</h1>
							<p className="text-xl text-muted-foreground leading-relaxed">
								Start with a 14-day free trial. No credit card required. Upgrade
								or downgrade anytime.
							</p>
						</div>
					</div>
				</section>

				{/* Pricing Table Section - Native Stripe Component */}
				<section className="relative py-12">
					<div className="max-w-7xl mx-auto px-6 lg:px-8">
						<StripePricingTable className="w-full" />
					</div>
				</section>

				{/* Testimonials Section */}
				<TestimonialsSection />

				{/* FAQ Section - Premium Split Layout */}
				<section className="relative py-24 bg-gradient-to-b from-transparent to-muted/20">
					<div className="max-w-7xl mx-auto px-6 lg:px-8">
						{/* Header */}
						<div className="max-w-3xl mx-auto text-center mb-16">
							<h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
								Frequently Asked Questions
							</h2>
							<p className="text-xl text-muted-foreground">
								Everything you need to know about our pricing and plans
							</p>
						</div>

						{/* FAQ Grid - Premium 2 Column Layout */}
						<div className="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
							{faqs.map((faq, index) => (
								<Accordion
									key={index}
									type="single"
									collapsible
									className="w-full"
								>
									<AccordionItem
										value={`item-${index}`}
										className="border border-border/60 rounded-xl px-6 bg-card/50 backdrop-blur-sm hover:bg-card hover:border-primary/20 hover:shadow-md transition-all duration-300"
									>
										<AccordionTrigger className="text-left hover:no-underline py-6 gap-4">
											<span className="font-semibold text-lg text-foreground pr-4">
												{faq.question}
											</span>
										</AccordionTrigger>
										<AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
											{faq.answer}
										</AccordionContent>
									</AccordionItem>
								</Accordion>
							))}
						</div>

						{/* CTA */}
						<div className="text-center mt-16 p-8 rounded-2xl bg-card/30 border border-border/50 max-w-2xl mx-auto">
							<p className="text-lg text-muted-foreground mb-6">
								Still have questions? We&apos;re here to help.
							</p>
							<Button size="lg" className="h-12 px-8" asChild>
								<Link href="/contact">
									Contact Sales
									<ArrowRight className="w-4 h-4 ml-2" />
								</Link>
							</Button>
						</div>
					</div>
				</section>

				{/* Final CTA Section */}
				<section className="relative py-20 bg-transparent">
					<div className="max-w-4xl mx-auto px-6 lg:px-8">
						<div className="bg-linear-to-br from-primary/10 via-primary/5 to-transparent rounded-3xl border border-primary/20 p-12 text-center shadow-xl">
							<h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
								Ready to transform your property management?
							</h2>
							<p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
								Join 10,000+ property managers who save 20+ hours weekly
							</p>
							<div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
								<Button size="lg" className="px-10 h-14 text-lg" asChild>
									<Link href="/signup">
										Start Free Trial
										<ArrowRight className="w-5 h-5 ml-2" />
									</Link>
								</Button>
								<Button
									size="lg"
									variant="outline"
									className="px-10 h-14 text-lg border-2"
									asChild
								>
									<Link href="/contact">Talk to Sales</Link>
								</Button>
							</div>
							<div className="flex flex-wrap justify-center items-center gap-8 text-sm">
								<div className="flex items-center gap-2">
									<CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
									<span className="text-foreground font-medium">
										14-day free trial
									</span>
								</div>
								<div className="flex items-center gap-2">
									<CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
									<span className="text-foreground font-medium">
										No credit card required
									</span>
								</div>
								<div className="flex items-center gap-2">
									<CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
									<span className="text-foreground font-medium">
										Cancel anytime
									</span>
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
