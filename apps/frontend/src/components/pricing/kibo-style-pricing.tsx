'use client'

import NumberFlow from '@number-flow/react'
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
import { useState } from 'react'
import { useStripeProducts } from '#hooks/use-stripe-products'
import { createCheckoutSession, isUserAuthenticated } from '#lib/stripe-client'
import { checkoutRateLimiter } from '#lib/security'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createLogger } from '@repo/shared/lib/frontend-logger'

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

export function KiboStylePricing() {
	const [frequency, setFrequency] = useState<'monthly' | 'yearly'>('monthly')
	const { products, isLoading } = useStripeProducts()

	const subscriptionMutation = useMutation({
		mutationFn: async (planData: {
			planId: string
			planName: string
			monthlyPriceId?: string | undefined
			annualPriceId?: string | undefined
		}) => {
			// Enterprise/MAX plan redirects to contact
			if (planData.planId === 'max') {
				window.location.href = '/contact'
				return { success: true }
			}

			// Rate limiting check
			if (!checkoutRateLimiter.canMakeRequest()) {
				throw new Error(
					'Too many requests. Please wait a moment before trying again.'
				)
			}

			// Auth check
			const isAuthenticated = await isUserAuthenticated()
			if (!isAuthenticated) {
				window.location.href = '/login'
				throw new Error('Please sign in to subscribe')
			}

			// Get appropriate price ID
			const stripePriceId =
				frequency === 'yearly'
					? planData.annualPriceId
					: planData.monthlyPriceId
			if (!stripePriceId) {
				throw new Error(
					`No ${frequency} price configured for ${planData.planName}`
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

	// Filter and sort products - get Starter, Growth, MAX
	const mainProducts = products
		.filter(p => ['Starter', 'Growth', 'MAX'].includes(p.name))
		.sort((a, b) => {
			const aPrice = a.prices.monthly?.unit_amount || 0
			const bPrice = b.prices.monthly?.unit_amount || 0
			return aPrice - bPrice
		})

	// Map products to pricing data structure
	const pricingPlans = mainProducts.map(product => {
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
			stripeMonthlyPriceId: product.prices.monthly?.id,
			stripeAnnualPriceId: product.prices.annual?.id
		}
	})

	const handleSubscribe = (plan: (typeof pricingPlans)[0]) => {
		const payload: {
			planId: string
			planName: string
			monthlyPriceId?: string | undefined
			annualPriceId?: string | undefined
		} = {
			planId: plan.id,
			planName: plan.name
		}
		if (plan.stripeMonthlyPriceId)
			payload.monthlyPriceId = plan.stripeMonthlyPriceId
		if (plan.stripeAnnualPriceId)
			payload.annualPriceId = plan.stripeAnnualPriceId

		subscriptionMutation.mutate(payload)
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-24">
				<Spinner className="size-8" />
			</div>
		)
	}

	return (
		<div className="@container flex flex-col gap-16 px-8 py-24 text-center">
			<div className="flex flex-col items-center justify-center gap-8">
				<h1 className="mb-0 text-balance font-medium text-5xl tracking-tighter">
					Simple, transparent pricing
				</h1>
				<p className="mx-auto mt-0 mb-0 max-w-2xl text-balance text-lg text-muted-foreground">
					Property management is hard enough. Choose a plan that scales with
					your portfolio and makes your life easier.
				</p>
				<Tabs
					defaultValue={frequency}
					onValueChange={value => setFrequency(value as 'monthly' | 'yearly')}
				>
					<TabsList>
						<TabsTrigger value="monthly">Monthly</TabsTrigger>
						<TabsTrigger value="yearly">
							Yearly
							<Badge variant="secondary">Save 17%</Badge>
						</TabsTrigger>
					</TabsList>
				</Tabs>
				<div className="mt-8 grid w-full max-w-4xl @2xl:grid-cols-3 gap-4">
					{pricingPlans.map(plan => (
						<Card
							className={cn(
								'relative w-full text-left',
								plan.popular && 'ring-2 ring-primary'
							)}
							key={plan.id}
						>
							{plan.popular && (
								<Badge className="-translate-x-1/2 -translate-y-1/2 absolute top-0 left-1/2 rounded-full">
									Most Popular
								</Badge>
							)}
							<CardHeader>
								<CardTitle className="font-medium text-xl">
									{plan.name}
								</CardTitle>
								<CardDescription>
									<p>{plan.description}</p>
									{typeof plan.price[frequency] === 'number' ? (
										<NumberFlow
											className="font-medium text-foreground text-3xl"
											format={{
												style: 'currency',
												currency: 'USD',
												maximumFractionDigits: 0
											}}
											suffix={`/month, billed ${frequency}.`}
											value={plan.price[frequency] as number}
										/>
									) : (
										<span className="font-medium text-foreground text-xl">
											{plan.price[frequency]}.
										</span>
									)}
								</CardDescription>
							</CardHeader>
							<CardContent className="grid gap-2">
								{plan.features.map((feature, index) => (
									<div
										className="flex gap-2 text-muted-foreground text-sm"
										key={index}
									>
										<BadgeCheck className="h-lh w-4 flex-none text-green-600 dark:text-green-400" />
										{feature}
									</div>
								))}
							</CardContent>
							<CardFooter>
								<Button
									className="w-full"
									variant={plan.popular ? 'default' : 'secondary'}
									disabled={subscriptionMutation.isPending}
									onClick={() => handleSubscribe(plan)}
								>
									{subscriptionMutation.isPending ? (
										<>
											<Spinner className="size-4 mr-2" />
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
		</div>
	)
}
