import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { usePostHog } from 'posthog-js/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, CheckCircle2, TrendingUp, Target, ArrowRight, Users } from 'lucide-react'
import { Link } from '@tanstack/react-router'
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
	// Billing period state - simplified for MVP, only MONTHLY for now
	const [billingPeriod] = useState<'MONTHLY' | 'ANNUAL'>(
		'MONTHLY'
	)

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
			// Redirect to sign up for paid plans
			window.location.href = '/auth/signup'
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
									<Badge 
										variant="secondary" 
										className="mb-8 bg-blue-500/10 text-blue-200 border-blue-500/20 px-6 py-2 text-sm font-medium backdrop-blur-sm"
									>
										<Sparkles className="w-4 h-4 mr-2" />
										14-Day Free Trial • No Credit Card Required
									</Badge>
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
							</motion.div>
						</div>
						
						{/* Enhanced Bottom Gradient */}
						<div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-50 via-gray-50/80 to-transparent"></div>
					</div>
				</section>

				{/* Pricing Cards */}
				<section className="py-24 bg-gradient-to-b from-gray-50 to-white">
					<div className="container mx-auto px-6">
						<motion.div 
							className="text-center mb-20"
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-100px" }}
							transition={{ duration: 0.8 }}
						>
							<h2 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
								Choose Your{' '}
								<span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
									Perfect Plan
								</span>
							</h2>
							<p className="text-xl lg:text-2xl text-gray-600 max-w-4xl mx-auto font-light leading-relaxed">
								Start with our free trial, then scale as your portfolio grows.
							</p>
						</motion.div>

						<motion.div 
							className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto"
							initial={{ opacity: 0 }}
							whileInView={{ opacity: 1 }}
							viewport={{ once: true }}
							transition={{ duration: 0.8, staggerChildren: 0.1 }}
						>
							{enhancedPlans.map((enhancedPlan, index) => {
								const { plan, isPopular, badge, spotlight, icon: IconComponent } = enhancedPlan
								const price = plan.price

								return (
									<motion.div
										key={plan.id}
										initial={{ opacity: 0, y: 30 }}
										whileInView={{ opacity: 1, y: 0 }}
										viewport={{ once: true }}
										transition={{ duration: 0.6, delay: index * 0.1 }}
									>
										<Card className={cn(
											"group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white/80 backdrop-blur-sm hover:bg-white h-full relative",
											isPopular ? "border-2 border-blue-500 scale-105 hover:-translate-y-2" : "hover:-translate-y-2"
										)}>
											{/* Badge */}
											{badge && (
												<div className={cn(
													"absolute -top-3 left-1/2 -translate-x-1/2 transform rounded-full px-3 py-1 text-xs font-semibold",
													isPopular
														? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
														: "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg"
												)}>
													{badge}
												</div>
											)}

											<CardContent className="p-8 h-full flex flex-col">
												{/* Icon */}
												<div className={cn(
													"w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300",
													isPopular 
														? "bg-gradient-to-br from-blue-500 to-blue-600"
														: "bg-gradient-to-br from-gray-500 to-gray-600"
												)}>
													<IconComponent className="h-8 w-8 text-white" />
												</div>

												{/* Header */}
												<div className="mb-6 text-center">
													<h3 className={cn(
														"text-2xl font-bold mb-2 transition-colors duration-300",
														isPopular ? "text-blue-600 group-hover:text-blue-700" : "text-gray-900 group-hover:text-blue-600"
													)}>
														{plan.name}
													</h3>
													<p className="text-gray-600">
														{spotlight}
													</p>
												</div>

												{/* Price */}
												<div className="mb-6 text-center">
													{plan.id === 'ENTERPRISE' ? (
														<div className="mb-4">
															<span className="text-gray-900 text-3xl font-bold">
																Custom
															</span>
															<span className="text-gray-600 block text-sm">
																pricing
															</span>
														</div>
													) : (
														<div className="mb-4">
															<span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
																${billingPeriod === 'ANNUAL' && plan.ANNUALPrice ? plan.ANNUALPrice : price}
															</span>
															<span className="text-gray-600">
																/{billingPeriod === 'ANNUAL' ? 'year' : 'month'}
															</span>
														</div>
													)}
												</div>

												{/* Description */}
												<p className="text-gray-600 mb-6 text-center text-sm leading-relaxed">
													{plan.description}
												</p>

												{/* Features */}
												<div className="mb-8 space-y-3 flex-grow">
													{(plan.features || [])
														.slice(0, 5)
														.map((feature, idx) => (
															<div
																key={idx}
																className="flex items-center gap-2 text-sm text-gray-600"
															>
																<CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
																{feature}
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
													) : (
														<Button
															size="lg"
															className={cn(
																"w-full font-semibold transition-all duration-300",
																isPopular
																	? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl hover:scale-105"
																	: "bg-gray-900 hover:bg-gray-800 text-white hover:scale-105"
															)}
															onClick={() => handleGetStarted(plan.id)}
														>
															{plan.id === 'FREE' ? 'Start Free Trial' : 'Get Started'}
															<ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
														</Button>
													)}
												</div>
											</CardContent>
										</Card>
									</motion.div>
								)
							})}
						</motion.div>
					</div>
				</section>

				{/* FAQ Section */}
				<section className="py-24 bg-white">
					<div className="container mx-auto px-6">
						<motion.div
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-100px" }}
							transition={{ duration: 0.8 }}
							className="text-center mb-20"
						>
							<h2 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
								Frequently Asked{' '}
								<span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
									Questions
								</span>
							</h2>
							<p className="text-xl lg:text-2xl text-gray-600 max-w-4xl mx-auto font-light leading-relaxed">
								Get answers to common questions about our pricing and plans.
							</p>
						</motion.div>

						<motion.div
							className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto"
							initial={{ opacity: 0 }}
							whileInView={{ opacity: 1 }}
							viewport={{ once: true }}
							transition={{ duration: 0.8, staggerChildren: 0.1 }}
						>
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
								<motion.div
									key={index}
									initial={{ opacity: 0, y: 30 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }}
									transition={{ duration: 0.6, delay: index * 0.1 }}
								>
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
							<div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-12">
								<div className="mb-6">
									<div className="bg-gradient-to-br from-blue-500 to-indigo-600 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6">
										<Users className="h-8 w-8 text-white" />
									</div>
									<h3 className="text-2xl font-bold text-gray-900 mb-4">
										Still have questions?
									</h3>
									<p className="text-gray-600 mb-8 max-w-md mx-auto">
										Our team is here to help you find the perfect plan for your property management needs.
									</p>
								</div>
								<div className="flex flex-col sm:flex-row gap-4 justify-center">
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
									<Link to="/auth/signup">
										<Button
											variant="outline"
											size="lg"
											className="border-blue-300 text-blue-600 hover:bg-blue-50 transition-all duration-300"
										>
											Start Free Trial
										</Button>
									</Link>
								</div>
							</div>
						</motion.div>
					</div>
				</section>
			</div>
		</>
	)
}
