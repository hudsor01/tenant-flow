/**
 * Pricing CTA Component
 * Final call-to-action section at the bottom of pricing page
 */

import { Button } from '@/components/ui/button'
import { ArrowRight, Check, Clock, Shield, Star } from 'lucide-react'

export function PricingCTA() {
	return (
		<section className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 py-24 text-white">
			<div className="mx-auto max-w-4xl px-4 text-center">
				{/* Main CTA */}
				<h2 className="mb-6 text-4xl font-bold sm:text-5xl">
					Ready to transform your
					<br />
					property management?
				</h2>

				<p className="mb-12 text-xl leading-relaxed text-blue-100">
					Join thousands of property managers who've streamlined their
					operations and increased their revenue with TenantFlow.
				</p>

				{/* CTA Buttons */}
				<div className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
					<Button
						size="lg"
						className="bg-white px-8 py-4 text-lg font-semibold text-blue-600 shadow-lg transition-all hover:bg-gray-100 hover:shadow-xl"
					>
						<span>Start your free trial</span>
						<ArrowRight className="ml-2 h-5 w-5" />
					</Button>

					<Button
						variant="outline"
						size="lg"
						className="border-blue-300 px-8 py-4 text-lg font-semibold text-white hover:bg-blue-700"
					>
						Schedule a demo
					</Button>
				</div>

				{/* Trust indicators */}
				<div className="mb-8 text-sm text-blue-200">
					<div className="flex flex-wrap items-center justify-center gap-8">
						<div className="flex items-center gap-2">
							<Clock className="h-4 w-4" />
							<span>14-day free trial</span>
						</div>
						<div className="flex items-center gap-2">
							<Shield className="h-4 w-4" />
							<span>No credit card required</span>
						</div>
						<div className="flex items-center gap-2">
							<Star className="h-4 w-4" />
							<span>Cancel anytime</span>
						</div>
					</div>
				</div>

				{/* Success stories */}
				<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
					<div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
						<div className="mb-4 text-3xl font-bold text-white">
							200+
						</div>
						<div className="text-blue-100">
							Properties managed on average per customer
						</div>
					</div>

					<div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
						<div className="mb-4 text-3xl font-bold text-white">
							10 hrs
						</div>
						<div className="text-blue-100">
							Saved per week with automation
						</div>
					</div>

					<div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm md:col-span-2 lg:col-span-1">
						<div className="mb-4 text-3xl font-bold text-white">
							98%
						</div>
						<div className="text-blue-100">
							Customer satisfaction rating
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
