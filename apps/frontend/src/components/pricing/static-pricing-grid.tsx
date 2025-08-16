/**
 * Static pricing grid component (Server Component)
 * Works without JavaScript - progressive enhancement target
 */

import { Check, Star, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ENHANCED_PRODUCT_TIERS } from '@repo/shared/config/pricing'

interface StaticPricingGridProps {
	className?: string
	showRecommended?: boolean
	showPopular?: boolean
}

/**
 * Server-side pricing grid that works without JavaScript
 * Enhanced progressively with Stripe integration
 */
export function StaticPricingGrid({
	className,
	showRecommended = true,
	showPopular = true
}: StaticPricingGridProps) {
	const plans = Object.values(ENHANCED_PRODUCT_TIERS)

	return (
		<div className={`py-16 ${className || ''}`}>
			<div className="mx-auto max-w-7xl px-4">
				{/* Grid */}
				<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
					{plans.map(plan => {
						const isRecommended =
							showRecommended &&
							('recommended' in plan ? plan.recommended : false)
						const isPopular =
							showPopular &&
							('popular' in plan ? plan.popular : false)

						return (
							<Card
								key={plan.id}
								className={`relative ${
									isRecommended || isPopular
										? 'border-primary scale-105 border-2 shadow-lg'
										: 'border hover:shadow-md'
								} transition-all duration-200`}
							>
								{(isRecommended || isPopular) && (
									<div className="absolute -top-4 left-1/2 -translate-x-1/2 transform">
										<Badge className="bg-primary px-4 py-1 text-white">
											{isRecommended && (
												<Star className="mr-1 h-3 w-3" />
											)}
											{isRecommended
												? 'Recommended'
												: 'Most Popular'}
										</Badge>
									</div>
								)}

								<CardHeader className="pb-4 text-center">
									<CardTitle className="text-xl font-bold text-gray-900">
										{plan.name}
									</CardTitle>
									<p className="text-sm text-gray-600">
										{plan.description}
									</p>

									{/* Pricing */}
									<div className="mt-4">
										{plan.price.monthly === 0 ? (
											<div className="text-4xl font-bold text-gray-900">
												Free
											</div>
										) : (
											<>
												<div className="text-4xl font-bold text-gray-900">
													${plan.price.monthly}
													<span className="text-lg font-normal text-gray-600">
														/month
													</span>
												</div>
												{plan.price.annual > 0 && (
													<div className="mt-1 text-sm font-medium text-green-600">
														Or ${plan.price.annual}
														/year (save $
														{plan.price.monthly *
															12 -
															plan.price.annual}
														)
													</div>
												)}
											</>
										)}
									</div>

									{/* Trial info */}
									{plan.trial.trialPeriodDays > 0 && (
										<div className="text-primary mt-2 flex items-center justify-center gap-1 text-xs">
											<Zap className="h-3 w-3" />
											<span>
												{plan.trial.trialPeriodDays}-day
												free trial
											</span>
										</div>
									)}
								</CardHeader>

								<CardContent className="pt-0">
									{/* Features */}
									<div className="mb-6 space-y-3">
										{plan.features.map((feature, index) => (
											<div
												key={index}
												className="flex items-start gap-3"
											>
												<Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
												<span className="text-sm text-gray-700">
													{feature}
												</span>
											</div>
										))}
									</div>

									{/* CTA */}
									<div className="space-y-3">
										<Button
											className={`w-full ${
												isRecommended || isPopular
													? 'bg-primary hover:bg-blue-700'
													: 'bg-gray-900 hover:bg-gray-800'
											}`}
											asChild
										>
											<a
												href={`/signup?plan=${plan.planId}`}
											>
												{plan.price.monthly === 0
													? 'Start Free Trial'
													: 'Get Started'}
											</a>
										</Button>

										{plan.price.monthly > 0 && (
											<div className="text-center text-xs text-gray-500">
												No setup fees • Cancel anytime
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						)
					})}
				</div>

				{/* Bottom CTA */}
				<div className="mt-16 text-center">
					<h3 className="mb-4 text-2xl font-bold text-gray-900">
						Need a custom solution?
					</h3>
					<p className="mx-auto mb-6 max-w-2xl text-gray-600">
						We offer custom enterprise solutions for larger property
						management companies with specific requirements.
					</p>
					<Button variant="outline" asChild>
						<a href="/contact">Contact Our Sales Team</a>
					</Button>
				</div>
			</div>
		</div>
	)
}
