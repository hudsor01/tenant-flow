'use client'

import { useState } from 'react'
import { PricingCardFeatured } from './pricing-card-featured'
import { PricingCardStandard } from './pricing-card-standard'
import { PricingComparisonTable } from './pricing-comparison-table'
import { PricingTrustBadges } from './pricing-trust-badges'
import { Switch } from '#components/ui/switch'
import { Label } from '#components/ui/label'
import { Badge } from '#components/ui/badge'
import { getAllPricingPlans, PLAN_FEATURES } from '@repo/shared/config/pricing'
import { Building2, Users, Shield } from 'lucide-react'

interface BentoPricingSectionProps {
	defaultBillingCycle?: 'monthly' | 'yearly'
}

export function BentoPricingSection({
	defaultBillingCycle = 'monthly'
}: BentoPricingSectionProps) {
	const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
		defaultBillingCycle
	)

	// Get pricing plans from config
	const allPlans = getAllPricingPlans()
		.filter(plan => plan.planId !== 'trial')
		.map(plan => ({
			id: plan.planId,
			name: plan.name,
			description: plan.description,
			price: {
				monthly: plan.price.monthly,
				yearly: Math.round((plan.price.annual / 12) * 100) / 100
			},
			annualTotal: plan.price.annual,
			features: PLAN_FEATURES[plan.planId as keyof typeof PLAN_FEATURES]
				? [...PLAN_FEATURES[plan.planId as keyof typeof PLAN_FEATURES]]
				: [...plan.features.slice(0, 9)],
			popular: plan.planId === 'growth',
			stripeMonthlyPriceId: plan.stripePriceIds.monthly,
			stripeAnnualPriceId: plan.stripePriceIds.annual
		}))

	const starterPlan = allPlans.find(p => p.id === 'starter')
	const growthPlan = allPlans.find(p => p.id === 'growth')
	const maxPlan = allPlans.find(p => p.id === 'max')

	// Calculate savings for annual
	const annualSavings = growthPlan
		? growthPlan.price.monthly * 12 - growthPlan.annualTotal
		: 0

	return (
		<div className="w-full">
			{/* Social Proof Header */}
			<div className="flex-center gap-6 mb-8 flex-wrap">
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Building2 className="size-4 text-primary" />
					<span>
						<strong className="text-foreground">8,000+</strong> properties
						managed
					</span>
				</div>
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Users className="size-4 text-primary" />
					<span>
						<strong className="text-foreground">500+</strong> property managers
					</span>
				</div>
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Shield className="size-4 text-success" />
					<span>
						<strong className="text-foreground">90-day</strong> ROI guarantee
					</span>
				</div>
			</div>

			{/* Enhanced Billing Toggle */}
			<div className="flex-center gap-4 mb-12">
				<Label
					htmlFor="billing-toggle"
					className={`text-sm font-medium transition-colors cursor-pointer ${
						billingCycle === 'monthly'
							? 'text-foreground'
							: 'text-muted-foreground'
					}`}
				>
					Monthly
				</Label>
				<Switch
					id="billing-toggle"
					checked={billingCycle === 'yearly'}
					onCheckedChange={checked =>
						setBillingCycle(checked ? 'yearly' : 'monthly')
					}
					className="data-[state=checked]:bg-primary"
				/>
				<Label
					htmlFor="billing-toggle"
					className={`text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
						billingCycle === 'yearly'
							? 'text-foreground'
							: 'text-muted-foreground'
					}`}
				>
					Annual
					<Badge
						variant="secondary"
						className="bg-success/10 text-success hover:bg-success/20 text-xs font-semibold"
					>
						Save ${Math.round(annualSavings)}
					</Badge>
				</Label>
			</div>

			{/* Bento Grid Layout */}
			<div className="mx-auto max-w-6xl px-4">
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
					{/* Starter - Left Column (1 col) */}
					{starterPlan && (
						<div className="lg:col-span-1">
							<PricingCardStandard
								plan={starterPlan}
								billingCycle={billingCycle}
								variant="starter"
							/>
						</div>
					)}

					{/* Growth - Center Column (2 cols) */}
					{growthPlan && (
						<div className="lg:col-span-2">
							<PricingCardFeatured
								plan={growthPlan}
								billingCycle={billingCycle}
							/>
						</div>
					)}

					{/* Max - Right Column (1 col) */}
					{maxPlan && (
						<div className="lg:col-span-1">
							<PricingCardStandard
								plan={maxPlan}
								billingCycle={billingCycle}
								variant="enterprise"
							/>
						</div>
					)}
				</div>

				{/* Trust Badges */}
				<PricingTrustBadges className="mt-8" />

				{/* Feature Comparison Table */}
				<PricingComparisonTable className="mt-16" />
			</div>
		</div>
	)
}
