import type { UnitStatus } from '@repo/shared/types/core'
import { Home, User, Wrench } from 'lucide-react'

// Status badge configuration matching spec
export const statusConfig: Record<
	UnitStatus,
	{ label: string; className: string; icon: typeof Home }
> = {
	occupied: {
		label: 'Occupied',
		className:
			'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
		icon: User
	},
	available: {
		label: 'Available',
		className:
			'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
		icon: Home
	},
	maintenance: {
		label: 'Maintenance',
		className:
			'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
		icon: Wrench
	},
	reserved: {
		label: 'Reserved',
		className:
			'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
		icon: Home
	}
}

export function formatUnitCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(amount)
}
