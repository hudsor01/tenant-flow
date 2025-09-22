'use client'

import { Navbar } from '@/components/layout/navbar'
import { BlurFade } from '@/components/magicui/blur-fade'
import { HeroAuthority } from '@/components/marketing/hero-authority'
import Footer from '@/components/layout/footer'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { createCheckoutSession } from '@/lib/stripe-client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

// UI Components

// Icons
import { ArrowRight, Check, Star } from 'lucide-react'

// Design System
import { TYPOGRAPHY_SCALE } from '@repo/shared'

// Pricing Plans Configuration
const pricingPlans = [
	{
		id: 'starter',
		name: 'Starter',
		price: { monthly: 29, yearly: 290 },
		description: 'Perfect for small property managers',
		features: [
			'Up to 5 properties',
			'Professional tenant management',
			'Maintenance tracking',
			'Email support',
			'Mobile app access',
			'Basic reporting'
		],
		popular: false
	},
	{
		id: 'growth',
		name: 'Growth',
		price: { monthly: 79, yearly: 790 },
		description: 'For expanding property portfolios',
		features: [
			'Up to 20 properties',
			'Advanced analytics & insights',
			'Automated workflows',
			'Priority support',
			'API access',
			'Custom branding',
			'Advanced reporting',
			'Maintenance tracking',
			'Document management'
		],
		popular: true
	},
	{
		id: 'max',
		name: 'TenantFlow Max',
		price: { monthly: 299, yearly: 2990 },
		description: 'Enterprise features for serious professionals',
		features: [
			'Unlimited properties',
			'White-label portal',
			'Custom integrations',
			'Dedicated account manager',
			'24/7 priority support',
			'Advanced security features',
			'Custom training',
			'SLA guarantees'
		],
		popular: false
	}
]

export default function PricingPage() {
	const router = useRouter()
	const [isYearly, setIsYearly] = useState(false)

	const priceIds = {
		starter: {
			monthly: process.env.NEXT_PUBLIC_PRICE_STARTER_MONTHLY,
			yearly: process.env.NEXT_PUBLIC_PRICE_STARTER_YEARLY
		},
		growth: {
			monthly: process.env.NEXT_PUBLIC_PRICE_GROWTH_MONTHLY,
			yearly: process.env.NEXT_PUBLIC_PRICE_GROWTH_YEARLY
		},
		max: {
			monthly: process.env.NEXT_PUBLIC_PRICE_MAX_MONTHLY,
			yearly: process.env.NEXT_PUBLIC_PRICE_MAX_YEARLY
		}
	} as const

	const handleSelectPlan = async (planId: string) => {
		const plan = pricingPlans.find(p => p.id === planId)
		if (!plan) return

		if (plan.id === 'enterprise' || plan.id === 'max') {
			toast.info('Connecting you with sales...', {
				description: "We'll help tailor the best plan."
			})
			router.push('/contact?plan=enterprise')
			return
		}

		const key = planId as keyof typeof priceIds
		const priceId = isYearly ? priceIds[key].yearly : priceIds[key].monthly
		if (!priceId) {
			toast.error('Stripe price not configured', {
				description: 'Set NEXT_PUBLIC_PRICE_* env vars.'
			})
			return
		}

		try {
			toast.loading('Redirecting to secure checkout...', { id: 'checkout' })
			const data = await createCheckoutSession({
				priceId,
				planName: plan.name,
				description: plan.description
			})
			toast.dismiss('checkout')
			if (data?.url) {
				window.location.href = data.url
			} else {
				throw new Error('Missing checkout URL')
			}
		} catch (e) {
			toast.error('Checkout failed', {
				description: e instanceof Error ? e.message : 'Unknown error'
			})
		}
	}

	return (
		<main className="min-h-screen bg-background">
			<Navbar />

			{/* Hero Authority Section */}
			<HeroAuthority
				title={<>Choose the perfect plan to scale your business</>}
				subtitle={
					<>
						Professional property managers increase NOI by 40% with TenantFlow's
						enterprise-grade automation, advanced analytics, and scalable
						operations platform.
					</>
				}
				primaryCta={{ label: 'Start Free Trial', href: '/auth/sign-up' }}
				secondaryCta={{ label: 'Contact Sales', href: '/contact' }}
			/>

			<section className="section-content md:py-16 gradient-authority">
				<div className="mx-auto max-w-7xl">
					{/* Header */}
					<BlurFade delay={0.1} inView>
						<div className="mx-auto max-w-4xl space-y-6 text-center mb-16">
							<Badge variant="outline" className="mb-4">
								<Star className="w-3 h-3 mr-1" />
								Trusted by 10,000+ property managers
							</Badge>

							<h1
								className="text-center font-bold tracking-tight leading-tight text-gradient-authority"
								style={TYPOGRAPHY_SCALE['display-lg']}
							>
								Choose the perfect plan to scale your business
							</h1>

							<p
								className="text-muted-foreground leading-relaxed max-w-2xl mx-auto"
								style={TYPOGRAPHY_SCALE['body-lg']}
							>
								Professional property managers increase NOI by 40% with
								TenantFlow's enterprise-grade automation, advanced analytics,
								and scalable operations platform.
							</p>

							{/* Billing Toggle */}
							<div className="flex items-center justify-center gap-4 mt-8">
								<span
									className={`text-sm font-medium ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}
								>
									Monthly
								</span>
								<button
									onClick={() => setIsYearly(!isYearly)}
									className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
										isYearly ? 'bg-primary' : 'bg-muted'
									}`}
								>
									<span
										className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
											isYearly ? 'translate-x-6' : 'translate-x-1'
										}`}
									/>
								</button>
								<span
									className={`text-sm font-medium ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}
								>
									Yearly
									<Badge className="ml-2 bg-accent/10 text-accent text-xs">
										Save 17%
									</Badge>
								</span>
							</div>
						</div>
					</BlurFade>

					{/* Pricing Grid */}
					<BlurFade delay={0.2} inView>
						<div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
							{pricingPlans.map(plan => (
								<Card
									key={plan.id}
									className={`relative flex flex-col ${plan.popular ? 'card-glass-popular' : 'card-glass-premium'}`}
								>
									{plan.popular && (
										<div className="absolute -top-3 left-1/2 -translate-x-1/2">
											<Badge className="bg-primary text-primary-foreground">
												<Star className="w-3 h-3 mr-1" />
												Most Popular
											</Badge>
										</div>
									)}

									<CardHeader>
										<CardTitle className="font-medium">{plan.name}</CardTitle>

										{plan.price ? (
											<div className="space-y-2">
												<div className="flex items-baseline gap-1">
													<span className="text-3xl font-bold">
														${isYearly ? plan.price.yearly : plan.price.monthly}
													</span>
													<span className="text-sm font-normal text-muted-foreground">
														/{isYearly ? 'year' : 'month'}
													</span>
												</div>
												{isYearly && (
													<p className="text-sm text-accent">
														2 months free • $
														{(plan.price.monthly * 12).toFixed(0)} value
													</p>
												)}
											</div>
										) : (
											<span className="text-3xl font-bold">Custom</span>
										)}

										<CardDescription className="text-sm">
											{plan.description}
										</CardDescription>
									</CardHeader>

									<CardContent className="flex-1">
										<hr className="border-dashed mb-6" />

										<ul className="space-y-3 text-sm">
											{plan.features.map((feature, index) => (
												<li key={index} className="flex items-center gap-2">
													<div className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center feature-icon-hover">
														<Check className="w-3 h-3 text-accent transition-colors duration-200" />
													</div>
													<span>{feature}</span>
												</li>
											))}
										</ul>
									</CardContent>

									<CardFooter>
										{plan.popular ? (
											<Button
												variant="primaryGlass"
												className="w-full h-12 text-base font-bold"
											>
												<span className="inline-flex items-center">
													{plan.id === 'enterprise'
														? 'Contact Sales'
														: 'Get Started'}
													<ArrowRight className="w-4 h-4 ml-2" />
												</span>
											</Button>
										) : (
											<Button
												onClick={() => handleSelectPlan(plan.id)}
												variant="outline"
												className="w-full btn-gradient-primary btn-premium-hover"
											>
												{plan.id === 'enterprise'
													? 'Contact Sales'
													: 'Get Started'}
												<ArrowRight className="w-4 h-4 ml-2" />
											</Button>
										)}
									</CardFooter>
								</Card>
							))}
						</div>
					</BlurFade>

					{/* Features Section */}
					<BlurFade delay={0.3} inView>
						<div className="mt-32">
							<div className="text-center mb-12 space-y-4">
								<h2
									className="text-foreground font-bold tracking-tight"
									style={TYPOGRAPHY_SCALE['heading-xl']}
								>
									Proven results that transform property management
								</h2>
								<p
									className="text-muted-foreground leading-relaxed max-w-2xl mx-auto"
									style={TYPOGRAPHY_SCALE['body-lg']}
								>
									Professional property managers use TenantFlow to reduce costs
									by 32%, increase NOI by 40%, and automate 80% of repetitive
									tasks
								</p>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
								<div className="text-center">
									<div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
										<Check className="w-6 h-6 text-primary" />
									</div>
									<h3
										className="font-semibold mb-2 text-foreground"
										style={TYPOGRAPHY_SCALE['heading-sm']}
									>
										Increase NOI by 40% Average
									</h3>
									<p
										className="text-muted-foreground leading-relaxed"
										style={TYPOGRAPHY_SCALE['body-sm']}
									>
										Real-time financial analytics and automated rent
										optimization maximize property returns. ROI in 90 days
										guaranteed.
									</p>
								</div>

								<div className="text-center">
									<div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
										<ArrowRight className="w-6 h-6 text-primary" />
									</div>
									<h3
										className="font-semibold mb-2 text-foreground"
										style={TYPOGRAPHY_SCALE['heading-sm']}
									>
										Automate 80% of Daily Tasks
									</h3>
									<p
										className="text-muted-foreground leading-relaxed"
										style={TYPOGRAPHY_SCALE['body-sm']}
									>
										Smart workflows handle maintenance tracking, lease renewals,
										and tenant communications automatically. Save 20+ hours per
										week.
									</p>
								</div>

								<div className="text-center">
									<div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
										<Star className="w-6 h-6 text-primary" />
									</div>
									<h3
										className="font-semibold mb-2 text-foreground"
										style={TYPOGRAPHY_SCALE['heading-sm']}
									>
										Enterprise Security
									</h3>
									<p
										className="text-muted-foreground leading-relaxed"
										style={TYPOGRAPHY_SCALE['body-sm']}
									>
										Bank-level security with SOC 2 compliance ensures your
										sensitive property and tenant data is always protected.
									</p>
								</div>
							</div>
						</div>
					</BlurFade>

					{/* Bottom CTA */}
					<div className="text-center mt-16">
						<p className="text-sm text-muted-foreground">
							Questions about our plans?{' '}
							<Button
								variant="link"
								className="p-0 h-auto text-sm"
								onClick={() => router.push('/contact')}
							>
								Contact our sales team
							</Button>
						</p>
					</div>
				</div>
			</section>
			<Footer />
		</main>
	)
}
