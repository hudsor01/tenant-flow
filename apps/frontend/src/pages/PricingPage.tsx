import { useState, useEffect } from 'react'
import { usePostHog } from 'posthog-js/react'
import { Button } from '@/components/ui/button'
import { Sparkles, CheckCircle2, TrendingUp, Target, ArrowRight } from 'lucide-react'
import { CheckoutButton } from '@/components/billing/CheckoutButton'
import type { PLAN_TYPE } from '@tenantflow/shared'
// Temporary local PLANS constant until shared package import is fixed
const PLANS = [
  {
    id: 'FREE' as const,
    name: 'Free Trial',
    description: 'Perfect for getting started with property management',
    price: 0,
    propertyLimit: 2,
    tenantLimit: 5,
    features: [
      'Up to 2 Properties',
      'Up to 5 Tenants',
      'Basic Maintenance Tracking',
      'Tenant Communication',
      'Document Storage',
      '14-Day Trial'
    ]
  },
  {
    id: 'STARTER' as const,
    name: 'Starter',
    description: 'Great for small property portfolios',
    price: 19,
    ANNUALPrice: 15,
    propertyLimit: 10,
    tenantLimit: 50,
    features: [
      'Up to 10 Properties',
      'Up to 50 Tenants',
      'Advanced Maintenance Workflow',
      'Automated Rent Reminders',
      'Financial Reporting',
      'Priority Support'
    ]
  },
  {
    id: 'GROWTH' as const,
    name: 'Growth',
    description: 'Ideal for growing property businesses',
    price: 49,
    ANNUALPrice: 39,
    propertyLimit: 50,
    tenantLimit: 250,
    features: [
      'Up to 50 Properties',
      'Up to 250 Tenants',
      'Advanced Analytics',
      'Custom Reports',
      'API Access',
      'White-label Options',
      'Dedicated Support'
    ]
  },
  {
    id: 'ENTERPRISE' as const,
    name: 'Enterprise',
    description: 'Unlimited growth potential for large portfolios',
    price: 149,
    ANNUALPrice: 119,
    propertyLimit: -1, // Unlimited
    tenantLimit: -1, // Unlimited
    features: [
      'Unlimited Properties',
      'Unlimited Tenants',
      'Custom Integrations',
      'Advanced Security',
      'On-premise Options',
      'Dedicated Account Manager',
      '24/7 Support'
    ]
  }
]

type Plan = typeof PLANS[0]
import { SEO } from '@/components/seo/SEO'
import { generatePricingSEO } from '@/lib/utils/seo-utils'
import { cn } from '@/lib/utils/css.utils'
import { Navigation } from '@/components/layout/Navigation'

// Enhanced plan interface for display
interface EnhancedPlan {
	plan: Plan
	isPopular: boolean
	icon: React.ComponentType<{ className?: string }>
	badge?: string
	spotlight?: string
}

// Helper function to safely get plans
const getPlans = () => {
	const free = PLANS.find(p => p.id === 'FREE')
	const starter = PLANS.find(p => p.id === 'STARTER')
	const growth = PLANS.find(p => p.id === 'GROWTH')
	const enterprise = PLANS.find(p => p.id === 'ENTERPRISE')

	if (!free || !starter || !growth || !enterprise) {
		throw new Error('Missing required plans in configuration')
	}

	return { free, starter, growth, enterprise }
}

// Enhanced plan configuration with visual elements
const enhancedPlans: EnhancedPlan[] = (() => {
	const { free, starter, growth, enterprise } = getPlans()

	return [
		{
			plan: free,
			isPopular: false,
			icon: Target,
			badge: '14-Day Free Trial',
			spotlight: 'Perfect for getting started'
		},
		{
			plan: starter,
			isPopular: false,
			icon: TrendingUp,
			badge: 'Best Value',
			spotlight: 'Great for small portfolios'
		},
		{
			plan: growth,
			isPopular: true,
			icon: Sparkles,
			badge: 'Most Popular',
			spotlight: 'Ideal for growing businesses'
		},
		{
			plan: enterprise,
			isPopular: false,
			icon: CheckCircle2,
			badge: 'Enterprise',
			spotlight: 'Unlimited growth potential'
		}
	]
})()

export default function PricingPage() {
	// Billing period state with toggle functionality
	const [billingPeriod, setBillingPeriod] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY')

	const posthog = usePostHog()

	// Generate optimized SEO data
	const seoData = generatePricingSEO()

	// Simple analytics tracking for MVP
	useEffect(() => {
		posthog?.capture('pricing_page_viewed', {
			timestamp: new Date().toISOString()
		})
	}, [posthog])

	const handleGetStarted = (planId: string) => {
		posthog?.capture('pricing_plan_clicked', {
			plan_id: planId,
			timestamp: new Date().toISOString()
		})

		if (planId === 'FREE') {
			// Redirect to sign up for free trial
			window.location.href = '/auth/signup'
		} else if (planId === 'ENTERPRISE') {
			// Open email for enterprise
			window.open('mailto:sales@tenantflow.app?subject=Enterprise Plan Inquiry', '_blank')
		} else {
			// For paid plans, redirect to signup - the Stripe checkout will be handled in the dashboard
			window.location.href = '/auth/signup'
		}
	}

	const handleSubscriptionSuccess = (subscriptionId: string) => {
		posthog?.capture('subscription_created', {
			subscription_id: subscriptionId,
			timestamp: new Date().toISOString()
		})
		// Redirect to dashboard or success page
		window.location.href = '/dashboard'
	}

	// Map plan IDs to PLAN_TYPE
	const getPlanType = (planId: string): keyof typeof PLAN_TYPE | null => {
		switch (planId) {
			case 'STARTER':
				return 'STARTER'
			case 'GROWTH':
				return 'GROWTH'
			case 'ENTERPRISE':
				return 'ENTERPRISE'
			default:
				return null
		}
	}

	return (
		<>
			<SEO
				title={seoData.title}
				description={seoData.description}
				keywords={seoData.keywords}
				canonical={seoData.canonical}
				structuredData={seoData.structuredData}
				breadcrumb={seoData.breadcrumb}
			/>

			<div className="min-h-screen bg-white">
				<Navigation context="public" />

				{/* Hero Section */}
				<section className="bg-white border-b border-gray-200">
					<div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-24">
						<div className="max-w-4xl mx-auto text-center">
							<div className="mb-6 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-50 border border-gray-200 rounded-full text-gray-700">
								<Sparkles className="w-4 h-4" />
								14-Day Free Trial • No Credit Card Required
							</div>
							
							<h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold mb-4 sm:mb-6 leading-tight tracking-tight text-gray-900">
								Simple, transparent pricing
							</h1>
							
							<p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
								Choose the perfect plan for your property management needs. Start free, upgrade when you grow.
							</p>
						</div>
					</div>
				</section>

				{/* Pricing Cards */}
				<section className="py-12 sm:py-16 lg:py-24 bg-white">
					<div className="container mx-auto px-4 sm:px-6">
						<div className="text-center mb-8 sm:mb-12 lg:mb-16">
							<h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-3 sm:mb-4 tracking-tight">
								Choose your plan
							</h2>
							<p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto mb-6 sm:mb-8">
								Start with our free trial, then scale as your portfolio grows.
							</p>
							
							{/* Billing Toggle */}
							<div className="flex items-center justify-center">
								<div className="bg-gray-100 border border-gray-200 rounded-lg p-1 flex items-center">
									<button
										onClick={() => setBillingPeriod('MONTHLY')}
										className={cn(
											"px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
											billingPeriod === 'MONTHLY'
												? "bg-white text-gray-900 shadow-sm border border-gray-200"
												: "text-gray-600 hover:text-gray-900"
										)}
									>
										Monthly
									</button>
									<button
										onClick={() => setBillingPeriod('ANNUAL')}
										className={cn(
											"px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 relative",
											billingPeriod === 'ANNUAL'
												? "bg-white text-gray-900 shadow-sm border border-gray-200"
												: "text-gray-600 hover:text-gray-900"
										)}
									>
										Annual
										<span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
											-20%
										</span>
									</button>
								</div>
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto">
							{enhancedPlans.map((enhancedPlan) => {
								const { plan, isPopular, badge } = enhancedPlan
								const price = billingPeriod === 'ANNUAL' && plan.ANNUALPrice ? plan.ANNUALPrice : plan.price
								const originalPrice = plan.price

								return (
									<div
										key={plan.id}
										className={cn(
											"relative p-4 sm:p-6 border rounded-lg bg-white transition-colors duration-200 flex flex-col h-full",
											isPopular 
												? "border-gray-900 border-2" 
												: "border-gray-200 hover:border-gray-300"
										)}
									>
											{/* Badge */}
											{badge && isPopular && (
												<div className="absolute -top-2 sm:-top-3 left-3 sm:left-4 bg-gray-900 text-white px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full">
													{badge}
												</div>
											)}

											{/* Header */}
											<div className="mb-4 sm:mb-6">
												<h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
													{plan.name}
												</h3>
												<p className="text-xs sm:text-sm text-gray-600">
													{plan.description}
												</p>
											</div>

												{/* Price */}
												<div className="mb-6">
													{plan.id === 'ENTERPRISE' ? (
														<div>
															<div className="text-xl sm:text-2xl font-bold text-gray-900">Custom</div>
															<div className="text-xs sm:text-sm text-gray-600">Contact sales</div>
														</div>
													) : (
														<div>
															<div className="flex items-baseline gap-1">
																<span className="text-xl sm:text-2xl font-bold text-gray-900">
																	${price}
																</span>
																<span className="text-xs sm:text-sm text-gray-600">
																	/{billingPeriod === 'ANNUAL' ? 'year' : 'month'}
																</span>
															</div>
															{billingPeriod === 'ANNUAL' && plan.ANNUALPrice && (
																<div className="text-xs sm:text-sm text-gray-500 mt-1">
																	<span className="line-through">${originalPrice}/month</span>
																	<span className="ml-2 text-green-600">Save 20%</span>
																</div>
															)}
														</div>
													)}
												</div>


												{/* Features */}
												<div className="mb-6 sm:mb-8 space-y-2 flex-grow">
													{(plan.features || [])
														.slice(0, 6)
														.map((feature, idx) => (
															<div
																key={idx}
																className="flex items-start gap-2 text-xs sm:text-sm text-gray-600"
															>
																<CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 text-gray-400 mt-0.5" />
																<span>{feature}</span>
															</div>
														))}
												</div>

												{/* CTA Button */}
												<div className="mt-auto">
													{plan.id === 'ENTERPRISE' ? (
														<Button
															variant="outline"
															size="lg"
															className="w-full group-hover:bg-gray-50 group-hover:border-gray-300 transition-all duration-300"
															onClick={() =>
																window.open(
																	'mailto:sales@tenantflow.app?subject=Enterprise Plan Inquiry',
																	'_blank'
																)
															}
														>
															Contact Sales
															<ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
														</Button>
													) : plan.id === 'FREE' ? (
														<Button
															size="lg"
															variant="outline"
															className="w-full font-semibold border-green-500 text-green-600 hover:bg-green-50 transition-all duration-300"
															onClick={() => handleGetStarted(plan.id)}
														>
															Start Free Trial
															<ArrowRight className="ml-2 h-4 w-4" />
														</Button>
													) : (
														<div>
															{getPlanType(plan.id) ? (
																<CheckoutButton
																	planType={getPlanType(plan.id)!}
																	billingInterval={billingPeriod === 'ANNUAL' ? 'annual' : 'monthly'}
																	onSuccess={handleSubscriptionSuccess}
																	className={cn(
																		"w-full font-semibold transition-all duration-300 border",
																		isPopular
																			? "bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
																			: "bg-gray-900 hover:bg-gray-800 text-white border-gray-800"
																	)}
																>
																	<span className="flex items-center justify-center">
																		Subscribe Now
																		<ArrowRight className="ml-2 h-4 w-4" />
																	</span>
																</CheckoutButton>
															) : (
																<Button
																	size="lg"
																	className={cn(
																		"w-full font-semibold transition-all duration-300 border",
																		isPopular
																			? "bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
																			: "bg-gray-900 hover:bg-gray-800 text-white border-gray-800"
																	)}
																	onClick={() => handleGetStarted(plan.id)}
																>
																	Get Started
																	<ArrowRight className="ml-2 h-4 w-4" />
																</Button>
															)}
														</div>
													)}
												</div>
										</div>
								)
							})}
						</div>

					</div>
				</section>

				{/* FAQ Section */}
				<section className="py-12 sm:py-16 lg:py-24 bg-white">
					<div className="container mx-auto px-4 sm:px-6">
						<div className="text-center mb-8 sm:mb-12 lg:mb-16">
							<h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-3 sm:mb-4 tracking-tight">
								Frequently Asked Questions
							</h2>
							<p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
								Get answers to common questions about our pricing and plans.
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
							{[
								{
									question: 'Can I change my plan at any time?',
									answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and billing is prorated.'
								},
								{
									question: 'What happens during the free trial?',
									answer: 'You get full access to all features for 14 days. No credit card required, and you can cancel anytime without being charged.'
								},
								{
									question: 'Are there any setup fees?',
									answer: 'No setup fees, ever. You only pay the monthly or annual subscription fee based on your chosen plan.'
								},
								{
									question: 'What if I need to cancel?',
									answer: 'You can cancel anytime. Your subscription will remain active until the end of your billing period, then automatically stop.'
								},
								{
									question: 'Do you offer discounts for annual plans?',
									answer: 'Yes! Annual plans save you up to 20% compared to monthly billing. The savings are automatically applied.'
								},
								{
									question: 'Is my data secure?',
									answer: 'Absolutely. We use bank-level encryption, secure cloud infrastructure, and comply with industry security standards.'
								}
							].map((faq, index) => (
								<div
									key={index}
									className="border border-gray-200 rounded-lg p-4 sm:p-6 bg-white"
								>
									<h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">
										{faq.question}
									</h3>
									<p className="text-sm sm:text-base text-gray-600 leading-relaxed">
										{faq.answer}
									</p>
								</div>
							))}
						</div>
					</div>
				</section>
			</div>
		</>
	)
}
