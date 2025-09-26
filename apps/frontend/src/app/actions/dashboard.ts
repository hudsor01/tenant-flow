'use server'

import { serverFetch } from '@/lib/api/server'
import type { DashboardStats } from '@repo/shared'
import { revalidatePath } from 'next/cache'
import { cache } from 'react'

/**
 * Server Actions for Dashboard
 * Follows established Next.js 15 Server Actions pattern
 * Uses serverFetch for authenticated backend communication
 */

/**
 * Get dashboard statistics
 * Uses server-side authentication via serverFetch
 * Cached to prevent duplicate calls during render
 */
export const getDashboardStats = cache(async () => {
	try {
		const stats = await serverFetch<DashboardStats>('/api/v1/dashboard/stats')
		return { success: true, data: stats }
	} catch (error) {
		// Check if this is an authentication error
		const errorMessage = error instanceof Error ? error.message : String(error)
		const isAuthError =
			errorMessage.includes('401') ||
			errorMessage.includes('Authentication required') ||
			errorMessage.includes('Unauthorized')

		if (isAuthError) {
			// For authentication errors, redirect to login instead of showing mock data
			return {
				success: false,
				error: 'Authentication required',
				shouldRedirect: '/login'
			}
		}

		return {
			success: false,
			error: errorMessage || 'Failed to fetch dashboard stats'
		}
	}
})

/**
 * Get dashboard activity feed
 * Returns recent activity across properties, tenants, leases
 * Cached to prevent duplicate calls during render
 */
export const getDashboardActivity = cache(async () => {
	try {
		const activity = await serverFetch<{ activities: Array<unknown> }>(
			'/api/v1/dashboard/activity'
		)
		return { success: true, data: activity }
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		const isAuthError =
			errorMessage.includes('401') ||
			errorMessage.includes('Authentication required') ||
			errorMessage.includes('Unauthorized')

		if (isAuthError) {
			return {
				success: false,
				error: 'Authentication required',
				shouldRedirect: '/login'
			}
		}

		return {
			success: false,
			error: errorMessage || 'Failed to fetch dashboard activity'
		}
	}
})

/**
 * Get property performance metrics
 * Backend calculates per-property performance data
 */
export async function getPropertyPerformance() {
	try {
		const performance = await serverFetch(
			'/api/v1/dashboard/property-performance'
		)
		return { success: true, data: performance }
	} catch (error) {
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Failed to fetch property performance'
		}
	}
}

/**
 * Combined dashboard data fetcher
 * Fetches all dashboard data in parallel for server-side rendering
 * Cached to prevent duplicate calls during render
 */
export const getDashboardData = cache(async () => {
	try {
		const [statsResult, activityResult] = await Promise.all([
			getDashboardStats(),
			getDashboardActivity()
		])

		// Check for authentication errors first
		const hasAuthError =
			(!statsResult.success && 'shouldRedirect' in statsResult) ||
			(!activityResult.success && 'shouldRedirect' in activityResult)

		if (hasAuthError) {
			const redirectResult = statsResult.success ? activityResult : statsResult
			return {
				success: false,
				error: (redirectResult as { error: string }).error,
				shouldRedirect: (redirectResult as { shouldRedirect: string }).shouldRedirect
			}
		}

		// If either request failed for other reasons, use fallback
		if (!statsResult.success || !activityResult.success) {
			return {
				success: false,
				error: statsResult.success ? activityResult.error : statsResult.error
			}
		}

		return {
			success: true,
			data: {
				stats: statsResult.data,
				activity: activityResult.data,
				chartData: [] // TODO: Add chart data endpoint
			}
		}
	} catch (error) {
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Failed to fetch dashboard data'
		}
	}
})

/**
 * Revalidate dashboard cache
 * Call when dashboard-affecting actions occur
 */
export async function revalidateDashboard() {
	revalidatePath('/dashboard')
	revalidatePath('/(protected)/dashboard')
}
