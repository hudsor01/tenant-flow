import {
	BadRequestException,
	Injectable,
	Logger,
	Optional
} from '@nestjs/common'
import type { Request } from 'express'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import { SupabaseService } from '../../../database/supabase.service'

// Helper to extract JWT token from request
function getTokenFromRequest(req: Request): string | null {
	const authHeader = req.headers.authorization
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return null
	}
	return authHeader.substring(7)
}

// Validation constants
const VALID_TIMEFRAMES = ['7d', '30d', '90d', '180d', '365d'] as const

@Injectable()
export class PropertyAnalyticsService {
	private readonly logger: Logger

	constructor(
		private readonly supabase: SupabaseService,
		@Optional() logger?: Logger
	) {
		this.logger = logger ?? new Logger(PropertyAnalyticsService.name)
	}

	/**
	 * Get property performance analytics
	 * Performance metrics per property (occupancy, revenue, expenses)
	 *
	 * TODO: Implement RPC function 'get_property_performance_analytics' in database
	 * Current implementation returns empty array as stub
	 */
	async getPropertyPerformanceAnalytics(
		req: AuthenticatedRequest,
		query: { property_id?: string; timeframe: string; limit?: number }
	): Promise<unknown[]> {
		const user_id = req.user.id
		const startTime = Date.now()

		this.logger.log(
			'[ANALYTICS:PERFORMANCE:START] Performance analytics request received',
			{
				user_id,
				property_id: query.property_id,
				timeframe: query.timeframe,
				limit: query.limit
			}
		)

		// Validate using constant
		if (
			!VALID_TIMEFRAMES.includes(
				query.timeframe as (typeof VALID_TIMEFRAMES)[number]
			)
		) {
			this.logger.warn('[ANALYTICS:PERFORMANCE:VALIDATION] Invalid timeframe', {
				user_id,
				timeframe: query.timeframe
			})
			throw new BadRequestException(
				`Invalid timeframe. Must be one of: ${VALID_TIMEFRAMES.join(', ')}`
			)
		}

		// SECURITY: Verify property ownership before calling RPC
		if (query.property_id) {
			this.logger.debug('[ANALYTICS:PERFORMANCE:SECURITY] Verifying property access', {
				user_id,
				property_id: query.property_id
			})

			const { data: property } = await this.getPropertyForUser(
				req,
				query.property_id
			)
			if (!property) {
				this.logger.warn('[ANALYTICS:PERFORMANCE:SECURITY] Property not found', {
					user_id,
					property_id: query.property_id
				})
				throw new BadRequestException('Property not found or access denied')
			}

			this.logger.debug('[ANALYTICS:PERFORMANCE:SECURITY] Property access verified', {
				user_id,
				property_id: query.property_id
			})
		}

		this.logger.debug('[ANALYTICS:PERFORMANCE:STUB] RPC not implemented yet', {
			user_id,
			property_id: query.property_id,
			timeframe: query.timeframe,
			duration_ms: Date.now() - startTime
		})

		// TODO: RPC function 'get_property_performance_analytics' does not exist in Supabase schema
		// Once implemented, uncomment and use:
		// const { data, error } = await client.rpc('get_property_performance_analytics', {
		//   p_user_id: user_id,
		//   p_property_id: query.property_id,
		//   p_timeframe: query.timeframe,
		//   p_limit: query.limit || 10
		// })

		// Placeholder: Return empty array
		this.logger.log('[ANALYTICS:PERFORMANCE:COMPLETE] Performance analytics returning stub',
			{
				user_id,
				resultCount: 0,
				duration_ms: Date.now() - startTime
			}
		)
		return []
	}

	/**
	 * Get property occupancy analytics
	 * Occupancy rates and trends over time per property
	 *
	 * TODO: Implement RPC function 'get_property_occupancy_analytics' in database
	 * Current implementation returns empty array as stub
	 */
	async getPropertyOccupancyAnalytics(
		req: AuthenticatedRequest,
		query: { property_id?: string; period?: string }
	): Promise<unknown[]> {
		const user_id = req.user.id
		const startTime = Date.now()

		this.logger.log(
			'[ANALYTICS:OCCUPANCY:START] Occupancy analytics request received',
			{
				user_id,
				property_id: query.property_id,
				period: query.period
			}
		)

		// SECURITY: Verify property ownership before calling RPC
		if (query.property_id) {
			this.logger.debug('[ANALYTICS:OCCUPANCY:SECURITY] Verifying property access', {
				user_id,
				property_id: query.property_id
			})

			const { data: property } = await this.getPropertyForUser(
				req,
				query.property_id
			)
			if (!property) {
				this.logger.warn('[ANALYTICS:OCCUPANCY:SECURITY] Property not found', {
					user_id,
					property_id: query.property_id
				})
				throw new BadRequestException('Property not found or access denied')
			}

			this.logger.debug('[ANALYTICS:OCCUPANCY:SECURITY] Property access verified', {
				user_id,
				property_id: query.property_id
			})
		}

		this.logger.debug('[ANALYTICS:OCCUPANCY:STUB] RPC not implemented yet', {
			user_id,
			property_id: query.property_id,
			period: query.period,
			duration_ms: Date.now() - startTime
		})

		// TODO: RPC function 'get_property_occupancy_analytics' does not exist in Supabase schema
		// Once implemented, uncomment and use:
		// const { data, error } = await client.rpc('get_property_occupancy_analytics', {
		//   p_user_id: user_id,
		//   p_property_id: query.property_id,
		//   p_period: query.period || 'monthly'
		// })

		// Placeholder: Return empty array
		this.logger.log('[ANALYTICS:OCCUPANCY:COMPLETE] Occupancy analytics returning stub',
			{
				user_id,
				resultCount: 0,
				duration_ms: Date.now() - startTime
			}
		)
		return []
	}

	/**
	 * Get property financial analytics
	 * Revenue, expenses, and profitability metrics per property
	 *
	 * TODO: Implement RPC function 'get_property_financial_analytics' in database
	 * Current implementation returns empty array as stub
	 */
	async getPropertyFinancialAnalytics(
		req: AuthenticatedRequest,
		query: { property_id?: string; timeframe?: string }
	): Promise<unknown[]> {
		const user_id = req.user.id
		const startTime = Date.now()

		this.logger.log(
			'[ANALYTICS:FINANCIAL:START] Financial analytics request received',
			{
				user_id,
				property_id: query.property_id,
				timeframe: query.timeframe
			}
		)

		// SECURITY: Verify property ownership before calling RPC
		if (query.property_id) {
			this.logger.debug('[ANALYTICS:FINANCIAL:SECURITY] Verifying property access', {
				user_id,
				property_id: query.property_id
			})

			const { data: property } = await this.getPropertyForUser(
				req,
				query.property_id
			)
			if (!property) {
				this.logger.warn('[ANALYTICS:FINANCIAL:SECURITY] Property not found', {
					user_id,
					property_id: query.property_id
				})
				throw new BadRequestException('Property not found or access denied')
			}

			this.logger.debug('[ANALYTICS:FINANCIAL:SECURITY] Property access verified', {
				user_id,
				property_id: query.property_id
			})
		}

		this.logger.debug('[ANALYTICS:FINANCIAL:STUB] RPC not implemented yet', {
			user_id,
			property_id: query.property_id,
			timeframe: query.timeframe,
			duration_ms: Date.now() - startTime
		})

		// TODO: RPC function 'get_property_financial_analytics' does not exist in Supabase schema
		// Once implemented, uncomment and use:
		// const { data, error } = await client.rpc('get_property_financial_analytics', {
		//   p_user_id: user_id,
		//   p_property_id: query.property_id,
		//   p_timeframe: query.timeframe || '12m'
		// })

		// Placeholder: Return empty array
		this.logger.log('[ANALYTICS:FINANCIAL:COMPLETE] Financial analytics returning stub',
			{
				user_id,
				resultCount: 0,
				duration_ms: Date.now() - startTime
			}
		)
		return []
	}

	/**
	 * Get property maintenance analytics
	 * Maintenance costs, frequency, and trends per property
	 *
	 * TODO: Implement RPC function 'get_property_maintenance_analytics' in database
	 * Current implementation returns empty array as stub
	 */
	async getPropertyMaintenanceAnalytics(
		req: AuthenticatedRequest,
		query: { property_id?: string; timeframe?: string }
	): Promise<unknown[]> {
		const user_id = req.user.id
		const startTime = Date.now()

		this.logger.log(
			'[ANALYTICS:MAINTENANCE:START] Maintenance analytics request received',
			{
				user_id,
				property_id: query.property_id,
				timeframe: query.timeframe
			}
		)

		// SECURITY: Verify property ownership before calling RPC
		if (query.property_id) {
			this.logger.debug('[ANALYTICS:MAINTENANCE:SECURITY] Verifying property access', {
				user_id,
				property_id: query.property_id
			})

			const { data: property } = await this.getPropertyForUser(
				req,
				query.property_id
			)
			if (!property) {
				this.logger.warn('[ANALYTICS:MAINTENANCE:SECURITY] Property not found', {
					user_id,
					property_id: query.property_id
				})
				throw new BadRequestException('Property not found or access denied')
			}

			this.logger.debug('[ANALYTICS:MAINTENANCE:SECURITY] Property access verified', {
				user_id,
				property_id: query.property_id
			})
		}

		this.logger.debug('[ANALYTICS:MAINTENANCE:STUB] RPC not implemented yet', {
			user_id,
			property_id: query.property_id,
			timeframe: query.timeframe,
			duration_ms: Date.now() - startTime
		})

		// TODO: RPC function 'get_property_maintenance_analytics' does not exist in Supabase schema
		// Once implemented, uncomment and use:
		// const { data, error } = await client.rpc('get_property_maintenance_analytics', {
		//   p_user_id: user_id,
		//   p_property_id: query.property_id,
		//   p_timeframe: query.timeframe || '6m'
		// })

		// Placeholder: Return empty array
		this.logger.log('[ANALYTICS:MAINTENANCE:COMPLETE] Maintenance analytics returning stub',
			{
				user_id,
				resultCount: 0,
				duration_ms: Date.now() - startTime
			}
		)
		return []
	}

	/**
	 * Private helper: Get single property for authenticated user
	 * Verifies ownership and returns property data
	 */
	private async getPropertyForUser(req: AuthenticatedRequest, property_id: string) {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.warn('Property lookup requested without auth token', {
				property_id
			})
			return { data: null }
		}

		const client = this.supabase.getUserClient(token)

		const { data, error } = await client
			.from('properties')
			.select('id')
			.eq('id', property_id)
			.single()

		if (error || !data) {
			this.logger.warn('Property not found or access denied', {
				property_id,
				error
			})
			return { data: null }
		}

		return { data }
	}
}
