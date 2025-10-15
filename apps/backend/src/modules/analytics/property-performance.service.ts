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
		const raw = await this.callRpc(
			'get_property_performance',
			this.buildUserPayload(userId)
		)
		return mapPropertyPerformance(raw)
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
