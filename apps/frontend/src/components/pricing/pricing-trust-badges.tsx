'use client'

import { cn } from '#lib/utils'
import { Shield, Clock, CreditCard, Lock, Headphones, RefreshCcw } from 'lucide-react'

interface PricingTrustBadgesProps {
	className?: string
}

const trustBadges = [
	{
		icon: Shield,
		title: '90-Day ROI Guarantee',
		description: 'See results or get your money back'
	},
	{
		icon: Clock,
		title: '5-Minute Setup',
		description: 'Start managing properties today'
	},
	{
		icon: CreditCard,
		title: 'No Credit Card Required',
		description: 'Start your free trial instantly'
	},
	{
		icon: Lock,
		title: 'Bank-Level Security',
		description: '256-bit encryption & SOC 2 compliant'
	},
	{
		icon: Headphones,
		title: 'US-Based Support',
		description: 'Real humans, no chatbots'
	},
	{
		icon: RefreshCcw,
		title: 'Cancel Anytime',
		description: 'No long-term contracts'
	}
]

export function PricingTrustBadges({ className }: PricingTrustBadgesProps) {
	return (
		<div className={cn('w-full', className)}>
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
				{trustBadges.map(badge => (
					<div
						key={badge.title}
						className="flex flex-col items-center text-center p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
					>
						<div className="size-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
							<badge.icon className="size-5 text-primary" />
						</div>
						<div className="text-sm font-semibold text-foreground mb-1">
							{badge.title}
						</div>
						<div className="text-xs text-muted-foreground leading-tight">
							{badge.description}
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
