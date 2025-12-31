import { Injectable } from '@nestjs/common'
import type { PropertyPerformance } from '@repo/shared/types/core'
import { DashboardAnalyticsService } from '../analytics/dashboard-analytics.service'
import { AppLogger } from '../../logger/app-logger.service'

@Injectable()
export class DashboardPerformanceService {
	constructor(
		private readonly dashboardAnalyticsService: DashboardAnalyticsService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Get property performance metrics
	 * Delegates to repository layer for clean data access
	 */
	async getPropertyPerformance(
		user_id?: string,
		token?: string
	): Promise<PropertyPerformance[]> {
		if (!user_id) {
			this.logger.warn('Property performance requested without user_id')
			return []
		}

		try {
			// Delegate to DashboardAnalyticsService which uses optimized RPC
			// Reduces method from 165 lines to 15 lines (CLAUDE.md compliant)
			return await this.dashboardAnalyticsService.getPropertyPerformance(
				user_id,
				token
			)
		} catch (error) {
			this.logger.error('Failed to get property performance', {
				error: error instanceof Error ? error.message : String(error),
				user_id
			})
			return []
		}
	}
}
