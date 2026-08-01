"use client";

import { useState } from "react";
import { useIncomeStatement } from "#hooks/api/use-financials";
import { buildIncomeStatementDateRange } from "./income-statement-date-range";
import { IncomeStatementPageBreakdowns } from "./income-statement-page-breakdowns";
import { IncomeStatementPageError } from "./income-statement-page-error";
import { IncomeStatementPageHeader } from "./income-statement-page-header";
import { IncomeStatementPageLoading } from "./income-statement-page-loading";
import { IncomeStatementPageNetSummary } from "./income-statement-page-net-summary";
import { IncomeStatementPageStats } from "./income-statement-page-stats";

export default function IncomeStatementPage() {
	const [period, setPeriod] = useState("monthly");
	const [year, setYear] = useState(String(new Date().getFullYear()));

	const dateRange = buildIncomeStatementDateRange(period, year);

	const {
		data: response,
		isLoading,
		error,
		refetch,
	} = useIncomeStatement(dateRange);
	const data = response?.data;

	const totalRevenue = data?.revenue.totalRevenue || 0;
	const totalExpenses = data?.expenses.totalExpenses || 0;
	const netIncome = data?.netIncome || 0;
	const profitMargin =
		totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : "0.0";

	const revenueItems = [
		{ label: "Rental Income", amount: data?.revenue.rentalIncome || 0 },
		{ label: "Late Fees", amount: data?.revenue.lateFeesIncome || 0 },
		{ label: "Other Income", amount: data?.revenue.otherIncome || 0 },
	];

	const expenseItems = [
		{
			label: "Property Management",
			amount: data?.expenses.propertyManagement || 0,
		},
		{ label: "Maintenance", amount: data?.expenses.maintenance || 0 },
		{ label: "Utilities", amount: data?.expenses.utilities || 0 },
		{ label: "Insurance", amount: data?.expenses.insurance || 0 },
		{ label: "Property Tax", amount: data?.expenses.propertyTax || 0 },
		{ label: "Mortgage", amount: data?.expenses.mortgage || 0 },
		{ label: "Other", amount: data?.expenses.other || 0 },
	];

	if (isLoading) {
		return <IncomeStatementPageLoading />;
	}

	if (error) {
		return (
			<IncomeStatementPageError
				error={error instanceof Error ? error : null}
				onRetry={() => void refetch()}
			/>
		);
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<IncomeStatementPageHeader
				period={period}
				year={year}
				onPeriodChange={setPeriod}
				onYearChange={setYear}
			/>

			<IncomeStatementPageStats
				totalRevenue={totalRevenue}
				totalExpenses={totalExpenses}
				netIncome={netIncome}
				profitMargin={profitMargin}
			/>

			<IncomeStatementPageBreakdowns
				revenueItems={revenueItems}
				expenseItems={expenseItems}
				totalRevenue={totalRevenue}
				totalExpenses={totalExpenses}
			/>

			<IncomeStatementPageNetSummary
				totalRevenue={totalRevenue}
				totalExpenses={totalExpenses}
				netIncome={netIncome}
				grossProfit={data?.grossProfit}
				operatingIncome={data?.operatingIncome}
				previousPeriod={data?.previousPeriod}
			/>
		</div>
	);
}
