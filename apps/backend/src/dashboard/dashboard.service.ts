import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'
import { SupabaseService } from '../database/supabase.service'
import type { DashboardStats } from '@repo/shared'

@Injectable()
export class DashboardService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: PinoLogger
	) {
		this.logger.setContext(DashboardService.name)
	}

	/**
	 * Get comprehensive dashboard statistics
	 */
	async getStats(userId?: string): Promise<DashboardStats> {
		try {
			// If no userId provided (public access), return mock data for demo
			if (!userId) {
				this.logger.info({ action: 'get_dashboard_stats', type: 'mock' }, 'Returning mock dashboard stats for public access')
				return this.getMockDashboardStats()
			}

			this.logger.info({ userId, action: 'get_dashboard_stats' }, 'Fetching dashboard statistics')

			// ULTRA-NATIVE: Direct RPC call with proper types
			const { data, error } = await this.supabase
				.getAdminClient()
				.rpc('get_dashboard_stats', { user_id_param: userId })

			if (error) {
				this.logger.error({ userId, error: error.message }, 'Failed to get dashboard stats via RPC')
				throw new InternalServerErrorException('Failed to retrieve dashboard statistics')
			}

			this.logger.info({ userId, action: 'get_dashboard_stats' }, 'Dashboard stats retrieved successfully')
			return data as unknown as DashboardStats
		} catch (error) {
			this.logger.error({ userId, error: error instanceof Error ? error.message : String(error) }, 'Failed to get dashboard stats')
			throw new InternalServerErrorException('Failed to retrieve dashboard statistics')
		}
	}

	/**
	 * Get recent activity feed
	 */
	async getActivity(
		userId: string,
		_authToken?: string
	): Promise<{ activities: Record<string, unknown>[] }> {
		try {
			this.logger.info({ userId, action: 'get_dashboard_activity' }, 'Fetching dashboard activity')

			// ULTRA-NATIVE: Direct RPC call
			const { data, error } = await this.supabase
				.getAdminClient()
				.rpc('get_dashboard_metrics', { p_user_id: userId })

			if (error) {
				this.logger.error({ userId, error: error.message }, 'Failed to get dashboard activity')
				throw new InternalServerErrorException('Failed to retrieve dashboard activity')
			}

			this.logger.info({ userId, action: 'get_dashboard_activity' }, 'Dashboard activity retrieved successfully')
			return ((data as unknown) as { activities: Record<string, unknown>[] }) || { activities: [] }
		} catch (error) {
			this.logger.error({ userId, error: error instanceof Error ? error.message : String(error) }, 'Failed to get dashboard activity')
			throw new InternalServerErrorException('Failed to retrieve dashboard activity')
		}
	}

	/**
	 * Get comprehensive billing insights using direct RPC
	 */
	async getBillingInsights(): Promise<Record<string, unknown> | null> {
		return null
	}

	/**
	 * Check if Stripe data service is available and healthy
	 */
	async isBillingInsightsAvailable(): Promise<boolean> {
		return false
	}

	/**
	 * Get mock dashboard statistics for public demo
	 */
	private getMockDashboardStats(): DashboardStats {
		return {
			properties: {
				total: 25,
				occupied: 23,
				vacant: 2,
				occupancyRate: 92,
				totalMonthlyRent: 48500,
				averageRent: 1940
			},
			tenants: {
				total: 23,
				active: 21,
				inactive: 2,
				newThisMonth: 3
			},
			units: {
				total: 25,
				occupied: 23,
				vacant: 2,
				maintenance: 1,
				averageRent: 1940,
				available: 2,
				occupancyRate: 92,
				totalPotentialRent: 48500,
				totalActualRent: 44620
			},
			leases: {
				total: 23,
				active: 21,
				expired: 2,
				expiringSoon: 3
			},
			maintenance: {
				total: 12,
				open: 3,
				inProgress: 2,
				completed: 7,
				avgResolutionTime: 4.5,
				byPriority: {
					low: 2,
					medium: 6,
					high: 3,
					emergency: 1
				}
			},
			revenue: {
				monthly: 48500,
				yearly: 582000,
				growth: 8.5
			}
		}
	}
}