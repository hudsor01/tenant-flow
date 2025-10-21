'use client'

import { ExportButtons } from '@/components/export/export-buttons'
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
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { getCashFlowStatement } from '@/lib/api/financials-client'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import type { CashFlowData } from '@repo/shared/types/financial-statements'
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function CashFlowPage() {
	const [data, setData] = useState<CashFlowData | null>(null)
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

				const result = await getCashFlowStatement(
					session.access_token,
					startDate,
					endDate
				)
				setData(result)
			} catch {
				// Error handling - silent fail
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

	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
			<div
				className="border-b bg-background"
				style={{ padding: 'var(--dashboard-content-padding)' }}
			>
				<div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 lg:px-6">
					<div className="flex flex-col gap-2">
						<h1 className="text-3xl font-semibold tracking-tight">
							Cash Flow Statement
						</h1>
						<p className="text-muted-foreground">
							Track cash inflows and outflows across all activities
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-3">
						<Select value={selectedMonth} onValueChange={setSelectedMonth}>
							<SelectTrigger className="w-[200px]">
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
						<ExportButtons filename="cash-flow-statement" payload={data} />
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
						<Card className="@container/card">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									Operating Activities
									{data.operatingActivities.netOperatingCash >= 0 ? (
										<ArrowUpRight className="size-4 text-[oklch(var(--success))]" />
									) : (
										<ArrowDownRight className="size-4 text-[oklch(var(--destructive))]" />
									)}
								</CardTitle>
								<CardDescription>Core business operations</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<p
									className="text-3xl font-semibold tabular-nums"
									style={{
										color:
											data.operatingActivities.netOperatingCash >= 0
												? 'oklch(var(--success))'
												: 'oklch(var(--destructive))'
									}}
								>
									{formatCurrency(data.operatingActivities.netOperatingCash)}
								</p>
							</CardContent>
						</Card>

						<Card className="@container/card">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									Investing Activities
									{data.investingActivities.netInvestingCash >= 0 ? (
										<ArrowUpRight className="size-4 text-[oklch(var(--success))]" />
									) : (
										<ArrowDownRight className="size-4 text-[oklch(var(--destructive))]" />
									)}
								</CardTitle>
								<CardDescription>Property investments</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<p
									className="text-3xl font-semibold tabular-nums"
									style={{
										color:
											data.investingActivities.netInvestingCash >= 0
												? 'oklch(var(--success))'
												: 'oklch(var(--destructive))'
									}}
								>
									{formatCurrency(data.investingActivities.netInvestingCash)}
								</p>
							</CardContent>
						</Card>

						<Card className="@container/card">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									Financing Activities
									{data.financingActivities.netFinancingCash >= 0 ? (
										<ArrowUpRight className="size-4 text-[oklch(var(--success))]" />
									) : (
										<ArrowDownRight className="size-4 text-[oklch(var(--destructive))]" />
									)}
								</CardTitle>
								<CardDescription>Loans and distributions</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<p
									className="text-3xl font-semibold tabular-nums"
									style={{
										color:
											data.financingActivities.netFinancingCash >= 0
												? 'oklch(var(--success))'
												: 'oklch(var(--destructive))'
									}}
								>
									{formatCurrency(data.financingActivities.netFinancingCash)}
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
							<CardTitle>Cash Flow Summary</CardTitle>
							<CardDescription>
								Beginning to ending cash position
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="flex items-center justify-between rounded-lg bg-muted/40 p-4">
									<span className="font-medium">Beginning Cash</span>
									<span className="text-xl font-semibold tabular-nums">
										{formatCurrency(data.beginningCash)}
									</span>
								</div>

								<div className="flex items-center justify-between px-4">
									<span className="text-muted-foreground">
										Net Cash from Operations
									</span>
									<span
										className="font-semibold tabular-nums"
										style={{
											color:
												data.operatingActivities.netOperatingCash >= 0
													? 'oklch(var(--success))'
													: 'oklch(var(--destructive))'
										}}
									>
										{formatCurrency(data.operatingActivities.netOperatingCash)}
									</span>
								</div>

								<div className="flex items-center justify-between px-4">
									<span className="text-muted-foreground">
										Net Cash from Investing
									</span>
									<span
										className="font-semibold tabular-nums"
										style={{
											color:
												data.investingActivities.netInvestingCash >= 0
													? 'oklch(var(--success))'
													: 'oklch(var(--destructive))'
										}}
									>
										{formatCurrency(data.investingActivities.netInvestingCash)}
									</span>
								</div>

								<div className="flex items-center justify-between px-4">
									<span className="text-muted-foreground">
										Net Cash from Financing
									</span>
									<span
										className="font-semibold tabular-nums"
										style={{
											color:
												data.financingActivities.netFinancingCash >= 0
													? 'oklch(var(--success))'
													: 'oklch(var(--destructive))'
										}}
									>
										{formatCurrency(data.financingActivities.netFinancingCash)}
									</span>
								</div>

								<div className="flex items-center justify-between border-t-2 pt-4">
									<span className="text-lg font-semibold">Net Cash Flow</span>
									<span
										className="text-2xl font-bold tabular-nums"
										style={{
											color:
												data.netCashFlow >= 0
													? 'oklch(var(--success))'
													: 'oklch(var(--destructive))'
										}}
									>
										{formatCurrency(data.netCashFlow)}
									</span>
								</div>

								<div className="flex items-center justify-between rounded-lg bg-muted/40 p-4">
									<span className="font-medium">Ending Cash</span>
									<span className="text-xl font-semibold tabular-nums">
										{formatCurrency(data.endingCash)}
									</span>
								</div>
							</div>
						</CardContent>
					</Card>

					<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
						<Card>
							<CardHeader>
								<CardTitle>Operating Activities</CardTitle>
								<CardDescription>Day-to-day cash flows</CardDescription>
							</CardHeader>
							<CardContent>
								<Table>
									<TableBody>
										<TableRow>
											<TableCell className="font-medium">
												Rental Payments
											</TableCell>
											<TableCell className="text-right text-[oklch(var(--success))]">
												{formatCurrency(
													data.operatingActivities.rentalPaymentsReceived
												)}
											</TableCell>
										</TableRow>
										<TableRow>
											<TableCell className="font-medium">
												Operating Expenses
											</TableCell>
											<TableCell className="text-right text-[oklch(var(--destructive))]">
												(
												{formatCurrency(
													Math.abs(
														data.operatingActivities.operatingExpensesPaid
													)
												)}
												)
											</TableCell>
										</TableRow>
										<TableRow>
											<TableCell className="font-medium">Maintenance</TableCell>
											<TableCell className="text-right text-[oklch(var(--destructive))]">
												(
												{formatCurrency(
													Math.abs(data.operatingActivities.maintenancePaid)
												)}
												)
											</TableCell>
										</TableRow>
										<TableRow className="border-t-2">
											<TableCell className="font-semibold">Net Cash</TableCell>
											<TableCell
												className="text-right font-semibold"
												style={{
													color:
														data.operatingActivities.netOperatingCash >= 0
															? 'oklch(var(--success))'
															: 'oklch(var(--destructive))'
												}}
											>
												{formatCurrency(
													data.operatingActivities.netOperatingCash
												)}
											</TableCell>
										</TableRow>
									</TableBody>
								</Table>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Investing Activities</CardTitle>
								<CardDescription>Property & improvements</CardDescription>
							</CardHeader>
							<CardContent>
								<Table>
									<TableBody>
										<TableRow>
											<TableCell className="font-medium">
												Property Acquisitions
											</TableCell>
											<TableCell className="text-right text-[oklch(var(--destructive))]">
												(
												{formatCurrency(
													Math.abs(
														data.investingActivities.propertyAcquisitions
													)
												)}
												)
											</TableCell>
										</TableRow>
										<TableRow>
											<TableCell className="font-medium">
												Property Improvements
											</TableCell>
											<TableCell className="text-right text-[oklch(var(--destructive))]">
												(
												{formatCurrency(
													Math.abs(
														data.investingActivities.propertyImprovements
													)
												)}
												)
											</TableCell>
										</TableRow>
										<TableRow className="border-t-2">
											<TableCell className="font-semibold">Net Cash</TableCell>
											<TableCell
												className="text-right font-semibold"
												style={{
													color:
														data.investingActivities.netInvestingCash >= 0
															? 'oklch(var(--success))'
															: 'oklch(var(--destructive))'
												}}
											>
												{formatCurrency(
													data.investingActivities.netInvestingCash
												)}
											</TableCell>
										</TableRow>
									</TableBody>
								</Table>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Financing Activities</CardTitle>
								<CardDescription>Loans & distributions</CardDescription>
							</CardHeader>
							<CardContent>
								<Table>
									<TableBody>
										<TableRow>
											<TableCell className="font-medium">
												Mortgage Payments
											</TableCell>
											<TableCell className="text-right text-[oklch(var(--destructive))]">
												(
												{formatCurrency(
													Math.abs(data.financingActivities.mortgagePayments)
												)}
												)
											</TableCell>
										</TableRow>
										<TableRow>
											<TableCell className="font-medium">
												Loan Proceeds
											</TableCell>
											<TableCell className="text-right text-[oklch(var(--success))]">
												{formatCurrency(data.financingActivities.loanProceeds)}
											</TableCell>
										</TableRow>
										<TableRow>
											<TableCell className="font-medium">
												Owner Contributions
											</TableCell>
											<TableCell className="text-right text-[oklch(var(--success))]">
												{formatCurrency(
													data.financingActivities.ownerContributions
												)}
											</TableCell>
										</TableRow>
										<TableRow>
											<TableCell className="font-medium">
												Owner Distributions
											</TableCell>
											<TableCell className="text-right text-[oklch(var(--destructive))]">
												(
												{formatCurrency(
													Math.abs(data.financingActivities.ownerDistributions)
												)}
												)
											</TableCell>
										</TableRow>
										<TableRow className="border-t-2">
											<TableCell className="font-semibold">Net Cash</TableCell>
											<TableCell
												className="text-right font-semibold"
												style={{
													color:
														data.financingActivities.netFinancingCash >= 0
															? 'oklch(var(--success))'
															: 'oklch(var(--destructive))'
												}}
											>
												{formatCurrency(
													data.financingActivities.netFinancingCash
												)}
											</TableCell>
										</TableRow>
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	)
}
