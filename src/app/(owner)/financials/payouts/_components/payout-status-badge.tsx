'use client'

import { CheckCircle, Clock, ArrowDownRight, XCircle } from 'lucide-react'

export function getPayoutStatusBadge(status: string) {
	switch (status) {
		case 'paid':
			return (
				<span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
					<CheckCircle className="w-3.5 h-3.5" />
					Paid
				</span>
			)
		case 'pending':
			return (
				<span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
					<Clock className="w-3.5 h-3.5" />
					Pending
				</span>
			)
		case 'in_transit':
			return (
				<span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
					<ArrowDownRight className="w-3.5 h-3.5" />
					In Transit
				</span>
			)
		case 'cancelled':
		case 'failed':
			return (
				<span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
					<XCircle className="w-3.5 h-3.5" />
					{status.charAt(0).toUpperCase() + status.slice(1)}
				</span>
			)
		default:
			return (
				<span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground">
					{status}
				</span>
			)
	}
}
