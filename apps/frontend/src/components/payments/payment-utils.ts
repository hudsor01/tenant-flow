import {
	CheckCircle,
	Clock,
	XCircle,
	AlertCircle,
	type LucideIcon
} from 'lucide-react'
import type { PaymentStatus } from '@repo/shared/types/core'

export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2
	}).format(amount)
}

export function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	})
}

export interface StatusConfig {
	className: string
	icon: LucideIcon
	label: string
}

export function getStatusConfig(status: PaymentStatus): StatusConfig {
	const config: Record<PaymentStatus, StatusConfig> = {
		succeeded: {
			className:
				'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
			icon: CheckCircle,
			label: 'Paid'
		},
		pending: {
			className:
				'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
			icon: Clock,
			label: 'Pending'
		},
		processing: {
			className:
				'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
			icon: Clock,
			label: 'Processing'
		},
		failed: {
			className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
			icon: XCircle,
			label: 'Failed'
		},
		canceled: {
			className:
				'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
			icon: XCircle,
			label: 'Canceled'
		},
		cancelled: {
			className:
				'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
			icon: XCircle,
			label: 'Canceled'
		},
		requires_action: {
			className:
				'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
			icon: AlertCircle,
			label: 'Action Required'
		}
	}

	return (
		config[status] ?? {
			className:
				'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
			icon: Clock,
			label: status
		}
	)
}

export function getInitials(name: string): string {
	return name
		.split(' ')
		.map(n => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
}
