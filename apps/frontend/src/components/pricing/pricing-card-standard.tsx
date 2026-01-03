'use client'

import NumberFlow from '@number-flow/react'
import { Button } from '#components/ui/button'
import { OwnerSubscribeDialog } from './owner-subscribe-dialog'
import { ArrowRight, BadgeCheck, Loader2, MessageSquare } from 'lucide-react'
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

const logger = createLogger({ component: 'PricingCardStandard' })

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

interface PricingCardStandardProps {
	plan: PricingPlan
	billingCycle: 'monthly' | 'yearly'
	variant: 'starter' | 'enterprise'
	className?: string
}

export function PricingCardStandard({
	plan,
	billingCycle,
	variant,
	className
}: PricingCardStandardProps) {
	const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false)
	const isEnterprise = variant === 'enterprise'

	const subscriptionMutation = useMutation({
		mutationFn: async (overrides?: {
			customerEmail?: string
			tenant_id?: string
		}) => {
			if (isEnterprise) {
				window.location.href = '/contact'
				return { success: true }
			}

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

		if (isEnterprise) {
			await subscriptionMutation.mutateAsync({})
			return
		}

		const authenticated = await isUserAuthenticated()
		if (!authenticated) {
			setSubscribeDialogOpen(true)
			return
		}

		await subscriptionMutation.mutateAsync({})
	}

	const currentPrice = plan.price[billingCycle]
	const displayFeatures = plan.features.slice(0, 6) // Show fewer features in compact cards

	return (
		<>
			<div
				className={cn(
					'h-full rounded-2xl border border-border/50 bg-card p-6 flex flex-col',
					'hover:border-primary/30 hover:shadow-lg transition-all duration-300',
					className
				)}
			>
				{/* Header */}
				<div className="mb-4">
					<h3 className="text-xl font-bold text-foreground mb-1">
						{plan.name}
					</h3>
					<p className="text-sm text-muted-foreground">{plan.description}</p>
				</div>

				{/* Price */}
				<div className="mb-6">
					{isEnterprise ? (
						<div className="text-3xl font-bold text-foreground">Custom</div>
					) : (
						<>
							<div className="flex items-baseline gap-1">
								<NumberFlow
									className="text-3xl font-bold text-foreground"
									format={{
										style: 'currency',
										currency: 'USD',
										maximumFractionDigits: 0
									}}
									value={currentPrice}
								/>
								<span className="text-sm text-muted-foreground">/mo</span>
							</div>
							<p className="text-xs text-muted-foreground mt-1">
								{billingCycle === 'yearly'
									? `Billed annually`
									: 'Billed monthly'}
							</p>
						</>
					)}
				</div>

				{/* Features */}
				<div className="space-y-2.5 mb-6 flex-1">
					{displayFeatures.map(feature => (
						<div
							key={feature}
							className="flex items-start gap-2 text-sm text-muted-foreground"
						>
							<BadgeCheck className="size-4 text-success shrink-0 mt-0.5" />
							<span>{feature}</span>
						</div>
					))}
					{plan.features.length > 6 && (
						<p className="text-xs text-muted-foreground pl-6">
							+{plan.features.length - 6} more features
						</p>
					)}
				</div>

				{/* CTA */}
				<Button
					variant="outline"
					size="lg"
					className="w-full group hover:bg-primary/5 hover:border-primary/50 transition-all duration-300"
					disabled={subscriptionMutation.isPending}
					onClick={handleSubscribe}
				>
					{subscriptionMutation.isPending ? (
						<>
							<Loader2 className="mr-2 size-4 animate-spin" />
							Processing...
						</>
					) : isEnterprise ? (
						<>
							<MessageSquare className="mr-2 size-4" />
							Contact Sales
						</>
					) : (
						<>
							Start Free
							<ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
						</>
					)}
				</Button>
			</div>

			{!isEnterprise && (
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
			)}
		</>
	)
}
