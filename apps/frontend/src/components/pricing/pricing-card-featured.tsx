'use client'

import NumberFlow from '@number-flow/react'
import { Button } from '#components/ui/button'
import { Badge } from '#components/ui/badge'
import { OwnerSubscribeDialog } from './owner-subscribe-dialog'
import {
	ArrowRight,
	BadgeCheck,
	Loader2,
	Shield,
	Sparkles,
	Users
} from 'lucide-react'
import { useState } from 'react'
import {
	createCheckoutSession,
	isUserAuthenticated
} from '#lib/stripe/stripe-client'
import { checkoutRateLimiter } from '#lib/security'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { cn } from '#lib/utils'

const logger = createLogger({ component: 'PricingCardFeatured' })

interface PricingPlan {
	id: string
	name: string
	description: string
	price: {
		monthly: number
		yearly: number
	}
	annualTotal: number
	features: string[]
	popular: boolean
	stripeMonthlyPriceId?: string | null
	stripeAnnualPriceId?: string | null
}

interface PricingCardFeaturedProps {
	plan: PricingPlan
	billingCycle: 'monthly' | 'yearly'
	className?: string
}

export function PricingCardFeatured({
	plan,
	billingCycle,
	className
}: PricingCardFeaturedProps) {
	const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false)

	const subscriptionMutation = useMutation({
		mutationFn: async (overrides?: {
			customerEmail?: string
			tenant_id?: string
		}) => {
			if (!checkoutRateLimiter.canMakeRequest()) {
				throw new Error(
					'Too many requests. Please wait a moment before trying again.'
				)
			}

			if (!overrides?.tenant_id) {
				const authenticated = await isUserAuthenticated()
				if (!authenticated) {
					window.location.href = '/login'
					throw new Error('Please sign in or create an account to subscribe')
				}
			}

			const stripePriceId =
				billingCycle === 'yearly'
					? plan.stripeAnnualPriceId
					: plan.stripeMonthlyPriceId

			if (!stripePriceId) {
				throw new Error(
					`No ${billingCycle} price configured for ${plan.name}`
				)
			}

			toast.loading('Creating checkout session...', { id: 'checkout' })

			const result = await createCheckoutSession({
				priceId: stripePriceId,
				planName: plan.name,
				...(overrides?.customerEmail && {
					customerEmail: overrides.customerEmail
				}),
				...(overrides?.tenant_id && { tenant_id: overrides.tenant_id })
			})

			if (!result.url) {
				throw new Error('Failed to create checkout session')
			}

			window.location.href = result.url
			return { success: true }
		},
		onError: (error: Error) => {
			logger.error('Checkout failed', {
				metadata: { error: error.message }
			})
			toast.error(
				error.message || 'Failed to start checkout. Please try again.'
			)
		},
		onSettled: () => {
			toast.dismiss('checkout')
		}
	})

	const handleSubscribe = async () => {
		if (subscriptionMutation.isPending) return

		const authenticated = await isUserAuthenticated()
		if (!authenticated) {
			setSubscribeDialogOpen(true)
			return
		}

		await subscriptionMutation.mutateAsync({})
	}

	const currentPrice = plan.price[billingCycle]
	const monthlyEquivalent = plan.price.monthly

	return (
		<>
			<div
				className={cn(
					'relative h-full rounded-2xl p-[2px] bg-gradient-to-br from-primary via-accent to-primary',
					'animate-gradient-x',
					className
				)}
			>
				{/* Most Popular Badge */}
				<div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
					<Badge className="bg-primary text-primary-foreground shadow-lg px-4 py-1.5 text-sm font-semibold">
						<Sparkles className="size-3.5 mr-1.5" />
						Most Popular
					</Badge>
				</div>

				<div className="relative h-full rounded-[14px] bg-card/95 backdrop-blur-sm p-8 flex flex-col">
					{/* Header */}
					<div className="text-center mb-6">
						<h3 className="text-2xl font-bold text-foreground mb-2">
							{plan.name}
						</h3>
						<p className="text-muted-foreground">{plan.description}</p>
					</div>

					{/* Price */}
					<div className="text-center mb-6">
						{billingCycle === 'yearly' && (
							<div className="text-muted-foreground line-through text-lg mb-1">
								${monthlyEquivalent}/mo
							</div>
						)}
						<div className="flex items-baseline justify-center gap-2">
							<NumberFlow
								className="text-5xl font-bold text-foreground"
								format={{
									style: 'currency',
									currency: 'USD',
									maximumFractionDigits: 0
								}}
								value={currentPrice}
							/>
							<span className="text-muted-foreground font-medium">
								/{billingCycle === 'yearly' ? 'mo' : 'month'}
							</span>
						</div>
						<p className="text-sm text-muted-foreground mt-1">
							{billingCycle === 'yearly'
								? `Billed annually ($${plan.annualTotal}/year)`
								: 'Billed monthly'}
						</p>
					</div>

					{/* Social Proof */}
					<div className="flex items-center justify-center gap-2 mb-6 py-3 bg-muted/50 rounded-lg">
						<Users className="size-4 text-primary" />
						<span className="text-sm text-muted-foreground">
							Join <strong className="text-foreground">500+</strong> Growth
							subscribers
						</span>
					</div>

					{/* Features - 2 column grid for featured card */}
					<div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-8 flex-1">
						{plan.features.map(feature => (
							<div
								key={feature}
								className="flex items-start gap-2 text-sm text-muted-foreground"
							>
								<BadgeCheck className="size-4 text-primary shrink-0 mt-0.5" />
								<span>{feature}</span>
							</div>
						))}
					</div>

					{/* CTA */}
					<div className="space-y-3">
						<Button
							size="lg"
							className="w-full group relative overflow-hidden shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/40 hover:scale-[1.02] transition-all duration-300"
							disabled={subscriptionMutation.isPending}
							onClick={handleSubscribe}
						>
							{subscriptionMutation.isPending ? (
								<>
									<Loader2 className="mr-2 size-4 animate-spin" />
									Processing...
								</>
							) : (
								<>
									Start 14-Day Free Trial
									<ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
								</>
							)}
						</Button>
						<div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
							<span className="flex items-center gap-1">
								<Shield className="size-3" />
								No credit card required
							</span>
							<span>Cancel anytime</span>
						</div>
					</div>
				</div>
			</div>

			<OwnerSubscribeDialog
				open={subscribeDialogOpen}
				onOpenChange={setSubscribeDialogOpen}
				planName={plan.name}
				planCta={`Subscribe to ${plan.name}`}
				onComplete={async ({ email, tenant_id }) => {
					await subscriptionMutation.mutateAsync({
						customerEmail: email,
						...(tenant_id && { tenant_id })
					})
					setSubscribeDialogOpen(false)
				}}
			/>
		</>
	)
}
