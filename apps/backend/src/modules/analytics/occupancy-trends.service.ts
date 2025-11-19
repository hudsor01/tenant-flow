import { Injectable, Logger } from '@nestjs/common'
import type {
	OccupancyAnalyticsPageResponse,
	OccupancyMetricSummary,
	OccupancyTrendPoint,
	VacancyAnalysisEntry
} from '@repo/shared/types/occupancy-analytics'
import {
	buildOccupancyAnalyticsPageResponse,
	mapOccupancyMetrics,
	mapOccupancyTrends,
	mapVacancyAnalysis
} from '@repo/shared/utils/occupancy-analytics'
import { SupabaseService } from '../../database/supabase.service'

@Injectable()
export class OccupancyTrendsService {
	private readonly logger = new Logger(OccupancyTrendsService.name)

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
			const res = result as {
				data?: T
				error?: { message?: string } | null
			}
			if (res.error) {
				this.logger.warn(
					`Occupancy analytics RPC failed: ${functionName} - ${res.error?.message}`
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

	async getOccupancyTrends(user_id: string): Promise<OccupancyTrendPoint[]> {
		const raw = await this.callRpc(
			'get_occupancy_trends',
			this.buildUserPayload(user_id)
		)
		return mapOccupancyTrends(raw)
	}

	async getVacancyAnalysis(user_id: string): Promise<VacancyAnalysisEntry[]> {
		const raw = await this.callRpc(
			'get_vacancy_analysis',
			this.buildUserPayload(user_id)
		)
		return mapVacancyAnalysis(raw)
	}

	async getOccupancyMetrics(user_id: string): Promise<OccupancyMetricSummary> {
		const raw = await this.callRpc(
			'get_occupancy_overview',
			this.buildUserPayload(user_id)
		)
		return mapOccupancyMetrics(raw)
	}

	async getOccupancyAnalyticsPageData(
		user_id: string
	): Promise<OccupancyAnalyticsPageResponse> {
		const [metricsRaw, trendsRaw, vacancyRaw] = await Promise.all([
			this.callRpc('get_occupancy_overview', this.buildUserPayload(user_id)),
			this.callRpc('get_occupancy_trends', this.buildUserPayload(user_id)),
			this.callRpc('get_vacancy_analysis', this.buildUserPayload(user_id))
		])

		return buildOccupancyAnalyticsPageResponse({
			metrics: metricsRaw,
			trends: trendsRaw,
			vacancy: vacancyRaw
		})
	}
}
