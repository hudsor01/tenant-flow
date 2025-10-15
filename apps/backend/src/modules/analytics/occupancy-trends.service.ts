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

	async getOccupancyTrends(userId: string): Promise<OccupancyTrendPoint[]> {
		const raw = await this.callRpc(
			'get_occupancy_trends',
			this.buildUserPayload(userId)
		)
		return mapOccupancyTrends(raw)
	}

	async getVacancyAnalysis(userId: string): Promise<VacancyAnalysisEntry[]> {
		const raw = await this.callRpc(
			'get_vacancy_analysis',
			this.buildUserPayload(userId)
		)
		return mapVacancyAnalysis(raw)
	}

	async getOccupancyMetrics(userId: string): Promise<OccupancyMetricSummary> {
		const raw = await this.callRpc(
			'get_occupancy_overview',
			this.buildUserPayload(userId)
		)
		return mapOccupancyMetrics(raw)
	}

	async getOccupancyAnalyticsPageData(
		userId: string
	): Promise<OccupancyAnalyticsPageResponse> {
		const [metricsRaw, trendsRaw, vacancyRaw] = await Promise.all([
			this.callRpc('get_occupancy_overview', this.buildUserPayload(userId)),
			this.callRpc('get_occupancy_trends', this.buildUserPayload(userId)),
			this.callRpc('get_vacancy_analysis', this.buildUserPayload(userId))
		])

		return buildOccupancyAnalyticsPageResponse({
			metrics: metricsRaw,
			trends: trendsRaw,
			vacancy: vacancyRaw
		})
	}
}
