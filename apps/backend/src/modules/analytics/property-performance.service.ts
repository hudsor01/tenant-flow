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

	private async callRpc(
		functionName: string,
		payload: Record<string, unknown>
	): Promise<unknown> {
		const client = this.supabase.getAdminClient()

		try {
			const { data, error } = await (
				client as unknown as {
					rpc: (
						fn: string,
						args: Record<string, unknown>
					) => Promise<{ data: unknown; error: { message: string } | null }>
				}
			).rpc(functionName, payload)

			if (error) {
				this.logger.warn(
					`Property analytics RPC failed: ${functionName} - ${error.message}`
				)
				return null
			}

			return data ?? null
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error)
			// Downgrade to warn - RPC failures are expected in some test mocks and
			// should not be treated as hard errors.
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
