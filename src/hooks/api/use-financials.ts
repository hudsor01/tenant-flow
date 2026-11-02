import { useQuery } from "@tanstack/react-query";
import {
	financialQueries,
	financialKeys as importedFinancialKeys,
} from "./query-keys/financial-keys";

export type {
	ExpenseSummaryData,
	FinancialOverviewData,
	MonthlyMetric,
} from "./query-keys/financial-keys";

export const financialKeys = importedFinancialKeys;

export function useExpenseSummary() {
	return useQuery(financialQueries.expenseSummary());
}

export function useIncomeStatement(params: {
	start_date: string;
	end_date: string;
}) {
	return useQuery(financialQueries.incomeStatement(params));
}

export function useCashFlow(params: { start_date: string; end_date: string }) {
	return useQuery(financialQueries.cashFlow(params));
}

export function useBalanceSheet(asOfDate: string) {
	return useQuery(financialQueries.balanceSheet(asOfDate));
}
