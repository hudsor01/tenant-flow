'use client'

import { BlurFade } from '@/components/magicui/blur-fade'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PricingPlan } from '@/types/marketing'
import { ArrowRight, Check, Shield, Star, Users, Zap } from 'lucide-react'
import * as React from 'react'

export const DEFAULT_PLANS: PricingPlan[] = [
	{
		name: 'Starter',
		price: '$29',
		originalPrice: '$39',
		yearlyPrice: '$290',
		originalYearlyPrice: '$390',
		description: 'Perfect for individual property managers',
		usageLimit: 'Up to 5 properties',
		features: [
			'Property & tenant management',
			'Basic reporting & analytics',
			'Mobile app access',
			'Email support',
			'5GB document storage',
			'Standard integrations'
		],
		badge: 'Best for beginners',
		ctaText: 'Start free trial',
		ctaVariant: 'outline' as const
	},
	{
		name: 'Professional',
		price: '$79',
		originalPrice: '$99',
		yearlyPrice: '$790',
		originalYearlyPrice: '$990',
		description: 'Most popular for growing businesses',
		usageLimit: 'Up to 50 properties',
		features: [
			'Everything in Starter',
			'Advanced analytics & insights',
			'Automated workflows',
			'Priority support (24/7)',
			'50GB document storage',
			'Team collaboration (up to 5 users)',
			'Custom branding',
			'API access',
			'Advanced reporting suite'
		],
		featured: true,
		badge: 'Most Popular',
		ctaText: 'Start free trial',
		ctaVariant: 'default' as const,
		testimonial: {
			text: 'Increased our efficiency by 200% in just 3 months',
			author: 'Sarah Johnson',
			role: 'Property Manager'
		}
	},
	{
		name: 'Enterprise',
		price: 'Custom',
		description: 'For large-scale operations',
		usageLimit: 'Unlimited properties',
		features: [
			'Everything in Professional',
			'Unlimited users & properties',
			'White-label solution',
			'Dedicated success manager',
			'Custom integrations & API',
			'Advanced security (SSO, SAML)',
			'SLA guarantees (99.9% uptime)',
			'Priority implementation',
			'Custom training & onboarding'
		],
		badge: 'Contact Sales',
		ctaText: 'Contact Sales',
		ctaVariant: 'outline' as const
	}
]

const testimonials = [
	{
		text: 'TenantFlow has transformed how we manage our 200+ property portfolio. The automation features alone save us 15 hours per week.',
		author: 'Michael Chen',
		role: 'Portfolio Manager',
		rating: 5,
		image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael'
	},
	{
		text: 'The analytics dashboard gives us insights we never had before. Our revenue increased by 30% in the first year.',
		author: 'Lisa Rodriguez',
		role: 'Property Owner',
		rating: 5,
		image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa'
	},
	{
		text: 'Customer support is incredible. They helped us migrate all our data seamlessly and provided excellent training.',
		author: 'James Thompson',
		role: 'Operations Director',
		rating: 5,
		image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James'
	}
]

export interface PricingSectionProps extends React.ComponentProps<'section'> {
	plans?: PricingPlan[]
	featuredIndex?: number | null
	showTestimonials?: boolean
	billingPeriod?: 'monthly' | 'annual'
	compare?: boolean
	showBillingToggle?: boolean
	showTrustBadges?: boolean
	onBillingPeriodChange?: (period: 'monthly' | 'annual') => void
}

export const PricingSection = React.forwardRef<
	HTMLElement,
	PricingSectionProps
>(
	(
		{
			plans = DEFAULT_PLANS,
			featuredIndex = null,
			showTestimonials = true,
			billingPeriod = 'monthly',
			compare = false,
			showBillingToggle = true,
			showTrustBadges = true,
			onBillingPeriodChange,
			className,
			...props
		},
		ref
	) => {
		const derivedPlans: PricingPlan[] = plans.map((p, i) => ({
			...p,
			featured:
				typeof featuredIndex === 'number' ? i === featuredIndex : p.featured
		}))

		const [internalPeriod, setInternalPeriod] = React.useState<
			'monthly' | 'annual'
		>(billingPeriod)
		const period = onBillingPeriodChange ? billingPeriod : internalPeriod

		function formatPrice(value: number) {
			return `$${Math.round(value)}`
		}

		function parseMonthlyPrice(price: string | undefined): number | null {
			if (!price) return null
			if (price.toLowerCase() === 'custom') return null
			const match = price.match(/\$([0-9]+(?:\.[0-9]{1,2})?)/)
			if (!match || !match[1]) return null
			return Number.parseFloat(match[1])
		}

		function calculateSavings(plan: PricingPlan): string {
			const monthly = parseMonthlyPrice(plan.price)
			const yearly = parseMonthlyPrice(plan.yearlyPrice)
			if (!monthly || !yearly) return ''
			const monthlyCost = monthly * 12
			const savings = ((monthlyCost - yearly) / monthlyCost) * 100
			return `Save ${Math.round(savings)}%`
		}

		return (
			<section
				ref={ref}
				className={cn(
					'py-24 bg-gradient-to-br from-background via-background/50 to-muted/20',
					className
				)}
				{...props}
			>
				{/* Subtle background pattern */}
				<div className="absolute inset-0 bg-grid-small-black/[0.02] dark:bg-grid-small-white/[0.02]" />

				<div className="relative container max-w-7xl mx-auto px-4">
					{/* Modern Header Section */}
					<BlurFade delay={0.1}>
						<div className="text-center mb-16">
							{/* Clean Badge */}
							<Badge variant="secondary" className="mb-6 text-sm font-medium">
								<Zap className="mr-2 size-4" />
								Simple, transparent pricing
							</Badge>

							{/* Clean Typography */}
							<h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
								Scale with confidence
							</h2>
							<p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
								Start free, then add a site plan to go live. Account plans
								unlock additional features.
							</p>

							{/* Modern Billing Toggle */}
							{showBillingToggle && (
								<div className="flex items-center justify-center gap-3 mb-8">
									<span
										className={`text-sm ${period === 'monthly' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
									>
										Monthly
									</span>
									<button
										type="button"
										className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
											period === 'annual'
												? 'bg-primary'
												: 'bg-gray-200 dark:bg-gray-700'
										}`}
										onClick={() =>
											onBillingPeriodChange
												? onBillingPeriodChange(
														period === 'annual' ? 'monthly' : 'annual'
													)
												: setInternalPeriod(
														period === 'annual' ? 'monthly' : 'annual'
													)
										}
									>
										<span
											className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
												period === 'annual' ? 'translate-x-5' : 'translate-x-0'
											}`}
										/>
									</button>
									<div className="flex items-center gap-2">
										<span
											className={`text-sm ${period === 'annual' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
										>
											Annual
										</span>
										<Badge variant="secondary" className="text-xs px-2 py-1">
											Save 20%
										</Badge>
									</div>
								</div>
							)}

							{/* Trust Indicators */}
							{showTrustBadges && (
								<div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
									<div className="flex items-center gap-2">
										<Shield className="size-4 text-green-600" />
										<span>SOC 2 compliant</span>
									</div>
									<div className="flex items-center gap-2">
										<Users className="size-4 text-blue-600" />
										<span>10,000+ customers</span>
									</div>
									<div className="flex items-center gap-1">
										{[...Array(5)].map((_, i) => (
											<Star
												key={i}
												className="size-4 fill-yellow-400 text-yellow-400"
											/>
										))}
										<span className="ml-1">4.9/5 rating</span>
									</div>
								</div>
							)}
						</div>
					</BlurFade>

					{/* Modern Pricing Cards */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
						{derivedPlans.map((plan, index) => {
							const isCustom = (plan.price || '').toLowerCase() === 'custom'
							const displayPrice =
								period === 'annual' && plan.yearlyPrice
									? plan.yearlyPrice
									: plan.price
							const originalDisplayPrice =
								period === 'annual' && plan.originalYearlyPrice
									? plan.originalYearlyPrice
									: plan.originalPrice
							const showSavings = period === 'annual' && calculateSavings(plan)

							return (
								<BlurFade key={plan.name} delay={0.2 + index * 0.1}>
									<div
										className={`relative rounded-2xl border bg-card p-8 ${
											plan.featured
												? 'border-primary shadow-lg ring-1 ring-primary/10'
												: 'border-border hover:border-border/80'
										} transition-all duration-200`}
									>
										{/* Featured Badge */}
										{plan.featured && (
											<div className="absolute -top-3 left-1/2 -translate-x-1/2">
												<Badge className="bg-primary text-primary-foreground px-3 py-1">
													{plan.badge}
												</Badge>
											</div>
										)}

										{/* Plan Header */}
										<div className="mb-8">
											<h3 className="text-lg font-semibold text-foreground mb-2">
												{plan.name}
											</h3>
											<p className="text-sm text-muted-foreground mb-4">
												{plan.description}
											</p>

											{/* Usage Limit */}
											<div className="mb-6">
												<span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
													{plan.usageLimit}
												</span>
											</div>

											{/* Price Display */}
											<div className="flex items-baseline gap-2">
												{!isCustom ? (
													<>
														<span className="text-4xl font-bold text-foreground">
															{displayPrice}
														</span>
														<span className="text-muted-foreground">
															/{period === 'annual' ? 'year' : 'month'}
														</span>
														{originalDisplayPrice &&
															originalDisplayPrice !== displayPrice && (
																<span className="text-sm text-muted-foreground line-through ml-2">
																	{originalDisplayPrice}
																</span>
															)}
													</>
												) : (
													<span className="text-4xl font-bold text-foreground">
														{displayPrice}
													</span>
												)}
											</div>

											{/* Savings Badge */}
											{showSavings && (
												<div className="mt-2">
													<Badge variant="secondary" className="text-xs">
														{showSavings}
													</Badge>
												</div>
											)}

											{/* Billing Note */}
											{!isCustom && period === 'annual' && (
												<p className="text-xs text-muted-foreground mt-2">
													Billed annually
												</p>
											)}
										</div>

										{/* Features List */}
										<ul className="space-y-3 mb-8">
											{plan.features.map((feature: string, idx: number) => (
												<li key={idx} className="flex items-start gap-3">
													<div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mt-0.5">
														<Check className="h-3 w-3 text-green-600 dark:text-green-400" />
													</div>
													<span className="text-sm text-foreground">
														{feature}
													</span>
												</li>
											))}
										</ul>

										{/* Testimonial for featured plan */}
										{plan.testimonial && (
											<div className="mb-6 p-4 rounded-lg bg-muted/50 border">
												<div className="flex items-center gap-1 mb-2">
													{[...Array(5)].map((_, i) => (
														<Star
															key={i}
															className="w-3 h-3 fill-yellow-400 text-yellow-400"
														/>
													))}
												</div>
												<p className="text-xs text-muted-foreground mb-2 italic">
													"{plan.testimonial.text}"
												</p>
												<p className="text-xs font-medium text-foreground">
													— {plan.testimonial.author}, {plan.testimonial.role}
												</p>
											</div>
										)}

										{/* CTA Button */}
										<Button
											variant={plan.ctaVariant || 'default'}
											className={`w-full ${
												plan.featured ? 'bg-primary hover:bg-primary/90' : ''
											}`}
											size="lg"
										>
											{plan.ctaText}
											{plan.ctaText !== 'Contact Sales' && (
												<ArrowRight className="ml-2 h-4 w-4" />
											)}
										</Button>
									</div>
								</BlurFade>
							)
						})}
					</div>

					{/* Feature Comparison Table */}
					{compare && (
						<BlurFade delay={0.6}>
							<div className="mt-20 max-w-4xl mx-auto">
								<div className="text-center mb-12">
									<h3 className="text-2xl font-bold text-foreground mb-2">
										Compare plans
									</h3>
									<p className="text-muted-foreground">
										All the details you need to choose the right plan
									</p>
								</div>

								<div className="overflow-x-auto">
									<table className="w-full border border-border rounded-lg">
										<thead>
											<tr className="bg-muted/30">
												<th className="text-left py-4 px-6 font-semibold text-foreground">
													Features
												</th>
												{derivedPlans.map(plan => (
													<th
														key={plan.name}
														className="text-center py-4 px-6 font-semibold text-foreground min-w-32"
													>
														{plan.name}
													</th>
												))}
											</tr>
										</thead>
										<tbody>
											{Array.from(
												new Set(derivedPlans.flatMap(p => p.features))
											).map((feature, idx) => (
												<tr
													key={feature}
													className={`border-t border-border ${idx % 2 === 0 ? 'bg-muted/10' : ''}`}
												>
													<td className="py-3 px-6 text-sm font-medium text-foreground">
														{feature}
													</td>
													{derivedPlans.map(plan => (
														<td
															key={plan.name + feature}
															className="py-3 px-6 text-center"
														>
															{plan.features.includes(feature) ? (
																<div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30">
																	<Check className="w-3 h-3 text-green-600 dark:text-green-400" />
																</div>
															) : (
																<span className="text-muted-foreground">—</span>
															)}
														</td>
													))}
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						</BlurFade>
					)}

					{/* Social Proof / Testimonials */}
					{showTestimonials && (
						<BlurFade delay={0.8}>
							<div className="mt-24 text-center">
								<h3 className="text-2xl font-bold text-foreground mb-4">
									Join thousands of property managers
								</h3>
								<div className="flex items-center justify-center gap-2 mb-12">
									<div className="flex">
										{[...Array(5)].map((_, i) => (
											<Star
												key={i}
												className="w-5 h-5 fill-yellow-400 text-yellow-400"
											/>
										))}
									</div>
									<span className="text-sm text-muted-foreground">
										4.9/5 from 2,000+ reviews
									</span>
								</div>

								{/* Simple testimonial grid */}
								<div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
									{testimonials.map((testimonial, index) => (
										<div key={index} className="text-left">
											<div className="flex items-center gap-1 mb-3">
												{[...Array(testimonial.rating)].map((_, i) => (
													<Star
														key={i}
														className="w-4 h-4 fill-yellow-400 text-yellow-400"
													/>
												))}
											</div>
											<blockquote className="text-muted-foreground mb-4 leading-relaxed">
												"{testimonial.text}"
											</blockquote>
											<div className="flex items-center gap-3">
												<img
													src={testimonial.image}
													alt={testimonial.author}
													className="w-10 h-10 rounded-full"
												/>
												<div>
													<p className="font-medium text-foreground">
														{testimonial.author}
													</p>
													<p className="text-sm text-muted-foreground">
														{testimonial.role}
													</p>
												</div>
											</div>
										</div>
									))}
								</div>

								{/* FAQ Link */}
								<div className="mt-16">
									<p className="text-muted-foreground mb-4">
										Still have questions?
									</p>
									<Button variant="outline" className="mx-auto">
										View FAQ
										<ArrowRight className="ml-2 h-4 w-4" />
									</Button>
								</div>
							</div>
						</BlurFade>
					)}
				</div>
			</section>
		)
	}
)
PricingSection.displayName = 'PricingSection'

export default PricingSection
