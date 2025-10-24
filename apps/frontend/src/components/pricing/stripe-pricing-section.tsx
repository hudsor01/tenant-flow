'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardLayout } from '@/components/ui/card-layout'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import {
	calculateAnnualSavings,
	formatStripePrice,
	getPlanFeatures,
	useStripeProducts
} from '@/hooks/use-stripe-products'
import { checkoutRateLimiter } from '@/lib/security'
import { createCheckoutSession, isUserAuthenticated } from '@/lib/stripe-client'
import { cn } from '@/lib/utils'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { useMutation } from '@tanstack/react-query'
import { Check, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface StripePricingSectionProps {
	className?: string
}

export function StripePricingSection({ className }: StripePricingSectionProps) {
	const logger = createLogger({ component: 'StripePricingSection' })
	const [isAnnual, setIsAnnual] = useState(false)

	const { products } = useStripeProducts()

	const subscriptionMutation = useMutation({
		mutationFn: async (planData: {
			planId: string
			planName: string
			monthlyPriceId?: string
			annualPriceId?: string
		}) => {
			if (planData.planId === 'max') {
				window.location.href = '/contact'
				return { success: true }
			}

			if (!checkoutRateLimiter.canMakeRequest()) {
				throw new Error(
					'Too many requests. Please wait a moment before trying again.'
				)
			}

			const isAuthenticated = await isUserAuthenticated()
			if (!isAuthenticated) {
				window.location.href = '/login'
				throw new Error('Please sign in to subscribe')
			}

			const stripePriceId = isAnnual
				? planData.annualPriceId
				: planData.monthlyPriceId
			if (!stripePriceId) {
				throw new Error(
					`No ${isAnnual ? 'annual' : 'monthly'} price configured for ${planData.planName}`
				)
			}

			toast.loading('Creating checkout session...', { id: 'checkout' })

			const result = await createCheckoutSession({
				priceId: stripePriceId,
				planName: planData.planName
			})

			if (!result.url) {
				throw new Error('Failed to create checkout session')
			}

			window.location.href = result.url
			return { success: true }
		},
		onError: (error: Error) => {
			toast.dismiss('checkout')
			logger.error('Checkout failed', {
				metadata: {
					error: error instanceof Error ? error.message : 'Unknown error'
				}
			})
			toast.error(
				error.message || 'Failed to start checkout. Please try again.'
			)
		}
	})

	const handleSubscribe = (plan: {
		planId: string
		name: string
		stripeMonthlyPriceId?: string
		stripeAnnualPriceId?: string
	}) => {
		const payload: {
			planId: string
			planName: string
			monthlyPriceId?: string
			annualPriceId?: string
		} = {
			planId: plan.planId,
			planName: plan.name
		}
		if (plan.stripeMonthlyPriceId)
			payload.monthlyPriceId = plan.stripeMonthlyPriceId
		if (plan.stripeAnnualPriceId)
			payload.annualPriceId = plan.stripeAnnualPriceId

		subscriptionMutation.mutate(payload)
	}

	return (
		<div className={cn('w-full', className)}>
			{/* Header */}
			<div className="text-center mb-12">
				<h2 className="text-4xl md:text-5xl font-bold mb-4">
					Simple, transparent pricing
				</h2>
				<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
					Choose the perfect plan for your property management needs. Start with
					a 14-day free trial, no credit card required.
				</p>
			</div>

			{/* Billing Toggle */}
			<div className="flex items-center justify-center gap-4 mb-12">
				<span
					className={cn(
						'text-sm font-medium',
						!isAnnual && 'text-foreground',
						isAnnual && 'text-muted-foreground'
					)}
				>
					Monthly
				</span>
				<Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
				<span
					className={cn(
						'text-sm font-medium',
						isAnnual && 'text-foreground',
						!isAnnual && 'text-muted-foreground'
					)}
				>
					Annual
				</span>
				<Badge
					variant="secondary"
					className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
				>
					Save 17%
				</Badge>
			</div>

			{/* Pricing Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto mb-16">
				{products.map(product => {
					const planId = product.metadata.planId || product.name.toLowerCase()
					const isPopular = product.metadata.popular === 'true'
					const features = getPlanFeatures(planId)

					const monthlyPrice = product.prices.monthly?.unit_amount || 0
					const annualPrice = product.prices.annual?.unit_amount || 0
					const displayPrice = isAnnual
						? Math.floor(annualPrice / 12)
						: monthlyPrice
					const savings = calculateAnnualSavings(monthlyPrice, annualPrice)

					const isEnterprise = planId === 'max'

					return (
						<CardLayout
							key={product.id}
							title={product.name}
							// CardLayout expects a string for description; provide empty string when absent
							description={product.description ?? ''}
							className={cn(
								'relative flex flex-col',
								isPopular && 'border-2 border-primary shadow-lg scale-105'
							)}
						>
							{isPopular && (
								<div className="absolute -top-4 left-1/2 translate-x-[-50%] z-10">
									<Badge className="bg-primary text-primary-foreground px-4 py-1">
										<Sparkles className="size-3 mr-1" />
										Most Popular
									</Badge>
								</div>
							)}

							<div className="text-center pb-6">
								{!isEnterprise ? (
									<div className="mb-6">
										<div className="flex items-baseline justify-center gap-1">
											<span className="text-5xl font-bold">
												{formatStripePrice(displayPrice)}
											</span>
											<span className="text-muted-foreground">/month</span>
										</div>
										{isAnnual && annualPrice > 0 && (
											<p className="text-sm text-muted-foreground mt-2">
												{formatStripePrice(annualPrice)} billed annually
											</p>
										)}
										{isAnnual && savings.savingsPercent > 0 && (
											<p className="text-sm text-green-600 dark:text-green-400 mt-1">
												Save {savings.savingsPercent}% with annual billing
											</p>
										)}
									</div>
								) : (
									<div className="mb-6">
										<div className="text-4xl font-bold mb-2">Custom</div>
										<p className="text-sm text-muted-foreground">
											Contact us for pricing
										</p>
									</div>
								)}
							</div>

							<div className="flex-1 mb-6">
								<ul className="space-y-3">
									{features.map((feature, index) => (
										<li key={index} className="flex items-start gap-3">
											<Check className="size-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
											<span className="text-sm text-muted-foreground">
												{feature}
											</span>
										</li>
									))}
								</ul>
							</div>

							<div className="pt-4">
								<Button
									className={cn(
										'w-full h-11',
										isPopular && 'bg-primary hover:bg-primary/90'
									)}
									variant={isPopular ? 'default' : 'outline'}
									disabled={subscriptionMutation.isPending}
									onClick={() => {
										const payload: {
											planId: string
											name: string
											stripeMonthlyPriceId?: string
											stripeAnnualPriceId?: string
										} = { planId, name: product.name }
										if (product.prices.monthly?.id)
											payload.stripeMonthlyPriceId = product.prices.monthly.id
										if (product.prices.annual?.id)
											payload.stripeAnnualPriceId = product.prices.annual.id
										handleSubscribe(payload)
									}}
								>
									{subscriptionMutation.isPending ? (
										<>
											<Spinner className="size-4 mr-2" />
											Processing...
										</>
									) : isEnterprise ? (
										'Contact Sales'
									) : (
										'Get Started'
									)}
								</Button>
							</div>
						</CardLayout>
					)
				})}
			</div>

			{/* Trust Signals */}
			<div className="text-center">
				<p className="text-sm text-muted-foreground mb-4">
					Trusted by property managers across the country
				</p>
				<div className="flex items-center justify-center gap-8 flex-wrap">
					<div className="flex items-center gap-2">
						<Check className="size-4 text-green-600" />
						<span className="text-sm">14-day free trial</span>
					</div>
					<div className="flex items-center gap-2">
						<Check className="size-4 text-green-600" />
						<span className="text-sm">No credit card required</span>
					</div>
					<div className="flex items-center gap-2">
						<Check className="size-4 text-green-600" />
						<span className="text-sm">Cancel anytime</span>
					</div>
				</div>
			</div>
		</div>
	)
}
