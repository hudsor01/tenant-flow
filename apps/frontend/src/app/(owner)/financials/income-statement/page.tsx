'use client'

import * as React from 'react'
import {
	DollarSign,
	TrendingUp,
	TrendingDown,
	Download,
	ArrowUpRight,
	ArrowDownRight
} from 'lucide-react'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Skeleton } from '#components/ui/skeleton'
import { BlurFade } from '#components/ui/blur-fade'
import { NumberTicker } from '#components/ui/number-ticker'
import { BorderBeam } from '#components/ui/border-beam'
import { Stat, StatLabel, StatValue, StatIndicator, StatDescription } from '#components/ui/stat'
import { useIncomeStatement } from '#hooks/api/use-financial-statements'
import { formatCents } from '#lib/formatters/currency'

export default function IncomeStatementPage() {
	const [period, setPeriod] = React.useState('monthly')
	const [year, setYear] = React.useState('2024')

	// Calculate date range based on period and year
	const dateRange = React.useMemo(() => {
		const yearNum = parseInt(year)
		if (period === 'yearly') {
			return {
				start_date: `${yearNum}-01-01`,
				end_date: `${yearNum}-12-31`
			}
		} else if (period === 'quarterly') {
			const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1
			const quarterStart = (currentQuarter - 1) * 3 + 1
			const quarterEnd = quarterStart + 2
			return {
				start_date: `${yearNum}-${quarterStart.toString().padStart(2, '0')}-01`,
				end_date: `${yearNum}-${quarterEnd.toString().padStart(2, '0')}-31`
			}
		} else {
			const currentMonth = new Date().getMonth() + 1
			const lastDay = new Date(yearNum, currentMonth, 0).getDate()
			return {
				start_date: `${yearNum}-${currentMonth.toString().padStart(2, '0')}-01`,
				end_date: `${yearNum}-${currentMonth.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`
			}
		}
	}, [period, year])

	const { data: response, isLoading, error, refetch } = useIncomeStatement(dateRange)
	const data = response?.data

	const totalRevenue = data?.revenue.totalRevenue || 0
	const totalExpenses = data?.expenses.totalExpenses || 0
	const netIncome = data?.netIncome || 0
	const profitMargin = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : '0.0'

	// Revenue breakdown items
	const revenueItems = [
		{ label: 'Rental Income', amount: data?.revenue.rentalIncome || 0 },
		{ label: 'Late Fees', amount: data?.revenue.lateFeesIncome || 0 },
		{ label: 'Other Income', amount: data?.revenue.otherIncome || 0 }
	]

	// Expense breakdown items
	const expenseItems = [
		{ label: 'Property Management', amount: data?.expenses.propertyManagement || 0 },
		{ label: 'Maintenance', amount: data?.expenses.maintenance || 0 },
		{ label: 'Utilities', amount: data?.expenses.utilities || 0 },
		{ label: 'Insurance', amount: data?.expenses.insurance || 0 },
		{ label: 'Property Tax', amount: data?.expenses.propertyTax || 0 },
		{ label: 'Mortgage', amount: data?.expenses.mortgage || 0 },
		{ label: 'Other', amount: data?.expenses.other || 0 }
	]

	if (isLoading) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				{/* Header skeleton */}
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<Skeleton className="h-8 w-48 mb-2" />
						<Skeleton className="h-4 w-72" />
					</div>
					<div className="flex gap-2">
						<Skeleton className="h-10 w-32" />
						<Skeleton className="h-10 w-24" />
						<Skeleton className="h-10 w-24" />
					</div>
				</div>
				{/* Stats skeleton */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
					{[1, 2, 3].map(i => (
						<Skeleton key={i} className="h-28 rounded-lg" />
					))}
				</div>
				{/* Content skeleton */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{[1, 2].map(i => (
						<Skeleton key={i} className="h-80 rounded-lg" />
					))}
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<div className="max-w-md mx-auto text-center py-16">
					<div className="w-16 h-16 rounded-lg bg-destructive/10 flex items-center justify-center mx-auto mb-6">
						<TrendingDown className="w-8 h-8 text-destructive" />
					</div>
					<h2 className="text-xl font-semibold text-foreground mb-3">
						Failed to Load Income Statement
					</h2>
					<p className="text-muted-foreground mb-6">
						{error instanceof Error ? error.message : 'An error occurred'}
					</p>
					<button
						onClick={() => void refetch()}
						className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
					>
						Try Again
					</button>
				</div>
			</div>
		)
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="text-2xl font-semibold text-foreground">Income Statement</h1>
						<p className="text-muted-foreground">Revenue, expenses, and profitability analysis.</p>
					</div>
					<div className="flex gap-2">
						<Select value={period} onValueChange={setPeriod}>
							<SelectTrigger className="w-[130px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="monthly">Monthly</SelectItem>
								<SelectItem value="quarterly">Quarterly</SelectItem>
								<SelectItem value="yearly">Yearly</SelectItem>
							</SelectContent>
						</Select>
						<Select value={year} onValueChange={setYear}>
							<SelectTrigger className="w-[100px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="2024">2024</SelectItem>
								<SelectItem value="2023">2023</SelectItem>
								<SelectItem value="2022">2022</SelectItem>
							</SelectContent>
						</Select>
						<button className="inline-flex items-center gap-2 px-4 py-2.5 bg-card border border-border hover:bg-muted text-foreground font-medium rounded-lg transition-colors">
							<Download className="w-4 h-4" />
							Export
						</button>
					</div>
				</div>
			</BlurFade>

			{/* Summary Stats - Premium Stat Components */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				<BlurFade delay={0.15} inView>
					<Stat className="relative overflow-hidden">
						<BorderBeam size={100} duration={10} colorFrom="hsl(142 76% 36%)" colorTo="hsl(142 76% 36% / 0.3)" />
						<StatLabel>Total Revenue</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-emerald-600 dark:text-emerald-400">
							<span className="text-lg">$</span>
							<NumberTicker value={Math.floor(totalRevenue)} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<TrendingUp />
						</StatIndicator>
						<StatDescription>
							all income sources
						</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.2} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Total Expenses</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-red-600 dark:text-red-400">
							<span className="text-lg">$</span>
							<NumberTicker value={Math.floor(totalExpenses)} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="destructive">
							<TrendingDown />
						</StatIndicator>
						<StatDescription>
							operating costs
						</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.25} inView>
					<Stat className="relative overflow-hidden">
						{netIncome > 0 && (
							<BorderBeam size={100} duration={12} colorFrom="hsl(var(--primary))" colorTo="hsl(var(--primary)/0.3)" />
						)}
						<StatLabel>Net Income</StatLabel>
						<StatValue className={`flex items-baseline gap-0.5 ${netIncome >= 0 ? '' : 'text-destructive'}`}>
							<span className="text-lg">{netIncome >= 0 ? '$' : '-$'}</span>
							<NumberTicker value={Math.abs(Math.floor(netIncome))} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<DollarSign />
						</StatIndicator>
						<StatDescription>
							{profitMargin}% profit margin
						</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			{/* Revenue & Expense Breakdown */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
				{/* Revenue Breakdown */}
				<BlurFade delay={0.3} inView>
				<div className="bg-card border border-border rounded-lg p-6">
					<h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
						<ArrowUpRight className="w-4 h-4 text-emerald-600" />
						Revenue Breakdown
					</h3>
					<div className="space-y-3">
						{revenueItems.map((item) => {
							const percentage = totalRevenue > 0 ? ((item.amount / totalRevenue) * 100).toFixed(1) : '0.0'
							return (
								<div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
									<div className="flex items-center gap-3">
										<div className="w-2 h-2 rounded-full bg-emerald-500" />
										<span className="text-sm text-foreground">{item.label}</span>
									</div>
									<div className="flex items-center gap-4">
										<span className="text-sm text-muted-foreground">{percentage}%</span>
										<span className="text-sm font-medium text-foreground tabular-nums">
											{formatCents(item.amount * 100)}
										</span>
									</div>
								</div>
							)
						})}
						<div className="flex items-center justify-between pt-3 border-t border-border">
							<span className="text-sm font-medium text-foreground">Total Revenue</span>
							<span className="text-sm font-semibold text-emerald-600 tabular-nums">
								{formatCents(totalRevenue * 100)}
							</span>
						</div>
					</div>
				</div>
				</BlurFade>

				{/* Expense Breakdown */}
				<BlurFade delay={0.35} inView>
				<div className="bg-card border border-border rounded-lg p-6">
					<h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
						<ArrowDownRight className="w-4 h-4 text-red-600" />
						Expense Breakdown
					</h3>
					<div className="space-y-3">
						{expenseItems.filter(item => item.amount > 0).map((item) => {
							const percentage = totalExpenses > 0 ? ((item.amount / totalExpenses) * 100).toFixed(1) : '0.0'
							return (
								<div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
									<div className="flex items-center gap-3">
										<div className="w-2 h-2 rounded-full bg-red-500" />
										<span className="text-sm text-foreground">{item.label}</span>
									</div>
									<div className="flex items-center gap-4">
										<span className="text-sm text-muted-foreground">{percentage}%</span>
										<span className="text-sm font-medium text-foreground tabular-nums">
											{formatCents(item.amount * 100)}
										</span>
									</div>
								</div>
							)
						})}
						<div className="flex items-center justify-between pt-3 border-t border-border">
							<span className="text-sm font-medium text-foreground">Total Expenses</span>
							<span className="text-sm font-semibold text-red-600 tabular-nums">
								{formatCents(totalExpenses * 100)}
							</span>
						</div>
					</div>
				</div>
				</BlurFade>
			</div>

			{/* Net Income Summary */}
			<BlurFade delay={0.4} inView>
			<div className="bg-card border border-border rounded-lg p-6">
				<h3 className="font-medium text-foreground mb-4">Net Income Summary</h3>
				<div className="space-y-3">
					<div className="flex justify-between py-2 border-b border-border">
						<span className="text-sm text-foreground">Total Revenue</span>
						<span className="text-sm font-medium text-emerald-600 tabular-nums">
							{formatCents(totalRevenue * 100)}
						</span>
					</div>
					<div className="flex justify-between py-2 border-b border-border">
						<span className="text-sm text-foreground">Total Operating Expenses</span>
						<span className="text-sm font-medium text-red-600 tabular-nums">
							-{formatCents(totalExpenses * 100)}
						</span>
					</div>
					{data?.grossProfit !== undefined && (
						<div className="flex justify-between py-2 border-b border-border">
							<span className="text-sm text-foreground">Gross Profit</span>
							<span className="text-sm font-medium text-foreground tabular-nums">
								{formatCents((data.grossProfit || 0) * 100)}
							</span>
						</div>
					)}
					{data?.operatingIncome !== undefined && (
						<div className="flex justify-between py-2 border-b border-border">
							<span className="text-sm text-foreground">Operating Income</span>
							<span className="text-sm font-medium text-foreground tabular-nums">
								{formatCents((data.operatingIncome || 0) * 100)}
							</span>
						</div>
					)}
				</div>
				<div className="flex items-center justify-between p-4 mt-4 bg-primary/5 rounded-lg">
					<span className="font-medium text-foreground">Net Income</span>
					<span className={`text-xl font-bold tabular-nums ${netIncome >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
						{netIncome >= 0 ? '+' : ''}{formatCents(netIncome * 100)}
					</span>
				</div>
				{data?.previousPeriod && (
					<div className="mt-4 p-4 bg-muted/50 rounded-lg">
						<p className="text-xs text-muted-foreground mb-2">Period Comparison</p>
						<div className="flex items-center gap-2">
							<span className="text-sm text-foreground">Previous Period:</span>
							<span className="text-sm font-medium tabular-nums">
								{formatCents(data.previousPeriod.netIncome * 100)}
							</span>
							<span className={`text-sm font-medium ${data.previousPeriod.changePercent >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
								({data.previousPeriod.changePercent >= 0 ? '+' : ''}{data.previousPeriod.changePercent.toFixed(1)}%)
							</span>
						</div>
					</div>
				)}
			</div>
			</BlurFade>
		</div>
	)
}
