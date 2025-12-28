'use client'

import { useState } from 'react'
import {
	DollarSign,
	TrendingUp,
	AlertCircle,
	CheckCircle,
	Clock,
	Building2,
	Download,
	Send,
	Filter
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

interface RentCollectionSummary {
	totalDue: number
	collected: number
	outstanding: number
	collectionRate: number
	onTimePayments: number
	latePayments: number
	missedPayments: number
}

interface PropertyCollection {
	propertyId: string
	propertyName: string
	due: number
	collected: number
	outstanding: number
	rate: number
}

interface Payment {
	id: string
	tenantName: string
	property: string
	unit: string
	amount: number
	status: 'succeeded' | 'pending' | 'failed'
	paidDate?: string
	dueDate?: string
}

interface OutstandingPayment {
	id: string
	tenantName: string
	property: string
	unit: string
	amount: number
	dueDate: string
	daysOverdue: number
}

interface RentCollectionProps {
	summary: RentCollectionSummary
	byProperty: PropertyCollection[]
	recentPayments: Payment[]
	outstandingPayments: OutstandingPayment[]
	onSendReminder?: (paymentId: string) => void
	onExport?: () => void
}

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0
	}).format(amount / 100)
}

function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	})
}

export function RentCollection({
	summary,
	byProperty,
	recentPayments,
	outstandingPayments,
	onSendReminder,
	onExport
}: RentCollectionProps) {
	const [dateRange, setDateRange] = useState('this_month')

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="text-2xl font-semibold text-foreground">
							Rent Collection
						</h1>
						<p className="text-muted-foreground">
							Track payments and manage outstanding balances.
						</p>
					</div>
					<div className="flex gap-2">
						<select
							value={dateRange}
							onChange={e => setDateRange(e.target.value)}
							className="px-4 py-2.5 text-sm bg-card border border-border rounded-lg"
						>
							<option value="this_month">This Month</option>
							<option value="last_month">Last Month</option>
							<option value="this_quarter">This Quarter</option>
						</select>
						<button
							onClick={onExport}
							className="inline-flex items-center gap-2 px-4 py-2.5 bg-card border border-border hover:bg-muted rounded-lg transition-colors"
						>
							<Download className="w-4 h-4" />
							Export
						</button>
					</div>
				</div>
			</BlurFade>

			{/* Summary Stats */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				<BlurFade delay={0.2} inView>
					<Stat className="relative overflow-hidden">
						<BorderBeam
							size={100}
							duration={10}
							colorFrom="hsl(142 76% 36%)"
							colorTo="hsl(142 76% 36% / 0.3)"
						/>
						<StatLabel>Collected</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-emerald-600 dark:text-emerald-400">
							<span className="text-lg">$</span>
							<NumberTicker value={summary.collected / 100} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<CheckCircle />
						</StatIndicator>
						<StatDescription>
							{summary.collectionRate}% collection rate
						</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.3} inView>
					<Stat className="relative overflow-hidden">
						{summary.outstanding > 0 && (
							<BorderBeam
								size={80}
								duration={6}
								colorFrom="hsl(0 84% 60%)"
								colorTo="hsl(0 84% 60% / 0.3)"
							/>
						)}
						<StatLabel>Outstanding</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-red-600 dark:text-red-400">
							<span className="text-lg">$</span>
							<NumberTicker value={summary.outstanding / 100} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="destructive">
							<AlertCircle />
						</StatIndicator>
						<StatDescription>needs follow-up</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.4} inView>
					<Stat>
						<StatLabel>On-Time Payments</StatLabel>
						<StatValue className="flex items-baseline text-emerald-600 dark:text-emerald-400">
							<NumberTicker value={summary.onTimePayments} duration={1000} />
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<TrendingUp />
						</StatIndicator>
						<StatDescription>this period</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.5} inView>
					<Stat>
						<StatLabel>Late/Missed</StatLabel>
						<StatValue className="flex items-baseline text-amber-600 dark:text-amber-400">
							<NumberTicker
								value={summary.latePayments + summary.missedPayments}
								duration={1000}
							/>
						</StatValue>
						<StatIndicator variant="icon" color="warning">
							<Clock />
						</StatIndicator>
						<StatDescription>
							{summary.latePayments} late, {summary.missedPayments} missed
						</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			{/* Collection by Property */}
			<BlurFade delay={0.6} inView>
				<div className="bg-card border border-border rounded-lg p-6 mb-6">
					<h3 className="font-medium text-foreground mb-4">
						Collection by Property
					</h3>
					<div className="space-y-4">
						{byProperty.map((prop, idx) => (
							<BlurFade key={prop.propertyId} delay={0.7 + idx * 0.05} inView>
								<div className="flex items-center gap-4">
									<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
										<Building2 className="w-5 h-5 text-primary" />
									</div>
									<div className="flex-1">
										<div className="flex items-center justify-between mb-1">
											<span className="text-sm font-medium">
												{prop.propertyName}
											</span>
											<div className="flex items-center gap-3">
												<span className="text-sm text-muted-foreground">
													{formatCurrency(prop.collected)} /{' '}
													{formatCurrency(prop.due)}
												</span>
												<span
													className={`text-sm font-medium ${prop.rate >= 95 ? 'text-emerald-600' : prop.rate >= 80 ? 'text-amber-600' : 'text-red-600'}`}
												>
													{prop.rate}%
												</span>
											</div>
										</div>
										<div className="h-2 bg-muted rounded-full overflow-hidden">
											<div
												className={`h-full rounded-full transition-all duration-1000 ${prop.rate >= 95 ? 'bg-emerald-500' : prop.rate >= 80 ? 'bg-amber-500' : 'bg-red-500'}`}
												style={{ width: `${prop.rate}%` }}
											/>
										</div>
									</div>
								</div>
							</BlurFade>
						))}
					</div>
				</div>
			</BlurFade>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Recent Payments */}
				<BlurFade delay={0.8} inView>
					<div className="bg-card border border-border rounded-lg overflow-hidden">
						<div className="p-4 border-b border-border">
							<h3 className="font-medium text-foreground">Recent Payments</h3>
						</div>
						<div className="divide-y divide-border">
							{recentPayments.slice(0, 5).map((payment, idx) => (
								<BlurFade key={payment.id} delay={0.9 + idx * 0.05} inView>
									<div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
										<div className="flex items-center gap-3">
											<div
												className={`w-8 h-8 rounded-full flex items-center justify-center ${payment.status === 'succeeded' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}
											>
												{payment.status === 'succeeded' ? (
													<CheckCircle className="w-4 h-4 text-emerald-600" />
												) : (
													<Clock className="w-4 h-4 text-amber-600" />
												)}
											</div>
											<div>
												<p className="text-sm font-medium">
													{payment.tenantName}
												</p>
												<p className="text-xs text-muted-foreground">
													{payment.property} • {payment.unit}
												</p>
											</div>
										</div>
										<div className="text-right">
											<p className="text-sm font-medium">
												{formatCurrency(payment.amount)}
											</p>
											<p className="text-xs text-muted-foreground">
												{payment.paidDate
													? formatDate(payment.paidDate)
													: `Due ${payment.dueDate}`}
											</p>
										</div>
									</div>
								</BlurFade>
							))}
						</div>
					</div>
				</BlurFade>

				{/* Outstanding Payments */}
				<BlurFade delay={0.9} inView>
					<div className="bg-card border border-border rounded-lg overflow-hidden">
						<div className="p-4 border-b border-border flex items-center justify-between">
							<h3 className="font-medium text-foreground">
								Outstanding Payments
							</h3>
							<span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full">
								{outstandingPayments.length} overdue
							</span>
						</div>
						<div className="divide-y divide-border">
							{outstandingPayments.map((payment, idx) => (
								<BlurFade key={payment.id} delay={1 + idx * 0.05} inView>
									<div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
												<AlertCircle className="w-4 h-4 text-red-600" />
											</div>
											<div>
												<p className="text-sm font-medium">
													{payment.tenantName}
												</p>
												<p className="text-xs text-muted-foreground">
													{payment.property} • {payment.unit}
												</p>
											</div>
										</div>
										<div className="flex items-center gap-3">
											<div className="text-right">
												<p className="text-sm font-medium text-red-600">
													{formatCurrency(payment.amount)}
												</p>
												<p className="text-xs text-red-600">
													{payment.daysOverdue} days overdue
												</p>
											</div>
											<button
												onClick={() => onSendReminder?.(payment.id)}
												className="p-2 hover:bg-muted rounded-lg transition-colors"
												title="Send Reminder"
											>
												<Send className="w-4 h-4 text-muted-foreground" />
											</button>
										</div>
									</div>
								</BlurFade>
							))}
						</div>
					</div>
				</BlurFade>
			</div>
		</div>
	)
}
