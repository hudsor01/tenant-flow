import { Injectable, Logger } from '@nestjs/common'
import type {
	PropertyPerformanceEntry,
	PropertyPerformancePageResponse,
	PropertyUnitDetail,
	UnitStatisticEntry,
	VisitorAnalyticsResponse
} from '@repo/shared/types/property-analytics'
import {
	buildPropertyPerformancePageResponse,
	mapPropertyPerformance,
	mapPropertyUnits,
	mapUnitStatistics,
	mapVisitorAnalytics
} from '@repo/shared/utils/property-analytics'
import { SupabaseService } from '../../database/supabase.service'

@Injectable()
export class PropertyPerformanceService {
	private readonly logger = new Logger(PropertyPerformanceService.name)

	constructor(private readonly supabase: SupabaseService) {}

	private buildUserPayload(
		user_id: string,
		extra?: Record<string, unknown>
	): Record<string, unknown> {
		return {
			user_id: user_id,
			user_id_param: user_id,
			p_user_id: user_id,
			uid: user_id,
			...extra
		}
	}

	private async callRpc<T = unknown>(
		functionName: string,
		payload: Record<string, unknown>
	): Promise<T | null> {
		try {
			const result = await this.supabase.rpcWithRetries(functionName, payload)
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
		const [rawProperties, rawTrends] = await Promise.all([
			this.callRpc('get_property_performance', this.buildUserPayload(user_id)),
			this.callRpc<
				Array<{
					property_id: string
					current_month_revenue: number
					previous_month_revenue: number
					trend: 'up' | 'down' | 'stable'
					trend_percentage: number
				}>
			>('get_property_performance_trends', this.buildUserPayload(user_id))
		])

		const properties = mapPropertyPerformance(rawProperties)

		// Create a map of property trends for O(1) lookup
		const trendsMap = new Map(
			(rawTrends || []).map(trend => [trend.property_id, trend])
		)

		// Merge trend data with property performance
		return properties.map(property => {
			const trendData = trendsMap.get(property.property_id)

			if (trendData) {
				return {
					...property,
					trend: trendData.trend,
					trendPercentage: trendData.trend_percentage
				}
			}

			// Fallback to stable if no trend data available (e.g., new property with no payment history)
			return {
				...property,
				trend: 'stable' as const,
				trendPercentage: 0
			}
		})
	}

	async getPropertyUnits(user_id: string): Promise<PropertyUnitDetail[]> {
		const raw = await this.callRpc(
			'get_property_units',
			this.buildUserPayload(user_id)
		)
		return mapPropertyUnits(raw)
	}

	async getUnitStatistics(user_id: string): Promise<UnitStatisticEntry[]> {
		const raw = await this.callRpc(
			'get_unit_statistics',
			this.buildUserPayload(user_id)
		)
		return mapUnitStatistics(raw)
	}

	async getVisitorAnalytics(user_id: string): Promise<VisitorAnalyticsResponse> {
		const raw = await this.callRpc(
			'calculate_visitor_analytics_full',
			this.buildUserPayload(user_id)
		)
		return mapVisitorAnalytics(raw)
	}

	async getPropertyPerformancePageData(
		user_id: string
	): Promise<PropertyPerformancePageResponse> {
		const [performanceRaw, unitsRaw, unitStatsRaw, visitorRaw] =
			await Promise.all([
				this.callRpc('get_property_performance', this.buildUserPayload(user_id)),
				this.callRpc('get_property_units', this.buildUserPayload(user_id)),
				this.callRpc('get_unit_statistics', this.buildUserPayload(user_id)),
				this.callRpc(
					'calculate_visitor_analytics_full',
					this.buildUserPayload(user_id)
				)
			])

		return buildPropertyPerformancePageResponse({
			performance: performanceRaw,
			units: unitsRaw,
			unitStats: unitStatsRaw,
			visitorAnalytics: visitorRaw
		})
	}
}
