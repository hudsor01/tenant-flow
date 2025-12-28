'use client'

import { useState } from 'react'
import {
	DollarSign,
	TrendingUp,
	TrendingDown,
	Building2,
	Download,
	HelpCircle
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

interface PropertyPL {
	propertyId: string
	propertyName: string
	revenue: number
	expenses: number
	netIncome: number
	occupancyRate: number
}

interface MonthlyData {
	month: string
	revenue: number
	expenses: number
	netIncome: number
}

interface ProfitLossProps {
	totalRevenue: number
	totalExpenses: number
	netProfit: number
	byProperty: PropertyPL[]
	byMonth: MonthlyData[]
	periodLabel?: string
	onExport?: () => void
}

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0
	}).format(amount / 100)
}

export function ProfitLoss({
	totalRevenue,
	totalExpenses,
	netProfit,
	byProperty,
	byMonth,
	periodLabel = 'This Year',
	onExport
}: ProfitLossProps) {
	const [dateRange, setDateRange] = useState('this_year')
	const profitMargin =
		totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(0) : '0'

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="text-2xl font-semibold text-foreground">
							Profit & Loss
						</h1>
						<p className="text-muted-foreground">
							See how much money you're making after expenses.
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
							<option value="this_quarter">Last 3 Months</option>
							<option value="this_year">This Year</option>
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

			{/* Simple Summary - The Big Picture */}
			<BlurFade delay={0.2} inView>
				<div className="bg-card border border-border rounded-xl p-6 mb-8">
					<div className="flex items-center gap-2 mb-4">
						<h2 className="text-lg font-medium">The Bottom Line</h2>
						<button
							className="text-muted-foreground hover:text-foreground"
							title="Your profit after all expenses"
						>
							<HelpCircle className="w-4 h-4" />
						</button>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{/* Money Coming In */}
						<div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
							<p className="text-sm text-emerald-700 dark:text-emerald-300 mb-1">
								Money Coming In
							</p>
							<p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
								{formatCurrency(totalRevenue)}
							</p>
							<p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">
								Rent & other income
							</p>
						</div>

						{/* Minus Sign */}
						<div className="hidden md:flex items-center justify-center">
							<div className="text-4xl text-muted-foreground font-light">−</div>
						</div>

						{/* Money Going Out */}
						<div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
							<p className="text-sm text-red-700 dark:text-red-300 mb-1">
								Money Going Out
							</p>
							<p className="text-3xl font-bold text-red-600 dark:text-red-400">
								{formatCurrency(totalExpenses)}
							</p>
							<p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">
								Maintenance, fees, etc.
							</p>
						</div>
					</div>

					{/* Result */}
					<div className="mt-6 pt-6 border-t border-border">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-lg font-medium">Your Profit</p>
								<p className="text-sm text-muted-foreground">
									What you keep after expenses
								</p>
							</div>
							<div className="text-right">
								<p
									className={`text-4xl font-bold ${netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
								>
									{formatCurrency(netProfit)}
								</p>
								<p className="text-sm text-muted-foreground">
									{profitMargin}% profit margin
								</p>
							</div>
						</div>
					</div>
				</div>
			</BlurFade>

			{/* Summary Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				<BlurFade delay={0.3} inView>
					<Stat className="relative overflow-hidden">
						<BorderBeam
							size={100}
							duration={10}
							colorFrom="hsl(142 76% 36%)"
							colorTo="hsl(142 76% 36% / 0.3)"
						/>
						<StatLabel>Total Income</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-emerald-600 dark:text-emerald-400">
							<span className="text-lg">$</span>
							<NumberTicker value={totalRevenue / 100} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<TrendingUp />
						</StatIndicator>
						<StatDescription>all rent & fees collected</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.4} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Total Expenses</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-red-600 dark:text-red-400">
							<span className="text-lg">$</span>
							<NumberTicker value={totalExpenses / 100} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="destructive">
							<TrendingDown />
						</StatIndicator>
						<StatDescription>repairs, fees, costs</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.5} inView>
					<Stat className="relative overflow-hidden">
						<BorderBeam
							size={100}
							duration={12}
							colorFrom="hsl(var(--primary))"
							colorTo="hsl(var(--primary)/0.3)"
						/>
						<StatLabel>Net Profit</StatLabel>
						<StatValue className="flex items-baseline gap-0.5">
							<span className="text-lg">$</span>
							<NumberTicker value={netProfit / 100} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<DollarSign />
						</StatIndicator>
						<StatDescription>your take-home</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			{/* Monthly Trend - Visual Bar Chart */}
			<BlurFade delay={0.6} inView>
				<div className="bg-card border border-border rounded-lg p-6 mb-6">
					<h3 className="font-medium text-foreground mb-2">
						Monthly Profit Trend
					</h3>
					<p className="text-sm text-muted-foreground mb-4">
						How your profit has changed over time
					</p>

					<div className="h-48 flex items-end gap-3">
						{byMonth.map((data, index) => {
							const maxProfit = Math.max(...byMonth.map(d => d.netIncome))
							const height =
								maxProfit > 0 ? (data.netIncome / maxProfit) * 100 : 0
							return (
								<BlurFade key={index} delay={0.65 + index * 0.03} inView>
									<div className="flex-1 flex flex-col items-center gap-2">
										<div className="w-full flex flex-col items-center">
											<span className="text-xs font-medium text-emerald-600 mb-1">
												{formatCurrency(data.netIncome)}
											</span>
											<div
												className="w-full bg-emerald-500 rounded-t transition-all hover:bg-emerald-400"
												style={{
													height: `${Math.max(height, 5)}%`,
													minHeight: '8px'
												}}
											/>
										</div>
										<span className="text-xs text-muted-foreground font-medium">
											{data.month}
										</span>
									</div>
								</BlurFade>
							)
						})}
					</div>
				</div>
			</BlurFade>

			{/* Property Breakdown - Simple Table */}
			<BlurFade delay={0.8} inView>
				<div className="bg-card border border-border rounded-lg overflow-hidden">
					<div className="p-4 border-b border-border">
						<h3 className="font-medium text-foreground">Profit by Property</h3>
						<p className="text-sm text-muted-foreground">
							See which properties are most profitable
						</p>
					</div>
					<div className="divide-y divide-border">
						{byProperty.map((prop, idx) => (
							<BlurFade key={prop.propertyId} delay={0.85 + idx * 0.05} inView>
								<div className="p-4 hover:bg-muted/30 transition-colors">
									<div className="flex items-center justify-between mb-2">
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
												<Building2 className="w-5 h-5 text-primary" />
											</div>
											<div>
												<p className="font-medium">{prop.propertyName}</p>
												<p className="text-sm text-muted-foreground">
													{prop.occupancyRate}% occupied
												</p>
											</div>
										</div>
										<div className="text-right">
											<p
												className={`text-lg font-semibold ${prop.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
											>
												{formatCurrency(prop.netIncome)}
											</p>
											<p className="text-xs text-muted-foreground">profit</p>
										</div>
									</div>

									{/* Simple breakdown bar */}
									<div className="flex items-center gap-2 text-xs">
										<span className="text-emerald-600">
											{formatCurrency(prop.revenue)} in
										</span>
										<span className="text-muted-foreground">−</span>
										<span className="text-red-600">
											{formatCurrency(prop.expenses)} out
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
