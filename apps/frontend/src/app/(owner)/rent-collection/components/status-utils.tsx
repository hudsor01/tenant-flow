import { CheckCircle, Clock, Pause, XCircle } from 'lucide-react'

export type SubscriptionStatus = 'active' | 'paused' | 'canceled'

export type PaymentStatusType =
	| 'succeeded'
	| 'pending'
	| 'processing'
	| 'failed'
	| 'canceled'

export function getStatusBadge(status: SubscriptionStatus) {
	const styles: Record<SubscriptionStatus, string> = {
		active:
			'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
		paused:
			'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
		canceled:
			'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
	}
	const labels: Record<SubscriptionStatus, string> = {
		active: 'Active',
		paused: 'Paused',
		canceled: 'Canceled'
	}
	return (
		<span
			className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${styles[status]}`}
		>
			{status === 'active' && <CheckCircle className="w-3 h-3" />}
			{status === 'paused' && <Pause className="w-3 h-3" />}
			{status === 'canceled' && <XCircle className="w-3 h-3" />}
			{labels[status]}
		</span>
	)
}

export function getPaymentStatusConfig(status: string) {
	const statusMap: Record<
		PaymentStatusType,
		{
			className: string
			label: string
			Icon: typeof CheckCircle
		}
	> = {
		succeeded: {
			className:
				'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
			label: 'Paid',
			Icon: CheckCircle
		},
		pending: {
			className:
				'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
			label: 'Pending',
			Icon: Clock
		},
		processing: {
			className:
				'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
			label: 'Processing',
			Icon: Clock
		},
		failed: {
			className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
			label: 'Failed',
			Icon: XCircle
		},
		canceled: {
			className:
				'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
			label: 'Canceled',
			Icon: XCircle
		}
	}
	const defaultConfig = {
		className:
			'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
		label: 'Pending',
		Icon: Clock
	}
	return statusMap[status as PaymentStatusType] ?? defaultConfig
}

export function getPaymentStatusBadge(status: string) {
	const config = getPaymentStatusConfig(status)
	const StatusIcon = config.Icon
	return (
		<span
			className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${config.className}`}
		>
			<StatusIcon className="w-3 h-3" />
			{config.label}
		</span>
	)
}
