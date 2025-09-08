'use client'

import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface FAQItem {
	question: string
	answer: string
	category?: string
}

interface FAQSectionProps {
	title?: string
	description?: string
	faqs: FAQItem[]
	className?: string
	defaultExpanded?: boolean
	showCategories?: boolean
}

export function FAQSection({
	title = 'Frequently Asked Questions',
	description = 'Everything you need to know about our services',
	faqs,
	className,
	defaultExpanded = false,
	showCategories = false
}: FAQSectionProps) {
	const [expandedItems, setExpandedItems] = useState<Set<number>>(
		defaultExpanded ? new Set(faqs.map((_, index) => index)) : new Set()
	)

	const toggleItem = (index: number) => {
		const newExpanded = new Set(expandedItems)
		if (newExpanded.has(index)) {
			newExpanded.delete(index)
		} else {
			newExpanded.add(index)
		}
		setExpandedItems(newExpanded)
	}

	// Group FAQs by category if showCategories is true
	const groupedFaqs = showCategories
		? faqs.reduce(
				(acc, faq, index) => {
					const category = faq.category || 'General'
					if (!acc[category]) {
						acc[category] = []
					}
					acc[category].push({ ...faq, originalIndex: index })
					return acc
				},
				{} as Record<string, (FAQItem & { originalIndex: number })[]>
			)
		: { All: faqs.map((faq, index) => ({ ...faq, originalIndex: index })) }

	return (
		<section className={cn('py-24 bg-background', className)}>
			<div className="container max-w-4xl mx-auto px-4">
				{/* Header */}
				<div className="text-center mb-16 animate-fade-in-up">
					<h2 className="text-display font-bold mb-4 text-gradient-primary">
						{title}
					</h2>
					<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
						{description}
					</p>
				</div>

				{/* FAQ Content */}
				<div className="space-y-8">
					{Object.entries(groupedFaqs).map(([category, categoryFaqs]) => (
						<div key={category} className="animate-fade-in-up">
							{showCategories && category !== 'All' && (
								<h3 className="text-2xl font-semibold mb-6 text-foreground border-b border-border pb-2">
									{category}
								</h3>
							)}

							<div className="space-y-4">
								{categoryFaqs.map(faq => {
									const isExpanded = expandedItems.has(faq.originalIndex)
									return (
										<div
											key={faq.originalIndex}
											className="card-elevated-gradient group hover:scale-[1.02] transition-all duration-300"
										>
											<button
												onClick={() => toggleItem(faq.originalIndex)}
												className="w-full text-left p-6 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
												aria-expanded={isExpanded}
												aria-controls={`faq-answer-${faq.originalIndex}`}
											>
												<div className="flex items-center justify-between gap-4">
													<h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
														{faq.question}
													</h3>
													<div className="flex-shrink-0">
														{isExpanded ? (
															<ChevronUp className="w-5 h-5 text-primary transition-transform duration-200" />
														) : (
															<ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-transform duration-200" />
														)}
													</div>
												</div>
											</button>

											<div
												id={`faq-answer-${faq.originalIndex}`}
												className={cn(
													'overflow-hidden transition-all duration-300 ease-in-out',
													isExpanded
														? 'max-h-96 opacity-100'
														: 'max-h-0 opacity-0'
												)}
											>
												<div className="px-6 pb-6">
													<div className="border-t border-border pt-4 mt-2">
														<p className="text-muted-foreground leading-relaxed">
															{faq.answer}
														</p>
													</div>
												</div>
											</div>
										</div>
									)
								})}
							</div>
						</div>
					))}
				</div>

				{/* Contact CTA */}
				<div className="text-center mt-16 animate-fade-in-up">
					<div className="card-glass p-8 max-w-2xl mx-auto">
						<h3 className="text-xl font-semibold mb-2 text-foreground">
							Still have questions?
						</h3>
						<p className="text-muted-foreground mb-6">
							Can't find the answer you're looking for? Our support team is here
							to help.
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<button className="button-primary">Contact Support</button>
							<button className="button-secondary">View Documentation</button>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}

// Predefined FAQ data for common SaaS questions
export const commonPricingFAQs: FAQItem[] = [
	{
		question: "What's included in the free trial?",
		answer:
			"Our 14-day free trial includes full access to all features of your chosen plan. No credit card required, and you can cancel anytime during the trial period. You'll get access to property management tools, tenant screening, lease generation, and financial reporting.",
		category: 'Getting Started'
	},
	{
		question: 'Can I change plans later?',
		answer:
			"Absolutely! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any billing adjustments. Upgrades are processed instantly, while downgrades take effect at the next billing cycle.",
		category: 'Billing'
	},
	{
		question: 'What payment methods do you accept?',
		answer:
			'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and ACH bank transfers for annual plans. All payments are processed securely through Stripe with PCI DSS compliance.',
		category: 'Billing'
	},
	{
		question: 'Is there a setup fee?',
		answer:
			'No setup fees whatsoever. What you see is what you pay. We believe in transparent pricing with no hidden costs. Your first payment will be processed after the trial period ends.',
		category: 'Billing'
	},
	{
		question: 'Do you offer refunds?',
		answer:
			"Yes, we offer a 30-day money-back guarantee for all paid plans. If you're not completely satisfied, we'll refund your payment. Contact our support team within 30 days of your first payment.",
		category: 'Billing'
	},
	{
		question: 'What kind of support do you provide?',
		answer:
			'All plans include email support with 24h response time. Growth and TenantFlow Max plans include priority phone support and live chat during business hours (9 AM - 6 PM EST). Enterprise customers get dedicated support managers.',
		category: 'Support'
	},
	{
		question: 'Can I cancel my subscription anytime?',
		answer:
			"Yes, you can cancel your subscription at any time from your account settings or by contacting support. Your access will continue until the end of your current billing period, and you won't be charged for the next cycle.",
		category: 'Billing'
	},
	{
		question: 'Do you offer discounts for non-profits?',
		answer:
			'Yes! We offer special pricing for qualified non-profit organizations. Contact our sales team with your 501(c)(3) documentation to discuss discounted rates and custom terms.',
		category: 'Special Offers'
	},
	{
		question: 'What happens to my data if I cancel?',
		answer:
			'Your data remains accessible for 30 days after cancellation. During this period, you can export all your information. After 30 days, your account will be permanently deleted unless you reactivate your subscription.',
		category: 'Data & Privacy'
	},
	{
		question: 'Do you offer training or onboarding?',
		answer:
			'Yes! All new customers receive complimentary onboarding sessions and access to our comprehensive training materials. Growth and Enterprise plans include personalized training sessions with our success team.',
		category: 'Getting Started'
	}
]
