'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type BillingInterval = 'monthly' | 'annual'

interface BillingToggleProps {
	value: BillingInterval
	onChange: (interval: BillingInterval) => void
	className?: string
}

/**
 * Client component for billing interval toggle
 * Needs interactivity for state management
 */
export function BillingToggle({
	value,
	onChange,
	className
}: BillingToggleProps) {
	return (
		<div className={`mb-12 flex justify-center ${className || ''}`}>
			<div className="bg-muted inline-flex rounded-lg p-1">
				<button
					onClick={() => onChange('monthly')}
					className={cn(
						'rounded-md px-6 py-3 text-sm font-medium transition-all',
						value === 'monthly'
							? 'bg-background text-foreground shadow-sm'
							: 'text-muted-foreground hover:text-foreground'
					)}
				>
					Monthly Billing
				</button>
				<button
					onClick={() => onChange('annual')}
					className={cn(
						'relative rounded-md px-6 py-3 text-sm font-medium transition-all',
						value === 'annual'
							? 'bg-background text-foreground shadow-sm'
							: 'text-muted-foreground hover:text-foreground'
					)}
				>
					Annual Billing
					<Badge
						variant="secondary"
						className="absolute -top-2 -right-2 text-xs"
					>
						Save up to 17%
					</Badge>
				</button>
			</div>
		</div>
	)
}
