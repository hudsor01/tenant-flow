'use client'

import { Checkout } from '#components/pricing/checkout'
import { StripeProvider } from '#providers/stripe-provider'
import { CardLayout } from '#components/ui/card-layout'
import { LoadingDots } from '#components/ui/loading-spinner'
import {
	formatStripePrice,
	getPlanFeatures,
	useStripeProducts
} from '#hooks/use-stripe-products'
import { AlertCircle, ArrowLeft, CheckCircle, Shield, Zap } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function CheckoutPageContent() {
	const searchParams = useSearchParams()
	const planId = searchParams.get('plan') || 'growth'
	const { products, isLoading, error } = useStripeProducts()

	// Find the selected plan from fetched products
	const selectedProduct = products.find(
		p => (p.metadata.planId || p.name.toLowerCase()) === planId.toLowerCase()
	)

	// Loading state
	if (isLoading) {
		return (
			<main className="min-h-screen bg-linear-to-br from-slate-50 to-white flex items-center justify-center">
				<div className="text-center space-y-4">
					<LoadingDots size="lg" variant="primary" />
					<p className="text-muted-foreground">
						Loading pricing information...
					</p>
				</div>
			</main>
		)
	}

	// Error state
	if (error || !selectedProduct) {
		return (
			<main className="min-h-screen bg-linear-to-br from-slate-50 to-white">
				<div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
					<div className="container mx-auto px-4 py-4">
						<Link
							href="/pricing"
							className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
						>
							<ArrowLeft className="size-4 mr-2" />
							Back to pricing
						</Link>
					</div>
				</div>
				<div className="container mx-auto px-4 py-16">
					<div className="max-w-2xl mx-auto">
						<CardLayout
							title="Unable to Load Plan"
							description="We couldn't load the pricing information for this plan"
							className="border-destructive/50"
						>
							<div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg">
								<AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
								<div>
									<p className="text-sm text-foreground mb-2">
										{error
											? error.message
											: 'The selected plan could not be found.'}
									</p>
									<Link
										href="/pricing"
										className="text-sm text-primary hover:underline"
									>
										Return to pricing page
									</Link>
								</div>
							</div>
						</CardLayout>
					</div>
				</div>
			</main>
		)
	}

	// Get plan details from fetched product
	const plan = {
		id: selectedProduct.id,
		name: selectedProduct.name,
		description:
			selectedProduct.description || 'Professional property management tools',
		monthlyPrice: selectedProduct.prices.monthly?.unit_amount || 0,
		annualPrice: selectedProduct.prices.annual?.unit_amount || 0,
		monthlyPriceId: selectedProduct.prices.monthly?.id,
		annualPriceId: selectedProduct.prices.annual?.id,
		features: getPlanFeatures(planId),
		popular: selectedProduct.metadata.popular === 'true'
	}

	// Use monthly pricing for checkout (can be extended to support annual)
	const displayPrice = plan.monthlyPrice
	const priceId = plan.monthlyPriceId

	if (!priceId) {
		return (
			<main className="min-h-screen bg-linear-to-br from-slate-50 to-white">
				<div className="container mx-auto px-4 py-16">
					<div className="max-w-2xl mx-auto">
						<CardLayout
							title="Pricing Configuration Error"
							description="This plan doesn't have a valid price configured"
						>
							<p className="text-sm text-muted-foreground">
								Please contact support or select a different plan.
							</p>
						</CardLayout>
					</div>
				</div>
			</main>
		)
	}

	return (
		<main className="min-h-screen bg-linear-to-br from-slate-50 to-white">
			{/* Clean header */}
			<div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<Link
							href="/pricing"
							className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
						>
							<ArrowLeft className="size-4 mr-2" />
							Back to pricing
						</Link>
						<div className="flex items-center gap-2">
							<Shield className="size-4 text-success" />
							<span className="text-sm text-muted-foreground">
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
								<h1 className="text-2xl font-bold text-foreground mb-2">
									Complete your purchase
								</h1>
								<p className="text-muted-foreground">
									You&apos;re upgrading to TenantFlow {plan.name}
								</p>
							</div>

							<CardLayout
								title={plan.name}
								description={plan.description}
								className="border shadow-sm"
							>
								<div className="flex items-start justify-between mb-4">
									<div>
										<div className="flex items-center gap-2 mb-1">
											<h3 className="font-semibold text-foreground">
												{plan.name}
											</h3>
											{plan.popular && (
												<span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
													Most Popular
												</span>
											)}
										</div>
										<p className="text-sm text-muted-foreground mb-3">
											{plan.description}
										</p>
									</div>
									<div className="text-right">
										<div className="text-2xl font-bold text-foreground">
											{formatStripePrice(displayPrice)}
										</div>
										<div className="text-sm text-muted-foreground">
											per month
										</div>
									</div>
								</div>

								<div className="space-y-2 mb-6">
									{plan.features.map((feature, index) => (
										<div key={index} className="flex items-center gap-2">
											<CheckCircle className="size-4 text-success shrink-0" />
											<span className="text-sm text-foreground">{feature}</span>
										</div>
									))}
								</div>

								<div className="border-t border-border pt-4">
									<div className="flex justify-between items-center">
										<span className="font-medium text-foreground">
											Total today
										</span>
										<span className="text-xl font-bold text-foreground">
											{formatStripePrice(displayPrice)}
										</span>
									</div>
									<p className="text-xs text-muted-foreground mt-1">
										Billed monthly • Cancel anytime
									</p>
								</div>
							</CardLayout>

							{/* Trust indicators */}
							<div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
								<div className="flex items-center gap-1">
									<Shield className="size-4" />
									<span>SOC 2 Compliant</span>
								</div>
								<div className="flex items-center gap-1">
									<Zap className="size-4" />
									<span>99.9% Uptime</span>
								</div>
							</div>
						</div>

						{/* Payment form - Right side */}
						<div>
							<StripeProvider priceId={priceId} mode="subscription">
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
