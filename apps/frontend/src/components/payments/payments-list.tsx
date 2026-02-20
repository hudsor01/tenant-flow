'use client'

import { useState } from 'react'
import { DollarSign, Search, Download } from 'lucide-react'
import type { PaymentsListProps } from '@repo/shared/types/sections/payments'
import type { PaymentStatus } from '@repo/shared/types/core'
import { PaymentStats } from './payment-stats'
import { PaymentsTable } from './payments-table'

export function PaymentsList({
	payments,
	onView,
	onMarkPaid: _onMarkPaid,
	onSendReminder,
	onFilterChange: _onFilterChange
}: PaymentsListProps) {
	const [searchQuery, setSearchQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all')

	// Stats
	const paidPayments = payments.filter(p => p.status === 'succeeded')
	const totalCollected = paidPayments.reduce(
		(sum, p) => sum + p.amount + p.lateFee,
		0
	)
	const totalPlatformFees = paidPayments.reduce(
		(sum, p) => sum + p.platformFee,
		0
	)
	const totalLateFees = paidPayments.reduce((sum, p) => sum + p.lateFee, 0)
	const netToOwner = paidPayments.reduce((sum, p) => sum + p.netAmount, 0)

	const pendingAmount = payments
		.filter(p => p.status === 'pending')
		.reduce((sum, p) => sum + p.amount, 0)
	const overdueAmount = payments
		.filter(p => p.status === 'failed')
		.reduce((sum, p) => sum + p.amount + p.lateFee, 0)

	// Filter
	const filteredPayments = payments.filter(payment => {
		if (searchQuery) {
			const query = searchQuery.toLowerCase()
			if (
				!(payment.tenantName ?? '').toLowerCase().includes(query) &&
				!(payment.propertyName ?? '').toLowerCase().includes(query)
			) {
				return false
			}
		}
		if (statusFilter !== 'all' && payment.status !== statusFilter) {
			return false
		}
		return true
	})

	// Sort by due date (most recent first)
	const sortedPayments = [...filteredPayments].sort(
		(a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
	)

	if (payments.length === 0) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<div className="max-w-md mx-auto text-center py-16">
					<div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-6">
						<DollarSign className="w-8 h-8 text-primary" />
					</div>
					<h2 className="text-xl font-semibold text-foreground mb-3">
						No payments yet
					</h2>
					<p className="text-muted-foreground mb-6">
						Rent payments from your tenants will appear here.
					</p>
				</div>
			</div>
		)
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
				<div>
					<h1 className="text-2xl font-semibold text-foreground">Payments</h1>
					<p className="text-muted-foreground">
						Track rent payments and collections
					</p>
				</div>
				<button className="inline-flex items-center gap-2 px-4 py-2.5 bg-card border border-border hover:bg-muted text-foreground font-medium rounded-md transition-colors">
					<Download className="w-4 h-4" />
					Export
				</button>
			</div>

			<PaymentStats
				totalCollected={totalCollected}
				pendingAmount={pendingAmount}
				overdueAmount={overdueAmount}
				netToOwner={netToOwner}
				totalLateFees={totalLateFees}
				totalPlatformFees={totalPlatformFees}
			/>

			{/* Filters */}
			<div className="flex flex-col sm:flex-row gap-4 mb-6">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<input
						type="text"
						placeholder="Search by tenant or property..."
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
						className="w-full pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
					/>
				</div>
				<select
					value={statusFilter}
					onChange={e =>
						setStatusFilter(e.target.value as 'all' | PaymentStatus)
					}
					className="appearance-none px-4 py-2.5 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all"
				>
					<option value="all">All Status</option>
					<option value="paid">Paid</option>
					<option value="pending">Pending</option>
					<option value="late">Late</option>
					<option value="failed">Failed</option>
				</select>
				<span className="text-sm text-muted-foreground self-center">
					{sortedPayments.length} payments
				</span>
			</div>

			<PaymentsTable
				payments={sortedPayments}
				onView={onView}
				onSendReminder={onSendReminder}
			/>
		</div>
	)
}
