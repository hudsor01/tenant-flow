'use server'

import { createClient } from '@/utils/supabase/server'
import type { DashboardStats } from '@repo/shared'
import { revalidatePath } from 'next/cache'
import { cache } from 'react'

/**
 * Server Actions for Dashboard
 * Uses direct Supabase queries instead of backend API
 */

/**
 * Get dashboard statistics
 * Uses Supabase RPC function or falls back to aggregation
 * Cached to prevent duplicate calls during render
 */
export const getDashboardStats = cache(async () => {
	try {
		const supabase = await createClient()
		const { data: { user } } = await supabase.auth.getUser()

		if (!user) {
			return {
				success: false,
				error: 'Authentication required',
				shouldRedirect: '/login'
			}
		}

		// Try RPC function first
		const { data: rpcData, error: rpcError } = await supabase
			.rpc('get_dashboard_summary', {
				p_user_id: user.id
			})

		if (!rpcError && rpcData) {
			// Cast the Json response to DashboardStats
			const stats = rpcData as unknown as DashboardStats
			return { success: true, data: stats }
		}

		// Fallback to manual aggregation
		const [properties, tenants, units, leases, maintenanceRequests] = await Promise.all([
			supabase.from('Property').select('id, name').eq('ownerId', user.id),
			supabase.from('Tenant').select('id, createdAt').eq('userId', user.id),
			supabase
				.from('Unit')
				.select('id, status, Property!inner(ownerId)')
				.eq('Property.ownerId', user.id),
			supabase
				.from('Lease')
				.select('id, status, monthlyRent, Unit!inner(Property!inner(ownerId))')
				.eq('Unit.Property.ownerId', user.id),
			supabase
				.from('MaintenanceRequest')
				.select('id, status, Unit!inner(Property!inner(ownerId))')
				.eq('Unit.Property.ownerId', user.id)
		])

		// Calculate statistics
		const activeLeases = leases.data?.filter(l => l.status === 'ACTIVE') || []
		const monthlyRevenue = activeLeases.reduce((sum, l) => sum + (l.monthlyRent || 0), 0)
		const occupiedUnits = units.data?.filter(u => u.status === 'OCCUPIED') || []
		const vacantUnits = units.data?.filter(u => u.status === 'VACANT') || []
		const pendingMaintenance = maintenanceRequests.data?.filter(m => m.status === 'OPEN') || []

		// Calculate new tenants (last 30 days)
		const thirtyDaysAgo = new Date()
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
		const newTenants = tenants.data?.filter(
			t => new Date(t.createdAt) > thirtyDaysAgo
		) || []

		const stats: DashboardStats = {
			properties: {
				total: properties.data?.length || 0,
				occupied: 0, // TODO: Calculate from units
				vacant: 0, // TODO: Calculate from units
				occupancyRate: 0, // TODO: Calculate from units
				totalMonthlyRent: 0, // TODO: Calculate from units
				averageRent: 0 // TODO: Calculate from units
			},
			tenants: {
				total: tenants.data?.length || 0,
				active: activeLeases.length,
				inactive: tenants.data?.length ? tenants.data.length - activeLeases.length : 0,
				newThisMonth: newTenants.length
			},
			units: {
				total: units.data?.length || 0,
				occupied: occupiedUnits.length,
				vacant: vacantUnits.length,
				maintenance: 0,
				averageRent: monthlyRevenue / (activeLeases.length || 1),
				available: vacantUnits.length,
				occupancyRate: units.data?.length
					? (occupiedUnits.length / units.data.length) * 100
					: 0,
				occupancyChange: 0, // TODO: Calculate period-over-period change
				totalPotentialRent: 0, // TODO: Calculate
				totalActualRent: monthlyRevenue
			},
			leases: {
				total: leases.data?.length || 0,
				active: activeLeases.length,
				expired: 0, // TODO: Calculate expired leases
				expiringSoon: 0 // TODO: Calculate leases expiring soon
			},
			maintenance: {
				total: pendingMaintenance.length,
				open: pendingMaintenance.length,
				inProgress: 0, // TODO: Calculate from status
				completed: 0, // TODO: Calculate from status
				completedToday: 0, // TODO: Calculate from today's completed requests
				avgResolutionTime: 0, // TODO: Calculate average resolution time
				byPriority: {
					low: 0, // TODO: Calculate by priority
					medium: 0,
					high: 0,
					emergency: 0
				}
			},
			revenue: {
				monthly: monthlyRevenue,
				yearly: monthlyRevenue * 12,
				growth: 0 // Would need historical data
			},
			occupancyRate: units.data?.length
				? (occupiedUnits.length / units.data.length) * 100
				: 0
		}

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
 * Returns recent activity across properties, tenants, leases
 * Cached to prevent duplicate calls during render
 */
export const getDashboardActivity = cache(async () => {
	try {
		const supabase = await createClient()
		const { data: { user } } = await supabase.auth.getUser()

		if (!user) {
			return {
				success: false,
				error: 'Authentication required',
				shouldRedirect: '/login'
			}
		}

		// Get recent activities from various tables
		const [recentProperties, recentTenants, recentLeases, recentMaintenance] = await Promise.all([
			supabase
				.from('Property')
				.select('id, name, createdAt')
				.eq('ownerId', user.id)
				.order('createdAt', { ascending: false })
				.limit(5),
			supabase
				.from('Tenant')
				.select('id, name, createdAt')
				.eq('userId', user.id)
				.order('createdAt', { ascending: false })
				.limit(5),
			supabase
				.from('Lease')
				.select(`
					id,
					createdAt,
					Tenant(name),
					Unit(unitNumber, Property!inner(name, ownerId))
				`)
				.eq('Unit.Property.ownerId', user.id)
				.order('createdAt', { ascending: false })
				.limit(5),
			supabase
				.from('MaintenanceRequest')
				.select(`
					id,
					title,
					createdAt,
					status,
					Unit(unitNumber, Property!inner(name, ownerId))
				`)
				.eq('Unit.Property.ownerId', user.id)
				.order('createdAt', { ascending: false })
				.limit(5)
		])

		// Combine and format activities
		const activities: Array<{
			id: string
			type: string
			description: string
			timestamp: string
		}> = []

		// Add property activities
		recentProperties.data?.forEach(property => {
			activities.push({
				id: `property-${property.id}`,
				type: 'property',
				description: `New property added: ${property.name}`,
				timestamp: property.createdAt
			})
		})

		// Add tenant activities
		recentTenants.data?.forEach(tenant => {
			activities.push({
				id: `tenant-${tenant.id}`,
				type: 'tenant',
				description: `New tenant added: ${tenant.name}`,
				timestamp: tenant.createdAt
			})
		})

		// Add lease activities
		recentLeases.data?.forEach(lease => {
			if (lease.Tenant && lease.Unit) {
				activities.push({
					id: `lease-${lease.id}`,
					type: 'lease',
					description: `Lease created for ${lease.Tenant.name} - Unit ${lease.Unit.unitNumber}`,
					timestamp: lease.createdAt
				})
			}
		})

		// Add maintenance activities
		recentMaintenance.data?.forEach(request => {
			if (request.Unit) {
				activities.push({
					id: `maintenance-${request.id}`,
					type: 'maintenance',
					description: `Maintenance: ${request.title} - Unit ${request.Unit.unitNumber}`,
					timestamp: request.createdAt
				})
			}
		})

		// Sort by timestamp and take top 10
		activities.sort((a, b) =>
			new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
		)
		const recentActivities = activities.slice(0, 10)

		return { success: true, data: { activities: recentActivities } }
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
 * Uses Supabase RPC or aggregation
 */
export async function getPropertyPerformance() {
	try {
		const supabase = await createClient()
		const { data: { user } } = await supabase.auth.getUser()

		if (!user) {
			return {
				success: false,
				error: 'Authentication required',
				shouldRedirect: '/login'
			}
		}

		// Try RPC function first
		const { data, error } = await supabase
			.rpc('get_property_performance', {
				p_user_id: user.id
			})

		if (!error && data) {
			return { success: true, data }
		}

		// Fallback: Get properties with their units and leases
		const { data: properties } = await supabase
			.from('Property')
			.select(`
				id,
				name,
				address,
				Unit(
					id,
					status,
					Lease(
						id,
						status,
						monthlyRent
					)
				)
			`)
			.eq('ownerId', user.id)

		const performance = properties?.map(property => {
			const totalUnits = property.Unit?.length || 0
			const occupiedUnits = property.Unit?.filter(
				(u) => u.status === 'OCCUPIED'
			).length || 0
			const monthlyRevenue = property.Unit?.reduce((sum: number, unit) => {
				const activeLease = unit.Lease?.find((l) => l.status === 'ACTIVE')
				return sum + (activeLease?.monthlyRent || 0)
			}, 0) || 0

			return {
				propertyId: property.id,
				propertyName: property.name,
				address: property.address,
				totalUnits,
				occupiedUnits,
				vacantUnits: totalUnits - occupiedUnits,
				occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
				monthlyRevenue,
				annualRevenue: monthlyRevenue * 12
			}
		}) || []

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
				chartData: [] // TODO: Add chart data via Supabase
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