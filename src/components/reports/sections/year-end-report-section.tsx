"use client";

import { AlertCircle, Download, FileText } from "lucide-react";
import { Badge } from "#components/ui/badge";
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
import type { Year1099Summary, YearEndSummary } from "#types/reports";
import { sortExpenseCategoriesDesc } from "./year-end-report-section-utils";

interface YearEndReportSectionProps {
	year: number;
	yearEndData: YearEndSummary | undefined;
	/** The server cannot report the year's rent received yet. */
	ledgerUnavailable: boolean;
	data1099: Year1099Summary | undefined;
	isLoadingYearEnd: boolean;
	isLoading1099: boolean;
	onDownloadYearEndCsv: () => void;
	onDownload1099Csv: () => void;
	isExportingYearEnd: boolean;
	isExporting1099: boolean;
}

/** A figure the page has no data for: never shown as $0.00. */
const UNAVAILABLE = "Unavailable";

/**
 * In place of the summary when the server cannot report the year's rent
 * received yet; the expense breakdown and the 1099-NEC section are below.
 */
function LedgerTotalsUnavailableCard({ year }: { year: number }) {
	return (
		<Card>
			<CardContent className="pt-6">
				<p className="font-medium">Ledger totals unavailable</p>
				<p className="text-sm text-muted-foreground mt-1">
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
	);
}

export function YearEndReportSection({
	year,
	yearEndData,
	ledgerUnavailable,
	data1099,
	isLoadingYearEnd,
	isLoading1099,
	onDownloadYearEndCsv,
	onDownload1099Csv,
	isExportingYearEnd,
	isExporting1099,
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
						{isExportingYearEnd ? "Exporting..." : "Download CSV"}
					</Button>
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
							<CardDescription>
								Operating expenses by category for {year}
							</CardDescription>
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

			{/* 1099-NEC Section */}
			<div className="flex flex-col gap-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-lg font-semibold flex items-center gap-2">
							<AlertCircle className="size-5 text-warning-text" />
							1099-NEC Vendors ({year})
						</h2>
						<p className="text-sm text-muted-foreground">
							Vendors paid{" "}
							{formatCurrency(data1099?.threshold ?? 600, {
								minimumFractionDigits: 0,
								maximumFractionDigits: 0,
							})}
							+ — may require 1099-NEC filing
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
						{isExporting1099 ? "Exporting..." : "Download CSV"}
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
								No vendors exceeded the{" "}
								{formatCurrency(data1099?.threshold ?? 600, {
									minimumFractionDigits: 0,
									maximumFractionDigits: 0,
								})}{" "}
								threshold in {year}.
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
											<TableCell className="font-medium">
												{r.vendorName}
											</TableCell>
											<TableCell className="text-right">{r.jobCount}</TableCell>
											<TableCell className="text-right font-medium">
												{formatCurrency(r.totalPaid)}
											</TableCell>
											<TableCell className="text-right">
												<Badge variant="warning">1099 Required</Badge>
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
	);
}
