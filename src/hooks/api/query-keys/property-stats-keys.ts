/**
 * Property Stats & Performance Query Options
 * Split from property-keys.ts: stats, performance, and analytics queries.
 *
 * Queries: stats, performance, analytics.occupancy/financial/maintenance.
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { occupancyTrendsQuery } from './analytics-keys'
import { propertyQueries } from './property-keys'
import type { PropertyPerformance } from '#types/core'
import type { PropertyStats } from '#types/stats'
import type { Database } from '#types/supabase'

/**
 * Extract RPC return type from generated Database types
 */
type PerformanceWithTrendsRow =
	Database['public']['Functions']['get_property_performance_with_trends']['Returns'][number]

/**
 * Property details from join query (for performance enrichment)
 */
interface PropertyDetails {
	address: string
	propertyType: string
	units: Array<{ id: string; status: string }>
}

/**
 * Maps RPC return shape + property details to PropertyPerformance
 * Uses typed inputs -- no `as unknown as` assertions
 */
function mapPerformanceRow(
	row: PerformanceWithTrendsRow,
	propertyMap: Map<string, PropertyDetails>
): PropertyPerformance {
	const details = propertyMap.get(row.property_id)
	const units = details?.units ?? []
	const totalUnits = units.length
	const occupiedUnits = units.filter(u => u.status === 'occupied').length
	const vacantUnits = totalUnits - occupiedUnits

	let status: PropertyPerformance['status']
	if (totalUnits === 0) {
		status = 'NO_UNITS'
	} else if (occupiedUnits === 0) {
		status = 'vacant'
	} else if (occupiedUnits === totalUnits) {
		status = 'FULL'
	} else {
		status = 'PARTIAL'
	}

	let trend: PropertyPerformance['trend']
	if (row.trend_percentage > 0) {
		trend = 'up'
	} else if (row.trend_percentage < 0) {
		trend = 'down'
	} else {
		trend = 'stable'
	}

	const monthlyRevenue = row.total_revenue / (getTimeframeDays(row.timeframe) / 30)

	return {
		property: row.property_name,
		property_id: row.property_id,
		totalUnits,
		occupiedUnits,
		vacantUnits,
		occupancyRate: Number(row.occupancy_rate) || 0,
		revenue: row.total_revenue,
		monthlyRevenue: Math.round(monthlyRevenue),
		potentialRevenue: 0,
		address_line1: details?.address ?? '',
		property_type: details?.propertyType ?? 'SINGLE_FAMILY',
		status,
		trend,
		trendPercentage: Number(row.trend_percentage) || 0
	}
}

/**
 * Converts timeframe string to number of days
 */
function getTimeframeDays(timeframe: string): number {
	const map: Record<string, number> = {
		'7d': 7, '30d': 30, '90d': 90, '180d': 180, '365d': 365
	}
	return map[timeframe] ?? 30
}

export const propertyStatsQueries = {
	/**
	 * Property statistics
	 * Aggregates active, total counts directly via PostgREST
	 */
	stats: () =>
		queryOptions({
			queryKey: [...propertyQueries.all(), 'stats'],
			queryFn: async (): Promise<PropertyStats> => {
				const supabase = createClient()
				const [activeResult, totalResult, occupiedResult] = await Promise.all([
					supabase
						.from('properties')
						.select('id', { count: 'exact', head: true })
						.eq('status', 'active'),
					supabase
						.from('properties')
						.select('id', { count: 'exact', head: true })
						.neq('status', 'inactive'),
					supabase
						.from('units')
						.select('id', { count: 'exact', head: true })
						.eq('status', 'occupied')
				])

				if (activeResult.error) handlePostgrestError(activeResult.error, 'properties')
				if (totalResult.error) handlePostgrestError(totalResult.error, 'properties')
				if (occupiedResult.error) handlePostgrestError(occupiedResult.error, 'properties')

				const total = totalResult.count ?? 0
				const occupied = occupiedResult.count ?? 0
				const vacant = total - occupied
				const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0

				return {
					total,
					occupied,
					vacant,
					occupancyRate,
					totalMonthlyRent: 0,
					averageRent: 0
				}
			},
			staleTime: 5 * 60 * 1000,
			gcTime: 30 * 60 * 1000
		}),

	/**
	 * Property performance metrics
	 * Uses get_property_performance_with_trends RPC enriched with property details
	 */
	performance: (timeframe: '7d' | '30d' | '90d' | '180d' | '365d' = '30d') =>
		queryOptions({
			queryKey: [...propertyQueries.all(), 'performance', timeframe],
			queryFn: async (): Promise<PropertyPerformance[]> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) return []

				const [trendsResult, propertiesResult] = await Promise.all([
					supabase.rpc('get_property_performance_with_trends', {
						p_user_id: user.id,
						p_timeframe: timeframe,
						p_limit: 100
					}),
					supabase
						.from('properties')
						.select(`id, name, address_line1, property_type, units(id, status)`)
						.eq('owner_user_id', user.id)
						.neq('status', 'inactive')
				])

				if (trendsResult.error)
					handlePostgrestError(trendsResult.error, 'property performance')
				if (propertiesResult.error)
					handlePostgrestError(propertiesResult.error, 'properties')

				const trends: PerformanceWithTrendsRow[] = trendsResult.data ?? []
				const properties = propertiesResult.data ?? []

				const propertyMap = new Map(
					properties.map(p => [
						p.id,
						{
							address: p.address_line1 ?? '',
							propertyType: p.property_type ?? 'SINGLE_FAMILY',
							units: Array.isArray(p.units) ? p.units : []
						}
					])
				)

				return trends.map(row => mapPerformanceRow(row, propertyMap))
			},
			staleTime: 5 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		}),

	analytics: {
		occupancy: () => occupancyTrendsQuery({ months: 12 }),
		financial: () =>
			queryOptions({
				queryKey: [...propertyQueries.all(), 'analytics', 'financial'] as const,
				queryFn: async (): Promise<unknown> => {
					const supabase = createClient()
					const user = await getCachedUser()
					if (!user) throw new Error('Not authenticated')
					const { data, error } = await supabase.rpc('get_financial_overview', {
						p_user_id: user.id
					})
					if (error) handlePostgrestError(error, 'properties')
					return data ?? {}
				},
				staleTime: 2 * 60 * 1000,
				gcTime: 10 * 60 * 1000
			}),
		maintenance: () =>
			queryOptions({
				queryKey: [...propertyQueries.all(), 'analytics', 'maintenance'] as const,
				queryFn: async (): Promise<unknown> => {
					const supabase = createClient()
					const user = await getCachedUser()
					if (!user) throw new Error('Not authenticated')
					const { data, error } = await supabase.rpc(
						'get_maintenance_analytics',
						{ user_id: user.id }
					)
					if (error) handlePostgrestError(error, 'properties')
					return data ?? {}
				},
				staleTime: 2 * 60 * 1000,
				gcTime: 10 * 60 * 1000
			})
	}
}
