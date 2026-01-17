'use client'

import {
	ArrowDownRight,
	Banknote,
	Calendar,
	CheckCircle,
	Clock,
	CreditCard,
	XCircle
} from 'lucide-react'

import { Badge } from '#components/ui/badge'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import { Separator } from '#components/ui/separator'
import { Skeleton } from '#components/ui/skeleton'
import type { Payout } from '#hooks/api/use-stripe-connect'
import { formatCurrency } from '#lib/formatters/currency'
import { cn } from '#lib/utils'

interface PayoutDetailsModalProps {
	payout: Payout | null
	open: boolean
	onOpenChange: (open: boolean) => void
}

function getStatusConfig(status: string) {
	switch (status) {
		case 'paid':
			return {
				label: 'Paid',
				variant: 'success' as const,
				icon: CheckCircle,
				description: 'Successfully deposited to your bank account'
			}
		case 'pending':
			return {
				label: 'Pending',
				variant: 'warning' as const,
				icon: Clock,
				description: 'Payout is being processed'
			}
		case 'in_transit':
			return {
				label: 'In Transit',
				variant: 'default' as const,
				icon: ArrowDownRight,
				description: 'On the way to your bank account'
			}
		case 'cancelled':
			return {
				label: 'Cancelled',
				variant: 'destructive' as const,
				icon: XCircle,
				description: 'Payout was cancelled'
			}
		case 'failed':
			return {
				label: 'Failed',
				variant: 'destructive' as const,
				icon: XCircle,
				description: 'Payout failed to process'
			}
		default:
			return {
				label: status,
				variant: 'secondary' as const,
				icon: Clock,
				description: 'Processing'
			}
	}
}

function formatTimestamp(timestamp: number) {
	return new Date(timestamp * 1000).toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	})
}

function formatShortDate(timestamp: number) {
	return new Date(timestamp * 1000).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	})
}

export function PayoutDetailsModal({
	payout,
	open,
	onOpenChange
}: PayoutDetailsModalProps) {
	if (!payout) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Payout Details</DialogTitle>
						<DialogDescription>Loading payout information...</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<Skeleton className="h-16 w-full" />
						<Skeleton className="h-24 w-full" />
						<Skeleton className="h-32 w-full" />
					</div>
				</DialogContent>
			</Dialog>
		)
	}

	const statusConfig = getStatusConfig(payout.status)
	const StatusIcon = statusConfig.icon

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Banknote className="size-5 text-primary" />
						Payout Details
					</DialogTitle>
					<DialogDescription>{statusConfig.description}</DialogDescription>
				</DialogHeader>

				{/* Amount */}
				<div className="rounded-lg border bg-muted/50 p-6 text-center">
					<p className="text-sm text-muted-foreground mb-1">Payout Amount</p>
					<p className="text-4xl font-bold text-foreground">
						{formatCurrency(payout.amount / 100)}
					</p>
					<div className="mt-3">
						<Badge variant={statusConfig.variant} className="gap-1">
							<StatusIcon className="size-3" />
							{statusConfig.label}
						</Badge>
					</div>
				</div>

				<Separator />

				{/* Details Grid */}
				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<p className="text-xs text-muted-foreground flex items-center gap-1">
								<Calendar className="size-3" />
								Created
							</p>
							<p className="text-sm font-medium">
								{formatShortDate(payout.created)}
							</p>
						</div>
						<div className="space-y-1">
							<p className="text-xs text-muted-foreground flex items-center gap-1">
								<ArrowDownRight className="size-3" />
								Arrival Date
							</p>
							<p className="text-sm font-medium">
								{formatTimestamp(payout.arrival_date)}
							</p>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<p className="text-xs text-muted-foreground flex items-center gap-1">
								<CreditCard className="size-3" />
								Method
							</p>
							<p className="text-sm font-medium capitalize">{payout.method}</p>
						</div>
						<div className="space-y-1">
							<p className="text-xs text-muted-foreground">Type</p>
							<p className="text-sm font-medium capitalize">{payout.type}</p>
						</div>
					</div>

					{payout.description && (
						<div className="space-y-1">
							<p className="text-xs text-muted-foreground">Description</p>
							<p className="text-sm">{payout.description}</p>
						</div>
					)}

					{/* Failure Message */}
					{payout.failure_message && (
						<div
							className={cn(
								'rounded-lg border p-3',
								'border-destructive/30 bg-destructive/10'
							)}
						>
							<p className="text-xs text-destructive font-medium mb-1">
								Failure Reason
							</p>
							<p className="text-sm text-destructive/90">
								{payout.failure_message}
							</p>
						</div>
					)}

					{/* Payout ID */}
					<div className="rounded-lg border bg-muted/30 p-3">
						<p className="text-xs text-muted-foreground mb-1">Payout ID</p>
						<p className="text-xs font-mono text-muted-foreground">
							{payout.id}
						</p>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
