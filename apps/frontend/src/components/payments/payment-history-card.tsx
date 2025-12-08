'use client'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { Separator } from '#components/ui/separator'
import type { PaymentHistoryItem } from '#hooks/api/use-payment-history'
import { cn } from '#lib/utils'
import { CreditCard, Download } from 'lucide-react'

interface PaymentHistoryCardProps {
	payment: PaymentHistoryItem
	statusClass?: string
}

function getStatusBadgeClass(status: string) {
	switch (status) {
		case 'succeeded':
			return 'bg-success/10 text-success-foreground border-success/20'
		case 'pending':
			return 'bg-warning/10 text-warning-foreground border-warning/20'
		case 'failed':
		case 'canceled':
			return 'bg-destructive/10 text-destructive-foreground border-destructive/20'
		default:
			return 'bg-muted text-muted-foreground border-border'
	}
}

export function PaymentHistoryCard({ payment, statusClass }: PaymentHistoryCardProps) {
	return (
		<div
			data-testid="payment-history-card"
			data-layout="stacked"
			className="rounded-lg border p-4 space-y-3 bg-card shadow-sm"
		>
			<div className="flex items-start justify-between gap-3">
				<div className="space-y-1 min-w-0">
					<p className="font-semibold leading-tight break-words">{payment.formattedDate}</p>
					<p className="text-muted text-sm break-words">
						{payment.description || 'Monthly Rent'}
					</p>
				</div>
				<p className="text-lg font-bold text-right whitespace-nowrap">
					{payment.formattedAmount}
				</p>
			</div>

			<Separator />

			<div className="flex flex-col gap-2">
				<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
					<CreditCard className="size-4" aria-hidden />
					<span className="capitalize">Credit Card</span>
					{payment.stripePaymentIntentId && (
						<span className="text-xs text-muted">{payment.stripePaymentIntentId}</span>
					)}
				</div>
				<div className="flex flex-wrap items-center gap-2 justify-between">
					<Badge
						variant="outline"
						className={cn(getStatusBadgeClass(payment.status), statusClass)}
					>
						{payment.status === 'succeeded'
							? 'Paid'
							: payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
					</Badge>
					<Button
						variant="outline"
						size="sm"
						aria-label={`Download receipt for ${payment.formattedDate}`}
						className="gap-2"
					>
						<Download className="size-4" aria-hidden />
						<span>Download receipt</span>
					</Button>
				</div>
			</div>
		</div>
	)
}
