'use client'

import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Check, Sparkles, Zap, Crown, Rocket } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BillingInterval } from './billing-toggle'

interface PricingPlan {
	id: string
	name: string
	description: string
	monthlyPrice: number
	annualPrice: number
	monthlyPriceId: string
	annualPriceId: string
	features: string[]
	iconName: 'Sparkles' | 'Zap' | 'Crown' | 'Rocket'
	popular?: boolean
	propertyLimit: number | 'unlimited'
	unitLimit: number | 'unlimited'
	supportLevel: string
}

// Icon mapping for client-side rendering
const iconMap = {
	Sparkles,
	Zap,
	Crown,
	Rocket
} as const

interface PricingPlanCardProps {
	plan: PricingPlan
	billingInterval: BillingInterval
	isCurrentPlan: boolean
	isLoading: boolean
	onSelect: (plan: PricingPlan) => void
	className?: string
}

/**
 * Client component for individual pricing plan card
 * Needs interactivity for button clicks
 */
export function PricingPlanCard({
	plan,
	billingInterval,
	isCurrentPlan,
	isLoading,
	onSelect,
	className
}: PricingPlanCardProps) {
	const Icon = iconMap[plan.iconName]
	const price =
		billingInterval === 'monthly' ? plan.monthlyPrice : plan.annualPrice

	const calculateSavings = (monthlyPrice: number, annualPrice: number) => {
		const yearlyCost = monthlyPrice * 12
		const savings = yearlyCost - annualPrice
		const percentSaved = Math.round((savings / yearlyCost) * 100)
		return percentSaved
	}

	const savings =
		plan.annualPrice > 0
			? calculateSavings(plan.monthlyPrice, plan.annualPrice)
			: 0

	return (
		<Card
			className={cn(
				'relative flex min-w-[280px] flex-col transition-all hover:shadow-xl',
				plan.popular && 'border-primary z-10 shadow-lg lg:scale-105',
				className
			)}
		>
			{plan.popular && (
				<div className="absolute -top-4 right-0 left-0 mx-auto w-fit">
					<Badge className="from-primary to-primary/80 text-primary-foreground bg-gradient-to-r px-4 py-1">
						MOST POPULAR
					</Badge>
				</div>
			)}

			<CardHeader className="pb-4">
				<div className="mb-2 flex items-center justify-between">
					<Icon className="text-primary h-8 w-8 flex-shrink-0" />
					{isCurrentPlan && (
						<Badge variant="outline" className="text-xs">
							Current Plan
						</Badge>
					)}
				</div>
				<CardTitle className="text-xl lg:text-2xl">
					{plan.name}
				</CardTitle>
				<CardDescription className="mt-2 text-sm">
					{plan.description}
				</CardDescription>
			</CardHeader>

			<CardContent className="flex flex-1 flex-col space-y-4">
				<div className="space-y-1">
					<div className="flex items-baseline gap-1">
						<span className="text-4xl font-bold">${price}</span>
						<span className="text-muted-foreground">
							/{billingInterval === 'monthly' ? 'month' : 'year'}
						</span>
					</div>
					{billingInterval === 'annual' && plan.monthlyPrice > 0 && (
						<p className="text-muted-foreground text-sm">
							${(plan.annualPrice / 12).toFixed(2)}/month billed
							annually
							{savings > 0 && (
								<Badge
									variant="secondary"
									className="ml-2 text-xs"
								>
									Save {savings}%
								</Badge>
							)}
						</p>
					)}
				</div>

				{/* Key Limits */}
				<div className="space-y-2 pb-3">
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">
							Properties
						</span>
						<span className="font-semibold tabular-nums">
							{plan.propertyLimit === 'unlimited'
								? '∞'
								: plan.propertyLimit}
						</span>
					</div>
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Units</span>
						<span className="font-semibold tabular-nums">
							{plan.unitLimit === 'unlimited'
								? '∞'
								: plan.unitLimit}
						</span>
					</div>
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Support</span>
						<span className="max-w-[100px] truncate text-xs font-semibold">
							{plan.supportLevel}
						</span>
					</div>
				</div>

				<Separator className="my-3" />

				{/* Features List */}
				<ScrollArea className="h-[180px] pr-3">
					<ul className="space-y-2">
						{plan.features.map((feature, index) => (
							<li key={index} className="flex items-start gap-2">
								<Check className="text-primary mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
								<span className="text-sm leading-relaxed break-words">
									{feature}
								</span>
							</li>
						))}
					</ul>
				</ScrollArea>
			</CardContent>

			<CardFooter className="pt-4">
				<Button
					className="w-full"
					size="default"
					variant={plan.popular ? 'default' : 'outline'}
					disabled={isCurrentPlan || isLoading}
					onClick={() => onSelect(plan)}
				>
					{isLoading ? (
						<span className="flex items-center gap-2">
							<span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
							Processing...
						</span>
					) : isCurrentPlan ? (
						'Current Plan'
					) : plan.id === 'FREE_TRIAL' ? (
						'Start Free Trial'
					) : (
						'Get Started'
					)}
				</Button>
			</CardFooter>
		</Card>
	)
}
