'use client'

import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '#components/ui/table'
import { Badge } from '#components/ui/badge'
import { Download, FileText, AlertCircle } from 'lucide-react'
import type { YearEndSummary, Year1099Summary } from '@repo/shared/types/reports'

function formatMoney(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(amount)
}

interface YearEndReportSectionProps {
	year: number
	yearEndData: YearEndSummary | undefined
	data1099: Year1099Summary | undefined
	isLoadingYearEnd: boolean
	isLoading1099: boolean
	onDownloadYearEndCsv: () => void
	onDownload1099Csv: () => void
	isExportingYearEnd: boolean
	isExporting1099: boolean
}

function SummaryCard({
	label,
	value,
	isLoading
}: {
	label: string
	value: string
	isLoading: boolean
}) {
	return (
		<Card>
			<CardContent className="pt-6">
				{isLoading ? (
					<Skeleton className="h-8 w-32 mb-1" />
				) : (
					<p className="text-2xl font-semibold">{value}</p>
				)}
				<p className="text-sm text-muted-foreground mt-1">{label}</p>
			</CardContent>
		</Card>
	)
}

export function YearEndReportSection({
	year,
	yearEndData,
	data1099,
	isLoadingYearEnd,
	isLoading1099,
	onDownloadYearEndCsv,
	onDownload1099Csv,
	isExportingYearEnd,
	isExporting1099
}: YearEndReportSectionProps) {
	return (
		<section className="flex flex-col gap-6">
			{/* Year-End Summary */}
			<div className="flex flex-col gap-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-lg font-semibold flex items-center gap-2">
							<FileText className="size-5 text-primary" />
							{year} Year-End Summary
						</h2>
						<p className="text-sm text-muted-foreground">
							Annual income and expense summary for tax preparation
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={onDownloadYearEndCsv}
						disabled={isExportingYearEnd || !yearEndData}
						className="gap-1.5 min-h-11"
					>
						<Download className="size-4" />
						{isExportingYearEnd ? 'Exporting...' : 'Download CSV'}
					</Button>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<SummaryCard
						label="Gross Rental Income"
						value={yearEndData ? formatMoney(yearEndData.grossRentalIncome) : '$0.00'}
						isLoading={isLoadingYearEnd}
					/>
					<SummaryCard
						label="Operating Expenses"
						value={yearEndData ? formatMoney(yearEndData.operatingExpenses) : '$0.00'}
						isLoading={isLoadingYearEnd}
					/>
					<SummaryCard
						label="Net Income"
						value={yearEndData ? formatMoney(yearEndData.netIncome) : '$0.00'}
						isLoading={isLoadingYearEnd}
					/>
				</div>

				{/* By Property Table */}
				{(isLoadingYearEnd || (yearEndData?.byProperty.length ?? 0) > 0) && (
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-base">By Property</CardTitle>
							<CardDescription>Income and expenses for each property in {year}</CardDescription>
						</CardHeader>
						<CardContent>
							{isLoadingYearEnd ? (
								<div className="space-y-2">
									{Array.from({ length: 3 }).map((_, i) => (
										<Skeleton key={i} className="h-10 w-full" />
									))}
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Property</TableHead>
											<TableHead className="text-right">Income</TableHead>
											<TableHead className="text-right">Expenses</TableHead>
											<TableHead className="text-right">Net Income</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{yearEndData?.byProperty.map(p => (
											<TableRow key={p.propertyId}>
												<TableCell className="font-medium">{p.propertyName}</TableCell>
												<TableCell className="text-right text-emerald-600">
													{formatMoney(p.income)}
												</TableCell>
												<TableCell className="text-right text-red-500">
													{formatMoney(p.expenses)}
												</TableCell>
												<TableCell
													className={`text-right font-medium ${
														p.netIncome >= 0 ? 'text-emerald-600' : 'text-red-500'
													}`}
												>
													{formatMoney(p.netIncome)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				)}

				{/* Expense Categories */}
				{(isLoadingYearEnd || (yearEndData?.expenseByCategory.length ?? 0) > 0) && (
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-base">Expense Breakdown</CardTitle>
							<CardDescription>Operating expenses by category for {year}</CardDescription>
						</CardHeader>
						<CardContent>
							{isLoadingYearEnd ? (
								<div className="space-y-2">
									{Array.from({ length: 4 }).map((_, i) => (
										<Skeleton key={i} className="h-8 w-full" />
									))}
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Category</TableHead>
											<TableHead className="text-right">Amount</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{yearEndData?.expenseByCategory
											.sort((a, b) => b.amount - a.amount)
											.map((cat, i) => (
												<TableRow key={i}>
													<TableCell>{cat.category}</TableCell>
													<TableCell className="text-right text-red-500">
														{formatMoney(cat.amount)}
													</TableCell>
												</TableRow>
											))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				)}
			</div>

			{/* 1099-NEC Section */}
			<div className="flex flex-col gap-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-lg font-semibold flex items-center gap-2">
							<AlertCircle className="size-5 text-amber-500" />
							1099-NEC Vendors ({year})
						</h2>
						<p className="text-sm text-muted-foreground">
							Vendors paid ${data1099?.threshold ?? 600}+ — may require 1099-NEC filing
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={onDownload1099Csv}
						disabled={isExporting1099 || !data1099}
						className="gap-1.5 min-h-11"
					>
						<Download className="size-4" />
						{isExporting1099 ? 'Exporting...' : 'Download CSV'}
					</Button>
				</div>

				<Card>
					<CardContent className="pt-6">
						{isLoading1099 ? (
							<div className="space-y-2">
								{Array.from({ length: 3 }).map((_, i) => (
									<Skeleton key={i} className="h-10 w-full" />
								))}
							</div>
						) : (data1099?.recipients.length ?? 0) === 0 ? (
							<p className="text-sm text-muted-foreground text-center py-4">
								No vendors exceeded the ${data1099?.threshold ?? 600} threshold in {year}.
							</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Vendor</TableHead>
										<TableHead className="text-right">Jobs</TableHead>
										<TableHead className="text-right">Total Paid</TableHead>
										<TableHead className="text-right">Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{data1099?.recipients.map((r, i) => (
										<TableRow key={i}>
											<TableCell className="font-medium">{r.vendorName}</TableCell>
											<TableCell className="text-right">{r.jobCount}</TableCell>
											<TableCell className="text-right font-medium">
												{formatMoney(r.totalPaid)}
											</TableCell>
											<TableCell className="text-right">
												<Badge variant="outline" className="text-amber-600 border-amber-300">
													1099 Required
												</Badge>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>
		</section>
	)
}
