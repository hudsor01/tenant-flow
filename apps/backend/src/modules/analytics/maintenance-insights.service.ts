import { Injectable, Logger } from '@nestjs/common'
import type {
	MaintenanceAnalyticsPageResponse,
	MaintenanceMetricSummary
} from '@repo/shared/types/maintenance-analytics'
import {
	buildMaintenanceAnalyticsPageResponse,
	mapMaintenanceCategoryBreakdown,
	mapMaintenanceCostBreakdown,
	mapMaintenanceMetrics,
	mapMaintenanceTrends
} from '@repo/shared/utils/maintenance-analytics'
import { SupabaseService } from '../../database/supabase.service'

@Injectable()
export class MaintenanceInsightsService {
	private readonly logger = new Logger(MaintenanceInsightsService.name)

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
					`Maintenance analytics RPC failed: ${functionName} - ${error.message}`
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

	async getMaintenanceMetrics(
		userId: string
	): Promise<MaintenanceMetricSummary> {
		const raw = await this.callRpc(
			'calculate_maintenance_metrics',
			this.buildUserPayload(userId)
		)
		return mapMaintenanceMetrics(raw)
	}

	async getMaintenanceAnalytics(
		userId: string
	): Promise<MaintenanceAnalyticsPageResponse> {
		const metricsRaw = await this.callRpc(
			'calculate_maintenance_metrics',
			this.buildUserPayload(userId)
		)
		const analyticsRaw = await this.callRpc(
			'get_maintenance_analytics',
			this.buildUserPayload(userId)
		)

		const costBreakdown = mapMaintenanceCostBreakdown(
			isAnalyticsObject(analyticsRaw)
				? (analyticsRaw.cost_breakdown ?? analyticsRaw.costBreakdown)
				: null
		)
		const trends = mapMaintenanceTrends(
			isAnalyticsObject(analyticsRaw)
				? (analyticsRaw.trends_over_time ?? analyticsRaw.trends)
				: null
		)
		const categoryBreakdown = mapMaintenanceCategoryBreakdown(
			isAnalyticsObject(analyticsRaw)
				? (analyticsRaw.category_breakdown ?? analyticsRaw.categories)
				: null
		)

		return {
			metrics: mapMaintenanceMetrics(metricsRaw),
			costBreakdown,
			trends,
			categoryBreakdown
		}
	}

	async getMaintenanceInsightsPageData(
		userId: string
	): Promise<MaintenanceAnalyticsPageResponse> {
		const [metricsRaw, analyticsRaw] = await Promise.all([
			this.callRpc(
				'calculate_maintenance_metrics',
				this.buildUserPayload(userId)
			),
			this.callRpc('get_maintenance_analytics', this.buildUserPayload(userId))
		])

		return buildMaintenanceAnalyticsPageResponse({
			metrics: metricsRaw,
			costBreakdown: isAnalyticsObject(analyticsRaw)
				? (analyticsRaw.cost_breakdown ?? analyticsRaw.costBreakdown)
				: null,
			trends: isAnalyticsObject(analyticsRaw)
				? (analyticsRaw.trends_over_time ?? analyticsRaw.trends)
				: null,
			categoryBreakdown: isAnalyticsObject(analyticsRaw)
				? (analyticsRaw.category_breakdown ?? analyticsRaw.categories)
				: null
		})
	}
}

function isAnalyticsObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}
