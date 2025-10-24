import type { Metadata } from 'next'
import { requireSession } from '@/lib/server-auth'
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { cn, formatCurrency } from '@/lib/utils'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { BalanceSheetData } from '@repo/shared/types/financial-statements'
import { getApiBaseUrl } from '@repo/shared/utils/api-utils'
import { format } from 'date-fns'
import { CheckCircle2, XCircle } from 'lucide-react'

export const metadata: Metadata = {
	title: 'Balance Sheet | TenantFlow',
	description: 'Assets, liabilities, and equity at a point in time'
}

async function getBalanceSheet(
	token: string,
	asOfDate: string
): Promise<BalanceSheetData | null> {
	try {
		const API_BASE_URL = getApiBaseUrl()
		const url = `${API_BASE_URL}/financials/balance-sheet?asOfDate=${asOfDate}`

		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			cache: 'no-store'
		})

		if (!response.ok) {
			return null
		}

		const result = await response.json()
		return result.data
	} catch {
		return null
	}
}

export default async function BalanceSheetPage() {
	// Server-side auth
	const user = await requireSession()
	const logger = createLogger({ component: 'BalanceSheetPage', userId: user.id })

	// Default to today's date
	const asOfDate = format(new Date(), 'yyyy-MM-dd')

	// Fetch data
	let data: BalanceSheetData | null = null
	try {
		// Get auth token for API call
		const { createClient } = await import('@/lib/supabase/server')
		const supabase = await createClient()
		const { data: { session } } = await supabase.auth.getSession()

		if (session?.access_token) {
			data = await getBalanceSheet(session.access_token, asOfDate)
		}
	} catch (err) {
		logger.warn('Failed to fetch balance sheet', {
			error: err instanceof Error ? err.message : String(err)
		})
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
				<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
					<div className="flex flex-col gap-2">
						<h1 className="text-3xl font-semibold tracking-tight">
							Balance Sheet
						</h1>
						<p className="text-muted-foreground">
							Assets, liabilities, and equity at a point in time
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<ExportButtons filename="balance-sheet" payload={data} />
					</div>
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
								<CardDescription>Owner&apos;s stake</CardDescription>
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
				<div className="mx-auto max-w-400 space-y-8 px-4 lg:px-6">
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
								<CardDescription>Owner&apos;s investment</CardDescription>
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