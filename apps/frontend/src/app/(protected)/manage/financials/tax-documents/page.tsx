import type { Metadata } from 'next'
import { requireSession } from '#lib/server-auth'
import { ExportButtons } from '#components/export/export-buttons'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '#components/ui/table'
import { cn, formatCurrency } from '#lib/utils'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { TaxDocumentsData } from '@repo/shared/types/financial-statements'
import { getApiBaseUrl } from '@repo/shared/utils/api-utils'
import { CheckCircle, Download, XCircle } from 'lucide-react'

export const metadata: Metadata = {
	title: 'Tax Documents | TenantFlow',
	description: 'Schedule E and supporting documentation for tax preparation'
}

async function getTaxDocuments(
	token: string,
	taxYear: number
): Promise<TaxDocumentsData | null> {
	try {
		const API_BASE_URL = getApiBaseUrl()
		const url = `${API_BASE_URL}/financials/tax-documents?taxYear=${taxYear}`

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

export default async function TaxDocumentsPage() {
	// Server-side auth
	const { user } = await requireSession()
	const logger = createLogger({ component: 'TaxDocumentsPage', userId: user.id })

	// Default to previous tax year
	const selectedYear = new Date().getFullYear() - 1

	// Fetch data
	let data: TaxDocumentsData | null = null
	try {
		// Get auth token for API call
		const { createClient } = await import('#lib/supabase/server')
		const supabase = await createClient()
		const { data: { session } } = await supabase.auth.getSession()

		if (session?.access_token) {
			data = await getTaxDocuments(session.access_token, selectedYear)
		}
	} catch (err) {
		logger.warn('Failed to fetch tax documents', {
			error: err instanceof Error ? err.message : String(err)
		})
	}

	if (!data) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<p className="text-muted-foreground">No data available for the selected year</p>
			</div>
		)
	}

	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
			<div className="border-b bg-background p-6">
				<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
					<div className="flex flex-col gap-2">
						<h1 className="text-3xl font-semibold tracking-tight">
							Tax Documents
						</h1>
						<p className="text-muted-foreground">
							Schedule E and supporting documentation for tax preparation
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-3">
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
									className={cn(
										'text-3xl font-semibold tabular-nums',
										data.totals.netTaxableIncome >= 0
											? 'text-[oklch(var(--success))]'
											: 'text-[oklch(var(--destructive))]'
									)}
								>
									{formatCurrency(data.totals.netTaxableIncome)}
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
										className={cn(
											'text-2xl font-semibold',
											data.schedule.scheduleE.netIncome >= 0
												? 'text-[oklch(var(--success))]'
												: 'text-[oklch(var(--destructive))]'
										)}
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
														<CheckCircle className="size-3 text-[oklch(var(--success))]" />
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
									<span className="font-semibold text-[oklch(var(--destructive))]">
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
									<span className="font-semibold text-[oklch(var(--destructive))]">
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
									<span className="font-semibold text-[oklch(var(--destructive))]">
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
										className={cn(
											'text-2xl font-bold',
											data.incomeBreakdown.taxableIncome >= 0
												? 'text-[oklch(var(--success))]'
												: 'text-[oklch(var(--destructive))]'
										)}
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