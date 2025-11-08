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
		userId: string,
		extra?: Record<string, unknown>
	): Record<string, unknown> {
		return {
			user_id: userId,
			user_id_param: userId,
			p_user_id: userId,
			uid: userId,
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
		userId: string
	): Promise<PropertyPerformanceEntry[]> {
		const [rawProperties, rawTrends] = await Promise.all([
			this.callRpc('get_property_performance', this.buildUserPayload(userId)),
			this.callRpc<
				Array<{
					property_id: string
					current_month_revenue: number
					previous_month_revenue: number
					trend: 'up' | 'down' | 'stable'
					trend_percentage: number
				}>
			>('get_property_performance_trends', this.buildUserPayload(userId))
		])

		const properties = mapPropertyPerformance(rawProperties)

		// Create a map of property trends for O(1) lookup
		const trendsMap = new Map(
			(rawTrends || []).map(trend => [trend.property_id, trend])
		)

		// Merge trend data with property performance
		return properties.map(property => {
			const trendData = trendsMap.get(property.propertyId)

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

	async getPropertyUnits(userId: string): Promise<PropertyUnitDetail[]> {
		const raw = await this.callRpc(
			'get_property_units',
			this.buildUserPayload(userId)
		)
		return mapPropertyUnits(raw)
	}

	async getUnitStatistics(userId: string): Promise<UnitStatisticEntry[]> {
		const raw = await this.callRpc(
			'get_unit_statistics',
			this.buildUserPayload(userId)
		)
		return mapUnitStatistics(raw)
	}

	async getVisitorAnalytics(userId: string): Promise<VisitorAnalyticsResponse> {
		const raw = await this.callRpc(
			'calculate_visitor_analytics_full',
			this.buildUserPayload(userId)
		)
		return mapVisitorAnalytics(raw)
	}

	async getPropertyPerformancePageData(
		userId: string
	): Promise<PropertyPerformancePageResponse> {
		const [performanceRaw, unitsRaw, unitStatsRaw, visitorRaw] =
			await Promise.all([
				this.callRpc('get_property_performance', this.buildUserPayload(userId)),
				this.callRpc('get_property_units', this.buildUserPayload(userId)),
				this.callRpc('get_unit_statistics', this.buildUserPayload(userId)),
				this.callRpc(
					'calculate_visitor_analytics_full',
					this.buildUserPayload(userId)
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
