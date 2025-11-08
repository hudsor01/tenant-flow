import { useQuery } from '@tanstack/react-query'
import type { DashboardStats } from '@repo/shared/types/core'

/**
 * Dashboard stats query keys factory
 * Hierarchical organization per CLAUDE.md best practices
 */
export const dashboardStatsKeys = {
	all: ['dashboard-stats'] as const,
	stats: () => [...dashboardStatsKeys.all, 'stats'] as const
}

/**
 * Type guard to validate API response has expected structure
 */
function isValidDashboardStatsResponse(
	result: unknown
): result is { data: DashboardStats } {
	return (
		typeof result === 'object' &&
		result !== null &&
		'data' in result &&
		typeof result.data === 'object' &&
		result.data !== null
	)
}

/**
 * Fetch dashboard stats from backend
 * Uses native fetch per CLAUDE.md - NO wrapper functions
 */
async function fetchDashboardStats(): Promise<DashboardStats> {
	const response = await fetch(
		`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/manage/stats`,
		{
			credentials: 'include', // Send cookies for authentication
			headers: {
				'Content-Type': 'application/json'
			}
		}
	)

	if (!response.ok) {
		throw new Error(`Failed to fetch dashboard stats: ${response.statusText}`)
	}

	const result = await response.json()

	// ✅ Validate response structure before accessing .data property
	if (!isValidDashboardStatsResponse(result)) {
		throw new Error(
			'Invalid API response format: missing or malformed data property'
		)
	}

	return result.data
}

/**
 * Custom hook for dashboard stats
 * Per CLAUDE.md: Stats should use staleTime: 1min, gcTime: 5min
 * Uses refetchInterval for real-time updates (30s)
 */
export function useDashboardStats() {
	return useQuery({
		queryKey: dashboardStatsKeys.stats(),
		queryFn: fetchDashboardStats,
		staleTime: 60_000, // 1 minute - per CLAUDE.md
		gcTime: 300_000, // 5 minutes - per CLAUDE.md
		refetchInterval: 30_000, // 30 seconds - real-time updates
		refetchOnWindowFocus: true,
		refetchOnMount: true
	})
}
