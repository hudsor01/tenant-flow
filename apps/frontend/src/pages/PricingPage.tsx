import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePostHog } from 'posthog-js/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles, CheckCircle2, TrendingUp, Target, ArrowRight, Users, Star, Shield, Zap, Clock, Building2, User } from 'lucide-react'
import { Link } from '@tanstack/react-router'
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
<<<<<<< HEAD
=======
	const [hoveredPlan, setHoveredPlan] = useState<string | null>(null)
>>>>>>> origin/main

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
<<<<<<< HEAD
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
=======
				<section className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white overflow-hidden">
					{/* Background Pattern */}
					<div className="absolute inset-0">
						<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
						<div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.05%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
					</div>
					
					<div className="relative">
						<div className="container mx-auto px-6 py-20 lg:py-32">
							<motion.div 
								className="max-w-5xl mx-auto text-center"
								initial={{ opacity: 0, y: 30 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
							>
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.6, delay: 0.2 }}
								>
									<div className="mb-8 inline-flex items-center gap-2 px-6 py-2 text-sm font-medium bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-blue-200">
										<Sparkles className="w-4 h-4" />
										14-Day Free Trial • No Credit Card Required
									</div>
								</motion.div>
								
								<motion.h1 
									className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-8 leading-[1.1] tracking-tight"
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.8, delay: 0.3 }}
								>
									Simple, Transparent{' '}
									<span className="bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent">
										Pricing
									</span>
								</motion.h1>
								
								<motion.p 
									className="text-xl lg:text-2xl text-blue-100/90 mb-12 max-w-4xl mx-auto leading-relaxed font-light"
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.8, delay: 0.4 }}
								>
									Choose the perfect plan for your property management needs. Start free, upgrade when you grow.
								</motion.p>

								{/* Billing Toggle */}
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.8, delay: 0.5 }}
									className="flex items-center justify-center mb-8"
								>
									<div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-1 flex items-center">
										<button
											onClick={() => setBillingPeriod('MONTHLY')}
											className={cn(
												"px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300",
												billingPeriod === 'MONTHLY'
													? "bg-white text-blue-900 shadow-sm"
													: "text-blue-200 hover:text-white"
											)}
										>
											Monthly
										</button>
										<button
											onClick={() => setBillingPeriod('ANNUAL')}
											className={cn(
												"px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 relative",
												billingPeriod === 'ANNUAL'
													? "bg-white text-blue-900 shadow-sm"
													: "text-blue-200 hover:text-white"
											)}
										>
											Annual
											<div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full border border-green-400">
												Save 20%
											</div>
										</button>
									</div>
								</motion.div>

								{/* Trust Indicators */}
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.8, delay: 0.6 }}
									className="flex items-center justify-center gap-8 text-blue-200/70 text-sm"
								>
									<div className="flex items-center gap-2">
										<Shield className="w-4 h-4" />
										<span>Bank-level Security</span>
									</div>
									<div className="flex items-center gap-2">
										<Star className="w-4 h-4" />
										<span>5-star Support</span>
									</div>
									<div className="flex items-center gap-2">
										<Zap className="w-4 h-4" />
										<span>Instant Setup</span>
									</div>
								</motion.div>
							</motion.div>
>>>>>>> origin/main
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

<<<<<<< HEAD
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto">
							{enhancedPlans.map((enhancedPlan) => {
								const { plan, isPopular, badge } = enhancedPlan
=======
						<motion.div 
							className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto"
							initial={{ opacity: 0 }}
							whileInView={{ opacity: 1 }}
							viewport={{ once: true }}
							transition={{ duration: 0.8, staggerChildren: 0.1 }}
						>
							{enhancedPlans.map((enhancedPlan, index) => {
								const { plan, isPopular, badge, spotlight, icon: IconComponent } = enhancedPlan
>>>>>>> origin/main
								const price = billingPeriod === 'ANNUAL' && plan.ANNUALPrice ? plan.ANNUALPrice : plan.price
								const originalPrice = plan.price

								return (
									<div
										key={plan.id}
<<<<<<< HEAD
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
=======
										initial={{ opacity: 0, y: 30 }}
										whileInView={{ opacity: 1, y: 0 }}
										viewport={{ once: true }}
										transition={{ duration: 0.6, delay: index * 0.1 }}
										onHoverStart={() => setHoveredPlan(plan.id)}
										onHoverEnd={() => setHoveredPlan(null)}
									>
										<Card className={cn(
											"group bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 h-full relative overflow-hidden cursor-pointer",
											isPopular ? "border-blue-500 border-2 shadow-lg" : "hover:border-gray-300",
											hoveredPlan === plan.id ? "border-blue-400" : ""
										)}>
											{/* Badge */}
											{badge && (
												<motion.div 
													className={cn(
														"absolute -top-3 left-1/2 -translate-x-1/2 transform rounded-full px-3 py-1 text-xs font-semibold z-10 border",
														isPopular
															? "bg-blue-600 text-white border-blue-500"
															: "bg-green-600 text-white border-green-500"
													)}
													initial={{ scale: 0.8, opacity: 0 }}
													whileInView={{ scale: 1, opacity: 1 }}
													transition={{ duration: 0.4, delay: 0.3 }}
												>
>>>>>>> origin/main
													{badge}
												</motion.div>
											)}

<<<<<<< HEAD
											{/* Header */}
											<div className="mb-4 sm:mb-6">
												<h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
													{plan.name}
												</h3>
												<p className="text-xs sm:text-sm text-gray-600">
													{plan.description}
												</p>
											</div>
=======
											<CardContent className="p-8 h-full flex flex-col relative z-10">
												{/* Icon */}
												<div className={cn(
													"w-16 h-16 rounded-xl border flex items-center justify-center mb-6 transition-all duration-300",
													isPopular 
														? "bg-blue-50 border-blue-200"
														: "bg-gray-50 border-gray-200"
												)}>
													<IconComponent className={cn(
														"h-8 w-8",
														isPopular ? "text-blue-600" : "text-gray-600"
													)} />
												</div>

												{/* Header */}
												<div className="mb-6 text-center">
													<h3 className={cn(
														"text-2xl font-bold mb-2 transition-colors duration-300",
														isPopular ? "text-blue-600" : "text-gray-900"
													)}>
														{plan.name}
													</h3>
													<p className="text-gray-600 text-sm">
														{spotlight}
													</p>
												</div>
>>>>>>> origin/main

												{/* Price */}
												<div className="mb-6">
													{plan.id === 'ENTERPRISE' ? (
<<<<<<< HEAD
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
=======
														<div className="mb-4">
															<motion.span 
																className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
																whileHover={{ scale: 1.05 }}
															>
																Custom
															</motion.span>
															<span className="text-gray-600 block text-sm">
																pricing
															</span>
														</div>
													) : (
														<div className="mb-4">
															<div className="flex items-center justify-center gap-2">
																<AnimatePresence mode="wait">
																	<motion.span 
																		key={billingPeriod}
																		className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
																		initial={{ opacity: 0, y: -10 }}
																		animate={{ opacity: 1, y: 0 }}
																		exit={{ opacity: 0, y: 10 }}
																		transition={{ duration: 0.2 }}
																	>
																		${price}
																	</motion.span>
																</AnimatePresence>
																<span className="text-gray-600">
>>>>>>> origin/main
																	/{billingPeriod === 'ANNUAL' ? 'year' : 'month'}
																</span>
															</div>
															{billingPeriod === 'ANNUAL' && plan.ANNUALPrice && (
<<<<<<< HEAD
																<div className="text-xs sm:text-sm text-gray-500 mt-1">
																	<span className="line-through">${originalPrice}/month</span>
																	<span className="ml-2 text-green-600">Save 20%</span>
=======
																<div className="text-sm text-gray-500">
																	<span className="line-through">${originalPrice}/month</span>
																	<span className="ml-2 text-green-600 font-medium">Save 20%</span>
>>>>>>> origin/main
																</div>
															)}
														</div>
													)}
												</div>

<<<<<<< HEAD
=======
												{/* Property & Tenant Limits */}
												{plan.id !== 'ENTERPRISE' && (
													<div className="mb-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
														<div className="flex gap-4 justify-center">
															<div className="text-center">
																<div className="flex items-center gap-1 text-sm text-gray-600">
																	<Building2 className="w-4 h-4" />
																	<span>{plan.propertyLimit} Properties</span>
																</div>
															</div>
															<div className="text-center">
																<div className="flex items-center gap-1 text-sm text-gray-600">
																	<User className="w-4 h-4" />
																	<span>{plan.tenantLimit} Tenants</span>
																</div>
															</div>
														</div>
													</div>
												)}
>>>>>>> origin/main

												{/* Features */}
												<div className="mb-6 sm:mb-8 space-y-2 flex-grow">
													{(plan.features || [])
														.slice(0, 6)
														.map((feature, idx) => (
															<motion.div
																key={idx}
<<<<<<< HEAD
																className="flex items-start gap-2 text-xs sm:text-sm text-gray-600"
															>
																<CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 text-gray-400 mt-0.5" />
																<span>{feature}</span>
															</div>
=======
																className="flex items-center gap-2 text-sm text-gray-600"
																initial={{ opacity: 0, x: -10 }}
																whileInView={{ opacity: 1, x: 0 }}
																transition={{ duration: 0.3, delay: idx * 0.1 }}
															>
																<CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
																{feature}
															</motion.div>
>>>>>>> origin/main
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
<<<<<<< HEAD
						</div>

=======
						</motion.div>

						{/* Popular Plan Callout */}
						<motion.div
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.8, delay: 0.4 }}
							className="mt-16 text-center"
						>
							<div className="border border-gray-200 rounded-xl p-8 max-w-3xl mx-auto bg-white">
								<div className="flex items-center justify-center gap-2 mb-4">
									<Star className="w-5 h-5 text-yellow-500 fill-current" />
									<span className="text-gray-900 font-medium">Most Popular Choice</span>
									<Star className="w-5 h-5 text-yellow-500 fill-current" />
								</div>
								<p className="text-gray-700 text-lg mb-6">
									Over 70% of our customers choose the <strong>Growth plan</strong> for its perfect balance of features and value.
								</p>
								<div className="flex flex-col sm:flex-row gap-4 justify-center">
									<CheckoutButton
										planType="GROWTH"
										billingInterval={billingPeriod === 'ANNUAL' ? 'annual' : 'monthly'}
										onSuccess={handleSubscriptionSuccess}
										className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 transition-all duration-300 px-8 py-3"
									>
										Try Growth Plan
										<ArrowRight className="ml-2 h-4 w-4" />
									</CheckoutButton>
									<Button
										variant="outline"
										size="lg"
										className="border-green-500 text-green-600 hover:bg-green-50 transition-all duration-300"
										onClick={() => handleGetStarted('FREE')}
									>
										Start with Free Trial
									</Button>
								</div>
							</div>
						</motion.div>
>>>>>>> origin/main
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
<<<<<<< HEAD
									<h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">
										{faq.question}
									</h3>
									<p className="text-sm sm:text-base text-gray-600 leading-relaxed">
										{faq.answer}
=======
									<Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white/80 backdrop-blur-sm hover:bg-white hover:-translate-y-1">
										<CardContent className="p-8">
											<h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors duration-300">
												{faq.question}
											</h3>
											<p className="text-gray-600 leading-relaxed">
												{faq.answer}
											</p>
										</CardContent>
									</Card>
								</motion.div>
							))}
						</motion.div>

						{/* Contact Support */}
						<motion.div
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.8, delay: 0.6 }}
							className="mt-20 text-center"
						>
							<div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-12 relative overflow-hidden">
								{/* Background decoration */}
								<div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23dbeafe%22 fill-opacity=%220.4%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
								
								<div className="relative z-10">
									<motion.div 
										className="bg-gradient-to-br from-blue-500 to-indigo-600 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6"
										whileHover={{ scale: 1.1, rotate: 5 }}
										transition={{ type: "spring", stiffness: 300 }}
									>
										<Users className="h-8 w-8 text-white" />
									</motion.div>
									<h3 className="text-2xl font-bold text-gray-900 mb-4">
										Still have questions?
									</h3>
									<p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
										Our team is here to help you find the perfect plan for your property management needs. Get personalized recommendations.
>>>>>>> origin/main
									</p>
									<div className="flex flex-col sm:flex-row gap-4 justify-center">
										<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
											<Button
												size="lg"
												className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
												onClick={() =>
													window.open(
														'mailto:support@tenantflow.app?subject=Pricing Question',
														'_blank'
													)
												}
											>
												Contact Support
												<ArrowRight className="ml-2 h-4 w-4" />
											</Button>
										</motion.div>
										<Link to="/auth/signup">
											<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
												<Button
													variant="outline"
													size="lg"
													className="border-blue-300 text-blue-600 hover:bg-blue-50 transition-all duration-300"
												>
													Start Free Trial
												</Button>
											</motion.div>
										</Link>
									</div>
								</div>
<<<<<<< HEAD
							))}
						</div>
=======
							</div>
						</motion.div>

						{/* Final CTA Section */}
						<motion.div
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.8, delay: 0.7 }}
							className="mt-20"
						>
							<div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-12 text-center text-white relative overflow-hidden">
								{/* Background pattern */}
								<div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.1%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
								
								<div className="relative z-10 max-w-3xl mx-auto">
									<motion.div
										whileHover={{ scale: 1.05 }}
										transition={{ type: "spring", stiffness: 300 }}
										className="mb-6"
									>
										<Clock className="w-16 h-16 mx-auto mb-4 text-blue-200" />
									</motion.div>
									<h3 className="text-3xl font-bold mb-4">
										Ready to streamline your property management?
									</h3>
									<p className="text-xl text-blue-100 mb-8 leading-relaxed">
										Join thousands of property owners who've simplified their workflow with TenantFlow.
										Start your free trial today – no credit card required.
									</p>
									<div className="flex flex-col sm:flex-row gap-4 justify-center">
										<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
											<Button
												size="lg"
												className="bg-white text-blue-600 hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold px-8"
												onClick={() => handleGetStarted('FREE')}
											>
												Start Your Free Trial
												<ArrowRight className="ml-2 h-5 w-5" />
											</Button>
										</motion.div>
										<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
											<Button
												variant="outline"
												size="lg"
												className="border-white/30 text-white hover:bg-white/10 transition-all duration-300 font-semibold px-8"
												onClick={() => 
													window.open(
														'mailto:sales@tenantflow.app?subject=Demo Request',
														'_blank'
													)
												}
											>
												Schedule Demo
											</Button>
										</motion.div>
									</div>
								</div>
							</div>
						</motion.div>
>>>>>>> origin/main
					</div>
				</section>
			</div>
		</>
	)
}
