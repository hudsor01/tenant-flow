import React, { useMemo } from 'react'
import { Lightbulb, TrendingUp, Users, Building2, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
	PRODUCT_TIERS,
	getRecommendedUpgrade,
	type PlanType
} from '@repo/shared'
import { usePricingContext } from '@/contexts/pricing-context'

export interface PricingRecommendationsProps {
	onSelectPlan?: (planType: PlanType) => void
	className?: string
}

interface RecommendationReason {
	icon: React.ComponentType<{ className?: string }>
	text: string
	type: 'usage' | 'feature' | 'savings'
}

/**
 * Pricing Recommendations component
 * Provides intelligent plan recommendations based on current usage
 */
export function PricingRecommendations({
	onSelectPlan,
	className
}: PricingRecommendationsProps): React.ReactElement | null {
	const { currentPlan, usage } = usePricingContext()

	const currentPlanConfig = currentPlan
		? PRODUCT_TIERS[currentPlan as PlanType]
		: null

	const recommendation = useMemo(() => {
		if (!currentPlan || !currentPlanConfig) {
			return {
				planType: 'FREETRIAL' as PlanType,
				confidence: 'high' as const,
				reasons: [],
				isUpgrade: false
			}
		}

		// Get system recommendation
		const recommendedPlan = getRecommendedUpgrade(
			currentPlan as PlanType,
			{
				properties: usage.properties,
				units: usage.units,
				users: usage.tenants
			} as unknown as Parameters<typeof getRecommendedUpgrade>[1]
		)

		// If no upgrade needed, recommend current plan optimization
		if (!recommendedPlan) {
			return {
				planType: currentPlan,
				confidence: 'high' as const,
				reasons: [],
				isUpgrade: false
			}
		}

		const recommendedConfig = PRODUCT_TIERS[recommendedPlan]
		const reasons: RecommendationReason[] = []

		// Analyze usage patterns for recommendations
		if (
			usage.properties > currentPlanConfig.limits.properties &&
			currentPlanConfig.limits.properties !== -1
		) {
			reasons.push({
				icon: Building2,
				text: `You have ${usage.properties} properties, exceeding your current limit of ${currentPlanConfig.limits.properties}`,
				type: 'usage'
			})
		}

		if (
			usage.units > currentPlanConfig.limits.units &&
			currentPlanConfig.limits.units !== -1
		) {
			reasons.push({
				icon: TrendingUp,
				text: `You're managing ${usage.units} units, which exceeds your current limit`,
				type: 'usage'
			})
		}

		if (
			currentPlanConfig.limits.users &&
			usage.tenants > currentPlanConfig.limits.users &&
			currentPlanConfig.limits.users !== -1
		) {
			reasons.push({
				icon: Users,
				text: `Your team has ${usage.tenants} members, more than your current plan allows`,
				type: 'usage'
			})
		}

		// Add feature-based recommendations
		if (
			recommendedPlan === 'GROWTH' ||
			recommendedPlan === 'TENANTFLOW_MAX'
		) {
			reasons.push({
				icon: Zap,
				text: 'Unlock advanced analytics and automation features',
				type: 'feature'
			})
		}

		// Calculate potential savings for annual plans
		if (
			recommendedConfig.price.annual <
			recommendedConfig.price.monthly * 12
		) {
			const savings =
				recommendedConfig.price.monthly * 12 -
				recommendedConfig.price.annual
			reasons.push({
				icon: TrendingUp,
				text: `Save $${savings}/year with annual billing`,
				type: 'savings'
			})
		}

		// Determine confidence based on usage patterns
		const usageExceeded = reasons.filter(r => r.type === 'usage').length
		const confidence =
			usageExceeded > 1 ? 'high' : usageExceeded === 1 ? 'medium' : 'low'

		return {
			planType: recommendedPlan,
			confidence,
			reasons,
			isUpgrade: true
		}
	}, [usage, currentPlan, currentPlanConfig])

	if (!currentPlan || !currentPlanConfig) {
		return null
	}

	const getConfidenceColor = (confidence: string) => {
		switch (confidence) {
			case 'high':
				return 'bg-green-100 text-green-800 border-green-200'
			case 'medium':
				return 'bg-yellow-100 text-yellow-800 border-yellow-200'
			default:
				return 'bg-blue-100 text-blue-800 border-blue-200'
		}
	}

	const getIconColor = (type: RecommendationReason['type']) => {
		switch (type) {
			case 'usage':
				return 'text-red-600'
			case 'feature':
				return 'text-primary'
			case 'savings':
				return 'text-green-600'
			default:
				return 'text-gray-600'
		}
	}

	if (!recommendation.isUpgrade && recommendation.confidence === 'high') {
		return (
			<Card className={cn('border-green-200 bg-green-50', className)}>
				<CardContent className="pt-6">
					<div className="flex items-center gap-3">
						<div className="rounded-full bg-green-100 p-2">
							<Lightbulb className="h-5 w-5 text-green-600" />
						</div>
						<div>
							<h3 className="font-semibold text-green-900">
								You're on the perfect plan!
							</h3>
							<p className="text-sm text-green-700">
								Your current {currentPlanConfig.name} plan
								matches your usage perfectly.
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		)
	}

	const recommendedConfig = PRODUCT_TIERS[recommendation.planType]

	return (
		<Card
			className={cn('border-blue-200 bg-blue-50', className)}
			data-testid="pricing-recommendations"
		>
			<CardHeader className="pb-4">
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2 text-blue-900">
						<Lightbulb className="h-5 w-5" />
						Recommended for You
					</CardTitle>
					<Badge
						className={cn(
							'border',
							getConfidenceColor(recommendation.confidence)
						)}
					>
						{recommendation.confidence} confidence
					</Badge>
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				<div className="rounded-lg border border-blue-200 bg-white p-4">
					<div className="mb-3 flex items-center justify-between">
						<h4 className="text-lg font-semibold text-gray-900">
							{recommendedConfig.name} Plan
						</h4>
						<div className="text-right">
							<div className="text-primary text-2xl font-bold">
								${recommendedConfig.price.monthly}
								<span className="text-sm font-normal text-gray-600">
									/month
								</span>
							</div>
							{recommendedConfig.price.annual <
								recommendedConfig.price.monthly * 12 && (
								<div className="text-xs text-green-600">
									Save $
									{recommendedConfig.price.monthly * 12 -
										recommendedConfig.price.annual}
									/year
								</div>
							)}
						</div>
					</div>

					<p className="mb-4 text-sm text-gray-600">
						{recommendedConfig.description}
					</p>

					{recommendation.reasons.length > 0 && (
						<div className="mb-4 space-y-2">
							<h5 className="text-sm font-medium text-gray-900">
								Why we recommend this:
							</h5>
							{recommendation.reasons.map((reason, index) => (
								<div
									key={index}
									className="flex items-start gap-2 text-sm"
								>
									<reason.icon
										className={cn(
											'mt-0.5 h-4 w-4',
											getIconColor(reason.type)
										)}
									/>
									<span className="text-gray-700">
										{reason.text}
									</span>
								</div>
							))}
						</div>
					)}

					{onSelectPlan && (
						<Button
							onClick={() =>
								onSelectPlan(recommendation.planType)
							}
							className="bg-primary w-full text-white hover:bg-blue-700"
						>
							{recommendation.isUpgrade
								? 'Upgrade to'
								: 'Switch to'}{' '}
							{recommendedConfig.name}
						</Button>
					)}
				</div>

				<div className="text-center">
					<p className="text-xs text-blue-700">
						Recommendations based on your current usage of{' '}
						{usage.properties} properties,
						{usage.units} units, and {usage.tenants} team members.
					</p>
				</div>
			</CardContent>
		</Card>
	)
}
