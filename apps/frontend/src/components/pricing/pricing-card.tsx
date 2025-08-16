import { motion } from '@/lib/framer-motion'
import { Check, Loader2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PricingCardProps } from '@repo/shared'
import { calculateYearlySavings } from '@repo/shared'

function formatPricingPrice(price: number): string {
	return `$${price}`
}

export function PricingCard({
	tier,
	billingInterval,
	isCurrentPlan = false,
	loading = false,
	onSubscribe,
	className
}: PricingCardProps) {
	const price =
		billingInterval === 'yearly' ? tier.price.annual : tier.price.monthly
	const originalMonthlyPrice = tier.price.monthly
	const yearlyMonthlyEquivalent = Math.round(tier.price.annual / 12)
	const savings =
		billingInterval === 'yearly' && tier.price.monthly > 0
			? calculateYearlySavings(
					tier.price.monthly * 100,
					tier.price.annual * 100
				)
			: 0

	const isFreePlan = tier.id === 'FREETRIAL'
	const isEnterprise = tier.id === 'TENANTFLOW_MAX'

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className={cn(className)}
		>
			<Card
				className={cn(
					'relative h-full transition-all duration-300 hover:shadow-lg',
					tier.id === 'GROWTH'
						? 'border-primary border-2 shadow-md'
						: 'border border-gray-200 hover:border-gray-300',
					isCurrentPlan && 'ring-2 ring-green-500 ring-offset-2'
				)}
			>
				{/* Recommended Badge */}
				{tier.id === 'GROWTH' && (
					<div className="absolute -top-3 left-1/2 -translate-x-1/2 transform">
						<Badge className="bg-primary px-3 py-1 text-xs font-semibold text-white">
							<Star className="mr-1 h-3 w-3" />
							Most Popular
						</Badge>
					</div>
				)}

				{/* Current Plan Badge */}
				{isCurrentPlan && (
					<div className="absolute -top-3 right-4">
						<Badge className="bg-green-600 px-3 py-1 text-xs font-semibold text-white">
							Current Plan
						</Badge>
					</div>
				)}

				<CardHeader className="pb-4 text-center">
					<h3
						className={cn(
							'text-2xl font-bold',
							tier.id === 'GROWTH'
								? 'text-primary'
								: 'text-gray-900'
						)}
					>
						{tier.name}
					</h3>
					<p className="mt-2 text-sm text-gray-600">
						{tier.description}
					</p>
				</CardHeader>

				<CardContent className="px-6 pb-6">
					{/* Pricing */}
					<div className="mb-6 text-center">
						{isFreePlan ? (
							<div>
								<span className="text-4xl font-bold text-gray-900">
									Free
								</span>
								<p className="mt-1 text-sm text-gray-600">
									14-day trial
								</p>
							</div>
						) : isEnterprise ? (
							<div>
								<span className="from-primary bg-gradient-to-r to-indigo-600 bg-clip-text text-4xl font-bold text-transparent">
									Custom
								</span>
								<p className="mt-1 text-sm text-gray-600">
									Contact for pricing
								</p>
							</div>
						) : (
							<div>
								<div className="flex items-baseline justify-center">
									<span className="text-4xl font-bold text-gray-900">
										{formatPricingPrice(
											billingInterval === 'yearly'
												? yearlyMonthlyEquivalent
												: price
										)}
									</span>
									<span className="ml-1 text-gray-600">
										/
										{billingInterval === 'yearly'
											? 'month'
											: 'month'}
									</span>
								</div>

								{billingInterval === 'yearly' &&
									savings > 0 && (
										<div className="mt-2">
											<p className="text-sm text-gray-500">
												<span className="line-through">
													{formatPricingPrice(
														originalMonthlyPrice
													)}
													/month
												</span>
												<span className="ml-2 font-medium text-green-600">
													Save {savings}%
												</span>
											</p>
											<p className="mt-1 text-xs text-gray-500">
												Billed{' '}
												{formatPricingPrice(price)}{' '}
												annually
											</p>
										</div>
									)}
							</div>
						)}
					</div>

					{/* Limits Display (for non-tenantflow_max plans) */}
					{!isEnterprise && (
						<div className="mb-6 rounded-lg bg-gray-50 p-4">
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div className="text-center">
									<div className="font-semibold text-gray-900">
										{tier.limits.properties === 0
											? '∞'
											: tier.limits.properties}
									</div>
									<div className="text-gray-600">
										Properties
									</div>
								</div>
								<div className="text-center">
									<div className="font-semibold text-gray-900">
										{tier.limits.units === 0
											? '∞'
											: tier.limits.units}
									</div>
									<div className="text-gray-600">Units</div>
								</div>
							</div>
						</div>
					)}

					{/* Features */}
					<div className="space-y-3">
						{tier.features.map((feature: string, index: number) => (
							<div key={index} className="flex items-start">
								<Check className="mt-0.5 mr-3 h-4 w-4 flex-shrink-0 text-green-500" />
								<span className="text-sm text-gray-700">
									{feature}
								</span>
							</div>
						))}
					</div>
				</CardContent>

				<CardFooter className="px-6 pt-0">
					<Button
						onClick={onSubscribe}
						disabled={loading || isCurrentPlan}
						className={cn(
							'w-full transition-all duration-200',
							tier.id === 'GROWTH'
								? 'bg-primary text-white hover:bg-blue-700'
								: isFreePlan
									? 'bg-green-600 text-white hover:bg-green-700'
									: isEnterprise
										? 'bg-gray-900 text-white hover:bg-gray-800'
										: 'bg-gray-900 text-white hover:bg-gray-800',
							isCurrentPlan &&
								'cursor-not-allowed bg-gray-100 text-gray-500'
						)}
					>
						{loading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Processing...
							</>
						) : isCurrentPlan ? (
							'Current Plan'
						) : isFreePlan ? (
							'Start Free Trial'
						) : (
							'Get Started'
						)}
					</Button>
				</CardFooter>
			</Card>
		</motion.div>
	)
}
