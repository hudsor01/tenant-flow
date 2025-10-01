'use client'

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import type { IncomeStatementData } from '@repo/shared/types/financial-statements'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function IncomeStatementPage() {
	const [data, setData] = useState<IncomeStatementData | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [startDate, setStartDate] = useState('')
	const [endDate, setEndDate] = useState('')

	useEffect(() => {
		const now = new Date()
		const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
		setStartDate(firstDay.toISOString().split('T')[0] || '')
		setEndDate(now.toISOString().split('T')[0] || '')
	}, [])

	const loadData = useCallback(async () => {
		try {
			setIsLoading(true)
			const response = await fetch(
				`/api/financials/income-statement?startDate=${startDate}&endDate=${endDate}`,
				{ headers: { 'Content-Type': 'application/json' } }
			)

			if (!response.ok) {
				throw new Error('Failed to load income statement')
			}

			const result = await response.json()
			setData(result.data)
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: 'Failed to load income statement'
			)
		} finally {
			setIsLoading(false)
		}
	}, [startDate, endDate])

	useEffect(() => {
		if (startDate && endDate) {
			loadData()
		}
	}, [startDate, endDate, loadData])

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Income Statement</h1>
				<p className="text-muted-foreground">
					View revenue, expenses, and net income for your properties
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Date Range</CardTitle>
					<CardDescription>
						Select the period for the income statement
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="startDate">Start Date</Label>
							<Input
								id="startDate"
								type="date"
								value={startDate}
								onChange={e => setStartDate(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="endDate">End Date</Label>
							<Input
								id="endDate"
								type="date"
								value={endDate}
								onChange={e => setEndDate(e.target.value)}
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			{isLoading ? (
				<div className="space-y-4">
					<Skeleton className="h-[200px] w-full" />
					<Skeleton className="h-[300px] w-full" />
				</div>
			) : data ? (
				<>
					<Card>
						<CardHeader>
							<CardTitle>Revenue</CardTitle>
							<CardDescription>{data.period.label}</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Rental Income</span>
								<span className="font-semibold">
									{formatCurrency(data.revenue.rentalIncome)}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Late Fees</span>
								<span className="font-semibold">
									{formatCurrency(data.revenue.lateFeesIncome)}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Other Income</span>
								<span className="font-semibold">
									{formatCurrency(data.revenue.otherIncome)}
								</span>
							</div>
							<div className="flex items-center justify-between border-t pt-4">
								<span className="font-semibold">Total Revenue</span>
								<span className="text-xl font-bold">
									{formatCurrency(data.revenue.totalRevenue)}
								</span>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Expenses</CardTitle>
							<CardDescription>{data.period.label}</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">
									Property Management
								</span>
								<span className="font-semibold">
									{formatCurrency(data.expenses.propertyManagement)}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Maintenance</span>
								<span className="font-semibold">
									{formatCurrency(data.expenses.maintenance)}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Utilities</span>
								<span className="font-semibold">
									{formatCurrency(data.expenses.utilities)}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Insurance</span>
								<span className="font-semibold">
									{formatCurrency(data.expenses.insurance)}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Property Tax</span>
								<span className="font-semibold">
									{formatCurrency(data.expenses.propertyTax)}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Mortgage</span>
								<span className="font-semibold">
									{formatCurrency(data.expenses.mortgage)}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Other Expenses</span>
								<span className="font-semibold">
									{formatCurrency(data.expenses.other)}
								</span>
							</div>
							<div className="flex items-center justify-between border-t pt-4">
								<span className="font-semibold">Total Expenses</span>
								<span className="text-xl font-bold">
									{formatCurrency(data.expenses.totalExpenses)}
								</span>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Net Income</CardTitle>
							<CardDescription>{data.period.label}</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<span className="text-lg font-semibold">Net Income</span>
									<span
										className={`text-2xl font-bold ${
											data.netIncome >= 0
												? 'text-[var(--success)]'
												: 'text-[var(--destructive)]'
										}`}
									>
										{formatCurrency(data.netIncome)}
									</span>
								</div>
								{data.previousPeriod && (
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										{data.previousPeriod.changePercent > 0 ? (
											<TrendingUp className="size-4 text-[var(--success)]" />
										) : (
											<TrendingDown className="size-4 text-[var(--destructive)]" />
										)}
										<span>
											{Math.abs(data.previousPeriod.changePercent).toFixed(1)}%{' '}
											{data.previousPeriod.changePercent > 0
												? 'increase'
												: 'decrease'}{' '}
											from previous period
										</span>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</>
			) : (
				<Card>
					<CardContent className="flex items-center justify-center py-12">
						<p className="text-muted-foreground">No data available</p>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
