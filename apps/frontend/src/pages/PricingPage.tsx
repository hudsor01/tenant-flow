import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Box, Flex, Grid, Section } from '@radix-ui/themes'
import { usePostHog } from 'posthog-js/react'
import { Button } from '@/components/ui/button'
import { Sparkles, CheckCircle2, TrendingUp, Target } from 'lucide-react'
import SubscriptionModal from '@/components/modals/SubscriptionModal'
import { PLANS, type Plan } from '@/types/subscription'
import type { PlanType } from '@/types/prisma-types'
import { SEO } from '@/components/seo/SEO'
import { generatePricingSEO } from '@/lib/seo-utils'
import { cn } from '@/lib/utils'
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
	// Modal state
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [selectedPlanForStripe, setSelectedPlanForStripe] =
		useState<Plan | null>(null)

	// Billing period state - simplified for MVP, only monthly for now
	const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>(
		'monthly'
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

	const handleSubscribe = (planId: string) => {
		const plan = PLANS.find(p => p.id === planId)
		posthog?.capture('pricing_plan_subscribe_clicked', {
			plan_id: planId,
			timestamp: new Date().toISOString()
		})

		if (plan) {
			// For all plans, use the subscription modal
			setSelectedPlanForStripe(plan)
			setIsModalOpen(true)
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

			<Box className="bg-gradient-mesh min-h-screen">
				<Navigation context="public" />

				{/* Hero Section */}
				<Section className="section-spacing bg-gradient-steel-subtle relative">
					<div className="container mx-auto max-w-7xl px-6 lg:px-8">
						<Box className="text-center">
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.6 }}
								className="mb-8 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-400"
							>
								<Sparkles className="h-4 w-4" />
								14-Day Free Trial • No Credit Card Required
							</motion.div>

							<motion.h1
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.6, delay: 0.1 }}
								className="text-display text-foreground mb-6"
							>
								Simple, Transparent
							</motion.h1>
							<motion.h1
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.6, delay: 0.2 }}
								className="text-display text-gradient-brand-hero mb-6"
							>
								Pricing for Everyone
							</motion.h1>

							<motion.p
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.6, delay: 0.3 }}
								className="text-body-large mx-auto mb-12 max-w-3xl"
							>
								Choose the perfect plan for your property
								management needs. Start free, upgrade when you
								grow, and only pay for what you use.
							</motion.p>

							{/* Billing Toggle */}
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.6, delay: 0.4 }}
								className="mb-16 flex flex-col items-center gap-4"
							>
								<Flex className="border-border bg-card/50 rounded-full border p-1 backdrop-blur-sm">
									<button
										onClick={() =>
											setBillingPeriod('monthly')
										}
										className={cn(
											'rounded-full px-6 py-2 text-sm font-semibold transition-all duration-200',
											billingPeriod === 'monthly'
												? 'bg-cyan-500 text-white shadow-lg'
												: 'text-muted-foreground hover:text-foreground'
										)}
									>
										Monthly
									</button>
									<button
										onClick={() =>
											setBillingPeriod('annual')
										}
										className={cn(
											'rounded-full px-6 py-2 text-sm font-semibold transition-all duration-200',
											billingPeriod === 'annual'
												? 'bg-cyan-500 text-white shadow-lg'
												: 'text-muted-foreground hover:text-foreground'
										)}
									>
										Annual
										<span
											className={cn(
												'ml-1.5 text-xs font-medium',
												billingPeriod === 'annual'
													? 'text-white'
													: 'text-muted-foreground/50'
											)}
										>
											Save up to 20%
										</span>
									</button>
								</Flex>
							</motion.div>
						</Box>
					</div>
				</Section>

				{/* Pricing Cards */}
				<Section className="pb-24">
					<div className="container mx-auto max-w-7xl px-6 lg:px-8">
						<Grid
							columns={{ initial: '1', md: '2', lg: '4' }}
							gap="6"
						>
							{enhancedPlans.map(enhancedPlan => {
								const { plan, isPopular, badge, spotlight } =
									enhancedPlan
								const price = plan.price

								return (
									<motion.div
										key={plan.id}
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{
											duration: 0.5,
											delay:
												0.5 + enhancedPlan.plan.id ===
												'GROWTH'
													? 0.1
													: 0
										}}
										className={cn(
											'card-modern from-card to-card/80 relative h-full bg-gradient-to-br backdrop-blur-sm transition-all duration-300',
											isPopular
												? 'border-primary cta-glow scale-105 transform shadow-xl'
												: 'card-accent-border shadow-lg hover:shadow-xl'
										)}
									>
										{/* Badge */}
										{badge && (
											<div
												className={cn(
													'absolute -top-3 left-1/2 -translate-x-1/2 transform rounded-full px-3 py-1 text-xs font-semibold',
													isPopular
														? 'bg-gradient-primary text-primary-foreground shadow-lg'
														: 'bg-gradient-success text-white shadow-lg'
												)}
											>
												{badge}
											</div>
										)}

										<div className="p-6">
											{/* Header */}
											<div className="mb-6 text-center">
												<h3 className="text-foreground mb-2 text-xl font-semibold">
													{plan.name}
												</h3>
												<p className="text-caption">
													{spotlight}
												</p>
											</div>

											{/* Price */}
											<div className="mb-6 text-center">
												{plan.id === 'ENTERPRISE' ? (
													<div className="mb-4">
														<span className="text-foreground text-3xl font-bold">
															Custom
														</span>
														<span className="text-caption block">
															pricing
														</span>
													</div>
												) : (
													<div className="mb-4">
														<span className="text-gradient-brand text-4xl font-bold">
															${price}
														</span>
														<span className="text-caption">
															/month
														</span>
													</div>
												)}
											</div>

											{/* Description */}
											<p className="text-muted-foreground mb-6 text-center text-sm">
												{plan.description}
											</p>

											{/* Features */}
											<div className="mb-8 space-y-3">
												{(plan.features || [])
													.slice(0, 5)
													.map((feature, idx) => (
														<div
															key={idx}
															className="text-muted-foreground flex items-center gap-2 text-sm"
														>
															<CheckCircle2 className="h-4 w-4 flex-shrink-0 text-cyan-400" />
															{feature}
														</div>
													))}
											</div>

											{/* CTA Button */}
											<div className="mt-auto">
												{plan.id === 'ENTERPRISE' ? (
													<Button
														variant="steel"
														size="lg"
														className="w-full text-white"
														onClick={() =>
															window.open(
																'mailto:sales@tenantflow.app?subject=Enterprise Plan Inquiry',
																'_blank'
															)
														}
													>
														Contact Sales
													</Button>
												) : (
													<Button
														variant={
															isPopular
																? 'cta'
																: 'steel'
														}
														size="lg"
														className={cn(
															'w-full text-white',
															isPopular
																? 'cta-glow cta-magnetic'
																: 'cta-magnetic'
														)}
														onClick={() =>
															handleSubscribe(
																plan.id
															)
														}
													>
														{plan.id === 'FREE'
															? 'Start Free Trial'
															: 'Get Started'}
													</Button>
												)}
											</div>
										</div>
									</motion.div>
								)
							})}
						</Grid>
					</div>
				</Section>

				{/* FAQ Section */}
				<Section className="pb-24">
					<div className="container mx-auto max-w-7xl px-6 lg:px-8">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6 }}
							className="mb-16 text-center"
						>
							<h2 className="text-heading mb-4">
								Frequently Asked Questions
							</h2>
							<p className="text-body-large mx-auto max-w-3xl">
								Get answers to common questions about our
								pricing and plans.
							</p>
						</motion.div>

						<Grid
							columns={{ initial: '1', md: '2' }}
							gap="8"
							className="mx-auto max-w-4xl"
						>
							{[
								{
									question:
										'Can I change my plan at any time?',
									answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and billing is prorated.'
								},
								{
									question:
										'What happens during the free trial?',
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
									question:
										'Do you offer discounts for annual plans?',
									answer: 'Yes! Annual plans save you up to 20% compared to monthly billing. The savings are automatically applied.'
								},
								{
									question: 'Is my data secure?',
									answer: 'Absolutely. We use bank-level encryption, secure cloud infrastructure, and comply with industry security standards.'
								}
							].map((faq, index) => (
								<motion.div
									key={index}
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{
										duration: 0.5,
										delay: index * 0.1
									}}
									className="card-modern from-card to-card/80 card-accent-border rounded-xl bg-gradient-to-br p-6 backdrop-blur-sm transition-all duration-300"
								>
									<h3 className="text-foreground mb-3 text-lg font-semibold">
										{faq.question}
									</h3>
									<p className="text-body leading-relaxed">
										{faq.answer}
									</p>
								</motion.div>
							))}
						</Grid>

						{/* Contact Support */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.8 }}
							className="mt-16 text-center"
						>
							<p className="text-muted-foreground mb-4">
								Still have questions? We're here to help.
							</p>
							<Button
								variant="steel"
								size="lg"
								className="text-white"
								onClick={() =>
									window.open(
										'mailto:support@tenantflow.app?subject=Pricing Question',
										'_blank'
									)
								}
							>
								Contact Support
							</Button>
						</motion.div>
					</div>
				</Section>

				{/* Subscription Modal - For Free Trial */}
				{selectedPlanForStripe && (
					<SubscriptionModal
						isOpen={isModalOpen}
						onOpenChange={setIsModalOpen}
						planId={selectedPlanForStripe.id as PlanType}
						billingPeriod={billingPeriod}
					/>
				)}

			</Box>
		</>
	)
}
