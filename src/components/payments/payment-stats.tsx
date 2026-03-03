'use client'

import { DollarSign, Clock, AlertCircle, TrendingUp } from 'lucide-react'
import { formatCurrency } from './payment-utils'

interface PaymentStatsProps {
	totalCollected: number
	pendingAmount: number
	overdueAmount: number
	netToOwner: number
	totalLateFees: number
	totalPlatformFees: number
}

export function PaymentStats({
	totalCollected,
	pendingAmount,
	overdueAmount,
	netToOwner,
	totalLateFees,
	totalPlatformFees
}: PaymentStatsProps) {
	return (
		<>
			{/* Stats */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<div className="bg-card border border-success/30 rounded-lg px-4 py-3 flex items-center justify-between">
					<div>
						<p className="text-2xl font-semibold text-foreground">
							{formatCurrency(totalCollected)}
						</p>
						<p className="text-xs text-muted-foreground">Collected</p>
					</div>
					<div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
						<TrendingUp className="w-4 h-4 text-success" />
					</div>
				</div>
				<div className="bg-card border border-warning/30 rounded-lg px-4 py-3 flex items-center justify-between">
					<div>
						<p className="text-2xl font-semibold text-foreground">
							{formatCurrency(pendingAmount)}
						</p>
						<p className="text-xs text-muted-foreground">Pending</p>
					</div>
					<div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
						<Clock className="w-4 h-4 text-warning" />
					</div>
				</div>
				<div className="bg-card border border-destructive/30 rounded-lg px-4 py-3 flex items-center justify-between">
					<div>
						<p className="text-2xl font-semibold text-foreground">
							{formatCurrency(overdueAmount)}
						</p>
						<p className="text-xs text-muted-foreground">Overdue</p>
					</div>
					<div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
						<AlertCircle className="w-4 h-4 text-destructive" />
					</div>
				</div>
				<div className="bg-card border border-primary/30 rounded-lg px-4 py-3 flex items-center justify-between">
					<div>
						<p className="text-2xl font-semibold text-foreground">
							{formatCurrency(netToOwner)}
						</p>
						<p className="text-xs text-muted-foreground">Net to You</p>
					</div>
					<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
						<DollarSign className="w-4 h-4 text-primary" />
					</div>
				</div>
			</div>

			{/* Fee Summary */}
			<div className="bg-card border border-border rounded-lg p-4 mb-6">
				<div className="flex flex-wrap items-center gap-6 text-sm">
					<div className="flex items-center gap-2">
						<span className="text-muted-foreground">Late Fees Collected:</span>
						<span className="font-medium text-foreground">
							{formatCurrency(totalLateFees)}
						</span>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-muted-foreground">Platform Fees:</span>
						<span className="font-medium text-foreground">
							-{formatCurrency(totalPlatformFees)}
						</span>
					</div>
				</div>
			</div>
		</>
	)
}
