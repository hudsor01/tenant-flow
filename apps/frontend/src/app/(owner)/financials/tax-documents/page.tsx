'use client'

import { useState } from 'react'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import {
	FileText,
	TrendingDown,
	TrendingUp,
	Calendar,
	AlertCircle,
	RefreshCw,
	Download,
	Loader2
} from 'lucide-react'
import { Skeleton } from '#components/ui/skeleton'
import { Button } from '#components/ui/button'
import { BlurFade } from '#components/ui/blur-fade'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { useTaxDocuments } from '#hooks/api/use-financials'
import { useDownloadTaxDocumentPdf } from '#hooks/api/use-reports'
import { formatCents } from '@repo/shared/lib/format'

const logger = createLogger({ component: 'TaxDocumentsPage' })

const TAX_YEARS = Array.from(
	{ length: 5 },
	(_, i) => new Date().getFullYear() - i
)

export default function TaxDocumentsPage() {
	const [taxYear, setTaxYear] = useState(new Date().getFullYear())
	const { data, isLoading, error, refetch } = useTaxDocuments(taxYear)
	const downloadPdfMutation = useDownloadTaxDocumentPdf()

	if (isLoading) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<Skeleton className="h-8 w-40 mb-2" />
						<Skeleton className="h-4 w-64" />
					</div>
					<Skeleton className="h-10 w-32" />
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
					{[1, 2, 3].map(i => (
						<Skeleton key={i} className="h-24 rounded-lg" />
					))}
				</div>
				<div className="space-y-4">
					{[1, 2, 3].map(i => (
						<Skeleton key={i} className="h-16 rounded-lg" />
					))}
				</div>
			</div>
		)
	}

	if (error) {
		logger.error('Failed to load tax documents', { error })
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<div className="flex items-center gap-2 mb-6">
					<h1 className="typography-h1">Tax Documents</h1>
				</div>
				<div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 flex flex-col items-center gap-4 text-center">
					<AlertCircle className="size-10 text-destructive" />
					<div>
						<p className="font-medium text-destructive">Failed to load tax documents</p>
						<p className="text-sm text-muted-foreground mt-1">
							{error instanceof Error ? error.message : 'An unexpected error occurred'}
						</p>
					</div>
					<Button variant="outline" onClick={() => refetch()}>
						<RefreshCw className="mr-2 size-4" />
						Try Again
					</Button>
				</div>
			</div>
		)
	}

	const hasData = data && (
		data.totals.totalIncome > 0 ||
		data.totals.totalDeductions > 0 ||
		data.expenseCategories.length > 0
	)

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="typography-h1">Tax Documents</h1>
						<p className="text-muted-foreground">
							Tax summary and deductions for your rental properties.
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Select
							value={taxYear.toString()}
							onValueChange={v => setTaxYear(parseInt(v, 10))}
						>
							<SelectTrigger className="w-[130px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{TAX_YEARS.map(y => (
									<SelectItem key={y} value={y.toString()}>
										{y}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Button
							variant="outline"
							size="sm"
							className="gap-1.5 min-h-11"
							onClick={() => downloadPdfMutation.mutate(taxYear)}
							disabled={downloadPdfMutation.isPending || isLoading || !hasData}
							aria-label="Download tax documents as PDF"
						>
							{downloadPdfMutation.isPending ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<Download className="size-4" />
							)}
							{downloadPdfMutation.isPending ? 'Generating...' : 'Download PDF'}
						</Button>
					</div>
				</div>
			</BlurFade>

			{!hasData ? (
				<BlurFade delay={0.15} inView>
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
							<FileText className="w-8 h-8 text-muted-foreground" />
						</div>
						<h3 className="text-lg font-medium mb-1">No data for {taxYear}</h3>
						<p className="text-sm text-muted-foreground">
							No rental income or expenses recorded for tax year {taxYear}.
						</p>
					</div>
				</BlurFade>
			) : (
				<>
					{/* Summary Cards */}
					<BlurFade delay={0.15} inView>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
							<div className="p-4 rounded-lg border border-border bg-card">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
										<TrendingUp className="w-5 h-5 text-emerald-600" />
									</div>
									<div>
										<p className="text-xl font-semibold tabular-nums">
											{formatCents(data.totals.totalIncome)}
										</p>
										<p className="text-sm text-muted-foreground">Gross Income</p>
									</div>
								</div>
							</div>

							<div className="p-4 rounded-lg border border-border bg-card">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
										<TrendingDown className="w-5 h-5 text-rose-600" />
									</div>
									<div>
										<p className="text-xl font-semibold tabular-nums">
											{formatCents(data.totals.totalDeductions)}
										</p>
										<p className="text-sm text-muted-foreground">Total Deductions</p>
									</div>
								</div>
							</div>

							<div className="p-4 rounded-lg border border-border bg-card">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
										<Calendar className="w-5 h-5 text-blue-600" />
									</div>
									<div>
										<p className="text-xl font-semibold tabular-nums">
											{formatCents(data.totals.netTaxableIncome)}
										</p>
										<p className="text-sm text-muted-foreground">Net Taxable Income</p>
									</div>
								</div>
							</div>
						</div>
					</BlurFade>

					{/* Expense Categories */}
					{data.expenseCategories.length > 0 && (
						<BlurFade delay={0.2} inView>
							<div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
								<div className="p-4 border-b border-border bg-muted/30">
									<h3 className="font-medium text-foreground">
										Deductible Expenses — Schedule E
									</h3>
								</div>
								<div className="divide-y divide-border">
									{data.expenseCategories
										.filter(cat => cat.deductible)
										.map(cat => (
											<div
												key={cat.category}
												className="flex items-center justify-between p-4"
											>
												<div>
													<p className="text-sm font-medium capitalize">
														{cat.category.replace(/_/g, ' ')}
													</p>
													{cat.notes && (
														<p className="text-xs text-muted-foreground">
															{cat.notes}
														</p>
													)}
												</div>
												<div className="text-right">
													<p className="text-sm font-medium tabular-nums">
														{formatCents(cat.amount)}
													</p>
													<p className="text-xs text-muted-foreground">
														{cat.percentage.toFixed(1)}% of expenses
													</p>
												</div>
											</div>
										))}
								</div>
							</div>
						</BlurFade>
					)}

					{/* Property Depreciation */}
					{data.propertyDepreciation.length > 0 && (
						<BlurFade delay={0.25} inView>
							<div className="bg-card border border-border rounded-lg overflow-hidden">
								<div className="p-4 border-b border-border bg-muted/30">
									<h3 className="font-medium text-foreground">
										Property Depreciation
									</h3>
								</div>
								<div className="divide-y divide-border">
									{data.propertyDepreciation.map(prop => (
										<div
											key={prop.property_id}
											className="flex items-center justify-between p-4"
										>
											<div>
												<p className="text-sm font-medium">
													{prop.propertyName}
												</p>
												<p className="text-xs text-muted-foreground">
													Basis: {formatCents(prop.propertyValue)}
												</p>
											</div>
											<div className="text-right">
												<p className="text-sm font-medium tabular-nums">
													{formatCents(prop.annualDepreciation)}/yr
												</p>
												<p className="text-xs text-muted-foreground">
													Accumulated: {formatCents(prop.accumulatedDepreciation)}
												</p>
											</div>
										</div>
									))}
								</div>
							</div>
						</BlurFade>
					)}
				</>
			)}
		</div>
	)
}
