'use client'

import { financialApi } from '@/lib/api-client'
import { useQuery } from '@tanstack/react-query'
import type { FinancialOverviewResponse } from '@repo/shared'

/**
 * Financial hooks - all calculations done in database via RPC functions
 * Following CLAUDE.md principle: zero business logic in React components
 */

export function useFinancialOverview(year?: number) {
	return useQuery<FinancialOverviewResponse>({
		queryKey: ['financial', 'overview', year ?? 'current'],
		queryFn: async () => {
			return financialApi.getOverview(year)
		},
		staleTime: 5 * 60 * 1000, // 5 minutes - financial data doesn't change frequently
		gcTime: 30 * 60 * 1000, // 30 minutes - keep in memory for dashboard navigation
		retry: 3, // Retry failed financial queries
		refetchOnWindowFocus: false // Don't refetch on every window focus for financial data
	})
}

// Enhanced hook using pre-calculated financial data from database RPC functions
export function useFinancialOverviewFormatted(year?: number) {
	return useQuery<FinancialOverviewResponse>({
		queryKey: ['financial', 'overview-calculated', year ?? 'current'],
		queryFn: async () => {
			// Use enhanced RPC function that returns pre-calculated and formatted data
			return financialApi.getOverviewWithCalculations(year)
		},
		select: (data): FinancialOverviewResponse => ({
			...data,
			// All formatting and calculations are now done server-side
			// Just pass through the pre-calculated values from database
			chartData: data.chartData || []
		}),
		staleTime: 5 * 60 * 1000,
		gcTime: 30 * 60 * 1000,
		retry: 3,
		refetchOnWindowFocus: false
	})
}

export function useExpenseSummary(year?: number) {
	return useQuery({
		queryKey: ['financial', 'expenses', year ?? 'current'],
		queryFn: async () => {
			return financialApi.getExpenseSummary(year)
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 30 * 60 * 1000, // 30 minutes
		retry: 3,
		refetchOnWindowFocus: false
	})
}

// Enhanced hook using pre-calculated expense data with percentages from database RPC functions
export function useExpenseSummaryFormatted(year?: number) {
	return useQuery({
		queryKey: ['financial', 'expenses-calculated', year ?? 'current'],
		queryFn: async () => {
			// Use enhanced RPC function that returns pre-calculated percentages and formatting
			return financialApi.getExpenseSummaryWithPercentages(year)
		},
		select: (data) => ({
			...data,
			// All calculations and formatting are now done server-side
			// Just pass through the pre-calculated values from database
			chartData: data.chartData || []
		}),
		staleTime: 5 * 60 * 1000,
		gcTime: 30 * 60 * 1000,
		retry: 3,
		refetchOnWindowFocus: false
	})
}

// Helper function removed - colors are now provided by database RPC functions
// This eliminates frontend duplication and ensures consistency

export function useDashboardFinancialStats() {
	return useQuery({
		queryKey: ['financial', 'dashboard-stats'],
		queryFn: async () => {
			return financialApi.getDashboardStats()
		},
		staleTime: 2 * 60 * 1000, // 2 minutes - dashboard stats should be more fresh
		gcTime: 15 * 60 * 1000, // 15 minutes
		retry: 3,
		refetchOnWindowFocus: true // Refresh dashboard stats on focus for up-to-date info
	})
}

// Enhanced hook using pre-calculated dashboard financial stats from database RPC functions
export function useDashboardFinancialStatsFormatted() {
	return useQuery({
		queryKey: ['financial', 'dashboard-stats-calculated'],
		queryFn: async () => {
			// Use enhanced RPC function that returns all calculations and formatting
			return financialApi.getDashboardFinancialStatsCalculated()
		},
		select: (data) => ({
			...data,
			// All calculations, formatting, and trend analysis done server-side
			// Frontend just displays the pre-calculated values
			monthlyRevenue: {
				value: data.monthlyRevenueFormatted || '$0',
				raw: data.monthlyRecurring || 0,
				change: data.revenueChange || 0,
				changeFormatted: `${(data.revenueChange || 0) > 0 ? '+' : ''}${data.revenueChange?.toFixed(1) || 0}%`,
				trend: (data.revenueChange || 0) > 0 ? 'up' : (data.revenueChange || 0) < 0 ? 'down' : 'stable'
			},
			monthlyExpenses: {
				value: data.monthlyExpensesFormatted || '$0',
				raw: data.monthlyExpenses || 0,
				change: data.expenseChange || 0,
				changeFormatted: `${(data.expenseChange || 0) > 0 ? '+' : ''}${data.expenseChange?.toFixed(1) || 0}%`,
				trend: (data.expenseChange || 0) > 0 ? 'up' : (data.expenseChange || 0) < 0 ? 'down' : 'stable'
			},
			netIncome: {
				value: data.netIncomeFormatted || '$0',
				raw: data.netIncome || 0,
				margin: `${data.profitMargin || 0}%` // Pre-calculated profit margin from database
			}
		}),
		staleTime: 2 * 60 * 1000,
		gcTime: 15 * 60 * 1000,
		retry: 3,
		refetchOnWindowFocus: true
	})
}
