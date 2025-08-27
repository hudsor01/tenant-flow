/**
 * Dashboard Stats Server Actions - Next.js 15 Native Features
 * Pure server actions with native caching and revalidation
 * NO side effects beyond data fetching and cache invalidation
 */

'use server'

import { revalidateTag, revalidatePath } from 'next/cache'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { DashboardStats } from '@repo/shared'

// ============================================================================
// PURE CACHED DATA FETCHING - Next.js 15 native cache
// ============================================================================

/**
 * Pure cached dashboard stats fetcher
 * Uses Next.js 15 automatic request deduplication and caching
 */
export const getDashboardStatsAction = cache(async (): Promise<DashboardStats> => {
	try {
		// Pure fetch with Next.js 15 caching strategy
		const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/stats`, {
			headers: {
				'Content-Type': 'application/json',
			},
			next: {
				tags: ['dashboard-stats'], // For targeted cache invalidation
				revalidate: 300 // 5 minutes cache
			}
		})

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}

		const data = await response.json()
		return data as DashboardStats
	} catch (error) {
		console.error('Failed to fetch dashboard stats:', error)
		throw new Error('Failed to load dashboard statistics')
	}
})

/**
 * Pure cached individual stat fetcher - For granular updates
 */
export const getRevenuStatsAction = cache(async (): Promise<{ total: number, change: number }> => {
	try {
		const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/stats/revenue`, {
			headers: {
				'Content-Type': 'application/json',
			},
			next: {
				tags: ['revenue-stats'],
				revalidate: 60 // 1 minute cache for revenue
			}
		})

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}

		return await response.json()
	} catch (error) {
		console.error('Failed to fetch revenue stats:', error)
		throw new Error('Failed to load revenue statistics')
	}
})

// ============================================================================
// PURE SERVER ACTIONS - Next.js 15 server actions
// ============================================================================

/**
 * Pure server action - Refresh all dashboard stats
 * Invalidates cache and revalidates dashboard pages
 */
export async function refreshDashboardStatsAction(formData: FormData): Promise<{ success: boolean; message?: string }> {
	try {
		// Parse form data (pure operation)
		const forceRefresh = formData.get('force') === 'true'

		// Invalidate caches (side effect - but pure within server action context)
		revalidateTag('dashboard-stats')
		revalidateTag('revenue-stats')
		
		if (forceRefresh) {
			// Revalidate all dashboard-related pages
			revalidatePath('/dashboard')
			revalidatePath('/dashboard/properties')
			revalidatePath('/dashboard/tenants')
		}

		// Pure response object
		return { 
			success: true, 
			message: 'Dashboard statistics refreshed successfully' 
		}
	} catch (error) {
		console.error('Failed to refresh dashboard stats:', error)
		
		// Pure error response
		return { 
			success: false, 
			message: 'Failed to refresh dashboard statistics' 
		}
	}
}

/**
 * Pure server action - Refresh specific stat type
 */
export async function refreshStatAction(
	statType: 'revenue' | 'properties' | 'tenants' | 'maintenance',
	formData: FormData
): Promise<{ success: boolean; message?: string }> {
	try {
		// Pure tag mapping
		const tagMap = {
			revenue: 'revenue-stats',
			properties: 'property-stats', 
			tenants: 'tenant-stats',
			maintenance: 'maintenance-stats'
		}

		const tag = tagMap[statType]
		
		// Invalidate specific cache
		revalidateTag(tag)
		
		// Optionally revalidate related pages
		if (statType === 'revenue') {
			revalidatePath('/dashboard/billing')
		} else if (statType === 'properties') {
			revalidatePath('/dashboard/properties')
		}

		return { 
			success: true, 
			message: `${statType} statistics refreshed successfully` 
		}
	} catch (error) {
		console.error(`Failed to refresh ${statType} stats:`, error)
		
		return { 
			success: false, 
			message: `Failed to refresh ${statType} statistics` 
		}
	}
}

/**
 * Pure server action - Simulate stat update (for optimistic demos)
 */
export async function updateStatOptimisticallyAction(
	statType: string,
	newValue: number,
	formData: FormData
): Promise<{ success: boolean; value: number; message?: string }> {
	try {
		// Pure validation
		if (typeof newValue !== 'number' || newValue < 0) {
			return { 
				success: false, 
				value: 0,
				message: 'Invalid value provided' 
			}
		}

		// In real app, this would update the database
		// For demo, just invalidate cache and return new value
		revalidateTag('dashboard-stats')

		return { 
			success: true, 
			value: newValue,
			message: `${statType} updated successfully` 
		}
	} catch (error) {
		console.error(`Failed to update ${statType}:`, error)
		
		return { 
			success: false, 
			value: 0,
			message: `Failed to update ${statType}` 
		}
	}
}

/**
 * Pure server action - Navigate with stats refresh
 */
export async function navigateWithStatsRefresh(path: string): Promise<never> {
	// Refresh stats before navigation
	revalidateTag('dashboard-stats')
	
	// Pure navigation (terminates execution)
	redirect(path)
}

// ============================================================================
// PURE UTILITY ACTIONS - Helper server actions
// ============================================================================

/**
 * Pure server action - Get cache status for debugging
 */
export async function getCacheStatusAction(): Promise<{
	tags: string[]
	lastRevalidated: string
	cacheStrategy: string
}> {
	// Pure status object (would be enhanced with actual cache introspection in real app)
	return {
		tags: ['dashboard-stats', 'revenue-stats', 'property-stats', 'tenant-stats', 'maintenance-stats'],
		lastRevalidated: new Date().toISOString(),
		cacheStrategy: 'Next.js 15 native cache with tags'
	}
}

/**
 * Pure server action - Clear all stats caches
 */
export async function clearAllStatsCachesAction(): Promise<{ success: boolean; message: string }> {
	try {
		// Clear all stats-related caches
		const statsTags = ['dashboard-stats', 'revenue-stats', 'property-stats', 'tenant-stats', 'maintenance-stats']
		
		statsTags.forEach(tag => revalidateTag(tag))
		
		// Revalidate dashboard pages
		revalidatePath('/dashboard', 'layout')

		return { 
			success: true, 
			message: 'All statistics caches cleared successfully' 
		}
	} catch (error) {
		console.error('Failed to clear stats caches:', error)
		
		return { 
			success: false, 
			message: 'Failed to clear statistics caches' 
		}
	}
}