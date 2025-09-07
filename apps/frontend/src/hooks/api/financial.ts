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
		}
	})
}

export function useExpenseSummary(year?: number) {
	return useQuery({
		queryKey: ['financial', 'expenses', year ?? 'current'],
		queryFn: async () => {
			return financialApi.getExpenseSummary(year)
		}
	})
}

export function useDashboardFinancialStats() {
	return useQuery({
		queryKey: ['financial', 'dashboard-stats'],
		queryFn: async () => {
			return financialApi.getDashboardStats()
		}
	})
}