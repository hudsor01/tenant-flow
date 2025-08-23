/**
 * Pricing FAQ Component
 * Simple accordion-style FAQ section
 */

'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const faqs = [
	{
		question: 'How does the 14-day free trial work?',
		answer: 'Your free trial includes full access to all features in your chosen plan. No credit card required to start. You can cancel anytime during the trial with no charges.'
	},
	{
		question: 'Can I change plans anytime?',
		answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any billing adjustments."
	},
	{
		question: 'What happens to my data if I cancel?',
		answer: "Your data remains accessible for 90 days after cancellation. You can export all your data at any time, and we'll help with the transition if needed."
	},
	{
		question: 'Do you offer annual billing discounts?',
		answer: "Yes! Annual plans save you 20% compared to monthly billing. That's 2 months free when you pay annually."
	},
	{
		question: 'Is there a setup fee or long-term contract?',
		answer: 'No setup fees, no long-term contracts. You can cancel anytime with 30 days notice. We believe in earning your business every month.'
	},
	{
		question: 'How secure is my data?',
		answer: 'We use bank-grade encryption, SOC 2 Type II compliance, and regular security audits. Your data is backed up daily and stored in secure, redundant data centers.'
	},
	{
		question: 'What support is included?',
		answer: 'All plans include email support. Growth and Max plans get priority support with faster response times. Max plans also include phone support and a dedicated account manager.'
	},
	{
		question: 'Can I import data from other systems?',
		answer: 'Yes! We provide free data migration assistance and support imports from Excel, CSV files, and most popular property management systems.'
	}
]

export function PricingFAQ() {
	const [openIndex, setOpenIndex] = useState<number | null>(0)

	return (
		<section className="bg-gray-50 py-24">
			<div className="mx-auto max-w-4xl px-4">
				<div className="mb-16 text-center">
					<h2 className="mb-4 text-4xl font-bold text-gray-900">
						Frequently asked questions
					</h2>
					<p className="text-lg text-gray-600">
						Everything you need to know about our pricing and plans.
					</p>
				</div>

				<div className="space-y-4">
					{faqs.map((faq, index) => (
						<div
							key={index}
							className="rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md"
						>
							<button
								onClick={() =>
									setOpenIndex(
										openIndex === index ? null : index
									)
								}
								className="flex w-full items-center justify-between p-6 text-left"
							>
								<h3 className="pr-8 text-lg font-semibold text-gray-900">
									{faq.question}
								</h3>
								{openIndex === index ? (
									<ChevronUp className="h-5 w-5 flex-shrink-0 text-gray-500" />
								) : (
									<ChevronDown className="h-5 w-5 flex-shrink-0 text-gray-500" />
								)}
							</button>

							{openIndex === index && (
								<div className="border-t border-gray-100 px-6 pb-6">
									<p className="pt-4 leading-relaxed text-gray-600">
										{faq.answer}
									</p>
								</div>
							)}
						</div>
					))}
				</div>

				{/* Contact support */}
				<div className="mt-16 text-center">
					<div className="rounded-xl border border-blue-200 bg-blue-50 p-8">
						<h3 className="mb-3 text-xl font-semibold text-gray-900">
							Still have questions?
						</h3>
						<p className="mb-6 text-gray-600">
							Our support team is here to help you find the right
							plan for your needs.
						</p>
						<div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
							<button className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700">
								Contact Support
							</button>
							<button className="font-medium text-blue-600 transition-colors hover:text-blue-700">
								Schedule a Demo
							</button>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
