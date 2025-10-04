'use client'

import Footer from '@/components/layout/footer'
import { StripePricingSection } from '@/components/pricing/stripe-pricing-section'
import { StatsShowcase } from '@/components/sections/stats-showcase'
import { Button } from '@/components/ui/button'
import { GridBackground } from '@/components/ui/grid-background'
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemSeparator,
	ItemTitle
} from '@/components/ui/item'
import { ArrowRight, CheckCircle2, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

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
			"We'll notify you when you're approaching your limits. You can upgrade anytime to accommodate growth."
	},
	{
		question: 'Do you offer refunds?',
		answer:
			"Yes! We offer a 60-day money-back guarantee. If you're not satisfied, contact us for a full refund."
	}
]

export default function PricingPage() {
	const [openFaq, setOpenFaq] = useState<number | null>(null)

	return (
		<div className="relative min-h-screen flex flex-col">
			{/* Full page grid background */}
			<GridBackground className="fixed inset-0 -z-10" />

			{/* Navigation */}
			<nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-full px-8 py-4 backdrop-blur-xl border border-border shadow-lg bg-background/90 w-auto">
				<div className="flex items-center justify-between gap-8">
					<Link
						href="/"
						className="flex items-center justify-center space-x-4 hover:opacity-80 transition-opacity"
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

					<div className="hidden md:flex items-center space-x-2">
						<Link
							href="/features"
							className="px-4 py-2 text-muted-foreground font-medium text-sm rounded-xl transition-all duration-200 hover:text-foreground hover:bg-accent"
						>
							Features
						</Link>
						<Link
							href="/pricing"
							className="px-4 py-2 text-muted-foreground font-medium text-sm rounded-xl transition-all duration-200 hover:text-foreground hover:bg-accent"
						>
							Pricing
						</Link>
						<Link
							href="/about"
							className="px-4 py-2 text-muted-foreground font-medium text-sm rounded-xl transition-all duration-200 hover:text-foreground hover:bg-accent"
						>
							About
						</Link>
						<Link
							href="/blog"
							className="px-4 py-2 text-muted-foreground font-medium text-sm rounded-xl transition-all duration-200 hover:text-foreground hover:bg-accent"
						>
							Blog
						</Link>
						<Link
							href="/faq"
							className="px-4 py-2 text-muted-foreground font-medium text-sm rounded-xl transition-all duration-200 hover:text-foreground hover:bg-accent"
						>
							FAQ
						</Link>
						<Link
							href="/contact"
							className="px-4 py-2 text-muted-foreground font-medium text-sm rounded-xl transition-all duration-200 hover:text-foreground hover:bg-accent"
						>
							Contact
						</Link>
					</div>

					<div className="flex items-center space-x-4">
						<Link
							href="/login"
							className="hidden sm:flex items-center px-4 py-2 text-foreground rounded-xl font-medium transition-all duration-300 hover:bg-accent"
						>
							Sign In
						</Link>
						<Link
							href="/login"
							className="inline-flex items-center px-6 py-2.5 bg-primary text-primary-foreground font-medium text-sm rounded-xl shadow-lg transition-all duration-200 hover:bg-primary/90 hover:shadow-xl"
						>
							Get Started
							<ArrowRight className="ml-2 h-4 w-4" />
						</Link>
					</div>
				</div>
			</nav>

			<main className="flex-1">
				{/* Simple Header - No Hero */}
				<section className="relative page-content pb-4">
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

				{/* Pricing Cards Section */}
				<section className="relative pb-6 bg-transparent">
					<div className="max-w-7xl mx-auto px-6 lg:px-8">
						<StripePricingSection showHeader={false} showStats={false} />
					</div>
				</section>

				{/* Stats Section */}
				<StatsShowcase />

				{/* FAQ Section */}
				<section className="relative section-compact bg-transparent">
					<div className="max-w-4xl mx-auto px-6 lg:px-8">
						<div className="text-center mb-6">
							<h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
								Frequently Asked Questions
							</h2>
							<p className="text-xl text-muted-foreground">
								Everything you need to know about our pricing
							</p>
						</div>

						<ItemGroup>
							{faqs.map((faq, index) => (
								<>
									<Item
										key={index}
										variant="outline"
										className="cursor-pointer hover:bg-muted/50 transition-colors"
										onClick={() => setOpenFaq(openFaq === index ? null : index)}
									>
										<ItemContent>
											<ItemTitle className="flex items-center justify-between w-full">
												{faq.question}
												<ChevronDown
													className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform ml-4 ${
														openFaq === index ? 'transform rotate-180' : ''
													}`}
												/>
											</ItemTitle>
											{openFaq === index && (
												<ItemDescription className="mt-2 pt-2 border-t">
													{faq.answer}
												</ItemDescription>
											)}
										</ItemContent>
									</Item>
									{index < faqs.length - 1 && <ItemSeparator />}
								</>
							))}
						</ItemGroup>

						<div className="text-center mt-4">
							<p className="text-muted-foreground mb-2">
								Still have questions?
							</p>
							<Button size="lg" variant="outline" asChild>
								<Link href="/contact">
									Contact Sales
									<ArrowRight className="w-4 h-4 ml-2" />
								</Link>
							</Button>
						</div>
					</div>
				</section>

				{/* Final CTA Section */}
				<section className="relative section-content bg-transparent">
					<div className="max-w-4xl mx-auto px-6 lg:px-8">
						<div className="bg-accent-gradient py-4 px-4 text-center">
							<h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
								Ready to transform your property management?
							</h2>
							<p className="text-xl text-muted-foreground mb-4">
								Join 10,000+ property managers who save 20+ hours weekly
							</p>
							<div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-4">
								<Button size="lg" className="px-8" asChild>
									<Link href="/login">
										Start Free Trial
										<ArrowRight className="w-5 h-5 ml-2" />
									</Link>
								</Button>
								<Button size="lg" variant="outline" className="px-8" asChild>
									<Link href="/contact">Talk to Sales</Link>
								</Button>
							</div>
							<div className="flex flex-wrap justify-center items-center gap-6 text-sm text-muted-foreground">
								<div className="flex items-center justify-center gap-2">
									<CheckCircle2 className="w-4 h-4" />
									<span>14-day free trial</span>
								</div>
								<div className="flex items-center justify-center gap-2">
									<CheckCircle2 className="w-4 h-4" />
									<span>No credit card required</span>
								</div>
								<div className="flex items-center justify-center gap-2">
									<CheckCircle2 className="w-4 h-4" />
									<span>Cancel anytime</span>
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
