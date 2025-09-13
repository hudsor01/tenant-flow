'use client'

import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { API_BASE_URL } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import {
	AddressElement,
	Elements,
	PaymentElement,
	useElements,
	useStripe
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import {
	ArrowRight,
	Award,
	Building,
	Check,
	Crown,
	Shield,
	Sparkles,
	Star,
	Users,
	Zap
} from 'lucide-react'
import { useState } from 'react'

// Initialize Stripe with your publishable key
const stripePromise = loadStripe(
	process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

// Official Stripe types (imported from @stripe/stripe-js)
interface PricingPlan {
	id: string
	name: string
	description: string
	icon: React.ComponentType<{ className?: string }>
	stripePriceId: string
	stripeYearlyPriceId: string
	badge?: string
	valueProp: string
	features: string[]
	popular?: boolean
	highlight: string
	cta: string
}

const pricingPlans: PricingPlan[] = [
	{
		id: 'STARTER',
		name: 'Starter',
		description: 'Perfect for individual property owners',
		icon: Building,
		stripePriceId: 'price_starter_monthly', // Replace with actual Stripe price IDs
		stripeYearlyPriceId: 'price_starter_yearly',
		badge: 'Most Popular for Individuals',
		valueProp: 'Everything you need to manage properties professionally',
		features: [
			'Up to 10 properties',
			'Advanced tenant screening',
			'Automated rent collection',
			'Smart maintenance routing',
			'Financial reporting',
			'Mobile app access',
			'Email support'
		],
		popular: false,
		highlight: 'Save $58/year',
		cta: 'Start free trial'
	},
	{
		id: 'GROWTH',
		name: 'Growth',
		description: 'Ideal for growing property businesses',
		icon: Zap,
		stripePriceId: 'price_growth_monthly',
		stripeYearlyPriceId: 'price_growth_yearly',
		badge: 'Most Popular for Teams',
		valueProp: 'Scale your business with advanced automation',
		features: [
			'Up to 100 properties',
			'AI-powered screening',
			'Automated collections',
			'Smart maintenance',
			'Advanced analytics',
			'Custom lease templates',
			'Priority support',
			'API access'
		],
		popular: true,
		highlight: 'Save $198/year',
		cta: 'Start free trial'
	},
	{
		id: 'TENANTFLOW_MAX',
		name: 'TenantFlow Max',
		description: 'For large-scale property companies',
		icon: Crown,
		stripePriceId: 'price_tenantflow_max_monthly',
		stripeYearlyPriceId: 'price_tenantflow_max_yearly',
		badge: 'Built for Scale',
		valueProp: 'Enterprise-grade solution with dedicated support',
		features: [
			'Unlimited properties',
			'Multi-location management',
			'Advanced automation',
			'Predictive analytics',
			'Custom integrations',
			'Dedicated support',
			'SOC 2 compliance',
			'Custom development'
		],
		popular: false,
		highlight: 'Custom pricing',
		cta: 'Contact sales'
	}
]

const trustIndicators = [
	{ icon: Shield, text: 'SOC 2 Type II Compliant', color: 'text-green-600' },
	{ icon: Users, text: '10,000+ Properties Managed', color: 'text-blue-600' },
	{ icon: Award, text: 'G2 Leader in PropTech', color: 'text-purple-600' },
	{ icon: Star, text: '4.9/5 Customer Rating', color: 'text-yellow-600' }
]

// Official Stripe Checkout Component using their SDK
function StripeCheckoutForm({
	plan,
	isYearly
}: {
	plan: PricingPlan
	isYearly: boolean
}) {
	const stripe = useStripe()
	const elements = useElements()
	const [isLoading, setIsLoading] = useState(false)
	const [message, setMessage] = useState<string | null>(null)

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault()

		if (!stripe || !elements) {
			return
		}

		setIsLoading(true)
		setMessage(null)

		try {
			// Create checkout session using Stripe's official API
			const response = await fetch(`${API_BASE_URL}/stripe/checkout`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					priceId: isYearly ? plan.stripeYearlyPriceId : plan.stripePriceId,
					planName: plan.name,
					isYearly,
					successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
					cancelUrl: `${window.location.origin}/pricing`
				})
			})

			const { sessionId, error } = await response.json()

			if (error) {
				setMessage(error.message)
				return
			}

			// Use Stripe's official redirectToCheckout method
			const result = await stripe.redirectToCheckout({
				sessionId
			})

			if (result.error) {
				setMessage(result.error.message || 'An unexpected error occurred.')
			}
		} catch {
			setMessage('An unexpected error occurred.')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div className="space-y-4">
				<PaymentElement
					options={{
						layout: 'tabs'
					}}
				/>
				<AddressElement
					options={{
						mode: 'billing'
					}}
				/>
			</div>

			{message && (
				<div className="text-destructive text-sm font-medium">{message}</div>
			)}

                <button
                  type="submit"
                  disabled={!stripe || isLoading}
                  className="btn-gradient-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
				{isLoading ? 'Processing...' : `Subscribe to ${plan.name}`}
			</button>
		</form>
	)
}

// Pricing Card Component using official Stripe patterns
function PricingCard({
	plan,
	isYearly
}: {
	plan: PricingPlan
	isYearly: boolean
}) {
	const [showCheckout, setShowCheckout] = useState(false)

	const handleSubscribe = () => {
		if (plan.id === 'enterprise') {
			// For enterprise, redirect to contact form
			window.location.href = '/contact?plan=enterprise'
		} else {
			setShowCheckout(true)
		}
	}

	return (
		<div
			className={cn(
				'card-elevated-gradient relative h-full animate-fade-in-up',
				plan.popular && 'ring-2 ring-primary shadow-xl'
			)}
		>
			{plan.popular && (
				<div className="absolute -top-4 left-1/2 -translate-x-1/2">
					<Badge className="badge bg-gradient-to-r from-primary to-accent text-primary-foreground px-4 py-1">
						{plan.badge}
					</Badge>
				</div>
			)}

			<div className="p-6 text-center">
				<div className="flex justify-center mb-4">
					<div className="p-3 rounded-full bg-gradient-to-r from-primary/10 to-accent/10">
						<plan.icon className="w-8 h-8 text-primary" />
					</div>
				</div>

				<h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
				<p className="text-muted-foreground">{plan.description}</p>

				{/* Price display using Stripe's pricing structure */}
				<div className="mt-4">
					<div className="text-center">
						<div className="flex items-baseline justify-center gap-2">
							<span className="text-4xl font-bold text-foreground">
								$
								{isYearly
									? Math.floor(
											plan.stripeYearlyPriceId.includes('yearly')
												? plan.id === 'STARTER'
													? 290
													: plan.id === 'GROWTH'
														? 990
														: 2990
												: plan.id === 'STARTER'
													? 29
													: plan.id === 'GROWTH'
														? 99
														: 299
										)
									: Math.floor(
											plan.stripePriceId.includes('monthly')
												? plan.id === 'STARTER'
													? 29
													: plan.id === 'GROWTH'
														? 99
														: 299
												: plan.id === 'STARTER'
													? 29
													: plan.id === 'GROWTH'
														? 99
														: 299
										)}
							</span>
							<span className="text-muted-foreground">
								/{isYearly ? 'year' : 'month'}
							</span>
						</div>
						{isYearly && (
							<p className="text-sm text-success font-medium mt-1">
								Save $
								{plan.id === 'STARTER' ? 58 : plan.id === 'GROWTH' ? 198 : 598}{' '}
								vs monthly
							</p>
						)}
					</div>
				</div>
			</div>

			<div className="px-6 pb-6 space-y-4">
				<p className="text-center text-sm font-medium text-primary">
					{plan.valueProp}
				</p>

				<ul className="space-y-3">
					{plan.features.map((feature, index) => (
						<li key={index} className="flex items-start gap-3">
							<Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
							<span className="text-sm text-foreground">{feature}</span>
						</li>
					))}
				</ul>
			</div>

			<div className="px-6 pb-6">
				{!showCheckout ? (
            <button
              onClick={handleSubscribe}
              className={cn(
                'btn-gradient-primary w-full',
                plan.popular &&
                  'bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90'
              )}
            >
						{plan.cta}
						<ArrowRight className="w-4 h-4 ml-2" />
					</button>
				) : (
					// Use Stripe's official Elements provider
					<Elements
						stripe={stripePromise}
						options={{
							mode: 'subscription',
							amount: isYearly ? 29000 : 2900, // Amount in cents
							currency: 'usd',
							appearance: {
								theme: 'stripe',
								variables: {
									colorPrimary: 'hsl(var(--primary))'
								}
							}
						}}
					>
						<StripeCheckoutForm plan={plan} isYearly={isYearly} />
					</Elements>
				)}
			</div>
		</div>
	)
}

// Main component using official Stripe patterns
export function StripePricingSection({ className }: { className?: string }) {
	const [isYearly, setIsYearly] = useState(false)

	return (
		<section
			className={cn('relative py-32 surface-glow overflow-hidden', className)}
		>
			{/* Premium background */}
			<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary/10 to-accent/10 rounded-full blur-3xl" />

			<div className="container relative px-4 mx-auto max-w-7xl">
				{/* Header */}
				<div className="text-center max-w-4xl mx-auto mb-20 animate-fade-in-up">
					<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 mb-8">
						<Sparkles className="w-4 h-4 text-primary" />
						<span className="text-sm font-medium text-primary">
							Trusted by 10,000+ property managers
						</span>
					</div>

            <h2 className="display-xl font-bold tracking-tight mb-6">
						<span className="text-gradient-primary">Simple pricing,</span>
						<br />
              <span className="text-gradient-authority">
							extraordinary results
						</span>
					</h2>

					<p className="text-xl text-muted-foreground mb-8">
						Choose the perfect plan for your property management needs. All
						plans include a 14-day free trial.
					</p>

					{/* Billing Toggle */}
					<div className="flex items-center justify-center gap-4 mb-12">
						<span
							className={cn(
								'text-sm font-medium',
								!isYearly && 'text-foreground',
								isYearly && 'text-muted-foreground'
							)}
						>
							Monthly
						</span>
						<Switch
							checked={isYearly}
							onCheckedChange={setIsYearly}
							className="data-[state=checked]:bg-primary"
						/>
						<span
							className={cn(
								'text-sm font-medium',
								isYearly && 'text-foreground',
								!isYearly && 'text-muted-foreground'
							)}
						>
							Yearly
						</span>
						<Badge className="badge-success ml-2">Save up to 25%</Badge>
					</div>
				</div>

				{/* Pricing Cards */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
					{pricingPlans.map((plan, index) => (
						<div
							key={plan.id}
							className="animate-fade-in-up"
							style={{ animationDelay: `${index * 100}ms` }}
						>
							<PricingCard plan={plan} isYearly={isYearly} />
						</div>
					))}
				</div>

				{/* Trust Indicators */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
					{trustIndicators.map((indicator, index) => (
						<div
							key={index}
							className="text-center animate-fade-in-up"
							style={{ animationDelay: `${(index + 3) * 100}ms` }}
						>
							<div className="flex justify-center mb-3">
								<div className="p-3 rounded-full bg-gradient-to-r from-primary/10 to-accent/10">
									<indicator.icon className={cn('w-6 h-6', indicator.color)} />
								</div>
							</div>
							<p className="text-sm font-medium text-foreground">
								{indicator.text}
							</p>
						</div>
					))}
				</div>

				{/* Enterprise CTA */}
				<div
					className="text-center animate-fade-in-up"
					style={{ animationDelay: '700ms' }}
				>
          <div className="bg-gradient-to-r from-muted to-muted/80 rounded-2xl card-padding max-w-4xl mx-auto">
						<h3 className="text-2xl font-bold mb-4 text-foreground">
							Need a custom enterprise solution?
						</h3>
						<p className="text-muted-foreground mb-6">
							Get unlimited properties, custom integrations, dedicated support,
							and volume discounts.
						</p>
							<button className="btn-gradient-primary">
							Contact our sales team
							<ArrowRight className="w-4 h-4 ml-2" />
						</button>
					</div>
				</div>
			</div>
		</section>
	)
}
