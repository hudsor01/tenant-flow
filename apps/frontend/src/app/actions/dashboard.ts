'use server'

import { revalidatePath } from 'next/cache'
import { cache } from 'react'
import { dashboardApi } from '../../lib/api-client'

/**
 * Get dashboard statistics
 * Uses backend API with proper repository pattern and analytics service
 * Cached to prevent duplicate calls during render
 */
export const getDashboardStats = cache(async () => {
	try {
		const stats = await dashboardApi.getStats()
		return { success: true, data: stats }
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
			error: errorMessage || 'Failed to fetch dashboard stats'
		}
	}
})

/**
 * Get dashboard activity feed
 * Uses backend API with proper repository pattern
 * Cached to prevent duplicate calls during render
 */
export const getDashboardActivity = cache(async () => {
	try {
		const activityData = await dashboardApi.getActivity()
		return { success: true, data: activityData }
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
 * Uses backend API with proper repository pattern and analytics service
 */
export async function getPropertyPerformance() {
	try {
		const performance = await dashboardApi.getPropertyPerformance()
		return { success: true, data: performance }
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
			error: errorMessage || 'Failed to fetch property performance'
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
				shouldRedirect: (redirectResult as { shouldRedirect: string })
					.shouldRedirect
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
				chartData: [] // Chart data can be added via additional API endpoints when needed
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
