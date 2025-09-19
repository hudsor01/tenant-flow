'use client'

import { containerClasses } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import { TYPOGRAPHY_SCALE } from '@repo/shared'
import { loadStripe } from '@stripe/stripe-js'
import { ArrowRight, Check, Loader2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { BlurFade } from 'src/components/magicui/blur-fade'
import { Badge } from 'src/components/ui/badge'
import { Button } from 'src/components/ui/button'
import { usePricing } from '@/hooks/use-pricing'

// Initialize Stripe
const stripePromise = loadStripe(
	process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

export default function ModernPricingPage() {
	const [isAnnual, setIsAnnual] = useState(true)
	const [loading, setLoading] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const router = useRouter()

	const { plans, getPrice, getStripeId } = usePricing()

	// Filter out trial plan for pricing page
	const displayPlans = plans.filter(plan => plan.planId !== 'trial')

	// Handle checkout
	const handleCheckout = async (planConfig: typeof plans[0]) => {
		if (planConfig.planId === 'max') {
			router.push('/contact?plan=max')
			return
		}

		try {
			setLoading(planConfig.id)
			setError(null)

			const priceId = getStripeId(planConfig.planId, isAnnual ? 'annual' : 'monthly')

			if (!priceId) {
				throw new Error('Price ID not configured')
			}

			// Call backend Stripe service to create checkout session
			const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.tenantflow.app'
			const response = await fetch(`${apiUrl}/stripe/create-checkout-session`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					priceId,
					successUrl: `${window.location.origin}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
					cancelUrl: `${window.location.origin}/pricing/cancel`
				})
			})

			if (!response.ok) {
				throw new Error('Failed to create checkout session')
			}

			const { sessionId } = await response.json()
			const stripe = await stripePromise

			if (!stripe) {
				throw new Error('Stripe not initialized')
			}

			const { error: stripeError } = await stripe.redirectToCheckout({
				sessionId
			})

			if (stripeError) {
				throw stripeError
			}
		} catch (err) {
			console.error('Checkout error:', err)
			setError(err instanceof Error ? err.message : 'Something went wrong')
		} finally {
			setLoading(null)
		}
	}

	return (
		<div className="min-h-screen bg-background">
			{/* Hero Section */}
			<section className="relative overflow-hidden">
				{/* Background gradients */}
				<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
				<div className="absolute top-1/2 start-1/2 -z-10 transform -translate-y-1/2 -translate-x-1/2">
					<div className="w-[575px] h-[575px] border border-dashed border-border/50 rounded-full opacity-40"></div>
					<div className="absolute top-0 w-[840px] h-[840px] border border-dashed border-border/30 rounded-full opacity-30"></div>
				</div>

				<div className={cn(containerClasses('xl'), 'relative pt-24 pb-16')}>
					<BlurFade delay={0.1} inView>
						<div className="text-center max-w-3xl mx-auto mb-16">
							<h1
								className="font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
								style={TYPOGRAPHY_SCALE['display-lg']}
							>
								Simple, transparent pricing
							</h1>
							<p
								className="mt-4 text-muted-foreground"
								style={TYPOGRAPHY_SCALE['body-lg']}
							>
								Whatever your portfolio size, our plans scale with your needs
							</p>
						</div>
					</BlurFade>

					{/* Billing Toggle */}
					<BlurFade delay={0.2} inView>
						<div className="flex justify-center items-center gap-4 mb-12">
							<span
								className={cn(
									'text-sm font-medium',
									!isAnnual ? 'text-foreground' : 'text-muted-foreground'
								)}
							>
								Monthly
							</span>
							<button
								onClick={() => setIsAnnual(!isAnnual)}
								className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted border border-border transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
							>
								<span
									className={cn(
										'inline-block h-4 w-4 transform rounded-full bg-primary transition-transform',
										isAnnual ? 'translate-x-6' : 'translate-x-1'
									)}
								/>
							</button>
							<span
								className={cn(
									'text-sm font-medium',
									isAnnual ? 'text-foreground' : 'text-muted-foreground'
								)}
							>
								Annual
								<Badge className="ml-2 bg-primary/10 text-primary border-primary/20">
									Save 20%
								</Badge>
							</span>
						</div>
					</BlurFade>

					{/* Error Alert */}
					{error && (
						<div className="mb-8 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center justify-between max-w-2xl mx-auto">
							<p className="text-sm text-destructive">{error}</p>
							<button onClick={() => setError(null)}>
								<X className="h-4 w-4 text-destructive" />
							</button>
						</div>
					)}

					{/* Pricing Cards */}
					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
						{displayPlans.map((plan, index) => {
							const isPopular = plan.planId === 'growth'
							const isMax = plan.planId === 'max'

							return (
								<BlurFade key={plan.id} delay={0.3 + index * 0.1} inView>
									<div
										className={cn(
											'relative flex flex-col bg-card rounded-2xl p-6 border transition-all duration-300',
											isPopular
												? 'border-primary shadow-lg scale-105'
												: 'border-border hover:border-primary/50 hover:shadow-md'
										)}
									>
										{isPopular && (
											<Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
												Most Popular
											</Badge>
										)}

										<div className="text-center mb-6">
											<h3 className="font-semibold text-lg mb-2">{plan.name}</h3>
											<p className="text-sm text-muted-foreground mb-4">
												{plan.description}
											</p>

											{isMax ? (
												<div className="my-4">
													<span className="text-3xl font-bold">Custom</span>
													<p className="text-sm text-muted-foreground mt-1">
														Contact for pricing
													</p>
												</div>
											) : (
												<div className="my-4">
													<span className="text-3xl font-bold">
														{getPrice(plan.planId, isAnnual ? 'annual' : 'monthly')}
													</span>
													<span className="text-muted-foreground">/month</span>
													{isAnnual && (
														<p className="text-xs text-muted-foreground mt-1">
															Billed ${plan.price.annual} annually
														</p>
													)}
												</div>
											)}

											<p className="text-sm font-medium text-primary">
												{plan.limits.properties === -1
													? 'Unlimited properties'
													: `Up to ${plan.limits.properties} properties`}
											</p>
										</div>

										<ul className="space-y-3 mb-6 flex-grow">
											{plan.features.map((feature, i) => (
												<li key={i} className="flex items-start gap-2">
													<Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
													<span className="text-sm">{feature}</span>
												</li>
											))}
										</ul>

										<Button
											onClick={() => handleCheckout(plan)}
											disabled={loading === plan.id}
											variant={isPopular ? 'default' : 'outline'}
											className={cn(
												'w-full group',
												isPopular && 'bg-primary hover:bg-primary/90'
											)}
										>
											{loading === plan.id ? (
												<>
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													Processing...
												</>
											) : isMax ? (
												<>
													Contact Sales
													<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
												</>
											) : (
												<>
													Get Started
													<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
												</>
											)}
										</Button>
									</div>
								</BlurFade>
							)
						})}
					</div>

					{/* Trust Badges */}
					<BlurFade delay={0.8} inView>
						<div className="mt-16 text-center">
							<p className="text-sm text-muted-foreground mb-8">
								Trusted by 10,000+ property managers worldwide
							</p>
							<div className="flex flex-wrap justify-center items-center gap-8">
								<Badge variant="secondary" className="px-4 py-2">
									🔒 Bank-level security
								</Badge>
								<Badge variant="secondary" className="px-4 py-2">
									⚡ 99.9% uptime SLA
								</Badge>
								<Badge variant="secondary" className="px-4 py-2">
									🎯 14-day free trial
								</Badge>
								<Badge variant="secondary" className="px-4 py-2">
									💳 No setup fees
								</Badge>
							</div>
						</div>
					</BlurFade>
				</div>
			</section>
		</div>
	)
}
