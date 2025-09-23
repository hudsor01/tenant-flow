'use client'

import Footer from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createCheckoutSession } from '@/lib/stripe-client'
import { ArrowRight, Check } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

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
			monthly: process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY,
			yearly: process.env.NEXT_PUBLIC_STRIPE_STARTER_YEARLY
		},
		growth: {
			monthly: process.env.NEXT_PUBLIC_STRIPE_GROWTH_MONTHLY,
			yearly: process.env.NEXT_PUBLIC_STRIPE_GROWTH_YEARLY
		},
		max: {
			monthly: process.env.NEXT_PUBLIC_STRIPE_MAX_MONTHLY,
			yearly: process.env.NEXT_PUBLIC_STRIPE_MAX_YEARLY
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
		<div className="min-h-screen bg-white">
			{/* Navigation */}
			<nav className="fixed top-4 left-1/2 z-50 w-auto -translate-x-1/2 transform rounded-full px-6 py-3 backdrop-blur-xl border border-gray-200 shadow-lg bg-white/80">
				<div className="flex items-center justify-between gap-8">
					<Link
						href="/"
						className="flex items-center space-x-3 hover:opacity-80 transition-opacity duration-200"
					>
						<div className="w-8 h-8 rounded-lg overflow-hidden bg-blue-600 border border-gray-200 flex items-center justify-center">
							<svg
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								className="w-5 h-5 text-white"
							>
								<path
									d="M3 21L21 21M5 21V7L12 3L19 7V21M9 12H15M9 16H15"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</div>
						<span className="text-xl font-bold text-gray-900 tracking-tight">
							TenantFlow
						</span>
					</Link>

					<div className="hidden md:flex items-center space-x-1">
						<Link
							href="/"
							className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium text-sm rounded-xl hover:bg-gray-50 transition-all duration-200"
						>
							Home
						</Link>
						<Link
							href="/faq"
							className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium text-sm rounded-xl hover:bg-gray-50 transition-all duration-200"
						>
							FAQ
						</Link>
					</div>

					<div className="flex items-center space-x-3">
						<Link
							href="/login"
							className="hidden sm:flex px-4 py-2 text-gray-900 hover:text-gray-900 rounded-xl hover:bg-gray-50 transition-all duration-300 font-medium"
						>
							Sign In
						</Link>
						<Link
							href="/login"
							className="flex items-center px-6 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
						>
							Get Started
							<ArrowRight className="ml-2 h-4 w-4" />
						</Link>
					</div>
				</div>
			</nav>

			{/* Main Content */}
			<div className="pt-32 pb-24 px-4">
				<div className="max-w-6xl mx-auto">
					{/* Header */}
					<div className="text-center mb-16">
						<div className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-blue-200 bg-blue-50 mb-8">
							<div className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse" />
							<span className="text-gray-700 font-medium text-sm">
								Trusted by 10,000+ property managers
							</span>
						</div>

						<h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 tracking-tight leading-tight">
							Simple pricing for
							<span className="block text-blue-600">every business</span>
						</h1>

						<p className="text-xl text-gray-700 mb-8 leading-relaxed max-w-2xl mx-auto">
							Professional property managers increase NOI by 40% with
							TenantFlow's enterprise-grade automation and analytics.
						</p>

						{/* Billing Toggle */}
						<div className="flex items-center justify-center gap-4 mb-12">
							<span
								className={`text-sm font-medium ${!isYearly ? 'text-gray-900' : 'text-gray-500'}`}
							>
								Monthly
							</span>
							<button
								onClick={() => setIsYearly(!isYearly)}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
									isYearly ? 'bg-blue-600' : 'bg-gray-300'
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										isYearly ? 'translate-x-6' : 'translate-x-1'
									}`}
								/>
							</button>
							<span
								className={`text-sm font-medium ${isYearly ? 'text-gray-900' : 'text-gray-500'}`}
							>
								Yearly
								<span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
									Save 17%
								</span>
							</span>
						</div>
					</div>

					{/* Pricing Cards */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
						{pricingPlans.map(plan => (
							<Card
								key={plan.id}
								className={`relative bg-white border-2 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 ${
									plan.popular ? 'border-blue-500 scale-105' : 'border-gray-200'
								}`}
							>
								{plan.popular && (
									<div className="absolute -top-4 left-1/2 -translate-x-1/2">
										<span className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
											Most Popular
										</span>
									</div>
								)}

								<CardHeader className="p-8 pb-4">
									<CardTitle className="text-2xl font-bold text-gray-900 mb-2">
										{plan.name}
									</CardTitle>
									<div className="mb-4">
										<span className="text-4xl font-bold text-gray-900">
											${isYearly ? plan.price.yearly : plan.price.monthly}
										</span>
										<span className="text-gray-600 ml-1">
											/{isYearly ? 'year' : 'month'}
										</span>
									</div>
									<p className="text-gray-600">{plan.description}</p>
								</CardHeader>

								<CardContent className="p-8 pt-4">
									<ul className="space-y-4">
										{plan.features.map((feature, index) => (
											<li key={index} className="flex items-center gap-3">
												<div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
													<Check className="w-3 h-3 text-blue-600" />
												</div>
												<span className="text-gray-700">{feature}</span>
											</li>
										))}
									</ul>

									<Button
										onClick={() => handleSelectPlan(plan.id)}
										className={`w-full mt-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
											plan.popular
												? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
												: 'bg-gray-100 hover:bg-gray-200 text-gray-900 border-2 border-gray-200 hover:border-gray-300'
										}`}
									>
										{plan.id === 'max' ? 'Contact Sales' : 'Get Started'}
										<ArrowRight className="ml-2 h-4 w-4" />
									</Button>
								</CardContent>
							</Card>
						))}
					</div>

					{/* Bottom CTA */}
					<div className="text-center">
						<p className="text-gray-600 mb-2">Questions about our plans?</p>
						<Button
							variant="ghost"
							className="text-blue-600 hover:text-blue-700 font-medium"
							onClick={() => router.push('/contact')}
						>
							Contact our sales team →
						</Button>
					</div>
				</div>
			</div>

			<Footer />
		</div>
	)
}
