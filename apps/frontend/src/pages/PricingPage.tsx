import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { usePostHog } from 'posthog-js/react'
import { useFacebookPixel } from '@/hooks/useFacebookPixel'
import { useGTM } from '@/hooks/useGTM'
import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	Check,
	Building,
	FileText,
	Zap,
	ArrowRight,
	Crown
} from 'lucide-react'
import SubscriptionModal from '@/components/billing/SubscriptionModal'
import {
	PLANS
} from '@/types/subscription'
import { SEO } from '@/components/seo/SEO'
import { generatePricingSEO } from '@/lib/seo-utils'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { Navigation } from '@/components/layout/Navigation'

// Convert centralized PLANS to PricingPage format
const convertToPricingPlan = (plan: (typeof PLANS)[0]): PricingPlan => ({
	id: plan.id,
	name: plan.name,
	description: plan.description,
	monthlyPrice: plan.monthlyPrice,
	annualPrice: plan.annualPrice,
	features: plan.features,
	limits: {
		properties: plan.limits.properties,
		tenants: plan.limits.tenants,
		storage:
			typeof plan.limits.storage === 'number'
				? `${plan.limits.storage}MB`
				: String(plan.limits.storage),
		support:
			plan.id === 'freeTrial'
				? 'Community forum'
				: plan.id === 'starter'
					? 'Email support'
					: plan.id === 'growth'
						? 'Priority email & chat'
						: 'Dedicated success manager'
	},
	popular: plan.id === 'starter',
	cta:
		plan.id === 'freeTrial'
			? 'Start Free Trial'
			: plan.id === 'enterprise'
				? 'Contact Sales'
				: 'Start 14-Day Free Trial',
	ctaVariant:
		plan.id === 'freeTrial'
			? 'outline'
			: plan.id === 'enterprise'
				? 'secondary'
				: 'default'
})

interface PricingPlan {
	id: string
	name: string
	description: string
	monthlyPrice: number
	annualPrice: number
	features: string[]
	limits: {
		properties: number | 'unlimited'
		tenants: number | 'unlimited'
		storage: string
		support: string
	}
	popular?: boolean
	cta: string
	ctaVariant?: 'default' | 'outline' | 'secondary'
}

// Use centralized pricing data
const pricingPlans: PricingPlan[] = PLANS.map(convertToPricingPlan)

const fadeInUp = {
	initial: { opacity: 0, y: 20 },
	animate: { opacity: 1, y: 0 },
	transition: { duration: 0.6 }
}

const staggerChildren = {
	animate: {
		transition: {
			staggerChildren: 0.1
		}
	}
}

export default function PricingPage() {
	const [billingPeriod] = useState<'monthly' | 'annual'>(
		'monthly'
	)
	const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
	const [selectedPackage] = useState<string | null>(
		'growth'
	) // Default to popular plan
	const [isModalOpen, setIsModalOpen] = useState(false)
	const posthog = usePostHog()
	const facebookPixel = useFacebookPixel()
	const gtm = useGTM()

	// Generate optimized SEO data
	const seoData = generatePricingSEO()

	// Track pricing page view
	useEffect(() => {
		posthog?.capture('pricing_page_viewed', {
			default_billing_period: billingPeriod,
			default_selected_package: selectedPackage,
			timestamp: new Date().toISOString()
		})

		// Track pricing page view in Facebook Pixel
		facebookPixel.trackPricingPageView(
			selectedPackage || undefined,
			billingPeriod
		)

		// Track pricing page view in GTM
		gtm.trackPageView('/pricing', 'Pricing Page')
	}, [posthog, facebookPixel, gtm, billingPeriod, selectedPackage])

	const handleSubscribe = (planId: string) => {
		const plan = PLANS.find(p => p.id === planId)
		const price =
			billingPeriod === 'monthly' ? plan?.monthlyPrice : plan?.annualPrice

		posthog?.capture('pricing_plan_subscribe_clicked', {
			plan_id: planId,
			billing_period: billingPeriod,
			timestamp: new Date().toISOString()
		})

		// Track subscription initiation in Facebook Pixel
		if (plan && price) {
			facebookPixel.trackInitiateCheckout(price, 'USD', [planId])
			facebookPixel.trackPlanSelection(
				planId,
				plan.name,
				price,
				billingPeriod
			)
		}

		setSelectedPlan(planId)
		setIsModalOpen(true)
	}

	return (
		<>
			<SEO
				title={seoData.title}
				description={seoData.description}
				keywords={seoData.keywords}
				canonical={seoData.canonical}
				structuredData={seoData.structuredData}
				breadcrumbs={seoData.breadcrumbs}
			/>

			<div className="from-background via-background to-primary/5 min-h-screen bg-gradient-to-br">
				{/* Enhanced Navigation */}
				<Navigation variant="public" />

				{/* Breadcrumbs Section */}
				<div className="border-b border-border/50 bg-background/50 backdrop-blur-sm">
					<div className="container mx-auto px-4 py-4">
						<Breadcrumbs
							items={seoData.breadcrumbs!}
							className=""
						/>
					</div>
				</div>

				{/* Modern Pricing Hero */}
				<section className="px-8 py-32 bg-gradient-to-br from-background via-background to-primary/5">
					<div className="container mx-auto text-center">
						<motion.div {...fadeInUp}>
							<h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
								TenantFlow Pricing
							</h1>
							<p className="mx-auto mb-10 text-lg md:text-xl text-muted-foreground">
								Simple, transparent plans for every property manager. No hidden fees. Start free, upgrade as you grow.
							</p>
							<span className="inline-block rounded-full bg-primary/10 px-4 py-2 text-primary font-medium text-base mb-8">
								14-Day Free Trial • No Credit Card Required
							</span>
						</motion.div>
					</div>
				</section>

				{/* Modern Pricing Cards */}
				<section className="px-8 py-24">
					<div className="container mx-auto">
						<div className="mx-auto grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
							{pricingPlans.map(plan => (
								<motion.div
									key={plan.id}
									className={`rounded-2xl border border-border bg-white dark:bg-card shadow-lg flex flex-col items-center p-8 relative transition-all duration-300 hover:shadow-xl ${plan.popular ? 'ring-2 ring-primary/50 scale-[1.02] shadow-primary/10' : ''
										} ${plan.id === 'enterprise' ? 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20' : ''}`}
									whileHover={{ y: -4 }}
									transition={{ duration: 0.2 }}
								>
									{plan.popular && (
										<span className="mb-4 rounded-full bg-primary px-4 py-1 text-sm font-semibold text-white shadow">
											Most Popular
										</span>
									)}
									<h2 className="mb-2 text-2xl font-bold">{plan.name}</h2>
									<p className="mb-4 text-muted-foreground text-base">{plan.description}</p>
									<div className="mb-6 flex flex-col items-center">
										{plan.id === 'enterprise' ? (
											<>
												<span className="text-4xl font-extrabold text-primary">
													Custom
												</span>
												<span className="text-sm text-muted-foreground">pricing</span>
												<span className="text-xs text-muted-foreground mt-1">
													Starting at ${plan.monthlyPrice}/month
												</span>
											</>
										) : (
											<>
												<span className="text-4xl font-extrabold text-primary">
													${plan.monthlyPrice}
												</span>
												<span className="text-sm text-muted-foreground">/month</span>
												<span className="text-xs text-muted-foreground mt-1">
													or ${plan.annualPrice} billed yearly
												</span>
											</>
										)}
									</div>
									<ul className="mb-8 w-full space-y-2 text-left">
										{plan.features.slice(0, 6).map((feature, idx) => (
											<li key={idx} className="flex items-center text-sm">
												<Check className="mr-2 h-4 w-4 text-primary" />
												{feature}
											</li>
										))}
										{plan.features.length > 6 && (
											<li className="text-xs text-muted-foreground pl-6">...and more</li>
										)}
									</ul>
									{plan.id === 'enterprise' ? (
										<Button
											variant="default"
											size="lg"
											className="w-full mt-auto bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-lg"
											onClick={() => window.open('mailto:sales@tenantflow.app?subject=Enterprise Plan Inquiry', '_blank')}
										>
											<Crown className="mr-2 h-4 w-4" />
											{plan.cta}
										</Button>
									) : (
										<Button
											variant={plan.popular ? 'default' : 'outline'}
											size="lg"
											className="w-full mt-auto"
											onClick={() => handleSubscribe(plan.id)}
										>
											<Zap className="mr-2 h-4 w-4" />
											{plan.cta}
										</Button>
									)}
								</motion.div>
							))}
						</div>
					</div>
				</section>

				{/* Pricing Info Section */}
				<section className="px-4 py-12">
					<div className="container mx-auto">
						<h2 className="mb-4 text-2xl font-bold text-center">
							Everything you need to know about TenantFlow pricing and plans.
						</h2>
					</div>
				</section>

				{/* FAQ Section */}
				<section className="bg-muted/30 px-4 py-20">
					<div className="container mx-auto">
						<motion.div className="mb-12 text-center" {...fadeInUp}>
							<h2 className="mb-4 text-3xl font-bold">
								Frequently Asked Questions
							</h2>
						</motion.div>

						<motion.div
							className="mx-auto grid gap-8 md:grid-cols-2"
							variants={staggerChildren}
							initial="initial"
							animate="animate"
						>
							{[
								{
									question: 'Can I change plans anytime?',
									answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate your billing accordingly."
								},
								{
									question:
										'What happens if I exceed my plan limits?',
									answer: "We'll notify you when you approach your limits. You can upgrade to a higher plan or we'll help you optimize your usage."
								},
								{
									question: 'Is there a setup fee?',
									answer: 'No setup fees, ever. You only pay the monthly or annual subscription fee for your chosen plan.'
								},
								{
									question: 'Can I cancel anytime?',
									answer: 'Absolutely. You can cancel your subscription at any time. Your account will remain active until the end of your billing period.'
								},
								{
									question: 'Do you offer refunds?',
									answer: "We offer a 30-day money-back guarantee for all paid plans. If you're not satisfied, we'll refund your payment."
								},
								{
									question:
										'What payment methods do you accept?',
									answer: 'We accept all major credit cards (Visa, MasterCard, American Express) and bank transfers for annual plans.'
								}
							].map((faq, index) => (
								<motion.div key={index} variants={fadeInUp}>
									<Card>
										<CardHeader>
											<CardTitle className="text-lg">
												{faq.question}
											</CardTitle>
										</CardHeader>
										<CardContent>
											<p className="text-muted-foreground">
												{faq.answer}
											</p>
										</CardContent>
									</Card>
								</motion.div>
							))}
						</motion.div>
					</div>
				</section>

				{/* Trust Statement Section */}
				<section className="px-4 py-12">
					<div className="container mx-auto">
						<h2 className="mb-8 text-xl font-semibold text-center text-muted-foreground">
							Join thousands of property managers who trust TenantFlow to streamline their operations.
						</h2>
					</div>
				</section>

				{/* CTA Section */}
				<section className="px-4 py-20">
					<div className="container mx-auto text-center">
						<motion.div {...fadeInUp}>
							<h2 className="mb-4 text-3xl font-bold">
								Ready to Get Started?
							</h2>
						</motion.div>
						<motion.div {...fadeInUp}>
							<div className="flex flex-col justify-center gap-4 sm:flex-row">
								<Link to="/auth/Signup">
									<Button size="lg" className="px-8 text-lg">
										<Building className="mr-2 h-5 w-5" />
										Start Free Trial
									</Button>
								</Link>
								<Link to="/tools/lease-generator">
									<Button
										variant="outline"
										size="lg"
										className="px-8 text-lg"
									>
										<FileText className="mr-2 h-5 w-5" />
										Try Lease Generator
									</Button>
								</Link>
							</div>
							<p className="text-muted-foreground mt-4 text-sm">
								No credit card required • 14-day free trial •
								Cancel anytime
							</p>
						</motion.div>
					</div>
				</section>

				{/* Features Comparison Table (Optional) */}
				<section className="bg-muted/30 px-4 py-20">
					<div className="container mx-auto">
						<motion.div className="mb-12 text-center" {...fadeInUp}>
							<h2 className="mb-4 text-3xl font-bold">
								Compare All Features
							</h2>
							<p className="text-muted-foreground">
								See exactly what's included in each plan
							</p>
						</motion.div>

						<motion.div className="text-center" {...fadeInUp}>
							<Button variant="outline">
								View Full Feature Comparison
								<ArrowRight className="ml-2 h-4 w-4" />
							</Button>
						</motion.div>
					</div>
				</section>

				{/* Subscription Modal */}
				{selectedPlan && (
					<SubscriptionModal
						isOpen={isModalOpen}
						onOpenChange={setIsModalOpen}
						planId={selectedPlan}
						billingPeriod={billingPeriod}
					/>
				)}
			</div>
		</>
	)
}
