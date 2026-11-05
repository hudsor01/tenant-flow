"use client";

import {
	AlertCircle,
	Calendar,
	Download,
	FileText,
	Loader2,
	RefreshCw,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { useId, useState } from "react";
import { BlurFade } from "#components/ui/blur-fade";
import { Button } from "#components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#components/ui/select";
import { Skeleton } from "#components/ui/skeleton";
import { useTaxDocuments } from "#hooks/api/use-expense-mutations";
import { useDownloadTaxDocumentPdf } from "#hooks/api/use-report-mutations";
import { createLogger } from "#lib/frontend-logger";
import { formatCurrency } from "#lib/utils/currency";
import {
	DEDUCTIBILITY_NOTE,
	EXPENSES_BY_VENDOR_SECTION,
} from "../../../../../supabase/functions/_shared/tax-year-reports";
import { LedgerTotalsUnavailable } from "../ledger-totals-unavailable";

const logger = createLogger({ component: "TaxDocumentsPage" });

const TAX_YEARS = Array.from(
	{ length: 5 },
	(_, i) => new Date().getFullYear() - i,
);

export default function TaxDocumentsPage() {
	const [taxYear, setTaxYear] = useState(new Date().getFullYear());
	const { data: result, isLoading, error, refetch } = useTaxDocuments(taxYear);
	// When get_billing_insights returns none of the ledger figures the tax
	// year's income comes from (its body before 20261102055449), the query
	// says so rather than handing the page a $0 gross income.
	const ledgerUnavailable = result?.status === "ledger-unavailable";
	const data = result?.status === "ready" ? result.documents : undefined;
	const downloadPdfMutation = useDownloadTaxDocumentPdf();
	const pdfReasonId = useId();

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
					{[1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-24 rounded-lg" />
					))}
				</div>
				<div className="space-y-4">
					{[1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-16 rounded-lg" />
					))}
				</div>
			</div>
		);
	}

	if (error) {
		logger.error("Failed to load tax documents", { error });
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<div className="flex items-center gap-2 mb-6">
					<h1 className="typography-h1">Tax Documents</h1>
				</div>
				<div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 flex flex-col items-center gap-4 text-center">
					<AlertCircle className="size-10 text-destructive" />
					<div>
						<p className="font-medium text-destructive-text">
							Failed to load tax documents
						</p>
						<p className="text-sm text-muted-foreground mt-1">
							An unexpected error occurred
						</p>
					</div>
					<Button variant="outline" onClick={() => refetch()}>
						<RefreshCw className="mr-2 size-4" />
						Try Again
					</Button>
				</div>
			</div>
		);
	}

	// Rent received is the ledger's for the year, so a reversal posted in it can
	// leave it below zero: that is a figure to show, as the year-end page does.
	const hasData =
		data &&
		(data.totals.totalIncome !== 0 ||
			data.totals.totalExpenses > 0 ||
			data.expenseCategories.length > 0);

	// aria-disabled, not disabled, keeps the tab stop so the reason stays
	// reachable (as the statements' ReportExportButton does); the click is
	// ignored while it is set, and while a PDF is generating.
	const pdfUnavailableReason = ledgerUnavailable
		? "The rent ledger totals the tax documents are built on aren't available yet."
		: !hasData
			? `No rent received or expenses recorded for tax year ${taxYear}.`
			: null;
	const pdfBlocked =
		pdfUnavailableReason !== null || downloadPdfMutation.isPending;

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1}>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="typography-h1">Tax Documents</h1>
						<p className="text-muted-foreground">
							Rent received and expenses for a tax year, for your tax preparer.
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Select
							value={taxYear.toString()}
							onValueChange={(v) => setTaxYear(parseInt(v, 10))}
						>
							<SelectTrigger
								className="w-32.5"
								aria-label={`${taxYear} (tax year)`}
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{TAX_YEARS.map((y) => (
									<SelectItem key={y} value={y.toString()}>
										{y}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Button
							variant="outline"
							size="sm"
							className="gap-1.5 min-h-11 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
							onClick={
								pdfBlocked
									? undefined
									: () => downloadPdfMutation.mutate(taxYear)
							}
							aria-disabled={pdfBlocked || undefined}
							aria-describedby={
								pdfUnavailableReason !== null ? pdfReasonId : undefined
							}
							aria-label={
								downloadPdfMutation.isPending
									? "Generating..."
									: "Download PDF of the tax documents"
							}
						>
							{downloadPdfMutation.isPending ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<Download className="size-4" />
							)}
							{downloadPdfMutation.isPending ? "Generating..." : "Download PDF"}
						</Button>
						{pdfUnavailableReason !== null ? (
							<span id={pdfReasonId} className="sr-only">
								{pdfUnavailableReason}
							</span>
						) : null}
					</div>
				</div>
			</BlurFade>

			{ledgerUnavailable ? (
				<LedgerTotalsUnavailable
					description="Rent received for the tax year comes from your rent ledger."
					onRetryAction={() => void refetch()}
				/>
			) : !hasData ? (
				<BlurFade delay={0.15}>
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
					<BlurFade delay={0.15}>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
							<div className="p-4 rounded-lg border border-border bg-card">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
										<TrendingUp className="w-5 h-5 text-success-text" />
									</div>
									<div>
										<p className="text-xl font-semibold tabular-nums">
											{formatCurrency(data.totals.totalIncome)}
										</p>
										<p className="text-sm text-muted-foreground">
											Rent Received
										</p>
									</div>
								</div>
							</div>

							<div className="p-4 rounded-lg border border-border bg-card">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
										<TrendingDown className="w-5 h-5 text-destructive-text" />
									</div>
									<div>
										<p className="text-xl font-semibold tabular-nums">
											{formatCurrency(data.totals.totalExpenses)}
										</p>
										<p className="text-sm text-muted-foreground">
											Operating Expenses
										</p>
									</div>
								</div>
							</div>

							<div className="p-4 rounded-lg border border-border bg-card">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
										<Calendar className="w-5 h-5 text-info-text" />
									</div>
									<div>
										<p className="text-xl font-semibold tabular-nums">
											{formatCurrency(data.totals.netIncome)}
										</p>
										<p className="text-sm text-muted-foreground">Net Income</p>
									</div>
								</div>
							</div>
						</div>
					</BlurFade>

					{/* Expenses by vendor: TenantFlow does not decide deductibility. */}
					{data.expenseCategories.length > 0 && (
						<BlurFade delay={0.2}>
							<section
								aria-labelledby="tax-expenses-by-vendor"
								className="bg-card border border-border rounded-lg overflow-hidden mb-6"
							>
								<div className="p-4 border-b border-border bg-muted/30">
									<h3
										id="tax-expenses-by-vendor"
										className="font-medium text-foreground"
									>
										{EXPENSES_BY_VENDOR_SECTION}
									</h3>
									<p className="mt-1 text-sm text-muted-foreground">
										{DEDUCTIBILITY_NOTE}
									</p>
								</div>
								<div className="divide-y divide-border">
									{data.expenseCategories.map((cat) => (
										<div
											key={cat.category}
											className="flex items-center justify-between gap-4 p-4"
										>
											<p className="min-w-0 wrap-break-word text-sm font-medium">
												{cat.category}
											</p>
											<div className="shrink-0 text-right">
												<p className="text-sm font-medium tabular-nums">
													{formatCurrency(cat.amount)}
												</p>
												<p className="text-xs text-muted-foreground">
													{cat.percentage.toFixed(1)}% of expenses
												</p>
											</div>
										</div>
									))}
								</div>
							</section>
						</BlurFade>
					)}
				</>
			)}
		</div>
	);
}
