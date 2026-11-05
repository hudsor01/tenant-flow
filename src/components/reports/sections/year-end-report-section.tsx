"use client";

import { Download, FileText } from "lucide-react";
import { useId } from "react";
import { Button } from "#components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#components/ui/card";
import { Skeleton } from "#components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#components/ui/table";
import { formatCurrency } from "#lib/utils/currency";
import type { YearEndSummary } from "#types/reports";
import {
	sortExpenseCategoriesDesc,
	yearEndUnavailableReason,
} from "./year-end-report-section-utils";

interface YearEndReportSectionProps {
	year: number;
	yearEndData: YearEndSummary | undefined;
	/** The server cannot report the year's rent received yet. */
	ledgerUnavailable: boolean;
	isLoadingYearEnd: boolean;
	onDownloadYearEndCsv: () => void;
	isExportingYearEnd: boolean;
}

/** A figure the page has no data for: never shown as $0.00. */
const UNAVAILABLE = "Unavailable";

/**
 * In place of the year's figures when the server cannot report the year's
 * rent received yet. Nothing renders below it: an unavailable result carries
 * no summary, so the By Property and Expense Breakdown cards have no rows.
 */
function LedgerTotalsUnavailableCard({ year }: { year: number }) {
	// The Card's own py-6 pads it. mb-0: CardContent is a flex item, so the
	// base `p` margin would stay inside it, under the text and between the lines.
	return (
		<Card>
			<CardContent>
				<p className="mb-0 font-medium">Ledger totals unavailable</p>
				<p className="mt-1 mb-0 text-sm text-muted-foreground">
					Rent received in {year} comes from your rent ledger, and its totals
					aren&apos;t available yet. Try again later.
				</p>
			</CardContent>
		</Card>
	);
}

function SummaryCard({
	label,
	value,
	isLoading,
}: {
	label: string;
	value: string;
	isLoading: boolean;
}) {
	// The Card's own py-6 pads it: a pt-6 here doubled the top to 48px. mb-0:
	// CardContent is a flex item, so the base `p` margin would stay inside it,
	// under the label and between the figure and its label.
	return (
		<Card>
			<CardContent>
				{isLoading ? (
					<Skeleton className="h-8 w-32 mb-1" />
				) : (
					<p className="mb-0 text-2xl font-semibold">{value}</p>
				)}
				<p className="mt-1 mb-0 text-sm text-muted-foreground">{label}</p>
			</CardContent>
		</Card>
	);
}

export function YearEndReportSection({
	year,
	yearEndData,
	ledgerUnavailable,
	isLoadingYearEnd,
	onDownloadYearEndCsv,
	isExportingYearEnd,
}: YearEndReportSectionProps) {
	// The click is ignored while Download CSV is off or exporting.
	const csvUnavailableReason = yearEndUnavailableReason({
		year,
		yearEndData,
		ledgerUnavailable,
		isLoadingYearEnd,
	});
	const csvBlocked = isExportingYearEnd || !yearEndData;
	const csvReasonId = useId();
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
						onClick={csvBlocked ? undefined : onDownloadYearEndCsv}
						aria-disabled={csvBlocked || undefined}
						aria-describedby={
							csvUnavailableReason !== null ? csvReasonId : undefined
						}
						className="gap-1.5 min-h-11 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
					>
						<Download className="size-4" />
						{isExportingYearEnd ? "Exporting..." : "Download CSV"}
					</Button>
					{csvUnavailableReason !== null ? (
						<span id={csvReasonId} className="sr-only">
							{csvUnavailableReason}
						</span>
					) : null}
				</div>

				{ledgerUnavailable ? (
					<LedgerTotalsUnavailableCard year={year} />
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<SummaryCard
							label="Rent Received"
							value={
								yearEndData
									? formatCurrency(yearEndData.rentReceived)
									: UNAVAILABLE
							}
							isLoading={isLoadingYearEnd}
						/>
						<SummaryCard
							label="Operating Expenses"
							value={
								yearEndData
									? formatCurrency(yearEndData.operatingExpenses)
									: UNAVAILABLE
							}
							isLoading={isLoadingYearEnd}
						/>
						<SummaryCard
							label="Net Income"
							value={
								yearEndData
									? formatCurrency(yearEndData.netIncome)
									: UNAVAILABLE
							}
							isLoading={isLoadingYearEnd}
						/>
					</div>
				)}

				{/* By Property Table */}
				{(isLoadingYearEnd || (yearEndData?.byProperty.length ?? 0) > 0) && (
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-base">By Property</CardTitle>
							<CardDescription>
								Rent received and expenses for each property in {year}
							</CardDescription>
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
											<TableHead className="text-right">
												Rent Received
											</TableHead>
											<TableHead className="text-right">Expenses</TableHead>
											<TableHead className="text-right">Net Income</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{yearEndData?.byProperty.map((p) => (
											<TableRow key={p.propertyId}>
												<TableCell className="font-medium">
													{p.propertyName}
												</TableCell>
												<TableCell className="text-right text-success-text">
													{formatCurrency(p.rentReceived)}
												</TableCell>
												<TableCell className="text-right text-destructive-text">
													{formatCurrency(p.expenses)}
												</TableCell>
												<TableCell
													className={`text-right font-medium ${
														p.netIncome >= 0
															? "text-success-text"
															: "text-destructive-text"
													}`}
												>
													{formatCurrency(p.netIncome)}
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
				{(isLoadingYearEnd ||
					(yearEndData?.expenseByCategory.length ?? 0) > 0) && (
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-base">Expense Breakdown</CardTitle>
							<CardDescription>Expenses by vendor for {year}</CardDescription>
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
											<TableHead>Vendor</TableHead>
											<TableHead className="text-right">Amount</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{yearEndData?.expenseByCategory &&
											sortExpenseCategoriesDesc(
												yearEndData.expenseByCategory,
											).map((cat, i) => (
												<TableRow key={i}>
													<TableCell>{cat.category}</TableCell>
													<TableCell className="text-right text-destructive-text">
														{formatCurrency(cat.amount)}
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
		</section>
	);
}
