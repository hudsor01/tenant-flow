'use server'

import { serverFetch } from '@/lib/api/server'
import type { DashboardStats } from '@repo/shared'
import { revalidatePath } from 'next/cache'

/**
 * Server Actions for Dashboard
 * Follows established Next.js 15 Server Actions pattern
 * Uses serverFetch for authenticated backend communication
 */

/**
 * Get dashboard statistics
 * Uses server-side authentication via serverFetch
 */
export async function getDashboardStats() {
	try {
		const stats = await serverFetch<DashboardStats>('/api/v1/dashboard/stats')
		return { success: true, data: stats }
	} catch (error) {
		// Check if this is an authentication error
		const isAuthError =
			error instanceof Error &&
			(error.message.includes('401') ||
				error.message.includes('Authentication required'))

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
			error:
				error instanceof Error
					? error.message
					: 'Failed to fetch dashboard stats'
		}
	}
}

/**
 * Get dashboard activity feed
 * Returns recent activity across properties, tenants, leases
 */
export async function getDashboardActivity() {
	try {
		const activity = await serverFetch<{ activities: Array<unknown> }>(
			'/api/v1/dashboard/activity'
		)
		return { success: true, data: activity }
	} catch (error) {
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Failed to fetch dashboard activity'
		}
	}
}

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
 */
export async function getDashboardData() {
	try {
		const [statsResult, activityResult] = await Promise.all([
			getDashboardStats(),
			getDashboardActivity()
		])

		// If either request failed, use fallback
		if (!statsResult.success || !activityResult.success) {
			return {
				success: false,
				error: statsResult.error || activityResult.error
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
}

/**
 * Revalidate dashboard cache
 * Call when dashboard-affecting actions occur
 */
export async function revalidateDashboard() {
	revalidatePath('/dashboard')
	revalidatePath('/(protected)/dashboard')
}
