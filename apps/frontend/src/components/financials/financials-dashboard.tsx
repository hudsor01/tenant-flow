'use client'

import { useState } from 'react'
import {
	DollarSign,
	TrendingUp,
	TrendingDown,
	Building2,
	Download,
	PieChart,
	BarChart3,
	CreditCard,
	Wallet
} from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { NumberTicker } from '#components/ui/number-ticker'
import { BorderBeam } from '#components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatTrend,
	StatDescription
} from '#components/ui/stat'
import { AnimatedTrendIndicator } from '#components/ui/animated-trend-indicator'

interface RevenueData {
	month: string
	revenue: number
	expenses: number
}

interface PropertyRevenue {
	propertyName: string
	revenue: number
	percentage: number
	trend: 'up' | 'down' | 'neutral'
}

interface Payout {
	id: string
	amount: number
	date: string
	status: 'completed' | 'pending' | 'scheduled'
	bankAccount: string
}

interface FinancialsDashboardProps {
	revenueData: RevenueData[]
	propertyRevenue: PropertyRevenue[]
	payouts: Payout[]
	totalRevenue: number
	totalExpenses: number
	netIncome: number
	pendingPayouts: number
	onExport?: () => void
	onViewPayouts?: () => void
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
		day: 'numeric'
	})
}

export function FinancialsDashboard({
	revenueData,
	propertyRevenue,
	payouts,
	totalRevenue,
	totalExpenses,
	netIncome,
	pendingPayouts,
	onExport,
	onViewPayouts
}: FinancialsDashboardProps) {
	const [dateRange, setDateRange] = useState('this_month')

	const revenueChange = 12.5 // Mock percentage change
	const expenseChange = -3.2

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="text-2xl font-semibold text-foreground">
							Financials
						</h1>
						<p className="text-muted-foreground">
							Revenue analytics and payout management.
						</p>
					</div>
					<div className="flex gap-2">
						<select
							value={dateRange}
							onChange={e => setDateRange(e.target.value)}
							className="px-4 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						>
							<option value="this_month">This Month</option>
							<option value="last_month">Last Month</option>
							<option value="this_quarter">This Quarter</option>
							<option value="this_year">This Year</option>
						</select>
						<button
							onClick={onExport}
							className="inline-flex items-center gap-2 px-4 py-2.5 bg-card border border-border hover:bg-muted text-foreground font-medium rounded-lg transition-colors"
						>
							<Download className="w-4 h-4" />
							Export
						</button>
					</div>
				</div>
			</BlurFade>

			{/* Summary Stats - Premium Stat Components */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				<BlurFade delay={0.2} inView>
					<Stat className="relative overflow-hidden">
						<BorderBeam
							size={100}
							duration={10}
							colorFrom="hsl(142 76% 36%)"
							colorTo="hsl(142 76% 36% / 0.3)"
						/>
						<StatLabel>Total Revenue</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-emerald-600 dark:text-emerald-400">
							<span className="text-lg">$</span>
							<NumberTicker value={totalRevenue} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<TrendingUp />
						</StatIndicator>
						<StatTrend trend="up">
							<AnimatedTrendIndicator
								value={revenueChange}
								size="sm"
								delay={500}
							/>
							<span className="text-muted-foreground">vs last period</span>
						</StatTrend>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.3} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Total Expenses</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-red-600 dark:text-red-400">
							<span className="text-lg">$</span>
							<NumberTicker value={totalExpenses} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="destructive">
							<TrendingDown />
						</StatIndicator>
						<StatTrend trend="down">
							<AnimatedTrendIndicator
								value={expenseChange}
								size="sm"
								delay={600}
							/>
							<span className="text-muted-foreground">reduced</span>
						</StatTrend>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.4} inView>
					<Stat className="relative overflow-hidden">
						<BorderBeam
							size={100}
							duration={12}
							colorFrom="hsl(var(--primary))"
							colorTo="hsl(var(--primary)/0.3)"
						/>
						<StatLabel>Net Income</StatLabel>
						<StatValue className="flex items-baseline gap-0.5">
							<span className="text-lg">$</span>
							<NumberTicker value={netIncome} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<DollarSign />
						</StatIndicator>
						<StatDescription>after all expenses</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.5} inView>
					<Stat className="relative overflow-hidden">
						{pendingPayouts > 0 && (
							<BorderBeam
								size={80}
								duration={6}
								colorFrom="hsl(45 93% 47%)"
								colorTo="hsl(45 93% 47% / 0.3)"
							/>
						)}
						<StatLabel>Pending Payouts</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-amber-600 dark:text-amber-400">
							<span className="text-lg">$</span>
							<NumberTicker value={pendingPayouts} duration={1000} />
						</StatValue>
						<StatIndicator variant="icon" color="warning">
							<Wallet />
						</StatIndicator>
						<StatDescription>to be transferred</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			{/* Charts Row */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
				{/* Revenue Chart */}
				<BlurFade delay={0.6} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">Revenue Trend</h3>
								<p className="text-sm text-muted-foreground">
									Monthly revenue over time
								</p>
							</div>
							<BarChart3 className="w-5 h-5 text-muted-foreground" />
						</div>

						{/* Mock Chart */}
						<div className="h-48 flex items-end gap-2">
							{revenueData.map((data, index) => (
								<BlurFade key={index} delay={0.7 + index * 0.05} inView>
									<div className="flex-1 flex flex-col items-center gap-2">
										<div
											className="w-full bg-primary/20 rounded-t transition-all hover:bg-primary/30"
											style={{
												height: `${(data.revenue / Math.max(...revenueData.map(d => d.revenue))) * 100}%`
											}}
										>
											<div
												className="w-full bg-primary rounded-t"
												style={{ height: '70%' }}
											/>
										</div>
										<span className="text-xs text-muted-foreground">
											{data.month}
										</span>
									</div>
								</BlurFade>
							))}
						</div>
					</div>
				</BlurFade>

				{/* Revenue by Property */}
				<BlurFade delay={0.7} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">
									Revenue by Property
								</h3>
								<p className="text-sm text-muted-foreground">
									Breakdown by property
								</p>
							</div>
							<PieChart className="w-5 h-5 text-muted-foreground" />
						</div>

						<div className="space-y-4">
							{propertyRevenue.map((property, index) => (
								<BlurFade key={index} delay={0.8 + index * 0.05} inView>
									<div className="flex items-center gap-4">
										<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
											<Building2 className="w-5 h-5 text-primary" />
										</div>
										<div className="flex-1">
											<div className="flex items-center justify-between mb-1">
												<span className="text-sm font-medium text-foreground">
													{property.propertyName}
												</span>
												<span className="text-sm text-foreground">
													{formatCurrency(property.revenue)}
												</span>
											</div>
											<div className="h-2 bg-muted rounded-full overflow-hidden">
												<div
													className="h-full bg-primary rounded-full transition-all duration-1000"
													style={{ width: `${property.percentage}%` }}
												/>
											</div>
										</div>
									</div>
								</BlurFade>
							))}
						</div>
					</div>
				</BlurFade>
			</div>

			{/* Recent Payouts */}
			<BlurFade delay={0.9} inView>
				<div className="bg-card border border-border rounded-lg">
					<div className="p-6 border-b border-border">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="font-medium text-foreground">Recent Payouts</h3>
								<p className="text-sm text-muted-foreground">
									Stripe Connect payout history
								</p>
							</div>
							<button
								onClick={onViewPayouts}
								className="text-sm text-primary hover:underline"
							>
								View All
							</button>
						</div>
					</div>

					<div className="divide-y divide-border">
						{payouts.slice(0, 5).map((payout, idx) => (
							<BlurFade key={payout.id} delay={1 + idx * 0.05} inView>
								<div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
											<CreditCard className="w-5 h-5 text-muted-foreground" />
										</div>
										<div>
											<p className="text-sm font-medium text-foreground">
												{formatCurrency(payout.amount)}
											</p>
											<p className="text-xs text-muted-foreground">
												{payout.bankAccount}
											</p>
										</div>
									</div>
									<div className="text-right">
										<p className="text-sm text-foreground">
											{formatDate(payout.date)}
										</p>
										<span
											className={`text-xs font-medium ${
												payout.status === 'completed'
													? 'text-success'
													: payout.status === 'pending'
														? 'text-warning'
														: 'text-muted-foreground'
											}`}
										>
											{payout.status.charAt(0).toUpperCase() +
												payout.status.slice(1)}
										</span>
									</div>
								</div>
							</BlurFade>
						))}
					</div>
				</div>
			</BlurFade>
		</div>
	)
}
