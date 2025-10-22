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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { getBalanceSheet } from '@/lib/api/financials-client'
import { createClient } from '@/lib/supabase/client'
import { cn, formatCurrency } from '@/lib/utils'
import type { BalanceSheetData } from '@repo/shared/types/financial-statements'
import { format } from 'date-fns'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function BalanceSheetPage() {
	const [data, setData] = useState<BalanceSheetData | null>(null)
	const [loading, setLoading] = useState(true)
	const [asOfDate, setAsOfDate] = useState(format(new Date(), 'yyyy-MM-dd'))

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

				const result = await getBalanceSheet(session.access_token, asOfDate)
				setData(result)
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: 'Failed to load balance sheet'
				)
			} finally {
				setLoading(false)
			}
		}

		loadData()
	}, [asOfDate])

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

	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
			<div className="border-b bg-background p-6">
				<div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 lg:px-6">
					<div className="flex flex-col gap-2">
						<h1 className="text-3xl font-semibold tracking-tight">
							Balance Sheet
						</h1>
						<p className="text-muted-foreground">
							Assets, liabilities, and equity at a point in time
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<div className="flex items-center gap-2">
							<Label htmlFor="asOfDate" className="whitespace-nowrap">
								As of Date
							</Label>
							<Input
								id="asOfDate"
								type="date"
								value={asOfDate}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
									setAsOfDate(e.target.value)
								}
								className="w-[200px]"
							/>
						</div>
						<ExportButtons filename="balance-sheet" payload={data} />
					</div>{' '}
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
						<Card className="@container/card">
							<CardHeader>
								<CardTitle>Total Assets</CardTitle>
								<CardDescription>{data.period.label}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<p className="text-3xl font-semibold tabular-nums">
									{formatCurrency(data.assets.totalAssets)}
								</p>
							</CardContent>
						</Card>

						<Card className="@container/card">
							<CardHeader>
								<CardTitle>Total Liabilities</CardTitle>
								<CardDescription>Obligations</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<p className="text-3xl font-semibold tabular-nums">
									{formatCurrency(data.liabilities.totalLiabilities)}
								</p>
							</CardContent>
						</Card>

						<Card className="@container/card">
							<CardHeader>
								<CardTitle>Total Equity</CardTitle>
								<CardDescription>Owner's stake</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<p className="text-3xl font-semibold tabular-nums">
									{formatCurrency(data.equity.totalEquity)}
								</p>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>

			<div className="flex-1 p-6">
				<div className="mx-auto max-w-[1600px] space-y-8 px-4 lg:px-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								Balance Check
								{data.balanceCheck ? (
									<Badge variant="outline" className="flex items-center gap-1">
										<CheckCircle2 className="size-3 text-[oklch(var(--success))]" />
										Balanced
									</Badge>
								) : (
									<Badge
										variant="destructive"
										className="flex items-center gap-1"
									>
										<XCircle className="size-3" />
										Unbalanced
									</Badge>
								)}
							</CardTitle>
							<CardDescription>
								Assets should equal Liabilities + Equity
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
								<div className="rounded-lg bg-muted/40 p-4">
									<p className="text-sm text-muted-foreground">Assets</p>
									<p className="text-2xl font-semibold">
										{formatCurrency(data.assets.totalAssets)}
									</p>
								</div>
								<div className="rounded-lg bg-muted/40 p-4">
									<p className="text-sm text-muted-foreground">
										Liabilities + Equity
									</p>
									<p className="text-2xl font-semibold">
										{formatCurrency(
											data.liabilities.totalLiabilities +
												data.equity.totalEquity
										)}
									</p>
								</div>
								<div className="rounded-lg bg-muted/40 p-4">
									<p className="text-sm text-muted-foreground">Difference</p>
									<p
										className={cn(
											'text-2xl font-semibold',
											data.balanceCheck
												? 'text-[oklch(var(--success))]'
												: 'text-[oklch(var(--destructive))]'
										)}
									>
										{formatCurrency(
											data.assets.totalAssets -
												(data.liabilities.totalLiabilities +
													data.equity.totalEquity)
										)}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
						<Card>
							<CardHeader>
								<CardTitle>Assets</CardTitle>
								<CardDescription>What the business owns</CardDescription>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead colSpan={2} className="font-semibold">
												Current Assets
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										<TableRow>
											<TableCell className="pl-4">Cash</TableCell>
											<TableCell className="text-right">
												{formatCurrency(data.assets.currentAssets.cash)}
											</TableCell>
										</TableRow>
										<TableRow>
											<TableCell className="pl-4">
												Accounts Receivable
											</TableCell>
											<TableCell className="text-right">
												{formatCurrency(
													data.assets.currentAssets.accountsReceivable
												)}
											</TableCell>
										</TableRow>
										<TableRow>
											<TableCell className="pl-4">Security Deposits</TableCell>
											<TableCell className="text-right">
												{formatCurrency(
													data.assets.currentAssets.securityDeposits
												)}
											</TableCell>
										</TableRow>
										<TableRow className="border-t">
											<TableCell className="font-medium">Subtotal</TableCell>
											<TableCell className="text-right font-medium">
												{formatCurrency(data.assets.currentAssets.total)}
											</TableCell>
										</TableRow>
									</TableBody>
								</Table>

								<Table className="mt-4">
									<TableHeader>
										<TableRow>
											<TableHead colSpan={2} className="font-semibold">
												Fixed Assets
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										<TableRow>
											<TableCell className="pl-4">Property Values</TableCell>
											<TableCell className="text-right">
												{formatCurrency(data.assets.fixedAssets.propertyValues)}
											</TableCell>
										</TableRow>
										<TableRow>
											<TableCell className="pl-4">
												Accumulated Depreciation
											</TableCell>
											<TableCell className="text-right text-muted-foreground">
												(
												{formatCurrency(
													Math.abs(
														data.assets.fixedAssets.accumulatedDepreciation
													)
												)}
												)
											</TableCell>
										</TableRow>
										<TableRow className="border-t">
											<TableCell className="font-medium">
												Net Property Value
											</TableCell>
											<TableCell className="text-right font-medium">
												{formatCurrency(
													data.assets.fixedAssets.netPropertyValue
												)}
											</TableCell>
										</TableRow>
										<TableRow className="border-t-2">
											<TableCell className="font-semibold">
												Total Assets
											</TableCell>
											<TableCell className="text-right font-semibold">
												{formatCurrency(data.assets.totalAssets)}
											</TableCell>
										</TableRow>
									</TableBody>
								</Table>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Liabilities</CardTitle>
								<CardDescription>What the business owes</CardDescription>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead colSpan={2} className="font-semibold">
												Current Liabilities
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										<TableRow>
											<TableCell className="pl-4">Accounts Payable</TableCell>
											<TableCell className="text-right">
												{formatCurrency(
													data.liabilities.currentLiabilities.accountsPayable
												)}
											</TableCell>
										</TableRow>
										<TableRow>
											<TableCell className="pl-4">
												Security Deposit Liability
											</TableCell>
											<TableCell className="text-right">
												{formatCurrency(
													data.liabilities.currentLiabilities
														.securityDepositLiability
												)}
											</TableCell>
										</TableRow>
										<TableRow>
											<TableCell className="pl-4">Accrued Expenses</TableCell>
											<TableCell className="text-right">
												{formatCurrency(
													data.liabilities.currentLiabilities.accruedExpenses
												)}
											</TableCell>
										</TableRow>
										<TableRow className="border-t">
											<TableCell className="font-medium">Subtotal</TableCell>
											<TableCell className="text-right font-medium">
												{formatCurrency(
													data.liabilities.currentLiabilities.total
												)}
											</TableCell>
										</TableRow>
									</TableBody>
								</Table>

								<Table className="mt-4">
									<TableHeader>
										<TableRow>
											<TableHead colSpan={2} className="font-semibold">
												Long-term Liabilities
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										<TableRow>
											<TableCell className="pl-4">Mortgages Payable</TableCell>
											<TableCell className="text-right">
												{formatCurrency(
													data.liabilities.longTermLiabilities.mortgagesPayable
												)}
											</TableCell>
										</TableRow>
										<TableRow className="border-t-2">
											<TableCell className="font-semibold">
												Total Liabilities
											</TableCell>
											<TableCell className="text-right font-semibold">
												{formatCurrency(data.liabilities.totalLiabilities)}
											</TableCell>
										</TableRow>
									</TableBody>
								</Table>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Equity</CardTitle>
								<CardDescription>Owner's investment</CardDescription>
							</CardHeader>
							<CardContent>
								<Table>
									<TableBody>
										<TableRow>
											<TableCell className="font-medium">
												Owner Capital
											</TableCell>
											<TableCell className="text-right">
												{formatCurrency(data.equity.ownerCapital)}
											</TableCell>
										</TableRow>
										<TableRow>
											<TableCell className="font-medium">
												Retained Earnings
											</TableCell>
											<TableCell className="text-right">
												{formatCurrency(data.equity.retainedEarnings)}
											</TableCell>
										</TableRow>
										<TableRow>
											<TableCell className="font-medium">
												Current Period Income
											</TableCell>
											<TableCell className="text-right">
												{formatCurrency(data.equity.currentPeriodIncome)}
											</TableCell>
										</TableRow>
										<TableRow className="border-t-2">
											<TableCell className="font-semibold">
												Total Equity
											</TableCell>
											<TableCell className="text-right font-semibold">
												{formatCurrency(data.equity.totalEquity)}
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
