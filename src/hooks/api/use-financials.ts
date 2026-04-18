import { useQuery } from '@tanstack/react-query'
import {
	financialKeys as importedFinancialKeys,
	financialQueries
} from './query-keys/financial-keys'

export type {
	FinancialOverviewData,
	MonthlyMetric,
	ExpenseSummaryData
} from './query-keys/financial-keys'

export const financialKeys = importedFinancialKeys

export function useFinancialOverview() {
	return useQuery(financialQueries.overview())
}

export function useMonthlyMetrics() {
	return useQuery(financialQueries.monthly())
}

export function useExpenseSummary() {
	return useQuery(financialQueries.expenseSummary())
}

export function useIncomeStatement(params: {
	start_date: string
	end_date: string
}) {
	return useQuery(financialQueries.incomeStatement(params))
}

export function useCashFlow(params: { start_date: string; end_date: string }) {
	return useQuery(financialQueries.cashFlow(params))
}

export function useBalanceSheet(asOfDate: string) {
	return useQuery(financialQueries.balanceSheet(asOfDate))
}
