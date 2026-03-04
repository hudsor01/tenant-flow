'use client'

import { Check, Sparkles } from 'lucide-react'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '#components/ui/card'
import { cn } from '#lib/utils'

export interface PlanFeature {
	name: string
	included: boolean
}

export interface Plan {
	id: string
	name: string
	description: string
	price: number
	priceId: string | null
	features: PlanFeature[]
	tier: number
}

interface PlanCardProps {
	plan: Plan
	isCurrentPlan: boolean
	isMostPopular: boolean
	currentTier: number | null
	onSelect: (plan: Plan) => void
	isLoading?: boolean
}

export function PlanCard({
	plan,
	isCurrentPlan,
	isMostPopular,
	currentTier,
	onSelect,
	isLoading = false
}: PlanCardProps) {
	const isUpgrade = currentTier !== null && plan.tier > currentTier
	const isDowngrade = currentTier !== null && plan.tier < currentTier

	const getCtaLabel = () => {
		if (isCurrentPlan) return 'Current Plan'
		if (currentTier === null) return 'Get Started'
		if (isUpgrade) return 'Upgrade'
		if (isDowngrade) return 'Downgrade'
		return 'Select'
	}

	const ctaLabel = getCtaLabel()

	return (
		<Card
			variant={isMostPopular ? 'pricingPopular' : 'pricing'}
			className={cn(
				'relative flex flex-col',
				isCurrentPlan && 'border-primary/50 bg-primary/5'
			)}
		>
			{/* Badges */}
			<div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-2">
				{isMostPopular && !isCurrentPlan && (
					<Badge variant="default" className="shadow-md">
						<Sparkles className="mr-1 size-3" />
						Most Popular
					</Badge>
				)}
				{isCurrentPlan && (
					<Badge variant="success" className="shadow-md">
						Current Plan
					</Badge>
				)}
			</div>

			<CardHeader className="pt-8 pb-4">
				<h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
				<p className="text-sm text-muted-foreground">{plan.description}</p>
			</CardHeader>

			<CardContent className="flex-1">
				{/* Price */}
				<div className="mb-6">
					{plan.price === 0 ? (
						<div className="flex items-baseline gap-1">
							<span className="text-4xl font-bold text-foreground">Free</span>
						</div>
					) : (
						<div className="flex items-baseline gap-1">
							<span className="text-4xl font-bold text-foreground">
								${plan.price}
							</span>
							<span className="text-muted-foreground">/mo</span>
						</div>
					)}
				</div>

				{/* Features */}
				<ul className="space-y-3">
					{plan.features.map(feature => (
						<li
							key={feature.name}
							className={cn(
								'flex items-start gap-2 text-sm',
								feature.included
									? 'text-foreground'
									: 'text-muted-foreground/60 line-through'
							)}
						>
							<Check
								className={cn(
									'size-4 shrink-0 mt-0.5',
									feature.included ? 'text-success' : 'text-muted-foreground/40'
								)}
							/>
							<span>{feature.name}</span>
						</li>
					))}
				</ul>
			</CardContent>

			<CardFooter className="pt-4">
				<Button
					variant={
						isCurrentPlan ? 'outline' : isMostPopular ? 'default' : 'outline'
					}
					size="lg"
					className="w-full min-h-11"
					disabled={isCurrentPlan || isLoading}
					onClick={() => onSelect(plan)}
				>
					{isLoading ? 'Loading...' : ctaLabel}
				</Button>
			</CardFooter>
		</Card>
	)
}
