/**
 * Database RPC Function Response Types
 *
 * TypeScript interfaces for RPC function responses from Supabase database functions.
 * These provide type safety for complex database queries that return JSON/JSONB data.
 */

/**
 * Response from get_property_performance RPC function
 */
export interface PropertyPerformanceRpcResponse {
	property_name: string
	property_id: string
	total_units: number
	occupied_units: number
	vacant_units: number
	occupancy_rate: number
	annual_revenue: number
	monthly_revenue: number
	potential_revenue: number
	address: string
	property_type: string
	status: string
}

/**
 * Response for occupancy trends (calculated in-app)
 */
export interface OccupancyTrendResponse {
	month: string
	occupancy_rate: number
	total_units: number
	occupied_units: number
}

/**
 * Response for revenue trends (calculated in-app)
 */
export interface RevenueTrendResponse {
	month: string
	revenue: number
	growth: number
	previous_period_revenue: number
}


/**
 * Type guards for runtime validation
 */
export function isPropertyPerformanceRpcResponse(
	data: unknown
): data is PropertyPerformanceRpcResponse {
	if (!data || typeof data !== 'object') return false

	const obj = data as Record<string, unknown>
	return (
		'property_name' in obj &&
		typeof obj.property_name === 'string' &&
		'property_id' in obj &&
		typeof obj.property_id === 'string' &&
		'total_units' in obj &&
		typeof obj.total_units === 'number'
	)
}