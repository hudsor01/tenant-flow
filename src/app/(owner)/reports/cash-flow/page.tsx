"use client";

import { useState } from "react";
import { useCashFlow } from "#hooks/api/use-financials";
import { formatLocalYmd } from "#lib/formatters/date";
import { handleMutationError } from "#lib/mutation-error-handler";
import { CSV_MIME_TYPE } from "#lib/reports/csv";
import { downloadBlob } from "#lib/reports/download-blob";
import { LedgerTotalsUnavailable } from "../ledger-totals-unavailable";
import { CashFlowActivity } from "./cash-flow-activity";
import { CashFlowBalanceSummary } from "./cash-flow-balance-summary";
import { CashFlowBreakdown } from "./cash-flow-breakdown";
import { buildCashFlowCsv, cashFlowCsvFilename } from "./cash-flow-csv";
import { CashFlowError } from "./cash-flow-error";
import { CashFlowHeader } from "./cash-flow-header";
import { CashFlowLoading } from "./cash-flow-loading";
import { CashFlowStats } from "./cash-flow-stats";
import { buildCashFlowView } from "./cash-flow-view";

const LEDGER_UNAVAILABLE_EXPORT_REASON =
	"The rent ledger totals this report is built on aren't available yet.";

export default function CashFlowPage() {
	const [period, setPeriod] = useState("monthly");
	const [year, setYear] = useState(String(new Date().getFullYear()));

	const dateRange = (() => {
		const currentDate = new Date();
		const selectedYear = parseInt(year, 10);
		// First and last day of a run of months, as local YYYY-MM-DD (day 0 of
		// the following month is the last day of the run).
		const range = (startMonthIndex: number, months: number) => ({
			start_date: formatLocalYmd(new Date(selectedYear, startMonthIndex, 1)),
			end_date: formatLocalYmd(
				new Date(selectedYear, startMonthIndex + months, 0),
			),
		});

		if (period === "yearly") return range(0, 12);
		if (period === "quarterly") {
			return range(Math.floor(currentDate.getMonth() / 3) * 3, 3);
		}
		return range(currentDate.getMonth(), 1);
	})();

	const { data, isLoading, isPlaceholderData, error, refetch } =
		useCashFlow(dateRange);
	// When get_billing_insights returns none of the ledger figures the report
	// is built on (its body before 20261102055449), the query says so rather
	// than handing the page zeros to present as rent received and balances.
	const ledgerUnavailable = data?.status === "ledger-unavailable";
	const cashFlowData = data?.status === "ready" ? data.report : undefined;
	const view = buildCashFlowView(cashFlowData);

	// The global keepPreviousData shows the last period while the selected one
	// loads, so the export waits for the data that matches the selectors.
	const exportUnavailableReason = ledgerUnavailable
		? LEDGER_UNAVAILABLE_EXPORT_REASON
		: !cashFlowData
			? "No cash flow data to export yet."
			: isPlaceholderData
				? "Loading the selected period. Export is available when it finishes."
				: null;

	const handleExport = () => {
		if (!cashFlowData || isPlaceholderData) return;
		try {
			const { start_date, end_date } = cashFlowData.period;
			const csv = buildCashFlowCsv({
				period,
				startDate: start_date,
				endDate: end_date,
				view,
			});
			downloadBlob(
				new Blob([csv], { type: CSV_MIME_TYPE }),
				cashFlowCsvFilename(start_date, end_date),
			);
		} catch (exportError) {
			handleMutationError(
				exportError,
				"Export cash flow",
				"Couldn't export the cash flow report. Please try again.",
			);
		}
	};

	if (isLoading) {
		return <CashFlowLoading />;
	}

	if (error) {
		return <CashFlowError onRetry={() => void refetch()} />;
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<CashFlowHeader
				period={period}
				year={year}
				onPeriodChange={setPeriod}
				onYearChange={setYear}
				onExport={handleExport}
				exportUnavailableReason={exportUnavailableReason}
			/>

			{ledgerUnavailable ? (
				<LedgerTotalsUnavailable
					description="Rent received and the opening and closing balances on this report come from your rent ledger."
					onRetryAction={() => void refetch()}
				/>
			) : (
				<>
					<CashFlowBalanceSummary
						openingBalance={view.openingBalance}
						netCashFlow={view.netCashFlow}
						closingBalance={view.closingBalance}
					/>

					<CashFlowStats
						totalInflows={view.totalInflows}
						totalOutflows={view.totalOutflows}
						netCashFlow={view.netCashFlow}
					/>

					<CashFlowBreakdown
						inflowItems={view.inflowItems}
						outflowItems={view.outflowItems}
						totalInflows={view.totalInflows}
						totalOutflows={view.totalOutflows}
					/>

					<CashFlowActivity
						netOperatingCash={view.netOperatingCash}
						netInvestingCash={view.netInvestingCash}
						netFinancingCash={view.netFinancingCash}
					/>
				</>
			)}
		</div>
	);
}
