'use client'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '#components/ui/card'
import { Switch } from '#components/ui/switch'
import { Spinner } from '#components/ui/spinner'
import { cn } from '#lib/utils'
import { Check, X, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useStripeProducts, formatStripePrice, calculateAnnualSavings } from '#hooks/use-stripe-products'
import { createCheckoutSession, isUserAuthenticated } from '#lib/stripe-client'
import { checkoutRateLimiter } from '#lib/security'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'PremiumPricingTable' })

// Feature comparison data
const FEATURE_CATEGORIES = [
	{
		category: 'Property Management',
		items: [
			{ name: 'Properties', starter: '5', growth: '20', max: 'Unlimited' },
			{ name: 'Units', starter: '25', growth: '100', max: 'Unlimited' },
			{ name: 'Property types', starter: true, growth: true, max: true },
			{ name: 'Multi-property dashboard', starter: false, growth: true, max: true }
		]
	},
	{
		category: 'Tenant Management',
		items: [
			{ name: 'Unlimited tenants', starter: true, growth: true, max: true },
			{ name: 'Tenant portal access', starter: true, growth: true, max: true },
			{ name: 'Tenant screening', starter: true, growth: true, max: true },
			{ name: 'Automated communications', starter: false, growth: true, max: true },
			{ name: 'Tenant analytics', starter: false, growth: false, max: true }
		]
	},
	{
		category: 'Financial Features',
		items: [
			{ name: 'Online rent collection', starter: true, growth: true, max: true },
			{ name: 'Lease management', starter: true, growth: true, max: true },
			{ name: 'Late fee automation', starter: false, growth: true, max: true },
			{ name: 'Financial reporting', starter: 'Basic', growth: 'Advanced', max: 'Custom' },
			{ name: 'Accounting integrations', starter: false, growth: false, max: true }
		]
	},
	{
		category: 'Maintenance & Operations',
		items: [
			{ name: 'Maintenance tracking', starter: true, growth: true, max: true },
			{ name: 'Vendor management', starter: false, growth: true, max: true },
			{ name: 'Work order automation', starter: false, growth: true, max: true },
			{ name: 'Mobile app access', starter: true, growth: true, max: true }
		]
	},
	{
		category: 'Storage & Support',
		items: [
			{ name: 'Document storage', starter: '10GB', growth: '50GB', max: 'Unlimited' },
			{ name: 'Support level', starter: 'Priority Email', growth: 'Phone & Email', max: '24/7 Dedicated' },
			{ name: 'API access', starter: false, growth: true, max: true },
			{ name: 'Custom integrations', starter: false, growth: false, max: true },
			{ name: 'Dedicated account manager', starter: false, growth: false, max: true }
		]
	}
]

interface PremiumPricingTableProps {
	size?: 'small' | 'medium' | 'large'
	theme?: 'minimal' | 'classic'
	className?: string
}

export function PremiumPricingTable({
	size = 'medium',
	theme = 'classic',
	className
}: PremiumPricingTableProps) {
	const [isAnnual, setIsAnnual] = useState(false)
	const { products, isLoading } = useStripeProducts()

	const subscriptionMutation = useMutation({
		mutationFn: async (planData: {
			planId: string
			planName: string
			monthlyPriceId?: string | undefined
			annualPriceId?: string | undefined
		}) => {
			if (planData.planId === 'max') {
				window.location.href = '/contact'
				return { success: true }
			}

			if (!checkoutRateLimiter.canMakeRequest()) {
				throw new Error('Too many requests. Please wait a moment before trying again.')
			}

			const isAuthenticated = await isUserAuthenticated()
			if (!isAuthenticated) {
				window.location.href = '/login'
				throw new Error('Please sign in to subscribe')
			}

			const stripePriceId = isAnnual ? planData.annualPriceId : planData.monthlyPriceId
			if (!stripePriceId) {
				throw new Error(`No ${isAnnual ? 'annual' : 'monthly'} price configured for ${planData.planName}`)
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
			toast.error(error.message || 'Failed to start checkout. Please try again.')
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
			monthlyPriceId?: string | undefined
			annualPriceId?: string | undefined
		} = {
			planId: plan.planId,
			planName: plan.name
		}
		if (plan.stripeMonthlyPriceId) payload.monthlyPriceId = plan.stripeMonthlyPriceId
		if (plan.stripeAnnualPriceId) payload.annualPriceId = plan.stripeAnnualPriceId

		subscriptionMutation.mutate(payload)
	}

	// Sort products by price and filter out old products
	const mainProducts = products
		.filter(p => ['Growth', 'MAX', 'Starter'].includes(p.name))
		.sort((a, b) => {
			const aPrice = a.prices.monthly?.unit_amount || 0
			const bPrice = b.prices.monthly?.unit_amount || 0
			return aPrice - bPrice
		})

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner className="size-8" />
			</div>
		)
	}

	return (
		<div className={cn('w-full space-y-12', className)}>
			{/* Pricing Cards Section */}
			<div className="space-y-8">
				{/* Billing Toggle */}
				<div className="flex items-center justify-center gap-4">
					<span className={cn('text-sm font-medium', !isAnnual && 'text-foreground', isAnnual && 'text-muted-foreground')}>
						Monthly
					</span>
					<Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
					<span className={cn('text-sm font-medium', isAnnual && 'text-foreground', !isAnnual && 'text-muted-foreground')}>
						Annual
					</span>
					<Badge variant="secondary" className="bg-success/10 text-success dark:bg-success/20 dark:text-success">
						Save 17%
					</Badge>
				</div>

				{/* Pricing Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{mainProducts.map(product => {
						const planId = product.metadata.planId || product.name.toLowerCase()
						const isPopular = product.metadata.popular === 'true'

						const monthlyPrice = product.prices.monthly?.unit_amount || 0
						const annualPrice = product.prices.annual?.unit_amount || 0
						const displayPrice = isAnnual ? Math.floor(annualPrice / 12) : monthlyPrice
						const savings = calculateAnnualSavings(monthlyPrice, annualPrice)

						const isEnterprise = planId === 'max'

						const cardSize = size === 'small' ? 'p-6' : size === 'large' ? 'p-10' : 'p-8'

						return (
							<Card
								key={product.id}
								className={cn(
									'relative flex flex-col',
									cardSize,
									isPopular && 'border-2 border-primary shadow-xl ring-2 ring-primary/20 scale-105',
									theme === 'classic' && 'bg-card/80'
								)}
							>
								{isPopular && (
									<div className="absolute -top-4 left-1/2 -translate-x-1/2">
										<Badge className="bg-primary text-primary-foreground px-4 py-1 shadow-lg">
											<Sparkles className="size-3 mr-1" />
											Most Popular
										</Badge>
									</div>
								)}

								<CardHeader className="pb-6">
									<CardTitle className="text-2xl">{product.name}</CardTitle>
									<CardDescription className="text-base">{product.description}</CardDescription>
								</CardHeader>

								<CardContent className="flex-1 space-y-6">
									{/* Price Display */}
									<div>
										{!isEnterprise ? (
											<div>
												<div className="flex items-baseline gap-1">
													<span className="text-5xl font-bold">{formatStripePrice(displayPrice)}</span>
													<span className="text-muted-foreground">/month</span>
												</div>
												{isAnnual && annualPrice > 0 && (
													<p className="text-sm text-muted-foreground mt-2">{formatStripePrice(annualPrice)} billed annually</p>
												)}
												{isAnnual && savings.savingsPercent > 0 && (
													<p className="text-sm text-success mt-1">
														Save {savings.savingsPercent}% with annual billing
													</p>
												)}
											</div>
										) : (
											<div>
												<div className="text-4xl font-bold mb-2">Custom</div>
												<p className="text-sm text-muted-foreground">Contact us for pricing</p>
											</div>
										)}
									</div>
								</CardContent>

								<CardFooter>
									<Button
										className={cn('w-full h-12 text-base', isPopular && 'bg-primary hover:bg-primary/90 shadow-lg')}
										variant={isPopular ? 'default' : 'outline'}
										size={size === 'small' ? 'sm' : size === 'large' ? 'lg' : 'default'}
										disabled={subscriptionMutation.isPending}
										onClick={() => {
											const payload: {
												planId: string
												name: string
												stripeMonthlyPriceId?: string
												stripeAnnualPriceId?: string
											} = { planId, name: product.name }
											if (product.prices.monthly?.id) payload.stripeMonthlyPriceId = product.prices.monthly.id
											if (product.prices.annual?.id) payload.stripeAnnualPriceId = product.prices.annual.id
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
								</CardFooter>
							</Card>
						)
					})}
				</div>
			</div>

			{/* Feature Comparison Table */}
			<div className="space-y-6">
				<div className="text-center space-y-2">
					<h3 className="text-3xl font-bold">Compare plans</h3>
					<p className="text-lg text-muted-foreground">Choose the plan that fits your property management needs</p>
				</div>

				<div className="border rounded-lg overflow-hidden">
					{/* Table Header */}
					<div className="bg-muted/50 border-b">
						<div className="grid grid-cols-4 gap-4 p-6">
							<div className="font-semibold">Features</div>
							{mainProducts.map(product => (
								<div key={product.id} className="text-center font-semibold">
									{product.name}
								</div>
							))}
						</div>
					</div>

					{/* Feature Categories */}
					{FEATURE_CATEGORIES.map((category, categoryIndex) => (
						<div key={categoryIndex} className={categoryIndex > 0 ? 'border-t' : ''}>
							{/* Category Header */}
							<div className="bg-muted/30 px-6 py-3 font-semibold text-sm uppercase tracking-wide">{category.category}</div>

							{/* Feature Items */}
							{category.items.map((item, itemIndex) => (
								<div key={itemIndex} className={cn('grid grid-cols-4 gap-4 p-6 items-center', itemIndex > 0 && 'border-t')}>
									<div className="text-sm font-medium">{item.name}</div>
									{mainProducts.map(product => {
										const planId = product.metadata.planId || product.name.toLowerCase()
										const value = item[planId as keyof typeof item]

										return (
											<div key={product.id} className="text-center">
												{typeof value === 'boolean' ? (
													value ? (
														<Check className="size-5 text-success mx-auto" />
													) : (
														<X className="size-5 text-muted-foreground/30 mx-auto" />
													)
												) : (
													<span className="text-sm font-medium">{value}</span>
												)}
											</div>
										)
									})}
								</div>
							))}
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
