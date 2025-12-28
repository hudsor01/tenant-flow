'use client'

import * as React from 'react'
import {
	ArrowUpCircle,
	ArrowDownCircle,
	Download,
	Wallet,
	ArrowRight
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
import { BorderBeam } from '#components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatDescription
} from '#components/ui/stat'
import { useCashFlow } from '#hooks/api/use-financial-statements'
import { formatCents } from '#lib/formatters/currency'

export default function CashFlowPage() {
	const [period, setPeriod] = React.useState('monthly')
	const [year, setYear] = React.useState('2024')

	// Calculate date range based on period/year selection
	const dateRange = React.useMemo(() => {
		const currentDate = new Date()
		const selectedYear = parseInt(year)

		if (period === 'yearly') {
			return {
				start_date: `${selectedYear}-01-01`,
				end_date: `${selectedYear}-12-31`
			}
		} else if (period === 'quarterly') {
			const currentQuarter = Math.floor(currentDate.getMonth() / 3)
			const startMonth = currentQuarter * 3 + 1
			const endMonth = startMonth + 2
			return {
				start_date: `${selectedYear}-${String(startMonth).padStart(2, '0')}-01`,
				end_date: `${selectedYear}-${String(endMonth).padStart(2, '0')}-${new Date(selectedYear, endMonth, 0).getDate()}`
			}
		} else {
			const month = currentDate.getMonth() + 1
			const lastDay = new Date(selectedYear, month, 0).getDate()
			return {
				start_date: `${selectedYear}-${String(month).padStart(2, '0')}-01`,
				end_date: `${selectedYear}-${String(month).padStart(2, '0')}-${lastDay}`
			}
		}
	}, [period, year])

	const { data, isLoading, error, refetch } = useCashFlow(dateRange)
	const cashFlowData = data?.data

	// Transform to inflow/outflow categories with percentages
	const inflowItems = React.useMemo(() => {
		if (!cashFlowData) return []
		const items = [
			{
				category: 'Rental Payments Received',
				amount: cashFlowData.operatingActivities.rentalPaymentsReceived
			},
			{
				category: 'Loan Proceeds',
				amount: cashFlowData.financingActivities.loanProceeds
			},
			{
				category: 'Owner Contributions',
				amount: cashFlowData.financingActivities.ownerContributions
			}
		].filter(i => i.amount > 0)
		const total = items.reduce((sum, i) => sum + i.amount, 0)
		return items.map(i => ({
			...i,
			percentage: total > 0 ? (i.amount / total) * 100 : 0
		}))
	}, [cashFlowData])

	const outflowItems = React.useMemo(() => {
		if (!cashFlowData) return []
		const items = [
			{
				category: 'Operating Expenses Paid',
				amount: Math.abs(cashFlowData.operatingActivities.operatingExpensesPaid)
			},
			{
				category: 'Maintenance Paid',
				amount: Math.abs(cashFlowData.operatingActivities.maintenancePaid)
			},
			{
				category: 'Property Acquisitions',
				amount: Math.abs(cashFlowData.investingActivities.propertyAcquisitions)
			},
			{
				category: 'Property Improvements',
				amount: Math.abs(cashFlowData.investingActivities.propertyImprovements)
			},
			{
				category: 'Mortgage Payments',
				amount: Math.abs(cashFlowData.financingActivities.mortgagePayments)
			},
			{
				category: 'Owner Distributions',
				amount: Math.abs(cashFlowData.financingActivities.ownerDistributions)
			}
		].filter(i => i.amount > 0)
		const total = items.reduce((sum, i) => sum + i.amount, 0)
		return items.map(i => ({
			...i,
			percentage: total > 0 ? (i.amount / total) * 100 : 0
		}))
	}, [cashFlowData])

	const totalInflows = inflowItems.reduce((sum, i) => sum + i.amount, 0)
	const totalOutflows = outflowItems.reduce((sum, i) => sum + i.amount, 0)
	const netCashFlow = cashFlowData?.netCashFlow || 0
	const openingBalance = cashFlowData?.beginningCash || 0
	const closingBalance = cashFlowData?.endingCash || 0

	if (isLoading) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				{/* Header skeleton */}
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<Skeleton className="h-8 w-40 mb-2" />
						<Skeleton className="h-4 w-64" />
					</div>
					<div className="flex gap-2">
						<Skeleton className="h-10 w-32" />
						<Skeleton className="h-10 w-24" />
						<Skeleton className="h-10 w-24" />
					</div>
				</div>
				{/* Cash flow summary skeleton */}
				<Skeleton className="h-24 rounded-lg mb-8" />
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
						<ArrowDownCircle className="w-8 h-8 text-destructive" />
					</div>
					<h2 className="text-xl font-semibold text-foreground mb-3">
						Failed to Load Cash Flow
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
						<h1 className="typography-h1">Cash Flow</h1>
						<p className="text-muted-foreground">
							Track money coming in and going out.
						</p>
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

			{/* Cash Flow Summary - Opening → Net → Closing */}
			<BlurFade delay={0.15} inView>
				<div className="bg-card border border-border rounded-lg p-6 mb-8">
					<div className="flex flex-col md:flex-row items-center justify-between gap-6">
						<div className="flex-1 text-center">
							<p className="text-sm text-muted-foreground mb-1">
								Opening Balance
							</p>
							<p className="text-2xl font-semibold tabular-nums">
								{formatCents(openingBalance * 100)}
							</p>
						</div>
						<ArrowRight className="w-6 h-6 text-muted-foreground hidden md:block" />
						<div className="flex-1 text-center">
							<p className="text-sm text-muted-foreground mb-1">
								Net Cash Flow
							</p>
							<p
								className={`text-2xl font-semibold tabular-nums ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
							>
								{netCashFlow >= 0 ? '+' : ''}
								{formatCents(netCashFlow * 100)}
							</p>
						</div>
						<ArrowRight className="w-6 h-6 text-muted-foreground hidden md:block" />
						<div className="flex-1 text-center">
							<p className="text-sm text-muted-foreground mb-1">
								Closing Balance
							</p>
							<p className="text-2xl font-semibold tabular-nums">
								{formatCents(closingBalance * 100)}
							</p>
						</div>
					</div>
				</div>
			</BlurFade>

			{/* Summary Stats - Premium Stat Components */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				<BlurFade delay={0.2} inView>
					<Stat className="relative overflow-hidden">
						<BorderBeam
							size={100}
							duration={10}
							colorFrom="hsl(142 76% 36%)"
							colorTo="hsl(142 76% 36% / 0.3)"
						/>
						<StatLabel>Total Inflows</StatLabel>
						<StatValue className="flex items-baseline text-emerald-600 dark:text-emerald-400">
							${Math.floor(totalInflows).toLocaleString()}
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<ArrowUpCircle />
						</StatIndicator>
						<StatDescription>money received</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.25} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Total Outflows</StatLabel>
						<StatValue className="flex items-baseline text-red-600 dark:text-red-400">
							${Math.floor(totalOutflows).toLocaleString()}
						</StatValue>
						<StatIndicator variant="icon" color="destructive">
							<ArrowDownCircle />
						</StatIndicator>
						<StatDescription>money spent</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.3} inView>
					<Stat className="relative overflow-hidden">
						{netCashFlow > 0 && (
							<BorderBeam
								size={100}
								duration={12}
								colorFrom="hsl(var(--primary))"
								colorTo="hsl(var(--primary)/0.3)"
							/>
						)}
						<StatLabel>Net Cash Flow</StatLabel>
						<StatValue
							className={`flex items-baseline ${netCashFlow >= 0 ? '' : 'text-destructive'}`}
						>
							{netCashFlow >= 0 ? '+' : '-'}$
							{Math.abs(Math.floor(netCashFlow)).toLocaleString()}
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<Wallet />
						</StatIndicator>
						<StatDescription>net change</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			{/* Inflows & Outflows Breakdown */}
			<BlurFade delay={0.35} inView>
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
					{/* Cash Inflows */}
					<div className="bg-card border border-border rounded-lg p-6">
						<h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
							<ArrowUpCircle className="w-4 h-4 text-emerald-600" />
							Cash Inflows
						</h3>
						<div className="space-y-4">
							{inflowItems.map(item => (
								<div key={item.category}>
									<div className="flex items-center justify-between mb-1">
										<span className="text-sm text-foreground">
											{item.category}
										</span>
										<div className="flex items-center gap-3">
											<span className="text-sm text-muted-foreground">
												{item.percentage.toFixed(1)}%
											</span>
											<span className="text-sm font-medium text-emerald-600 tabular-nums">
												{formatCents(item.amount * 100)}
											</span>
										</div>
									</div>
									<div className="h-2 bg-muted rounded-full overflow-hidden">
										<div
											className="h-full bg-emerald-500 rounded-full transition-all duration-500"
											style={{ width: `${item.percentage}%` }}
										/>
									</div>
								</div>
							))}
							{inflowItems.length === 0 && (
								<p className="text-sm text-muted-foreground text-center py-4">
									No inflows for this period
								</p>
							)}
							<div className="flex items-center justify-between pt-4 border-t border-border">
								<span className="text-sm font-medium text-foreground">
									Total Inflows
								</span>
								<span className="text-sm font-semibold text-emerald-600 tabular-nums">
									{formatCents(totalInflows * 100)}
								</span>
							</div>
						</div>
					</div>

					{/* Cash Outflows */}
					<div className="bg-card border border-border rounded-lg p-6">
						<h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
							<ArrowDownCircle className="w-4 h-4 text-red-600" />
							Cash Outflows
						</h3>
						<div className="space-y-4">
							{outflowItems.map(item => (
								<div key={item.category}>
									<div className="flex items-center justify-between mb-1">
										<span className="text-sm text-foreground">
											{item.category}
										</span>
										<div className="flex items-center gap-3">
											<span className="text-sm text-muted-foreground">
												{item.percentage.toFixed(1)}%
											</span>
											<span className="text-sm font-medium text-red-600 tabular-nums">
												{formatCents(item.amount * 100)}
											</span>
										</div>
									</div>
									<div className="h-2 bg-muted rounded-full overflow-hidden">
										<div
											className="h-full bg-red-500 rounded-full transition-all duration-500"
											style={{ width: `${item.percentage}%` }}
										/>
									</div>
								</div>
							))}
							{outflowItems.length === 0 && (
								<p className="text-sm text-muted-foreground text-center py-4">
									No outflows for this period
								</p>
							)}
							<div className="flex items-center justify-between pt-4 border-t border-border">
								<span className="text-sm font-medium text-foreground">
									Total Outflows
								</span>
								<span className="text-sm font-semibold text-red-600 tabular-nums">
									{formatCents(totalOutflows * 100)}
								</span>
							</div>
						</div>
					</div>
				</div>
			</BlurFade>

			{/* Activity Breakdown by Category */}
			<BlurFade delay={0.4} inView>
				<div className="bg-card border border-border rounded-lg p-6">
					<h3 className="font-medium text-foreground mb-4">
						Cash Flow by Activity
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
							<p className="text-2xl font-semibold text-emerald-600 tabular-nums">
								{formatCents(
									(cashFlowData?.operatingActivities.netOperatingCash || 0) *
										100
								)}
							</p>
							<p className="text-sm text-muted-foreground mt-1">
								Operating Activities
							</p>
						</div>
						<div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
							<p className="text-2xl font-semibold text-red-600 tabular-nums">
								{formatCents(
									(cashFlowData?.investingActivities.netInvestingCash || 0) *
										100
								)}
							</p>
							<p className="text-sm text-muted-foreground mt-1">
								Investing Activities
							</p>
						</div>
						<div className="text-center p-4 bg-primary/5 rounded-lg">
							<p className="text-2xl font-semibold text-foreground tabular-nums">
								{formatCents(
									(cashFlowData?.financingActivities.netFinancingCash || 0) *
										100
								)}
							</p>
							<p className="text-sm text-muted-foreground mt-1">
								Financing Activities
							</p>
						</div>
					</div>
				</div>
			</BlurFade>
		</div>
	)
}
