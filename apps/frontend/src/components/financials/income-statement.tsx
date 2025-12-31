'use client'

import { useState } from 'react'
import {
	DollarSign,
	TrendingUp,
	TrendingDown,
	Building2,
	Download,
	ArrowUpRight,
	ArrowDownRight
} from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { NumberTicker } from '#components/ui/number-ticker'
import { BorderBeam } from '#components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatDescription
} from '#components/ui/stat'

interface RevenueBreakdown {
	rentCollected: number
	lateFees: number
	otherIncome: number
	total: number
}

interface ExpenseBreakdown {
	maintenance: number
	platformFees: number
	processingFees: number
	otherExpenses: number
	total: number
}

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

interface IncomeStatementProps {
	revenue: RevenueBreakdown
	expenses: ExpenseBreakdown
	netIncome: number
	byProperty: PropertyPL[]
	byMonth: MonthlyData[]
	onExport?: () => void
}

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0
	}).format(amount / 100)
}

export function IncomeStatement({
	revenue,
	expenses,
	netIncome,
	byProperty,
	byMonth,
	onExport
}: IncomeStatementProps) {
	const [dateRange, setDateRange] = useState('this_year')

	const profitMargin = ((netIncome / revenue.total) * 100).toFixed(1)

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="text-2xl font-semibold text-foreground">
							Income Statement
						</h1>
						<p className="text-muted-foreground">
							Revenue, expenses, and profitability analysis.
						</p>
					</div>
					<div className="flex gap-2">
						<select
							value={dateRange}
							onChange={e => setDateRange(e.target.value)}
							className="px-4 py-2.5 text-sm bg-card border border-border rounded-lg"
						>
							<option value="this_month">This Month</option>
							<option value="this_quarter">This Quarter</option>
							<option value="this_year">This Year</option>
							<option value="last_year">Last Year</option>
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
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
							<NumberTicker value={revenue.total / 100} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<TrendingUp />
						</StatIndicator>
						<StatDescription>all income sources</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.3} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Total Expenses</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-red-600 dark:text-red-400">
							<span className="text-lg">$</span>
							<NumberTicker value={expenses.total / 100} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="destructive">
							<TrendingDown />
						</StatIndicator>
						<StatDescription>operating costs</StatDescription>
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
							<NumberTicker value={netIncome / 100} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<DollarSign />
						</StatIndicator>
						<StatDescription>{profitMargin}% profit margin</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
				{/* Revenue Breakdown */}
				<BlurFade delay={0.5} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
							<ArrowUpRight className="w-4 h-4 text-emerald-600" />
							Revenue Breakdown
						</h3>
						<div className="space-y-4">
							{[
								{
									label: 'Rent Collected',
									amount: revenue.rentCollected,
									percentage: (
										(revenue.rentCollected / revenue.total) *
										100
									).toFixed(1)
								},
								{
									label: 'Late Fees',
									amount: revenue.lateFees,
									percentage: (
										(revenue.lateFees / revenue.total) *
										100
									).toFixed(1)
								},
								{
									label: 'Other Income',
									amount: revenue.otherIncome,
									percentage: (
										(revenue.otherIncome / revenue.total) *
										100
									).toFixed(1)
								}
							].map((item, idx) => (
								<BlurFade key={item.label} delay={0.55 + idx * 0.05} inView>
									<div className="flex items-center justify-between py-2 border-b border-border last:border-0">
										<div className="flex items-center gap-3">
											<div className="w-2 h-2 rounded-full bg-emerald-500" />
											<span className="text-sm text-foreground">
												{item.label}
											</span>
										</div>
										<div className="flex items-center gap-4">
											<span className="text-sm text-muted-foreground">
												{item.percentage}%
											</span>
											<span className="text-sm font-medium text-foreground">
												{formatCurrency(item.amount)}
											</span>
										</div>
									</div>
								</BlurFade>
							))}
							<div className="flex items-center justify-between pt-2 border-t border-border">
								<span className="text-sm font-medium text-foreground">
									Total Revenue
								</span>
								<span className="text-sm font-semibold text-emerald-600">
									{formatCurrency(revenue.total)}
								</span>
							</div>
						</div>
					</div>
				</BlurFade>

				{/* Expense Breakdown */}
				<BlurFade delay={0.6} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
							<ArrowDownRight className="w-4 h-4 text-red-600" />
							Expense Breakdown
						</h3>
						<div className="space-y-4">
							{[
								{
									label: 'Maintenance',
									amount: expenses.maintenance,
									percentage: (
										(expenses.maintenance / expenses.total) *
										100
									).toFixed(1)
								},
								{
									label: 'Platform Fees',
									amount: expenses.platformFees,
									percentage: (
										(expenses.platformFees / expenses.total) *
										100
									).toFixed(1)
								},
								{
									label: 'Processing Fees',
									amount: expenses.processingFees,
									percentage: (
										(expenses.processingFees / expenses.total) *
										100
									).toFixed(1)
								},
								{
									label: 'Other Expenses',
									amount: expenses.otherExpenses,
									percentage: (
										(expenses.otherExpenses / expenses.total) *
										100
									).toFixed(1)
								}
							].map((item, idx) => (
								<BlurFade key={item.label} delay={0.65 + idx * 0.05} inView>
									<div className="flex items-center justify-between py-2 border-b border-border last:border-0">
										<div className="flex items-center gap-3">
											<div className="w-2 h-2 rounded-full bg-red-500" />
											<span className="text-sm text-foreground">
												{item.label}
											</span>
										</div>
										<div className="flex items-center gap-4">
											<span className="text-sm text-muted-foreground">
												{item.percentage}%
											</span>
											<span className="text-sm font-medium text-foreground">
												{formatCurrency(item.amount)}
											</span>
										</div>
									</div>
								</BlurFade>
							))}
							<div className="flex items-center justify-between pt-2 border-t border-border">
								<span className="text-sm font-medium text-foreground">
									Total Expenses
								</span>
								<span className="text-sm font-semibold text-red-600">
									{formatCurrency(expenses.total)}
								</span>
							</div>
						</div>
					</div>
				</BlurFade>
			</div>

			{/* Monthly Trend */}
			<BlurFade delay={0.7} inView>
				<div className="bg-card border border-border rounded-lg p-6 mb-6">
					<h3 className="font-medium text-foreground mb-4">
						Monthly Income Trend
					</h3>
					<div className="h-48 flex items-end gap-2">
						{byMonth.map((data, index) => (
							<BlurFade key={index} delay={0.75 + index * 0.03} inView>
								<div className="flex-1 flex flex-col items-center gap-2">
									<div className="w-full flex flex-col gap-0.5">
										<div
											className="w-full bg-emerald-500 rounded-t transition-all"
											style={{
												height: `${(data.netIncome / Math.max(...byMonth.map(d => d.netIncome))) * 120}px`
											}}
										/>
									</div>
									<span className="text-xs text-muted-foreground">
										{data.month}
									</span>
								</div>
							</BlurFade>
						))}
					</div>
					<div className="flex justify-center gap-6 mt-4">
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 rounded bg-emerald-500" />
							<span className="text-xs text-muted-foreground">Net Income</span>
						</div>
					</div>
				</div>
			</BlurFade>

			{/* Property P&L */}
			<BlurFade delay={0.8} inView>
				<div className="bg-card border border-border rounded-lg overflow-hidden">
					<div className="p-4 border-b border-border">
						<h3 className="font-medium text-foreground">
							Profit & Loss by Property
						</h3>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="bg-muted/50">
								<tr>
									<th className="text-left p-4 text-sm font-medium text-muted-foreground">
										Property
									</th>
									<th className="text-right p-4 text-sm font-medium text-muted-foreground">
										Revenue
									</th>
									<th className="text-right p-4 text-sm font-medium text-muted-foreground">
										Expenses
									</th>
									<th className="text-right p-4 text-sm font-medium text-muted-foreground">
										Net Income
									</th>
									<th className="text-right p-4 text-sm font-medium text-muted-foreground">
										Occupancy
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{byProperty.map((prop, idx) => (
									<BlurFade
										key={prop.propertyId}
										delay={0.85 + idx * 0.03}
										inView
									>
										<tr className="hover:bg-muted/30 transition-colors">
											<td className="p-4">
												<div className="flex items-center gap-3">
													<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
														<Building2 className="w-4 h-4 text-primary" />
													</div>
													<span className="text-sm font-medium">
														{prop.propertyName}
													</span>
												</div>
											</td>
											<td className="p-4 text-right text-sm text-emerald-600">
												{formatCurrency(prop.revenue)}
											</td>
											<td className="p-4 text-right text-sm text-red-600">
												{formatCurrency(prop.expenses)}
											</td>
											<td className="p-4 text-right text-sm font-medium">
												{formatCurrency(prop.netIncome)}
											</td>
											<td className="p-4 text-right">
												<span
													className={`text-sm font-medium ${prop.occupancyRate >= 95 ? 'text-emerald-600' : prop.occupancyRate >= 85 ? 'text-amber-600' : 'text-red-600'}`}
												>
													{prop.occupancyRate}%
												</span>
											</td>
										</tr>
									</BlurFade>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</BlurFade>
		</div>
	)
}
