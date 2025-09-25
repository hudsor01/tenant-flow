'use client'

// Removed CheckoutForm - now using full Embedded Checkout
import { SubscriptionPlans } from '@/components/payments/subscription-plans'
import { CustomerPortalCard } from '@/components/pricing/customer-portal'
import { StripePricingSection } from '@/components/pricing/stripe-pricing-section'
import { StripePricingTable } from '@/components/pricing/stripe-pricing-table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
	BarChart3,
	CheckCircle2,
	CreditCard,
	Shield,
	Sparkles,
	Users,
	Zap
} from 'lucide-react'
import { useState } from 'react'

export default function PricingComparisonPage() {
	const [selectedComponent, setSelectedComponent] = useState<string>('all')

	// Consistent design system styling for all components
	const componentWrapperClass = cn(
		'w-full rounded-2xl',
		'bg-background border border-border',
		'p-8 lg:p-12',
		'transition-all duration-200'
	)

	const sectionHeaderClass = cn(
		'mb-12 text-center space-y-4',
		'max-w-3xl mx-auto'
	)

	const componentLabelClass = cn(
		'inline-flex items-center gap-2',
		'px-4 py-2 rounded-full',
		'bg-muted text-muted-foreground',
		'text-sm font-medium',
		'border border-border'
	)

	return (
		<main className="min-h-screen bg-background">
			{/* Hero Section with Gradient */}
			<section className="relative overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
				<div className="container mx-auto px-6 py-24 relative z-10">
					<div className={sectionHeaderClass}>
						<Badge
							variant="outline"
							className="mb-4 px-4 py-1.5 text-primary border-primary/20 bg-primary/5"
						>
							<Sparkles className="w-3 h-3 mr-2" />
							Pricing Component Comparison
						</Badge>
						<h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-foreground">
							All Pricing Components
						</h1>
						<p className="text-xl text-muted-foreground leading-relaxed">
							Compare all pricing and billing components side by side with
							consistent design system styling
						</p>
					</div>

					{/* Feature highlights */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12">
						<Card className="border-border/50 bg-card/50 backdrop-blur">
							<CardContent className="p-6 flex items-center gap-4">
								<div className="p-3 rounded-xl bg-primary/10">
									<CheckCircle2 className="w-6 h-6 text-primary" />
								</div>
								<div>
									<p className="font-semibold text-foreground">
										Consistent Styling
									</p>
									<p className="text-sm text-muted-foreground">
										Design system applied
									</p>
								</div>
							</CardContent>
						</Card>
						<Card className="border-border/50 bg-card/50 backdrop-blur">
							<CardContent className="p-6 flex items-center gap-4">
								<div className="p-3 rounded-xl bg-accent/10">
									<BarChart3 className="w-6 h-6 text-accent" />
								</div>
								<div>
									<p className="font-semibold text-foreground">
										Fair Comparison
									</p>
									<p className="text-sm text-muted-foreground">
										Apples to apples
									</p>
								</div>
							</CardContent>
						</Card>
						<Card className="border-border/50 bg-card/50 backdrop-blur">
							<CardContent className="p-6 flex items-center gap-4">
								<div className="p-3 rounded-xl bg-primary/10">
									<Shield className="w-6 h-6 text-primary" />
								</div>
								<div>
									<p className="font-semibold text-foreground">
										Production Ready
									</p>
									<p className="text-sm text-muted-foreground">
										All components tested
									</p>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>

			{/* Component Tabs Navigation */}
			<section className="container mx-auto px-6 py-12">
				<Tabs
					value={selectedComponent}
					onValueChange={setSelectedComponent}
					className="w-full"
				>
					<TabsList className="grid w-full max-w-3xl mx-auto grid-cols-6 h-auto p-1 bg-muted/50">
						<TabsTrigger
							value="all"
							className="data-[state=active]:bg-background data-[state=active]:text-foreground py-3"
						>
							All Components
						</TabsTrigger>
						<TabsTrigger
							value="pricing-table"
							className="data-[state=active]:bg-background data-[state=active]:text-foreground py-3"
						>
							Pricing Table
						</TabsTrigger>
						<TabsTrigger
							value="pricing-cards"
							className="data-[state=active]:bg-background data-[state=active]:text-foreground py-3"
						>
							Pricing Cards
						</TabsTrigger>
						<TabsTrigger
							value="checkout"
							className="data-[state=active]:bg-background data-[state=active]:text-foreground py-3"
						>
							Checkout
						</TabsTrigger>
						<TabsTrigger
							value="subscription"
							className="data-[state=active]:bg-background data-[state=active]:text-foreground py-3"
						>
							Plans
						</TabsTrigger>
						<TabsTrigger
							value="portal"
							className="data-[state=active]:bg-background data-[state=active]:text-foreground py-3"
						>
							Portal
						</TabsTrigger>
					</TabsList>

					<TabsContent value="all" className="mt-12 space-y-24">
						{/* Component 1: Stripe Pricing Table */}
						<section id="stripe-pricing-table" className="scroll-mt-20">
							<div className="max-w-7xl mx-auto">
								<div className="mb-8 flex items-center justify-between">
									<div>
										<h2 className="text-3xl font-bold text-foreground mb-2">
											Stripe Pricing Table Component
										</h2>
										<p className="text-muted-foreground">
											Embedded Stripe pricing table with native integration
										</p>
									</div>
									<div className={componentLabelClass}>
										<CreditCard className="w-4 h-4" />
										Stripe Embedded
									</div>
								</div>
								<div className={componentWrapperClass}>
									<StripePricingTable
										pricingTableId={
											process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID ||
											'prctbl_1234567890'
										}
									/>
								</div>
							</div>
						</section>

						<Separator className="bg-border/50" />

						{/* Component 2: Custom Pricing Cards Section */}
						<section id="stripe-pricing-section" className="scroll-mt-20">
							<div className="max-w-7xl mx-auto">
								<div className="mb-8 flex items-center justify-between">
									<div>
										<h2 className="text-3xl font-bold text-foreground mb-2">
											Custom Pricing Cards Section
										</h2>
										<p className="text-muted-foreground">
											Full-featured pricing section with custom design and
											animations
										</p>
									</div>
									<div className={componentLabelClass}>
										<Sparkles className="w-4 h-4" />
										Custom Design
									</div>
								</div>
								<div className={componentWrapperClass}>
									<StripePricingSection showHeader={false} className="!p-0" />
								</div>
							</div>
						</section>

						<Separator className="bg-border/50" />

						{/* Component 3: Checkout Form - Commented out as it requires CheckoutProvider */}
						{/* <section id="checkout-form" className="scroll-mt-20">
							<div className="max-w-7xl mx-auto">
								<div className="mb-8 flex items-center justify-between">
									<div>
										<h2 className="text-3xl font-bold text-foreground mb-2">
											Checkout Form Component
										</h2>
										<p className="text-muted-foreground">
											Stripe checkout form with payment element integration
										</p>
									</div>
									<div className={componentLabelClass}>
										<CreditCard className="w-4 h-4" />
										Payment Form
									</div>
								</div>
								<div className={componentWrapperClass}>
									<div className="max-w-2xl mx-auto">
										<CheckoutForm
											priceId="price_example"
											planName="Growth Plan"
											amount={99}
										/>
									</div>
								</div>
							</div>
						</section>

						<Separator className="bg-border/50" /> */}

						{/* Component 4: Simple Subscription Plans */}
						<section id="subscription-plans" className="scroll-mt-20">
							<div className="max-w-7xl mx-auto">
								<div className="mb-8 flex items-center justify-between">
									<div>
										<h2 className="text-3xl font-bold text-foreground mb-2">
											Simple Subscription Plans
										</h2>
										<p className="text-muted-foreground">
											Minimal subscription plan cards with essential features
										</p>
									</div>
									<div className={componentLabelClass}>
										<Zap className="w-4 h-4" />
										Minimal Design
									</div>
								</div>
								<div className={componentWrapperClass}>
									<SubscriptionPlans />
								</div>
							</div>
						</section>

						<Separator className="bg-border/50" />

						{/* Component 5: Customer Portal Card */}
						<section id="customer-portal" className="scroll-mt-20">
							<div className="max-w-7xl mx-auto">
								<div className="mb-8 flex items-center justify-between">
									<div>
										<h2 className="text-3xl font-bold text-foreground mb-2">
											Customer Portal Management
										</h2>
										<p className="text-muted-foreground">
											Account management and billing portal access component
										</p>
									</div>
									<div className={componentLabelClass}>
										<Users className="w-4 h-4" />
										Account Management
									</div>
								</div>
								<div className={componentWrapperClass}>
									<div className="max-w-5xl mx-auto">
										<CustomerPortalCard
											title="Manage Your Account"
											description="Access your billing portal and manage subscription settings"
											icon={Users}
											actionText="Open Portal"
											onAction={() =>
												window.open('/dashboard/billing', '_blank')
											}
											currentPlan="Growth Plan"
											planTier="growth"
											showStats={true}
											showTestimonial={true}
										/>
									</div>
								</div>
							</div>
						</section>
					</TabsContent>

					{/* Individual Tab Contents */}
					<TabsContent value="pricing-table" className="mt-12">
						<div className="max-w-7xl mx-auto">
							<div className={componentWrapperClass}>
								<StripePricingTable
									pricingTableId={
										process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID ||
										'prctbl_1234567890'
									}
								/>
							</div>
						</div>
					</TabsContent>

					<TabsContent value="pricing-cards" className="mt-12">
						<div className="max-w-7xl mx-auto">
							<div className={componentWrapperClass}>
								<StripePricingSection showHeader={false} className="!p-0" />
							</div>
						</div>
					</TabsContent>

					<TabsContent value="checkout" className="mt-12">
						<div className="max-w-2xl mx-auto">
							<div className={componentWrapperClass}>
								<div className="text-center py-12">
									<h3 className="text-lg font-semibold text-foreground mb-2">
										Embedded Checkout
									</h3>
									<p className="text-muted-foreground">
										We now use Stripe's full Embedded Checkout experience.
										<br />
										Visit the checkout page to see it in action.
									</p>
								</div>
							</div>
						</div>
					</TabsContent>

					<TabsContent value="subscription" className="mt-12">
						<div className="max-w-7xl mx-auto">
							<div className={componentWrapperClass}>
								<SubscriptionPlans />
							</div>
						</div>
					</TabsContent>

					<TabsContent value="portal" className="mt-12">
						<div className="max-w-5xl mx-auto">
							<div className={componentWrapperClass}>
								<CustomerPortalCard
									title="Manage Your Account"
									description="Access your billing portal and manage subscription settings"
									icon={Users}
									actionText="Open Portal"
									onAction={() => window.open('/dashboard/billing', '_blank')}
									currentPlan="Growth Plan"
									planTier="growth"
									showStats={true}
									showTestimonial={true}
								/>
							</div>
						</div>
					</TabsContent>
				</Tabs>
			</section>
		</main>
	)
}
