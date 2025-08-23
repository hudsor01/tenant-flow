/**
 * Modern Pricing Cards Component
 * Inspired by Resend's clean card design and Stripe's interaction patterns
 */

'use client'

import { useState } from 'react'
import { Check, ArrowRight, Star, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
	getAllPlans,
	formatPrice,
	getAnnualSavings
} from '@repo/shared/stripe/config'
import { useCreateCheckoutSession } from '@/hooks/api/use-billing'
import type { PlanType, BillingPeriod } from '@repo/shared'

export function PricingCards() {
	const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly')
	const createCheckoutMutation = useCreateCheckoutSession()
	const plans = getAllPlans()

	const handleGetStarted = async (planId: PlanType) => {
		createCheckoutMutation.mutate({
			planId: planId,
			interval: billingPeriod === 'monthly' ? 'monthly' : 'annual',
			successUrl: `${window.location.origin}/billing/success`,
			cancelUrl: `${window.location.origin}/pricing`
		})
	}

	return (
		<section className="bg-white py-24">
			<div className="mx-auto max-w-7xl px-4">
				{/* Section header */}
				<div className="mb-16 text-center">
					<h2 className="mb-4 text-4xl font-bold text-gray-900 sm:text-5xl">
						Choose your plan
					</h2>
					<p className="mx-auto max-w-2xl text-lg text-gray-600">
						Start with a 14-day free trial, then select the plan
						that best fits your property portfolio size.
					</p>
				</div>

				{/* Billing toggle */}
				<div className="mb-12 flex justify-center">
					<div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1">
						<button
							onClick={() => setBillingPeriod('monthly')}
							className={`rounded-lg px-6 py-2 text-sm font-medium transition-all ${
								billingPeriod === 'monthly'
									? 'bg-white text-gray-900 shadow-sm'
									: 'text-gray-600 hover:text-gray-900'
							}`}
						>
							Monthly
						</button>
						<button
							onClick={() => setBillingPeriod('annual')}
							className={`rounded-lg px-6 py-2 text-sm font-medium transition-all ${
								billingPeriod === 'annual'
									? 'bg-white text-gray-900 shadow-sm'
									: 'text-gray-600 hover:text-gray-900'
							}`}
						>
							<span>Annual</span>
							<Badge
								variant="secondary"
								className="ml-2 bg-green-100 text-green-700"
							>
								Save 20%
							</Badge>
						</button>
					</div>
				</div>

				{/* Pricing cards */}
				<div className="grid gap-8 lg:grid-cols-3">
					{plans.map(plan => {
						const price =
							billingPeriod === 'monthly'
								? plan.monthly
								: plan.annual
						const savings =
							billingPeriod === 'annual'
								? getAnnualSavings(plan.id)
								: 0
						const isPopular = plan.popular
						const isRecommended = plan.recommended

						return (
							<Card
								key={plan.id}
								className={`relative overflow-hidden transition-all duration-200 ${
									isPopular || isRecommended
										? 'scale-105 border-2 border-blue-500 shadow-xl ring-4 ring-blue-50'
										: 'border border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-lg'
								}`}
							>
								{/* Popular/Recommended badge */}
								{(isPopular || isRecommended) && (
									<div className="absolute -top-4 left-1/2 -translate-x-1/2">
										<Badge className="bg-blue-600 px-4 py-1 font-medium text-white">
											{isRecommended && (
												<Star className="mr-1 h-3 w-3 fill-current" />
											)}
											{isRecommended
												? 'Recommended'
												: 'Most Popular'}
										</Badge>
									</div>
								)}

								<CardHeader className="pt-8 pb-8">
									<div className="text-center">
										<h3 className="text-2xl font-bold text-gray-900">
											{plan.name}
										</h3>
										<p className="mt-2 text-gray-600">
											{plan.description}
										</p>

										{/* Pricing */}
										<div className="mt-6">
											<div className="flex items-baseline justify-center">
												<span className="text-5xl font-bold text-gray-900">
													{formatPrice(price.amount)}
												</span>
												<span className="ml-2 text-lg text-gray-600">
													/
													{billingPeriod === 'monthly'
														? 'month'
														: 'year'}
												</span>
											</div>

											{billingPeriod === 'annual' &&
												savings > 0 && (
													<div className="mt-2 text-sm font-medium text-green-600">
														Save{' '}
														{formatPrice(savings)}{' '}
														annually
													</div>
												)}

											{billingPeriod === 'monthly' && (
												<div className="mt-2 text-sm text-gray-500">
													or{' '}
													{formatPrice(
														plan.annual.amount
													)}
													/year
												</div>
											)}
										</div>
									</div>
								</CardHeader>

								<CardContent className="pt-0">
									{/* Features list */}
									<div className="mb-8 space-y-4">
										{plan.features.map((feature, index) => (
											<div
												key={index}
												className="flex items-start gap-3"
											>
												<Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
												<span className="text-gray-700">
													{feature}
												</span>
											</div>
										))}
									</div>

									{/* Usage limits */}
									<div className="mb-8 rounded-lg border border-gray-100 bg-gray-50 p-4">
										<div className="mb-3 text-sm font-medium text-gray-900">
											Usage limits:
										</div>
										<div className="space-y-2 text-sm text-gray-600">
											<div className="flex justify-between">
												<span>Properties:</span>
												<span className="font-medium">
													{plan.limits.properties ===
													-1
														? 'Unlimited'
														: plan.limits
																.properties}
												</span>
											</div>
											<div className="flex justify-between">
												<span>Units:</span>
												<span className="font-medium">
													{plan.limits.units === -1
														? 'Unlimited'
														: plan.limits.units}
												</span>
											</div>
											<div className="flex justify-between">
												<span>Team members:</span>
												<span className="font-medium">
													{plan.limits.users === -1
														? 'Unlimited'
														: plan.limits.users}
												</span>
											</div>
										</div>
									</div>

									{/* CTA Button */}
									<Button
										onClick={() =>
											handleGetStarted(plan.id)
										}
										disabled={
											createCheckoutMutation.isPending
										}
										className={`h-12 w-full text-base font-semibold transition-all ${
											isPopular || isRecommended
												? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:shadow-xl'
												: 'bg-gray-900 text-white hover:bg-gray-800'
										}`}
									>
										{createCheckoutMutation.isPending ? (
											<div className="flex items-center gap-2">
												<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
												Processing...
											</div>
										) : (
											<div className="flex items-center gap-2">
												Start free trial
												<ArrowRight className="h-4 w-4" />
											</div>
										)}
									</Button>

									<div className="mt-4 text-center text-sm text-gray-500">
										14-day free trial • No credit card
										required • Cancel anytime
									</div>
								</CardContent>
							</Card>
						)
					})}
				</div>

				{/* Enterprise CTA */}
				<div className="mt-16 text-center">
					<div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white p-8">
						<h3 className="mb-4 text-2xl font-bold text-gray-900">
							Need a custom solution?
						</h3>
						<p className="mb-6 text-gray-600">
							For large property management companies with
							specific requirements, we offer custom enterprise
							solutions with dedicated support.
						</p>
						<Button variant="outline" size="lg" className="gap-2">
							<span>Contact sales</span>
							<ArrowRight className="h-4 w-4" />
						</Button>
					</div>
				</div>

				{/* Money back guarantee */}
				<div className="mt-16 text-center">
					<div className="inline-flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-6 py-3">
						<div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
							<Zap className="h-4 w-4 text-green-600" />
						</div>
						<div className="text-sm">
							<span className="font-semibold text-green-800">
								30-day money-back guarantee
							</span>
							<span className="text-green-700">
								{' '}
								• No questions asked
							</span>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
