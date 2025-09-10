'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { API_BASE_URL } from '@/lib/api-client'
import {
	checkoutRateLimiter,
	isValidAuthToken,
	validateCheckoutData
} from '@/lib/security'
import { 
	cn, 
	buttonClasses,
	cardClasses,
	ANIMATION_DURATIONS,
	TYPOGRAPHY_SCALE
} from '@/lib/utils'
import { PLANS } from '@repo/shared'
import { getStripePriceId } from '@repo/shared/stripe/plans'
import { useStripe } from '@stripe/react-stripe-js'
import { Building, Check, Crown, Loader2, Zap, Shield, Star } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'

interface StripePricingSectionProps {
	className?: string
}

// Enhanced plan configuration with Stripe integration
const enhancedPlans = [
	{
		...PLANS[0], // FREETRIAL
		icon: Building,
		popular: false,
		enhanced_features: [
			'Up to 2 properties',
			'Basic tenant management',
			'Rent collection',
			'Maintenance requests',
			'5GB storage',
			'Email support'
		],
		cta: 'Start Free Trial'
	},
	{
		...PLANS[1], // STARTER
		icon: Building,
		popular: false,
		enhanced_features: [
			'Up to 10 properties',
			'Advanced tenant screening',
			'Automated rent collection',
			'Smart maintenance routing',
			'50GB storage',
			'Email & phone support',
			'Financial reporting'
		],
		cta: 'Upgrade to Starter'
	},
	{
		...PLANS[2], // GROWTH
		icon: Zap,
		popular: true,
		enhanced_features: [
			'Up to 50 properties',
			'Advanced workflow automation',
			'Custom lease templates',
			'White-label tenant portal',
			'200GB storage',
			'Priority support',
			'Advanced analytics',
			'API access'
		],
		cta: 'Upgrade to Growth'
	},
	{
		...PLANS[3], // TENANTFLOW_MAX
		icon: Crown,
		popular: false,
		enhanced_features: [
			'Unlimited properties',
			'Multi-location management',
			'Predictive analytics & AI insights',
			'Custom integrations',
			'Dedicated account manager',
			'Unlimited storage',
			'24/7 support',
			'SOC 2 compliance',
			'Single sign-on (SSO)'
		],
		cta: 'Contact Sales'
	}
]

export function StripePricingSection({ className }: StripePricingSectionProps) {
	const [isYearly, setIsYearly] = useState(false)
	const stripe = useStripe()

	const subscriptionMutation = useMutation({
		mutationFn: async (planId: string) => {
			if (!stripe) {
				throw new Error('Stripe is not loaded. Please refresh the page and try again.')
			}

			if (planId === 'FREETRIAL') {
				// Handle free trial
				window.location.href = '/auth/register'
				return { success: true }
			}

			if (planId === 'TENANTFLOW_MAX') {
				// Handle enterprise contact
				window.location.href = '/contact'
				return { success: true }
			}

			// Check rate limiting
			if (!checkoutRateLimiter.canMakeRequest()) {
				throw new Error('Too many requests. Please wait a moment before trying again.')
			}

			// Check if user is authenticated
			const authToken = localStorage.getItem('auth-token')
			if (!authToken || !isValidAuthToken(authToken)) {
				window.location.href = '/auth/login'
				throw new Error('Please sign in to subscribe to a plan')
			}

			// Get the correct price ID for the plan and billing period (for validation)
			getStripePriceId(
				planId as 'FREETRIAL' | 'STARTER' | 'GROWTH' | 'TENANTFLOW_MAX',
				isYearly ? 'annual' : 'monthly'
			)

			// Validate checkout data
			const checkoutData = validateCheckoutData({
				planId: planId as 'STARTER' | 'GROWTH' | 'TENANTFLOW_MAX',
				interval: isYearly ? 'annual' : 'monthly',
				successUrl: `${window.location.origin}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
				cancelUrl: `${window.location.origin}/pricing/cancel`
			})

			if (!checkoutData) {
				throw new Error('Invalid checkout data')
			}

			// Show loading toast
			toast.loading('Creating checkout session...', { id: 'checkout' })

			// Create checkout session via backend API (backend service expects /stripe/*)
			const response = await fetch(`${API_BASE_URL}/stripe/checkout`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${authToken}`
				},
				body: JSON.stringify(checkoutData)
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(
					errorData.message || 'Failed to create checkout session'
				)
			}

			const { sessionId } = await response.json()

			// Update toast to success
			toast.success('Redirecting to checkout...', { id: 'checkout' })

			// Redirect to Stripe Checkout
			const { error } = await stripe.redirectToCheckout({
				sessionId
			})

			if (error) {
				console.error('Stripe checkout error:', error)
				throw error
			}

			return { success: true }
		},
		onError: (error) => {
			console.error('Subscription error:', error)
			// Show error toast
			toast.error(
				`Failed to start checkout: ${error instanceof Error ? error.message : 'Unknown error'}`,
				{ id: 'checkout' }
			)
		}
	})

	const handleSubscribe = async (planId: string) => {
		subscriptionMutation.mutate(planId)
	}

	const formatPrice = (price: { monthly: number; annual: number }) => {
		const amount = isYearly ? price.annual : price.monthly
		return Math.floor(amount / 100) // Convert from cents
	}

	return (
		<section
			className={cn(
				'relative py-24 bg-gradient-to-b from-muted/20 to-background',
				className
			)}
			style={{
				animation: `fadeIn ${ANIMATION_DURATIONS.slow} ease-out`
			}}
		>
			<div className="container px-4 mx-auto">
				{/* Section Header */}
				<div 
					className="text-center max-w-4xl mx-auto mb-20"
					style={{
						animation: `slideInFromTop ${ANIMATION_DURATIONS.default} ease-out`
					}}
				>
					<div className="mb-6">
						<Badge 
							variant="outline" 
							className="mb-4 px-4 py-2 text-sm font-semibold border-2 hover:bg-primary/5 transition-colors"
							style={{
								transition: `all ${ANIMATION_DURATIONS.fast} ease-out`
							}}
						>
							<Crown className="w-4 h-4 me-2 text-primary" />
							Pricing Plans
						</Badge>
					</div>

					<div className="mb-6">
						<h2 
							className="font-bold tracking-tight mb-4"
							style={{
								fontSize: TYPOGRAPHY_SCALE['display-lg'].fontSize,
								lineHeight: TYPOGRAPHY_SCALE['display-lg'].lineHeight,
								fontWeight: TYPOGRAPHY_SCALE['display-lg'].fontWeight,
								letterSpacing: TYPOGRAPHY_SCALE['display-lg'].letterSpacing
							}}
						>
							Simple, transparent pricing
							<span 
								className="block text-primary/80 font-medium mt-3"
								style={{
									fontSize: TYPOGRAPHY_SCALE['heading-lg'].fontSize,
									lineHeight: TYPOGRAPHY_SCALE['heading-lg'].lineHeight
								}}
							>
								that grows with your business
							</span>
						</h2>
					</div>

					<div className="mb-8">
						<p 
							className="text-muted-foreground leading-relaxed max-w-2xl mx-auto"
							style={{
								fontSize: TYPOGRAPHY_SCALE['body-lg'].fontSize,
								lineHeight: TYPOGRAPHY_SCALE['body-lg'].lineHeight
							}}
						>
							Start with our 14-day free trial. No credit card required. Cancel
							anytime.
						</p>
					</div>

					{/* Billing Toggle */}
					<div 
						className="bg-muted/30 rounded-2xl p-6 border-2 border-muted/50"
						style={{
							animation: `slideInFromBottom ${ANIMATION_DURATIONS.default} ease-out`,
							transition: `all ${ANIMATION_DURATIONS.fast} ease-out`
						}}
					>
						<div className="flex items-center justify-center gap-6 mb-3">
							<span
								className={cn(
									'text-sm font-semibold transition-all',
									!isYearly ? 'text-foreground' : 'text-muted-foreground'
								)}
								style={{
									transition: `all ${ANIMATION_DURATIONS.fast} ease-out`
								}}
							>
								Monthly
							</span>
							<Switch
								checked={isYearly}
								onCheckedChange={setIsYearly}
								className="data-[state=checked]:bg-primary scale-110"
								style={{
									transition: `all ${ANIMATION_DURATIONS.fast} ease-out`
								}}
							/>
							<span
								className={cn(
									'text-sm font-semibold transition-all',
									isYearly ? 'text-foreground' : 'text-muted-foreground'
								)}
								style={{
									transition: `all ${ANIMATION_DURATIONS.fast} ease-out`
								}}
							>
								Yearly
							</span>
							<Badge
								variant="secondary"
								className="ms-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-semibold px-3 py-1 hover:scale-105"
								style={{
									transition: `all ${ANIMATION_DURATIONS.fast} ease-out`
								}}
							>
								<Star className="w-3 h-3 mr-1" />
								Save 17%
							</Badge>
						</div>
						<div className="flex items-center justify-center gap-2">
							<Shield className="w-3 h-3 text-blue-600 dark:text-blue-400" />
							<p className="text-xs text-muted-foreground font-medium">
								All plans include a 14-day free trial
							</p>
						</div>
					</div>
				</div>

				{/* Pricing Grid */}
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-16">
					{enhancedPlans.map((plan, index) => (
						<div key={index}>
							<Card
								className={cn(
									'relative h-full transition-all duration-300 hover:scale-105',
									plan.popular
										? 'border-2 border-primary shadow-xl scale-105'
										: 'border border-border hover:border-primary/50'
								)}
							>
								{plan.popular && (
									<div className="absolute -top-4 left-1/2 -translate-x-1/2">
										<Badge className="bg-primary text-primary-foreground px-4 py-1">
											Most Popular
										</Badge>
									</div>
								)}

								<CardHeader className="text-center pb-8 pt-8">
									<div className="mb-4">
										<div
											className={cn(
												'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mx-auto mb-4',
												plan.popular
													? 'from-primary to-primary/80'
													: 'from-muted to-muted/50'
											)}
										>
											<plan.icon
												className={cn(
													'w-6 h-6',
													plan.popular
														? 'text-primary-foreground'
														: 'text-foreground'
												)}
											/>
										</div>
									</div>

									<h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
									<p className="text-muted-foreground text-sm mb-6">
										{plan.description}
									</p>

									<div className="space-y-1">
										<div className="flex items-baseline justify-center gap-1">
											<span className="text-4xl font-bold">
												${formatPrice(plan.price!)}
											</span>
											<span className="text-muted-foreground text-sm">
												/month
											</span>
										</div>
										{isYearly && plan.price!.annual > 0 && (
											<div className="text-xs text-muted-foreground">
												${plan.price!.annual / 100} billed annually
											</div>
										)}
									</div>
								</CardHeader>

								<CardContent className="px-6 pb-6">
									<ul className="space-y-3 mb-6">
										{plan.enhanced_features.map((feature, featureIndex) => (
											<li
												key={featureIndex}
												className="flex items-center text-sm"
											>
												<Check className="w-4 h-4 text-green-500 me-3 flex-shrink-0" />
												<span>{feature}</span>
											</li>
										))}
									</ul>
								</CardContent>

								<CardFooter className="px-6 pb-8">
									{plan.popular ? (
										<Button
											className="button-primary button-lg w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300"
											disabled={subscriptionMutation.isPending}
											onClick={() => handleSubscribe(plan.id!)}
										>
											{subscriptionMutation.isPending && (
												<Loader2 className="w-4 h-4 me-2 animate-spin" />
											)}
											{plan.cta}
										</Button>
									) : (
										<Button
											variant={
												plan.id === 'TENANTFLOW_MAX' ? 'outline' : 'default'
											}
											className={`w-full ${plan.id === 'TENANTFLOW_MAX' ? 'button-secondary' : 'button-primary'} button-lg`}
											disabled={subscriptionMutation.isPending}
											onClick={() => handleSubscribe(plan.id!)} // Will be set from backend
										>
											{subscriptionMutation.isPending && (
												<Loader2 className="w-4 h-4 me-2 animate-spin" />
											)}
											{plan.cta}
										</Button>
									)}
								</CardFooter>
							</Card>
						</div>
					))}
				</div>

				{/* Trust Signals */}
				<div>
					<div className="text-center">
						<div className="flex flex-wrap items-center justify-center gap-6 mb-8">
							<Badge variant="secondary" className="badge-success px-4 py-2">
								<Check className="w-4 h-4 me-2" />
								14-day free trial
							</Badge>
							<Badge variant="secondary" className="badge-info px-4 py-2">
								<Crown className="w-4 h-4 me-2" />
								No credit card required
							</Badge>
							<Badge variant="secondary" className="badge px-4 py-2">
								Cancel anytime
							</Badge>
							<Badge variant="secondary" className="badge-success px-4 py-2">
								SOC 2 compliant
							</Badge>
						</div>

						<p className="text-muted-foreground mb-6">
							Questions about our pricing?
						</p>
						<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
							<Button className="button-secondary button-lg">View FAQ</Button>
							<Button className="button-ghost button-lg">
								Contact support
							</Button>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
