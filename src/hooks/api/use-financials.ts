/**
 * Financials Hooks — overview, monthly metrics, and financial statements.
 * Expense CRUD, tax documents in use-expense-mutations.ts.
 */

import { useQuery } from '@tanstack/react-query'
import {
	financialKeys as importedFinancialKeys,
	financialQueries
} from './query-keys/financial-keys'

// Re-export types from financial-keys for backwards compatibility
export type {
	FinancialOverviewData,
	MonthlyMetric,
	ExpenseSummaryData
} from './query-keys/financial-keys'

// Re-export financial keys for consumers that import from use-financials
export const financialKeys = importedFinancialKeys

// ============================================================================
// FINANCIAL OVERVIEW HOOKS
// ============================================================================

export function useFinancialOverview() {
	return useQuery(financialQueries.overview())
}

export function useMonthlyMetrics() {
	return useQuery(financialQueries.monthly())
}

export function useExpenseSummary() {
	return useQuery(financialQueries.expenseSummary())
}

// ============================================================================
// FINANCIAL STATEMENTS HOOKS
// ============================================================================

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
