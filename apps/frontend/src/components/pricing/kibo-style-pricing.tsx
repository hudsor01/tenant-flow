'use client'

import NumberFlow from '@number-flow/react'
import { OwnerSubscribeDialog } from '#components/pricing/owner-subscribe-dialog'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '#components/ui/tabs'
import { Spinner } from '#components/ui/spinner'
import { cn } from '#lib/utils'
import { ArrowRight, BadgeCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useStripeProducts } from '#hooks/use-stripe-products'
import { createCheckoutSession, isUserAuthenticated } from '#lib/stripe-client'
import { checkoutRateLimiter } from '#lib/security'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { getAllPricingPlans } from '@repo/shared/config/pricing'
import { useModalStore } from '#stores/modal-store'

const logger = createLogger({ component: 'KiboStylePricing' })

// Feature lists per plan - matches your TenantFlow offerings
const PLAN_FEATURES = {
	starter: [
		'Up to 5 properties',
		'Up to 25 units',
		'Unlimited tenants',
		'Online rent collection',
		'Lease management',
		'Maintenance tracking',
		'10GB document storage',
		'Priority email support'
	],
	growth: [
		'Up to 20 properties',
		'Up to 100 units',
		'Everything in Starter',
		'Automated rent reminders',
		'Late fee automation',
		'Advanced reporting',
		'50GB document storage',
		'Phone & email support',
		'Mobile app access'
	],
	max: [
		'Unlimited properties',
		'Unlimited units',
		'Everything in Growth',
		'Custom integrations (API)',
		'White-label options',
		'Dedicated account manager',
		'Unlimited storage',
		'24/7 phone & chat support',
		'Custom reports & analytics'
	]
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

export function KiboStylePricing() {
	const [frequency, setFrequency] = useState<'monthly' | 'yearly'>('monthly')
	const [pendingPlan, setPendingPlan] = useState<PricingPlan | null>(null)
	const { openModal, closeModal } = useModalStore()
	const { products, isLoading } = useStripeProducts()

	const subscriptionMutation = useMutation({
		mutationFn: async ({
			plan,
			billingCycle,
			overrides
		}: {
			plan: PricingPlan
			billingCycle: 'monthly' | 'yearly'
			overrides?: { customerEmail?: string; tenantId?: string }
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

			if (!overrides?.tenantId) {
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
				...(overrides?.tenantId && { tenantId: overrides.tenantId })
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

	// Filter and sort products - get Starter, Growth, MAX
	const mainProducts = products
		.filter(p => ['Starter', 'Growth', 'MAX'].includes(p.name))
		.sort((a, b) => {
			const aPrice = a.prices.monthly?.unit_amount || 0
			const bPrice = b.prices.monthly?.unit_amount || 0
			return aPrice - bPrice
		})

	// Map products to pricing data structure
	const dynamicPricingPlans: PricingPlan[] = mainProducts.map(product => {
		const planId = product.metadata.planId || product.name.toLowerCase()
		const monthlyPrice = product.prices.monthly?.unit_amount || 0
		const annualPrice = product.prices.annual?.unit_amount || 0

		return {
			id: planId,
			name: product.name,
			price: {
				monthly: monthlyPrice > 0 ? monthlyPrice / 100 : 'Free forever',
				yearly:
					annualPrice > 0 ? Math.floor(annualPrice / 12) / 100 : 'Free forever'
			},
			description: product.description || '',
			features: PLAN_FEATURES[planId as keyof typeof PLAN_FEATURES] || [],
			cta: planId === 'max' ? 'Contact Sales' : `Subscribe to ${product.name}`,
			popular: product.metadata.popular === 'true',
			...(product.prices.monthly?.id && {
				stripeMonthlyPriceId: product.prices.monthly.id
			}),
			...(product.prices.annual?.id && {
				stripeAnnualPriceId: product.prices.annual.id
			})
		}
	})

	const fallbackPricingPlans = useMemo<PricingPlan[]>(() => {
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
					features:
						PLAN_FEATURES[plan.planId as keyof typeof PLAN_FEATURES] ||
						plan.features.slice(0, 9),
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

	const pricingPlans =
		dynamicPricingPlans.length > 0 ? dynamicPricingPlans : fallbackPricingPlans
	const usingFallback = dynamicPricingPlans.length === 0

	const startCheckout = async (
		plan: PricingPlan,
		overrides?: { customerEmail?: string; tenantId?: string }
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
			// onError handler already shows a toast for checkout failures; avoid duplicates
		}
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-24">
				<Spinner className="size-8" />
			</div>
		)
	}

	return (
		<>
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 py-16 text-center sm:px-6 lg:px-0">
				<div className="flex flex-col items-center justify-center gap-8">
					<h1 className="mb-0 text-balance font-medium text-5xl tracking-tighter">
						Simple, transparent pricing
					</h1>
					<p className="mx-auto mt-0 mb-0 max-w-2xl text-balance text-lg text-muted-foreground">
						Property management is hard enough. Choose a plan that scales with
						your portfolio and makes your life easier.
					</p>
					{usingFallback && (
						<p className="text-sm text-muted-foreground">
							Live pricing is warming up. Showing the default TenantFlow plans
							with active Stripe checkout links.
						</p>
					)}
				</div>
				<Tabs
					defaultValue={frequency}
					onValueChange={value => setFrequency(value as 'monthly' | 'yearly')}
				>
					<TabsList className="inline-flex rounded-full bg-muted/60 p-1 shadow-sm">
						<TabsTrigger value="monthly" className="rounded-full px-5 py-2">
							Monthly
						</TabsTrigger>
						<TabsTrigger value="yearly" className="rounded-full px-5 py-2">
							Yearly
							<Badge
								variant="secondary"
								className="ml-2 rounded-full bg-primary/10 text-primary"
							>
								Save 17%
							</Badge>
						</TabsTrigger>
					</TabsList>
				</Tabs>
				<div className="mt-10 grid w-full gap-6 sm:grid-cols-2 xl:grid-cols-3">
					{pricingPlans.map(plan => (
						<Card
							className={cn(
								'relative flex h-full flex-col overflow-hidden border border-border/60 bg-card/80 text-left shadow-sm backdrop-blur transition duration-300 ease-out hover:-translate-y-1 hover:shadow-lg',
								plan.popular && 'ring-2 ring-primary/70'
							)}
							key={plan.id}
						>
							{plan.popular && (
								<Badge className="absolute right-4 top-4 rounded-full bg-primary text-primary-foreground">
									Most Popular
								</Badge>
							)}
							<CardHeader className="space-y-4 pb-6 text-left">
								<CardTitle className="text-2xl font-semibold tracking-tight">
									{plan.name}
								</CardTitle>
								<CardDescription className="space-y-2 text-left text-base text-muted-foreground">
									<p>{plan.description}</p>
									{typeof plan.price[frequency] === 'number' ? (
										<div className="space-y-1 text-left">
											<div className="flex items-baseline gap-2 text-left">
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
							<CardContent className="flex flex-1 flex-col gap-3 pb-6 text-left">
								{plan.features.map((feature, index) => (
									<div
										className="flex gap-2 text-left text-sm leading-6 text-muted-foreground"
										key={index}
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
											<Spinner className="mr-2 size-4" />
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
				onComplete={async ({ email, tenantId, requiresEmailConfirmation }) => {
					if (!pendingPlan) return
					try {
						await startCheckout(pendingPlan, {
							customerEmail: email,
							...(tenantId && { tenantId })
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
