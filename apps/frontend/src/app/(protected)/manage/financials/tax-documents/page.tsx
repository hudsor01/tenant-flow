'use client'

import { ExportButtons } from '@/components/export/export-buttons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { getTaxDocuments } from '@/lib/api/financials-client'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import type { TaxDocumentsData } from '@repo/shared/types/financial-statements'
import { CheckCircle, Download, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function TaxDocumentsPage() {
	const [data, setData] = useState<TaxDocumentsData | null>(null)
	const [loading, setLoading] = useState(true)
	const [selectedYear, setSelectedYear] = useState(
		(new Date().getFullYear() - 1).toString()
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

				const result = await getTaxDocuments(
					session.access_token,
					Number.parseInt(selectedYear, 10)
				)
				setData(result)
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: 'Failed to load tax documents'
				)
			} finally {
				setLoading(false)
			}
		}

		loadData()
	}, [selectedYear])

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<p className="text-muted-foreground">Loading...</p>
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

	const currentYear = new Date().getFullYear()
	const yearOptions = Array.from({ length: 5 }, (_, i) => {
		const year = currentYear - 1 - i
		return {
			value: year.toString(),
			label: year.toString()
		}
	})

	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
			<div
				className="border-b bg-background"
				style={{ padding: 'var(--dashboard-content-padding)' }}
			>
				<div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 lg:px-6">
					<div className="flex flex-col gap-2">
						<h1 className="text-3xl font-semibold tracking-tight">
							Tax Documents
						</h1>
						<p className="text-muted-foreground">
							Schedule E and supporting documentation for tax preparation
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-3">
						<Select value={selectedYear} onValueChange={setSelectedYear}>
							<SelectTrigger className="w-[200px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{yearOptions.map(option => (
									<SelectItem key={option.value} value={option.value}>
										Tax Year {option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<ExportButtons filename="tax-documents" payload={data} />
						<Button variant="outline" className="gap-2">
							<Download className="size-4" />
							Download for Accountant
						</Button>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
						<Card className="@container/card">
							<CardHeader>
								<CardTitle>Total Income</CardTitle>
								<CardDescription>Tax year {data.taxYear}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<p className="text-3xl font-semibold tabular-nums">
									{formatCurrency(data.totals.totalIncome)}
								</p>
							</CardContent>
						</Card>

						<Card className="@container/card">
							<CardHeader>
								<CardTitle>Total Deductions</CardTitle>
								<CardDescription>Deductible expenses</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<p className="text-3xl font-semibold tabular-nums">
									{formatCurrency(data.totals.totalDeductions)}
								</p>
							</CardContent>
						</Card>

						<Card className="@container/card">
							<CardHeader>
								<CardTitle>Net Taxable Income</CardTitle>
								<CardDescription>Schedule E total</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<p
									className="text-3xl font-semibold tabular-nums"
									style={{
										color:
											data.totals.netTaxableIncome >= 0
												? 'hsl(var(--success))'
												: 'hsl(var(--destructive))'
									}}
								>
									{formatCurrency(data.totals.netTaxableIncome)}
								</p>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>

			<div
				className="flex-1"
				style={{ padding: 'var(--dashboard-content-padding)' }}
			>
				<div className="mx-auto max-w-[1600px] space-y-8 px-4 lg:px-6">
					<Card>
						<CardHeader>
							<CardTitle>Schedule E Summary</CardTitle>
							<CardDescription>
								Supplemental Income and Loss (Form 1040)
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
								<div className="rounded-lg bg-muted/40 p-4">
									<p className="text-sm text-muted-foreground">
										Gross Rental Income
									</p>
									<p className="text-2xl font-semibold">
										{formatCurrency(data.schedule.scheduleE.grossRentalIncome)}
									</p>
								</div>
								<div className="rounded-lg bg-muted/40 p-4">
									<p className="text-sm text-muted-foreground">
										Total Expenses
									</p>
									<p className="text-2xl font-semibold">
										{formatCurrency(data.schedule.scheduleE.totalExpenses)}
									</p>
								</div>
								<div className="rounded-lg bg-muted/40 p-4">
									<p className="text-sm text-muted-foreground">Depreciation</p>
									<p className="text-2xl font-semibold">
										{formatCurrency(data.schedule.scheduleE.depreciation)}
									</p>
								</div>
								<div className="rounded-lg bg-muted/40 p-4">
									<p className="text-sm text-muted-foreground">Net Income</p>
									<p
										className="text-2xl font-semibold"
										style={{
											color:
												data.schedule.scheduleE.netIncome >= 0
													? 'hsl(var(--success))'
													: 'hsl(var(--destructive))'
										}}
									>
										{formatCurrency(data.schedule.scheduleE.netIncome)}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Expense Categories</CardTitle>
							<CardDescription>
								Deductibility and amounts by category
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Category</TableHead>
										<TableHead className="text-center">Deductible</TableHead>
										<TableHead className="text-right">Amount</TableHead>
										<TableHead className="text-right">% of Total</TableHead>
										<TableHead>Notes</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{data.expenseCategories.map(expense => (
										<TableRow key={expense.category}>
											<TableCell className="font-medium">
												{expense.category}
											</TableCell>
											<TableCell className="text-center">
												{expense.deductible ? (
													<Badge
														variant="outline"
														className="flex w-fit items-center gap-1"
													>
														<CheckCircle className="size-3 text-[hsl(var(--success))]" />
														Yes
													</Badge>
												) : (
													<Badge
														variant="destructive"
														className="flex w-fit items-center gap-1"
													>
														<XCircle className="size-3" />
														No
													</Badge>
												)}
											</TableCell>
											<TableCell className="text-right">
												{formatCurrency(expense.amount)}
											</TableCell>
											<TableCell className="text-right text-muted-foreground">
												{expense.percentage.toFixed(1)}%
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{expense.notes || '—'}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Property Depreciation Schedule</CardTitle>
							<CardDescription>Annual depreciation by property</CardDescription>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Property</TableHead>
										<TableHead className="text-right">Property Value</TableHead>
										<TableHead className="text-right">
											Annual Depreciation
										</TableHead>
										<TableHead className="text-right">
											Accumulated Depreciation
										</TableHead>
										<TableHead className="text-right">
											Remaining Basis
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{data.propertyDepreciation.map(property => (
										<TableRow key={property.propertyId}>
											<TableCell className="font-medium">
												{property.propertyName}
											</TableCell>
											<TableCell className="text-right">
												{formatCurrency(property.propertyValue)}
											</TableCell>
											<TableCell className="text-right">
												{formatCurrency(property.annualDepreciation)}
											</TableCell>
											<TableCell className="text-right text-muted-foreground">
												(
												{formatCurrency(
													Math.abs(property.accumulatedDepreciation)
												)}
												)
											</TableCell>
											<TableCell className="text-right">
												{formatCurrency(property.remainingBasis)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Income Breakdown</CardTitle>
							<CardDescription>
								Detailed income calculation for tax year {data.taxYear}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">
										Gross Rental Income
									</span>
									<span className="font-semibold">
										{formatCurrency(data.incomeBreakdown.grossRentalIncome)}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Total Expenses</span>
									<span className="font-semibold text-[hsl(var(--destructive))]">
										(
										{formatCurrency(
											Math.abs(data.incomeBreakdown.totalExpenses)
										)}
										)
									</span>
								</div>
								<div className="flex items-center justify-between border-t pt-4">
									<span className="font-medium">Net Operating Income</span>
									<span className="font-semibold">
										{formatCurrency(data.incomeBreakdown.netOperatingIncome)}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Depreciation</span>
									<span className="font-semibold text-[hsl(var(--destructive))]">
										(
										{formatCurrency(
											Math.abs(data.incomeBreakdown.depreciation)
										)}
										)
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">
										Mortgage Interest
									</span>
									<span className="font-semibold text-[hsl(var(--destructive))]">
										(
										{formatCurrency(
											Math.abs(data.incomeBreakdown.mortgageInterest)
										)}
										)
									</span>
								</div>
								<div className="flex items-center justify-between border-t-2 pt-4">
									<span className="text-lg font-semibold">
										Taxable Income (Schedule E)
									</span>
									<span
										className="text-2xl font-bold"
										style={{
											color:
												data.incomeBreakdown.taxableIncome >= 0
													? 'hsl(var(--success))'
													: 'hsl(var(--destructive))'
										}}
									>
										{formatCurrency(data.incomeBreakdown.taxableIncome)}
									</span>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
