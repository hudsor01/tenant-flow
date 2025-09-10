'use client'

import { financialApi } from '@/lib/api-client'
import { useQuery } from '@tanstack/react-query'

/**
 * Financial hooks - all calculations done in database via RPC functions
 * Following CLAUDE.md principle: zero business logic in React components
 */

export function useFinancialOverview(year?: number) {
	return useQuery({
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