'use client'

import { useState } from 'react'
import {
	DollarSign,
	Clock,
	AlertCircle,
	CheckCircle,
	TrendingUp,
	Search,
	Download,
	Zap,
	XCircle,
	Eye,
	Send
} from 'lucide-react'
import type {
	PaymentsListProps,
	PaymentStatus
} from '@repo/shared/types/sections/payments'

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2
	}).format(amount)
}

function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	})
}

function getStatusConfig(status: PaymentStatus) {
	const config: Record<
		PaymentStatus,
		{ className: string; icon: typeof CheckCircle; label: string }
	> = {
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
		requires_action: {
			className:
				'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
			icon: AlertCircle,
			label: 'Action Required'
		}
	}
	return config[status]
}

function getInitials(name: string): string {
	return name
		.split(' ')
		.map(n => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
}

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
				!payment.tenantName.toLowerCase().includes(query) &&
				!payment.propertyName.toLowerCase().includes(query)
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

			{/* Payments Table */}
			<div className="bg-card border border-border rounded-lg overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-muted/50 border-b border-border">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Tenant
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
									Property
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Due
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
									Paid
								</th>
								<th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Amount
								</th>
								<th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
									Fees
								</th>
								<th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
									Net
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Status
								</th>
								<th className="px-4 py-3"></th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{sortedPayments.map(payment => {
								const statusConfig = getStatusConfig(payment.status)
								const StatusIcon = statusConfig.icon

								return (
									<tr
										key={payment.id}
										className="hover:bg-muted/50 transition-colors"
									>
										<td className="px-4 py-4">
											<div className="flex items-center gap-3">
												<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
													<span className="text-xs font-medium text-primary">
														{getInitials(payment.tenantName)}
													</span>
												</div>
												<div>
													<p className="font-medium text-foreground text-sm">
														{payment.tenantName}
													</p>
													<p className="text-xs text-muted-foreground sm:hidden">
														{payment.propertyName}
													</p>
												</div>
											</div>
										</td>
										<td className="px-4 py-4 text-sm text-foreground hidden sm:table-cell">
											<span>{payment.propertyName}</span>
											<span className="text-muted-foreground">
												{' '}
												· {payment.unitNumber}
											</span>
										</td>
										<td className="px-4 py-4 text-sm text-foreground">
											{formatDate(payment.dueDate)}
										</td>
										<td className="px-4 py-4 text-sm text-foreground hidden md:table-cell">
											{payment.paidDate ? formatDate(payment.paidDate) : '-'}
										</td>
										<td className="px-4 py-4 text-right">
											<div>
												<span className="font-medium text-foreground">
													{formatCurrency(payment.amount)}
												</span>
												{payment.lateFee > 0 && (
													<p className="text-xs text-destructive">
														+{formatCurrency(payment.lateFee)} late
													</p>
												)}
											</div>
										</td>
										<td className="px-4 py-4 text-right text-sm text-muted-foreground hidden lg:table-cell">
											{payment.platformFee > 0
												? `-${formatCurrency(payment.platformFee)}`
												: '-'}
										</td>
										<td className="px-4 py-4 text-right hidden lg:table-cell">
											<span className="font-medium text-foreground">
												{payment.netAmount > 0
													? formatCurrency(payment.netAmount)
													: '-'}
											</span>
										</td>
										<td className="px-4 py-4">
											<div className="flex items-center gap-2">
												<span
													className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.className}`}
												>
													<StatusIcon className="w-3 h-3" />
													{statusConfig.label}
												</span>
												{payment.isAutopay && (
													<Zap
														className="w-3.5 h-3.5 text-primary"
														aria-label="Autopay enabled"
													/>
												)}
											</div>
										</td>
										<td className="px-4 py-4">
											<div className="flex items-center gap-1">
												<button
													onClick={() => onView?.(payment.id)}
													className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
													title="View details"
												>
													<Eye className="w-4 h-4" />
												</button>
												{(payment.status === 'failed' ||
													payment.status === 'pending') && (
													<button
														onClick={() => onSendReminder?.(payment.id)}
														className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
														title="Send reminder"
													>
														<Send className="w-4 h-4" />
													</button>
												)}
											</div>
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>

				{sortedPayments.length === 0 && (
					<div className="text-center py-12">
						<p className="text-muted-foreground">
							No payments match your filters
						</p>
					</div>
				)}
			</div>
		</div>
	)
}
