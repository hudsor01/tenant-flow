import Navbar from '@/components/navbar'
import { SaasPricingSection } from '@/components/sections/saas-pricing-section'
import Link from 'next/link'

export default function PricingPage() {
	return (
		<main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
			<Navbar />
			<div className="pt-20">
				<SaasPricingSection />

				{/* Premium FAQ Section */}
				<section className="py-32 bg-white dark:bg-slate-900">
					<div className="container mx-auto px-4 max-w-4xl">
						<div className="text-center mb-20">
							<h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
								Frequently Asked Questions
							</h2>
							<p className="text-xl text-slate-600 dark:text-slate-400">
								Everything you need to know about TenantFlow pricing
							</p>
						</div>

						<div className="space-y-8">
							{[
								{
									question: "What's included in the free trial?",
									answer:
										'Our 14-day free trial includes full access to all features of your chosen plan. No credit card required, and you can cancel anytime during the trial period.'
								},
								{
									question: 'Can I change plans later?',
									answer:
										"Absolutely! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any billing adjustments."
								},
								{
									question: 'What payment methods do you accept?',
									answer:
										'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and ACH bank transfers for annual plans.'
								},
								{
									question: 'Is there a setup fee?',
									answer:
										'No setup fees whatsoever. What you see is what you pay. We believe in transparent pricing with no hidden costs.'
								},
								{
									question: 'Do you offer refunds?',
									answer:
										"Yes, we offer a 30-day money-back guarantee for all paid plans. If you're not completely satisfied, we'll refund your payment."
								},
								{
									question: 'What kind of support do you provide?',
									answer:
										'All plans include email support. Professional and Enterprise plans include priority phone support and live chat during business hours.'
								}
							].map((faq, index) => (
								<div key={index} className="group">
									<div className="bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-8 hover:shadow-lg transition-all duration-300">
										<h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
											{faq.question}
										</h3>
										<p className="text-slate-600 dark:text-slate-400 leading-relaxed">
											{faq.answer}
										</p>
									</div>
								</div>
							))}
						</div>

						<div className="text-center mt-16">
							<p className="text-slate-600 dark:text-slate-400 mb-6 text-lg">
								Still have questions?
							</p>
							<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
								<button className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300">
									Contact Support
								</button>
								<button className="border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 px-8 py-4 rounded-xl font-semibold text-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all duration-300">
									Schedule a Call
								</button>
							</div>
							{process.env.NODE_ENV === 'development' && (
								<div className="mt-8 text-center">
									<Link 
										href="/pricing/checkout" 
										className="inline-block bg-green-500 text-white px-6 py-3 rounded-lg font-medium text-sm hover:bg-green-600 transition-colors"
									>
										Test Stripe Checkout (Dev Only)
									</Link>
								</div>
							)}
						</div>
					</div>
				</section>
			</div>
		</main>
	)
}
