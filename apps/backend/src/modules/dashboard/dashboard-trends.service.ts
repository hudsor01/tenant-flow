import { Injectable } from '@nestjs/common'
import type {
	OccupancyTrendResponse,
	RevenueTrendResponse
} from '@repo/shared/types/database-rpc'
import { EMPTY_MAINTENANCE_ANALYTICS } from '@repo/shared/constants/empty-states'
import { SupabaseService } from '../../database/supabase.service'
import { DashboardAnalyticsService } from '../analytics/dashboard-analytics.service'
import { RedisCacheService } from '../../cache/cache.service'
import type { activitySchema } from '@repo/shared/validation/dashboard'
import {
	billingInsightsSchema,
	dashboardActivityResponseSchema
} from '@repo/shared/validation/dashboard'
import type { z } from 'zod'
import { BadRequestException } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'
import { AppLogger } from '../../logger/app-logger.service'

@Injectable()
export class DashboardTrendsService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly dashboardAnalyticsService: DashboardAnalyticsService,
		private readonly cache: RedisCacheService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Get recent activity feed using optimized RPC function
	 * PERFORMANCE: Replaces 5 separate queries with single optimized UNION query (4x faster)
	 */
	async getActivity(
		user_id: string,
		token: string
	): Promise<z.infer<typeof dashboardActivityResponseSchema>> {
		if (!user_id) {
			this.logger.warn('Activity requested without user_id')
			return { activities: [] }
		}
		if (!token) {
			this.logger.warn('Activity requested without token')
			return { activities: [] }
		}

		// Check cache first (CLAUDE.md: Real-time 3min TTL)
		const cacheKey = RedisCacheService.getUserKey(user_id, 'dashboard:activity')
		const cached =
			await this.cache.get<z.infer<typeof dashboardActivityResponseSchema>>(
				cacheKey
			)
		if (cached) {
			this.logger.debug('Dashboard activity cache hit', { user_id })
			return cached
		}

		try {
			// Use optimized RPC function - eliminates N+1 query pattern
			const { data, error } = await this.supabase
				.getAdminClient()
				.rpc('get_user_dashboard_activities', {
					p_user_id: user_id,
					p_limit: 20
				})

			if (error) {
				this.logger.error('Failed to fetch activities', {
					error: error.message,
					user_id
				})
				return { activities: [] }
			}

			const normalizedActivities = (data ?? []).map(activity =>
				this.normalizeActivity(activity)
			)

			// Validate response with dashboardActivityResponseSchema (pass data directly to safeParse)
			const validation = dashboardActivityResponseSchema.safeParse({
				activities: normalizedActivities
			})
			let result: z.infer<typeof dashboardActivityResponseSchema>

			if (validation.success) {
				result = validation.data
			} else {
				this.logger.warn('Some activities failed validation', {
					user_id,
					validationErrors: validation.error.format()
				})
				// Optionally filter valid activities only
				const validActivities = normalizedActivities.filter(
					(activity: unknown) =>
						dashboardActivityResponseSchema.shape.activities.element.safeParse(
							activity
						).success
				) as z.infer<typeof dashboardActivityResponseSchema>['activities']
				result = { activities: validActivities }
			}

			// Cache the validated result
			await this.cache.set(cacheKey, result, {
				tier: 'short',
				tags: [`user:${user_id}`, 'dashboard']
			})

			return result
		} catch (error) {
			this.logger.error('Failed to get activity', {
				error: error instanceof Error ? error.message : String(error),
				user_id
			})
			return { activities: [] }
		}
	}

	/**
	 * Get billing insights - MRR, churn rate, annual revenue
	 */
	async getBillingInsights(
		user_id?: string
	): Promise<z.infer<typeof billingInsightsSchema> | null> {
		if (!user_id) {
			this.logger.warn('getBillingInsights called without user_id')
			throw new BadRequestException('User ID is required to retrieve billing insights')
		}
		try {
			const result =
				await this.dashboardAnalyticsService.getBillingInsights(user_id)
			const parsed = billingInsightsSchema.safeParse(result)
			if (parsed.success) {
				return parsed.data
			}
			this.logger.error('Billing insights validation failed', {
				user_id,
				validationErrors: parsed.error.format()
			})
			throw new BadRequestException({
				message: 'Billing insights validation failed',
				errors: parsed.error.format()
			})
		} catch (error) {
			this.logger.error('Failed to get billing insights', {
				error: error instanceof Error ? error.message : String(error),
				user_id
			})
			if (error instanceof BadRequestException) {
				throw error
			}
			throw new BadRequestException('Failed to retrieve billing insights')
		}
	}

	/**
	 * Check if billing insights service is available
	 * Delegates to repository layer for service health check
	 */
	async isBillingInsightsAvailable(
		user_id: string,
		token: string
	): Promise<boolean> {
		if (!token) {
			this.logger.warn(
				'Billing insights availability check requested without token'
			)
			return false
		}

		try {
			const client = this.supabase.getUserClient(token)

			// Check if billing insights are available by checking if there's billing data for the user
			// RLS will automatically filter to user's data
			const { count, error } = await client
				.from('rent_payments')
				.select('*', { count: 'exact', head: true })
				.limit(1)

			if (error) {
				this.logger.error('Error checking billing insights availability', {
					error: error.message,
					user_id
				})
				return false
			}

			return count !== null && count > 0
		} catch (error) {
			this.logger.error(
				'Dashboard service failed to check billing insights availability',
				{
					error: error instanceof Error ? error.message : String(error),
					user_id
				}
			)
			return false
		}
	}

	/**
	 * Get occupancy trends using optimized RPC function
	 */
	async getOccupancyTrends(
		user_id?: string,
		token?: string,
		months?: number
	): Promise<OccupancyTrendResponse[]> {
		if (!user_id) {
			return []
		}

		try {
			// Delegate to DashboardAnalyticsService
			return await this.dashboardAnalyticsService.getOccupancyTrends(
				user_id,
				token,
				months
			)
		} catch (error) {
			this.logger.error('Failed to get occupancy trends', {
				error: error instanceof Error ? error.message : String(error),
				user_id
			})
			return []
		}
	}

	/**
	 * Get revenue trends using optimized RPC function
	 */
	async getRevenueTrends(
		user_id?: string,
		token?: string,
		months?: number
	): Promise<RevenueTrendResponse[]> {
		if (!user_id) {
			return []
		}

		try {
			// Delegate to DashboardAnalyticsService
			return await this.dashboardAnalyticsService.getRevenueTrends(
				user_id,
				token,
				months
			)
		} catch (error) {
			this.logger.error('Failed to get revenue trends', {
				error: error instanceof Error ? error.message : String(error),
				user_id
			})
			return []
		}
	}

	/**
	 * Get maintenance analytics using optimized RPC function
	 */
	async getMaintenanceAnalytics(
		user_id?: string
	): Promise<{
		avgResolutionTime: number
		completionRate: number
		priorityBreakdown: Record<string, number>
		trendsOverTime: {
			month: string
			completed: number
			avgResolutionDays: number
		}[]
	}> {
		if (!user_id) {
			return EMPTY_MAINTENANCE_ANALYTICS
		}

		try {
			// Delegate to DashboardAnalyticsService
			return await this.dashboardAnalyticsService.getMaintenanceAnalytics(
				user_id
			)
		} catch (error) {
			this.logger.error('Failed to get maintenance analytics', {
				error: error instanceof Error ? error.message : String(error),
				user_id
			})
			return EMPTY_MAINTENANCE_ANALYTICS
		}
	}

	private normalizeActivity(
		activity: Database['public']['Functions']['get_user_dashboard_activities']['Returns'][number]
	) {
		const normalizedType = this.mapActivityType(activity.activity_type)
		return {
			id: activity.id,
			activity_type: normalizedType,
			entity_id: activity.entity_id,
			property_id: null,
			tenant_id: null,
			unit_id: null,
			owner_id: activity.user_id ?? null,
			status: null,
			priority: null,
			action: activity.title ?? 'view',
			amount: null,
			activity_timestamp: activity.created_at,
			details: {
				entity_type: activity.entity_type,
				description: activity.description
			}
		}
	}

	private mapActivityType(
		type: string | null | undefined
	): z.infer<typeof activitySchema>['activity_type'] {
		switch (type?.toLowerCase()) {
			case 'lease':
			case 'leases':
				return 'leases'
			case 'payment':
			case 'payments':
				return 'payment'
			case 'maintenance':
				return 'maintenance'
			default:
				return 'units'
		}
	}
}
