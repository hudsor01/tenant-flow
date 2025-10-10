'use client'

import { LoadingDots } from '@/components/magicui/loading-spinner'
import { Checkout } from '@/components/pricing/checkout'
import { CardLayout } from '@/components/ui/card-layout'
import { StripeProvider } from '@/components/providers/stripe-provider'
import { ArrowLeft, CheckCircle, Shield, Zap } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const plans = {
	starter: {
		name: 'Starter',
		price: 2900, // $29/month
		priceId: 'price_starter_monthly', // Replace with actual Stripe price ID
		description: 'Perfect for small landlords managing up to 10 properties',
		features: [
			'Up to 10 properties',
			'Unlimited tenants',
			'Basic maintenance tracking',
			'Monthly financial reports',
			'Email support'
		]
	},
	professional: {
		name: 'Professional',
		price: 4900, // $49/month
		priceId: 'price_professional_monthly', // Replace with actual Stripe price ID
		description: 'Ideal for growing property management businesses',
		features: [
			'Up to 50 properties',
			'Unlimited tenants',
			'Advanced maintenance workflows',
			'Real-time analytics',
			'Priority support',
			'API access'
		],
		popular: true
	},
	enterprise: {
		name: 'Enterprise',
		price: 9900, // $99/month
		priceId: 'price_enterprise_monthly', // Replace with actual Stripe price ID
		description: 'For large-scale property management operations',
		features: [
			'Unlimited properties',
			'White-label options',
			'Custom integrations',
			'Dedicated account manager',
			'SLA guarantee',
			'Advanced reporting'
		]
	}
}

function CheckoutPageContent() {
	const searchParams = useSearchParams()
	const planId = searchParams.get('plan') || 'professional'
	const plan = plans[planId as keyof typeof plans] || plans.professional

	const formatCurrency = (cents: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(cents / 100)
	}

	// Note: Stripe embedded checkout handles success/error redirects automatically

	return (
		<main className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
			{/* Clean header */}
			<div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<Link
							href="/pricing"
							className="flex items-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
						>
							<ArrowLeft className="w-4 h-4 mr-2" />
							Back to pricing
						</Link>
						<div className="flex items-center gap-2">
							<Shield className="w-4 h-4 text-[var(--color-success)]" />
							<span className="text-sm text-[var(--color-text-secondary)]">
								Secure checkout
							</span>
						</div>
					</div>
				</div>
			</div>

			<div className="container mx-auto px-4 py-8">
				<div className="max-w-4xl mx-auto">
					<div className="grid lg:grid-cols-2 gap-8">
						{/* Plan summary - Left side */}
						<div className="space-y-6">
							<div>
								<h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
									Complete your purchase
								</h1>
								<p className="text-[var(--color-text-secondary)]">
									You're upgrading to TenantFlow {plan.name}
								</p>
							</div>

							<CardLayout
								title={plan.name}
								description={plan.description}
								className="border-[var(--color-border)] shadow-sm"
							>
								<div className="flex items-start justify-between mb-4">
									<div>
										<div className="flex items-center gap-2 mb-1">
											<h3 className="font-semibold text-[var(--color-text-primary)]">
												{plan.name}
											</h3>
											{'popular' in plan && plan.popular && (
												<span className="px-2 py-1 bg-[var(--color-primary-bg)] text-[var(--color-primary)] text-xs font-medium rounded-full">
													Most Popular
												</span>
											)}
										</div>
										<p className="text-sm text-[var(--color-text-secondary)] mb-3">
											{plan.description}
										</p>
									</div>
									<div className="text-right">
										<div className="text-2xl font-bold text-[var(--color-text-primary)]">
											{formatCurrency(plan.price)}
										</div>
										<div className="text-sm text-[var(--color-text-muted)]">
											per month
										</div>
									</div>
								</div>

								<div className="space-y-2 mb-6">
									{plan.features.map((feature, index) => (
										<div key={index} className="flex items-center gap-2">
											<CheckCircle className="w-4 h-4 text-[var(--color-success)] flex-shrink-0" />
											<span className="text-sm text-[var(--color-text)]">
												{feature}
											</span>
										</div>
									))}
								</div>

								<div className="border-t border-[var(--color-border)] pt-4">
									<div className="flex justify-between items-center">
										<span className="font-medium text-[var(--color-text-primary)]">
											Total today
										</span>
										<span className="text-xl font-bold text-[var(--color-text-primary)]">
											{formatCurrency(plan.price)}
										</span>
									</div>
									<p className="text-xs text-[var(--color-text-muted)] mt-1">
										Billed monthly • Cancel anytime
									</p>
								</div>
							</CardLayout>

							{/* Trust indicators */}
							<div className="flex items-center justify-center gap-6 text-sm text-[var(--color-text-muted)]">
								<div className="flex items-center gap-1">
									<Shield className="w-4 h-4" />
									<span>SOC 2 Compliant</span>
								</div>
								<div className="flex items-center gap-1">
									<Zap className="w-4 h-4" />
									<span>99.9% Uptime</span>
								</div>
							</div>
						</div>

						{/* Payment form - Right side */}
						<div>
							<StripeProvider priceId={plan.priceId} mode="subscription">
								<Checkout />
							</StripeProvider>
						</div>
					</div>
				</div>
			</div>
		</main>
	)
}

export default function CheckoutPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen flex items-center justify-center">
					<LoadingDots size="lg" variant="primary" />
				</div>
			}
		>
			<CheckoutPageContent />
		</Suspense>
	)
}
