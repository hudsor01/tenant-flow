'use client'

import { useState } from 'react'
import {
	CreditCard,
	DollarSign,
	Clock,
	AlertCircle,
	CheckCircle,
	TrendingUp,
	Search,
	Filter,
	Download,
	MoreHorizontal,
	Calendar,
	User
} from 'lucide-react'
import { BlurFade } from '@/components/ui/blur-fade'
import { NumberTicker } from '@/components/ui/number-ticker'
import { BorderBeam } from '@/components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatDescription
} from '@/components/ui/stat'

type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'failed'

interface Payment {
	id: string
	tenantName: string
	propertyName: string
	unitNumber: string
	amount: number
	dueDate: string
	paidDate?: string
	status: PaymentStatus
	paymentMethod?: string
	lateFee?: number
}

interface PaymentsDashboardProps {
	payments: Payment[]
	onView?: (id: string) => void
	onRecordPayment?: () => void
	onExport?: () => void
}

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0
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
	const config = {
		paid: {
			className:
				'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
			icon: CheckCircle,
			label: 'Paid'
		},
		pending: {
			className:
				'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
			icon: Clock,
			label: 'Pending'
		},
		overdue: {
			className: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
			icon: AlertCircle,
			label: 'Overdue'
		},
		failed: {
			className:
				'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
			icon: AlertCircle,
			label: 'Failed'
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

export function PaymentsDashboard({
	payments,
	onView,
	onRecordPayment,
	onExport
}: PaymentsDashboardProps) {
	const [searchQuery, setSearchQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState('all')
	const [dateRange, setDateRange] = useState('this_month')

	// Stats
	const totalCollected = payments
		.filter(p => p.status === 'paid')
		.reduce((sum, p) => sum + p.amount, 0)
	const pendingAmount = payments
		.filter(p => p.status === 'pending')
		.reduce((sum, p) => sum + p.amount, 0)
	const overdueAmount = payments
		.filter(p => p.status === 'overdue')
		.reduce((sum, p) => sum + p.amount + (p.lateFee || 0), 0)
	const totalLateFees = payments.reduce((sum, p) => sum + (p.lateFee || 0), 0)

	// Filter
	const filteredPayments = payments.filter(payment => {
		if (
			searchQuery &&
			!payment.tenantName.toLowerCase().includes(searchQuery.toLowerCase())
		) {
			return false
		}
		if (statusFilter !== 'all' && payment.status !== statusFilter) {
			return false
		}
		return true
	})

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Breadcrumb */}
			<p className="text-sm text-muted-foreground mb-4">Payments</p>

			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="text-2xl font-semibold text-foreground">Payments</h1>
						<p className="text-muted-foreground">
							Track rent payments and manage collections.
						</p>
					</div>
					<div className="flex gap-2">
						<button
							onClick={onExport}
							className="inline-flex items-center gap-2 px-4 py-2.5 bg-card border border-border hover:bg-muted text-foreground font-medium rounded-lg transition-colors"
						>
							<Download className="w-4 h-4" />
							Export
						</button>
						<button
							onClick={onRecordPayment}
							className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
						>
							<DollarSign className="w-4 h-4" />
							Record Payment
						</button>
					</div>
				</div>
			</BlurFade>

			{/* Stats - Premium Stat Components */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<BlurFade delay={0.2} inView>
					<Stat className="relative overflow-hidden">
						<BorderBeam
							size={80}
							duration={10}
							colorFrom="hsl(142 76% 36%)"
							colorTo="hsl(142 76% 36% / 0.3)"
						/>
						<StatLabel>Collected (MTD)</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-emerald-600 dark:text-emerald-400">
							<span className="text-lg">$</span>
							<NumberTicker value={totalCollected} duration={1200} />
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<TrendingUp />
						</StatIndicator>
						<StatDescription>this month</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.3} inView>
					<Stat className="relative overflow-hidden">
						{pendingAmount > 0 && (
							<BorderBeam
								size={80}
								duration={6}
								colorFrom="hsl(45 93% 47%)"
								colorTo="hsl(45 93% 47% / 0.3)"
							/>
						)}
						<StatLabel>Pending</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-amber-600 dark:text-amber-400">
							<span className="text-lg">$</span>
							<NumberTicker value={pendingAmount} duration={1000} />
						</StatValue>
						<StatIndicator variant="icon" color="warning">
							<Clock />
						</StatIndicator>
						<StatDescription>awaiting payment</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.4} inView>
					<Stat className="relative overflow-hidden">
						{overdueAmount > 0 && (
							<BorderBeam
								size={80}
								duration={4}
								colorFrom="hsl(0 84% 60%)"
								colorTo="hsl(0 84% 60% / 0.3)"
							/>
						)}
						<StatLabel>Overdue</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-red-600 dark:text-red-400">
							<span className="text-lg">$</span>
							<NumberTicker value={overdueAmount} duration={1000} />
						</StatValue>
						<StatIndicator variant="icon" color="destructive">
							<AlertCircle />
						</StatIndicator>
						<StatDescription>
							{overdueAmount > 0 ? 'needs follow-up' : 'all good'}
						</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.5} inView>
					<Stat>
						<StatLabel>Late Fees</StatLabel>
						<StatValue className="flex items-baseline gap-0.5">
							<span className="text-lg">$</span>
							<NumberTicker value={totalLateFees} duration={1000} />
						</StatValue>
						<StatIndicator variant="icon" color="muted">
							<DollarSign />
						</StatIndicator>
						<StatDescription>collected</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			{/* Filters */}
			<BlurFade delay={0.6} inView>
				<div className="flex flex-col sm:flex-row gap-4 mb-6">
					<div className="relative flex-1 max-w-sm">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
						<input
							type="text"
							placeholder="Search payments..."
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							className="w-full pl-10 pr-4 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						/>
					</div>
					<select
						value={statusFilter}
						onChange={e => setStatusFilter(e.target.value)}
						className="px-4 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
					>
						<option value="all">All Status</option>
						<option value="paid">Paid</option>
						<option value="pending">Pending</option>
						<option value="overdue">Overdue</option>
						<option value="failed">Failed</option>
					</select>
					<select
						value={dateRange}
						onChange={e => setDateRange(e.target.value)}
						className="px-4 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
					>
						<option value="this_month">This Month</option>
						<option value="last_month">Last Month</option>
						<option value="last_90_days">Last 90 Days</option>
						<option value="this_year">This Year</option>
					</select>
				</div>
			</BlurFade>

			{/* Payments Table */}
			<BlurFade delay={0.7} inView>
				<div className="bg-card border border-border rounded-lg overflow-hidden">
					<table className="w-full">
						<thead className="bg-muted/50 border-b border-border">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
									Tenant
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
									Property
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
									Due Date
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
									Amount
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
									Status
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
									Method
								</th>
								<th className="px-6 py-3"></th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{filteredPayments.map((payment, idx) => {
								const statusConfig = getStatusConfig(payment.status)
								const StatusIcon = statusConfig.icon

								return (
									<BlurFade key={payment.id} delay={0.02 * idx} inView>
										<tr
											onClick={() => onView?.(payment.id)}
											className={`hover:bg-muted/50 cursor-pointer ${payment.status === 'overdue' ? 'bg-red-50/50 dark:bg-red-950/20' : ''}`}
										>
											<td className="px-6 py-4">
												<div className="flex items-center gap-3">
													<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
														<span className="text-xs font-medium text-primary">
															{getInitials(payment.tenantName)}
														</span>
													</div>
													<span className="font-medium text-foreground">
														{payment.tenantName}
													</span>
												</div>
											</td>
											<td className="px-6 py-4 text-sm text-foreground">
												{payment.propertyName} · Unit {payment.unitNumber}
											</td>
											<td className="px-6 py-4 text-sm text-foreground">
												{formatDate(payment.dueDate)}
											</td>
											<td className="px-6 py-4">
												<span className="font-medium text-foreground">
													{formatCurrency(payment.amount)}
												</span>
												{payment.lateFee && payment.lateFee > 0 && (
													<span className="text-xs text-red-600 ml-2">
														+{formatCurrency(payment.lateFee)} late fee
													</span>
												)}
											</td>
											<td className="px-6 py-4">
												<span
													className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.className}`}
												>
													<StatusIcon className="w-3.5 h-3.5" />
													{statusConfig.label}
												</span>
											</td>
											<td className="px-6 py-4 text-sm text-muted-foreground">
												{payment.paymentMethod || '-'}
											</td>
											<td className="px-6 py-4">
												<button
													onClick={e => e.stopPropagation()}
													className="p-2 rounded-lg hover:bg-muted transition-colors"
												>
													<MoreHorizontal className="w-4 h-4 text-muted-foreground" />
												</button>
											</td>
										</tr>
									</BlurFade>
								)
							})}
						</tbody>
					</table>

					{filteredPayments.length === 0 && (
						<div className="text-center py-12">
							<p className="text-muted-foreground">
								No payments match your filters
							</p>
						</div>
					)}
				</div>
			</BlurFade>
		</div>
	)
}
