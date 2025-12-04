'use client'

import NumberFlow from '@number-flow/react'
import { OwnerSubscribeDialog } from '#components/pricing/owner-subscribe-dialog'
import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'

import { ArrowRight, BadgeCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createCheckoutSession, isUserAuthenticated } from '#lib/stripe/stripe-client'
import { checkoutRateLimiter } from '#lib/security'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { getAllPricingPlans, PLAN_FEATURES } from '@repo/shared/config/pricing'
import { useModalStore } from '#stores/modal-store'

const logger = createLogger({ component: 'KiboStylePricing' })

interface KiboStylePricingProps {
	billingCycle?: 'monthly' | 'yearly'
}

interface PricingPlan {
	id: string
	name: string
	price: {
		monthly: number | string
		yearly: number | string
	}
	description: string
	features: string[]
	cta: string
	popular: boolean
	stripeMonthlyPriceId?: string
	stripeAnnualPriceId?: string
}

export function KiboStylePricing({ billingCycle = 'monthly' }: KiboStylePricingProps) {
	const frequency = billingCycle
	const [pendingPlan, setPendingPlan] = useState<PricingPlan | null>(null)
	const { openModal, closeModal } = useModalStore()

	const subscriptionMutation = useMutation({
		mutationFn: async ({
			plan,
			billingCycle,
			overrides
		}: {
			plan: PricingPlan
			billingCycle: 'monthly' | 'yearly'
			overrides?: { customerEmail?: string; tenant_id?: string }
		}) => {
			if (plan.id === 'max') {
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
				throw new Error(`No ${billingCycle} price configured for ${plan.name}`)
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
				metadata: {
					error: error instanceof Error ? error.message : 'Unknown error'
				}
			})
			toast.error(
				error.message || 'Failed to start checkout. Please try again.'
			)
		},
		onSettled: () => {
			toast.dismiss('checkout')
		}
	})

	// Use static pricing config - instant render, no API calls
	const pricingPlans = useMemo<PricingPlan[]>(() => {
		const plans = getAllPricingPlans()
			.filter(plan => plan.planId !== 'trial')
			.map(plan => {
				const monthlyPrice = plan.price.monthly
				const annualPrice = plan.price.annual

				return {
					id: plan.planId,
					name: plan.name,
					price: {
						monthly: monthlyPrice || 'Free forever',
						yearly:
							annualPrice > 0
								? Math.round((annualPrice / 12) * 100) / 100
								: 'Free forever'
					},
					description: plan.description,
					features: PLAN_FEATURES[plan.planId as keyof typeof PLAN_FEATURES]
						? [...PLAN_FEATURES[plan.planId as keyof typeof PLAN_FEATURES]]
						: plan.features.slice(0, 9),
					cta:
						plan.planId === 'max'
							? 'Contact Sales'
							: `Subscribe to ${plan.name}`,
					popular: plan.planId === 'growth',
					...(plan.stripePriceIds.monthly && {
						stripeMonthlyPriceId: plan.stripePriceIds.monthly
					}),
					...(plan.stripePriceIds.annual && {
						stripeAnnualPriceId: plan.stripePriceIds.annual
					})
				}
			})

		// Preserve display ordering Starter -> Growth -> Max
		return plans.sort((a, b) => {
			const order = { starter: 1, growth: 2, max: 3 } as Record<string, number>
			return (order[a.id] || 99) - (order[b.id] || 99)
		})
	}, [])

	const startCheckout = async (
		plan: PricingPlan,
		overrides?: { customerEmail?: string; tenant_id?: string }
	) => {
		await subscriptionMutation.mutateAsync({
			plan,
			billingCycle: frequency,
			...(overrides && { overrides })
		})
	}

	const handleSubscribe = async (plan: PricingPlan) => {
		if (subscriptionMutation.isPending) return

		if (plan.id === 'max') {
			await startCheckout(plan)
			return
		}

		const authenticated = await isUserAuthenticated()
		if (!authenticated) {
			setPendingPlan(plan)
			openModal('owner-subscribe')
			return
		}

		try {
			await startCheckout(plan)
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: 'Unable to start checkout. Please try again.'
			logger.error('Failed to start checkout', {
				metadata: { error: message }
			})
		}
	}

	return (
		<>
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-(--spacing-4) sm:px-[var(--spacing-6)] lg:px-[var(--spacing-0)]">
				<div className="mt-10 grid w-full gap-6 sm:grid-cols-2 xl:grid-cols-3">
					{pricingPlans.map(plan => (
						<Card
							variant={plan.popular ? "pricingPopular" : "pricing"}
							key={plan.id}
						>
							<CardHeader className="space-y-[var(--spacing-4)] pb-[var(--spacing-6)] text-left">
								<CardTitle className="text-2xl font-semibold tracking-tight">
									{plan.name}
								</CardTitle>
								<CardDescription className="space-y-[var(--spacing-2)] text-left text-base text-muted-foreground">
									<p>{plan.description}</p>
									{typeof plan.price[frequency] === 'number' ? (
										<div className="space-y-1 text-left">
											<div className="flex items-baseline gap-[var(--spacing-2)] text-left">
												<NumberFlow
													className="text-4xl font-bold text-foreground"
													format={{
														style: 'currency',
														currency: 'USD',
														maximumFractionDigits: 0
													}}
													value={plan.price[frequency] as number}
												/>
												<span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
													/ {frequency}
												</span>
											</div>
											<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
												{frequency === 'yearly'
													? 'Billed annually'
													: 'Billed monthly'}
											</span>
										</div>
									) : (
										<span className="text-2xl font-bold text-foreground">
											{plan.price[frequency]}
										</span>
									)}
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-1 flex-col gap-[var(--spacing-3)] pb-[var(--spacing-6)] text-left">
								{plan.features.map((feature) => (
									<div
										className="flex gap-[var(--spacing-2)] text-left text-sm leading-6 text-muted-foreground"
										key={feature}
									>
										<BadgeCheck className="mt-1 h-4 w-4 flex-none text-success" />
										{feature}
									</div>
								))}
							</CardContent>
							<CardFooter className="mt-auto pt-2">
								<Button
									className="w-full"
									variant={plan.popular ? 'default' : 'outline'}
									disabled={subscriptionMutation.isPending}
									onClick={() => handleSubscribe(plan)}
								>
									{subscriptionMutation.isPending ? (
										<>
											<Skeleton className="mr-2 size-4" />
											Processing...
										</>
									) : (
										<>
											{plan.cta}
											<ArrowRight className="ml-2 h-4 w-4" />
										</>
									)}
								</Button>
							</CardFooter>
						</Card>
					))}
				</div>
			</div>
			<OwnerSubscribeDialog
				{...(pendingPlan?.name && { planName: pendingPlan.name })}
				{...(pendingPlan?.cta && { planCta: pendingPlan.cta })}
				onComplete={async ({ email, tenant_id, requiresEmailConfirmation }) => {
					if (!pendingPlan) return
					try {
						await startCheckout(pendingPlan, {
							customerEmail: email,
							...(tenant_id && { tenant_id })
						})
						closeModal('owner-subscribe')
						setPendingPlan(null)
						if (requiresEmailConfirmation) {
							logger.info(
								'Signup requires email confirmation before first login',
								{
									metadata: { email }
								}
							)
						}
					} catch (error) {
						logger.error('Checkout failed after signup', {
							metadata: {
								error: error instanceof Error ? error.message : 'Unknown error'
							}
						})
						throw error
					}
				}}
			/>
		</>
	)
}
