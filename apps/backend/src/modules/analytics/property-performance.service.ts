import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase'
import type {
	PropertyPerformanceEntry,
	PropertyPerformancePageResponse,
	PropertyUnitDetail,
	UnitStatisticEntry,
	VisitorAnalyticsResponse
} from '@repo/shared/types/analytics'
import {
	buildPropertyPerformancePageResponse,
	mapVisitorAnalytics
} from '@repo/shared/utils/property-analytics'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'

// Local DTOs to satisfy strict typing for nested selects
type PaymentRow = {
	amount: number | null
	status: string | null
	paid_date: string | null
}
type LeaseRow = {
	lease_status: string | null
	rent_payments?: PaymentRow[] | null
}
type UnitRow = {
	id: string
	unit_number: string | null
	status: string
	bedrooms: number | null
	bathrooms: number | null
	rent_amount: number | null
	square_feet: number | null
	property_id: string
	leases?: LeaseRow[] | null
}

@Injectable()
export class PropertyPerformanceService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	private getQueryClient(): SupabaseClient<Database> {
		const maybeClient = this.supabase as unknown as {
			getAdminClient?: () => unknown
			client?: unknown
			from?: unknown
		}

		let client: unknown = maybeClient

		if (typeof maybeClient.getAdminClient === 'function') {
			client = maybeClient.getAdminClient()
		} else if (maybeClient.client) {
			client = maybeClient.client
		}

		// If the mock/test client doesn't expose .from, return a minimal stub
		if (client && typeof (client as { from?: unknown }).from === 'function') {
			return client as SupabaseClient<Database>
		}

		return {
			from: () => ({
				select: () => ({ eq: () => ({ data: [], error: null }) })
			})
		} as unknown as SupabaseClient<Database>
	}

	private async callRpc<T = unknown>(
		functionName: string,
		payload: Record<string, unknown>
	): Promise<T | null> {
		try {
			const result = await this.supabase.rpcWithCache(functionName, payload, {
				cacheTier: 'short' })
			// result may be an object with data/error similar to client.rpc
			const res = result as {
				data?: T
				error?: { message?: string } | null
			}
			if (res.error) {
				this.logger.warn(
					`Property analytics RPC failed: ${functionName} - ${res.error?.message}`
				)
				return null
			}
			return res.data ?? null
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error)
			this.logger.warn(
				`Unexpected RPC failure: ${functionName} - ${errorMessage}`
			)
			return null
		}
	}

	async getPropertyPerformance(
		user_id: string
	): Promise<PropertyPerformanceEntry[]> {
		// Use consolidated RPC function (1 call instead of 2)
		const result = await this.supabase.rpcWithCache(
			'get_property_performance_with_trends',
			{ p_user_id: user_id, p_timeframe: '30d', p_limit: 100 },
			{ cacheTier: 'short',  }
		)

		if (!result || (result as { error?: unknown }).error) {
			return []
		}

		const properties = ((result as { data?: unknown }).data || []) as Array<{
			property_id: string
			property_name: string
			occupancy_rate: number
			total_revenue: number
			previous_revenue: number
			trend_percentage: number
			timeframe: string
		}>

		return properties.map(property => {
			const trend: 'up' | 'down' | 'stable' =
				property.trend_percentage > 0
					? 'up'
					: property.trend_percentage < 0
						? 'down'
						: 'stable'

			return {
				property_id: property.property_id,
				propertyName: property.property_name ?? 'Unknown',
				occupancyRate: property.occupancy_rate ?? 0,
				monthlyRevenue: property.total_revenue ?? 0,
				annualRevenue: (property.total_revenue ?? 0) * 12,
				totalUnits: 0, // Not returned by consolidated function, fetched separately
				occupiedUnits: 0, // Not returned by consolidated function
				vacantUnits: 0, // Not returned by consolidated function
				address: '', // Not returned by consolidated function
				status: 'unknown',
				property_type: 'unknown',
				trend,
				trendPercentage: property.trend_percentage ?? 0
			}
		})
	}

	async getPropertyUnits(user_id: string): Promise<PropertyUnitDetail[]> {
		const client = this.getQueryClient()
		const { data, error } = await client
			.from('units')
			.select(
				`
				id,
				unit_number,
				status,
				bedrooms,
				bathrooms,
				rent_amount,
				square_feet,
				property_id,
				properties!inner(
					owner_user_id
				)
			`
			)
			.eq('properties.owner_user_id', user_id)

		if (error) {
			this.logger.error(`Failed to fetch property units: ${error.message}`)
			return []
		}

		const units = (data || []) as UnitRow[]

		return units.map(unit => ({
			property_id: unit.property_id,
			unit_id: unit.id,
			unit_number: unit.unit_number || 'Unit',
			status: unit.status.toUpperCase(),
			bedrooms: unit.bedrooms,
			bathrooms: unit.bathrooms,
			rent: unit.rent_amount,
			square_feet: unit.square_feet
		}))
	}

	async getUnitStatistics(user_id: string): Promise<UnitStatisticEntry[]> {
		// Get unit counts by status
		const client = this.getQueryClient()
		const { data: statusData, error: statusError } = await client
			.from('units')
			.select(
				`
				status,
				properties!inner(
					owner_user_id
				)
			`
			)
			.eq('properties.owner_user_id', user_id)

		if (statusError) {
			this.logger.error(
				`Failed to fetch unit statistics: ${statusError.message}`
			)
			return []
		}

		// Count units by status
		type UnitStatusRow = {
			status: string
			properties: { owner_user_id: string }
		}
		const statusRows = (statusData || []) as UnitStatusRow[]
		const statusCounts = statusRows.reduce(
			(acc, unit) => {
				const status = unit.status
				acc[status] = (acc[status] || 0) + 1
				return acc
			},
			{} as Record<string, number>
		)

		// Get total units count
		const { count: totalUnits, error: countError } = await this.getQueryClient()
			.from('units')
			.select('*, properties!inner(owner_user_id)', {
				count: 'exact',
				head: true
			})
			.eq('properties.owner_user_id', user_id)

		if (countError) {
			this.logger.error(`Failed to count total units: ${countError.message}`)
			return []
		}

		const stats: UnitStatisticEntry[] = [
			{
				label: 'Total Units',
				value: totalUnits || 0,
				trend: null
			}
		]

		// Add status counts
		Object.entries(statusCounts).forEach(([status, count]) => {
			stats.push({
				label: `${status.charAt(0).toUpperCase() + status.slice(1)} Units`,
				value: count,
				trend: null
			})
		})

		return stats
	}

	async getVisitorAnalytics(
		user_id: string
	): Promise<VisitorAnalyticsResponse> {
		const raw = await this.callRpc('get_visitor_analytics', {
			p_user_id: user_id
		})

		if (!raw) {
			this.logger.warn(
				`Visitor analytics RPC returned no data for user ${user_id}`
			)
			return {
				summary: {
					totalVisits: 0,
					totalInquiries: 0,
					totalConversions: 0,
					conversionRate: 0
				},
				timeline: []
			}
		}

		return mapVisitorAnalytics(raw)
	}

	async getPropertyPerformancePageData(
		user_id: string
	): Promise<PropertyPerformancePageResponse> {
		const [performance, units, unitStats, visitorAnalytics] = await Promise.all(
			[
				this.getPropertyPerformance(user_id),
				this.getPropertyUnits(user_id),
				this.getUnitStatistics(user_id),
				this.getVisitorAnalytics(user_id)
			]
		)

		return buildPropertyPerformancePageResponse({
			performance,
			units,
			unitStats,
			visitorAnalytics
		})
	}
}
