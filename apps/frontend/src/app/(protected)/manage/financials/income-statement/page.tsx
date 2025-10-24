'use client'

import { ExportButtons } from '@/components/export/export-buttons'
import { Badge } from '@/components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { getIncomeStatement } from '@/lib/api/financials-client'
import { formatCurrency, formatPercentage } from '@/lib/design-system'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { IncomeStatementData } from '@repo/shared/types/financial-statements'
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { ArrowDownRight, ArrowUpRight, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

function TrendPill({ value }: { value: number | null | undefined }) {
	if (value === null || value === undefined) {
		return null
	}

	const isPositive = value >= 0
	const Icon = isPositive ? ArrowUpRight : ArrowDownRight

	return (
		<Badge
			variant={isPositive ? 'outline' : 'destructive'}
			className="flex items-center gap-1 font-medium"
		>
			<Icon className="size-3" />
			{formatPercentage(Math.abs(value), 1)}
		</Badge>
	)
}

export default function IncomeStatementPage() {
	const [data, setData] = useState<IncomeStatementData | null>(null)
	const [loading, setLoading] = useState(true)
	const [selectedMonth, setSelectedMonth] = useState(
		format(new Date(), 'yyyy-MM')
	)

	useEffect(() => {
		async function loadData() {
			try {
				const supabase = createClient()
				const {
					data: { session }
				} = await supabase.auth.getSession()

				if (!session?.access_token) {
					throw new Error('No session')
				}

				const monthDate = new Date(selectedMonth + '-01')
				const startDate = format(startOfMonth(monthDate), 'yyyy-MM-dd')
				const endDate = format(endOfMonth(monthDate), 'yyyy-MM-dd')

				const result = await getIncomeStatement(
					session.access_token,
					startDate,
					endDate
				)
				setData(result)
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: 'Failed to load income statement'
				)
			} finally {
				setLoading(false)
			}
		}

		loadData()
	}, [selectedMonth])

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="space-y-4">
					<Skeleton className="h-8 w-64" />
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-32 w-96" />
				</div>
			</div>
		)
	}

	if (!data) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<p className="text-muted-foreground">No data available</p>
			</div>
		)
	}

	const monthOptions = Array.from({ length: 12 }, (_, i) => {
		const date = subMonths(new Date(), i)
		return {
			value: format(date, 'yyyy-MM'),
			label: format(date, 'MMMM yyyy')
		}
	})

	const revenueItems = [
		{ label: 'Rental Income', value: data.revenue.rentalIncome },
		{ label: 'Late Fees', value: data.revenue.lateFeesIncome },
		{ label: 'Other Income', value: data.revenue.otherIncome }
	]

	const expenseItems = [
		{ label: 'Property Management', value: data.expenses.propertyManagement },
		{ label: 'Maintenance', value: data.expenses.maintenance },
		{ label: 'Utilities', value: data.expenses.utilities },
		{ label: 'Insurance', value: data.expenses.insurance },
		{ label: 'Property Tax', value: data.expenses.propertyTax },
		{ label: 'Mortgage', value: data.expenses.mortgage },
		{ label: 'Other', value: data.expenses.other }
	]

	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
			<div className="border-b bg-background p-6">
				<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
					<div className="flex flex-col gap-2">
						<h1 className="text-3xl font-semibold tracking-tight">
							Income Statement
						</h1>
						<p className="text-muted-foreground">
							Track revenue, expenses, and profitability over time
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-3">
						<Select value={selectedMonth} onValueChange={setSelectedMonth}>
							<SelectTrigger className="w-50">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{monthOptions.map(option => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<ExportButtons filename="income-statement" payload={data} />
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<Card className="@container/card">
							<CardHeader>
								<CardTitle>Total Revenue</CardTitle>
								<CardDescription>{data.period.label}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<p className="text-3xl font-semibold tabular-nums">
									{formatCurrency(data.revenue.totalRevenue)}
								</p>
							</CardContent>
						</Card>

						<Card className="@container/card">
							<CardHeader>
								<CardTitle>Total Expenses</CardTitle>
								<CardDescription>Operating costs</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<p className="text-3xl font-semibold tabular-nums">
									{formatCurrency(data.expenses.totalExpenses)}
								</p>
							</CardContent>
						</Card>

						<Card
							className={cn(
								'@container/card',
								data.netIncome >= 0
									? 'border-[oklch(var(--success))]'
									: 'border-[oklch(var(--destructive))]'
							)}
						>
							<CardHeader>
								<CardTitle>Net Income</CardTitle>
								<CardDescription>After all expenses</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<p
									className={cn(
										'text-3xl font-semibold tabular-nums',
										data.netIncome >= 0
											? 'text-[oklch(var(--success))]'
											: 'text-[oklch(var(--destructive))]'
									)}
								>
									{formatCurrency(data.netIncome)}
								</p>
								{data.previousPeriod && (
									<TrendPill value={data.previousPeriod.changePercent} />
								)}
							</CardContent>
						</Card>

						<Card className="@container/card">
							<CardHeader>
								<CardTitle>Profit Margin</CardTitle>
								<CardDescription>Net income / Revenue</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<p className="text-3xl font-semibold tabular-nums">
									{formatPercentage(data.profitMargin)}
								</p>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>

			<div className="flex-1 p-6">
				<div className="mx-auto max-w-400 space-y-8 px-4 lg:px-6">
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle>Revenue Breakdown</CardTitle>
								<CardDescription>Income sources for the period</CardDescription>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Category</TableHead>
											<TableHead className="text-right">Amount</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{revenueItems.map(item => (
											<TableRow key={item.label}>
												<TableCell className="font-medium">
													{item.label}
												</TableCell>
												<TableCell className="text-right">
													{formatCurrency(item.value)}
												</TableCell>
											</TableRow>
										))}
										<TableRow className="border-t-2">
											<TableCell className="font-semibold">
												Total Revenue
											</TableCell>
											<TableCell className="text-right font-semibold">
												{formatCurrency(data.revenue.totalRevenue)}
											</TableCell>
										</TableRow>
									</TableBody>
								</Table>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Expense Breakdown</CardTitle>
								<CardDescription>
									Operating expenses for the period
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Category</TableHead>
											<TableHead className="text-right">Amount</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{expenseItems.map(item => (
											<TableRow key={item.label}>
												<TableCell className="font-medium">
													{item.label}
												</TableCell>
												<TableCell className="text-right">
													{formatCurrency(item.value)}
												</TableCell>
											</TableRow>
										))}
										<TableRow className="border-t-2">
											<TableCell className="font-semibold">
												Total Expenses
											</TableCell>
											<TableCell className="text-right font-semibold">
												{formatCurrency(data.expenses.totalExpenses)}
											</TableCell>
										</TableRow>
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					</div>

					{data.previousPeriod && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<TrendingUp className="size-5" />
									Period Comparison
								</CardTitle>
								<CardDescription>
									Comparison with previous period
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
									<div className="rounded-lg bg-muted/40 p-4">
										<p className="text-sm text-muted-foreground">
											Previous Period
										</p>
										<p className="text-2xl font-semibold">
											{formatCurrency(data.previousPeriod.netIncome)}
										</p>
									</div>
									<div className="rounded-lg bg-muted/40 p-4">
										<p className="text-sm text-muted-foreground">Change</p>
										<p className="text-2xl font-semibold">
											{formatCurrency(data.previousPeriod.changeAmount)}
										</p>
									</div>
									<div className="rounded-lg bg-muted/40 p-4">
										<p className="text-sm text-muted-foreground">
											Change Percentage
										</p>
										<div className="flex items-center gap-2">
											<p className="text-2xl font-semibold">
												{formatPercentage(data.previousPeriod.changePercent)}
											</p>
											<TrendPill value={data.previousPeriod.changePercent} />
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			</div>
		</div>
	)
}
