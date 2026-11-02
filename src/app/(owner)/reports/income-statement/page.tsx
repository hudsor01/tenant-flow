"use client";

import { useState } from "react";
import { useIncomeStatement } from "#hooks/api/use-financials";
import { handleMutationError } from "#lib/mutation-error-handler";
import { CSV_MIME_TYPE } from "#lib/reports/csv";
import { downloadBlob } from "#lib/reports/download-blob";
import {
	buildIncomeStatementCsv,
	incomeStatementCsvFilename,
} from "./income-statement-csv";
import { buildIncomeStatementDateRange } from "./income-statement-date-range";
import { IncomeStatementPageBreakdowns } from "./income-statement-page-breakdowns";
import { IncomeStatementPageError } from "./income-statement-page-error";
import { IncomeStatementPageHeader } from "./income-statement-page-header";
import { IncomeStatementPageLoading } from "./income-statement-page-loading";
import { IncomeStatementPageNetSummary } from "./income-statement-page-net-summary";
import { IncomeStatementPageStats } from "./income-statement-page-stats";
import { buildIncomeStatementView } from "./income-statement-view";

export default function IncomeStatementPage() {
	const [period, setPeriod] = useState("monthly");
	const [year, setYear] = useState(String(new Date().getFullYear()));

	const dateRange = buildIncomeStatementDateRange(period, year);

	const {
		data: response,
		isLoading,
		isPlaceholderData,
		error,
		refetch,
	} = useIncomeStatement(dateRange);
	const data = response?.data;
	const view = buildIncomeStatementView(data);

	// The global keepPreviousData shows the last period while the selected one
	// loads, so the export waits for the data that matches the selectors.
	const exportUnavailableReason = !data
		? "No income statement data to export yet."
		: isPlaceholderData
			? "Loading the selected period. Export is available when it finishes."
			: null;

	const handleExport = () => {
		if (!data || isPlaceholderData) return;
		try {
			const { start_date, end_date } = data.period;
			const csv = buildIncomeStatementCsv({
				period,
				startDate: start_date,
				endDate: end_date,
				view,
			});
			downloadBlob(
				new Blob([csv], { type: CSV_MIME_TYPE }),
				incomeStatementCsvFilename(start_date, end_date),
			);
		} catch (exportError) {
			handleMutationError(
				exportError,
				"Export income statement",
				"Couldn't export the income statement. Please try again.",
			);
		}
	};

	if (isLoading) {
		return <IncomeStatementPageLoading />;
	}

	if (error) {
		return <IncomeStatementPageError onRetry={() => void refetch()} />;
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<IncomeStatementPageHeader
				period={period}
				year={year}
				onPeriodChange={setPeriod}
				onYearChange={setYear}
				onExport={handleExport}
				exportUnavailableReason={exportUnavailableReason}
			/>

			<IncomeStatementPageStats
				totalRevenue={view.totalRevenue}
				totalExpenses={view.totalExpenses}
				netIncome={view.netIncome}
				profitMargin={view.profitMargin.toFixed(1)}
			/>

			<IncomeStatementPageBreakdowns
				revenueItems={view.revenueItems}
				expenseItems={view.expenseItems}
				totalRevenue={view.totalRevenue}
				totalExpenses={view.totalExpenses}
			/>

			<IncomeStatementPageNetSummary
				totalRevenue={view.totalRevenue}
				totalExpenses={view.totalExpenses}
				netIncome={view.netIncome}
				grossProfit={view.grossProfit}
				operatingIncome={view.operatingIncome}
				previousPeriod={view.previousPeriod}
			/>
		</div>
	);
}
