import {
	BadRequestException,
	Injectable,
	Logger,
	Optional
} from '@nestjs/common'
import type { Request } from 'express'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import { SupabaseService } from '../../../database/supabase.service'
import {
  PropertyPerformanceData,
  PropertyOccupancyData,
  PropertyFinancialData,
  PropertyMaintenanceData,
  QueryProperty,
  DetailedQueryProperty,
  DetailedQueryUnit,
  DetailedQueryLease,
  MaintenanceQueryProperty
} from '@repo/shared/src/types/financial-statements.js'

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
	 * Parse timeframe string to date range
	 */
	private parseTimeframe(timeframe: string): { start: Date; end: Date } {
		const now = new Date()
		const days = parseInt(timeframe.replace('d', ''))
		const start = new Date(now)
		start.setDate(now.getDate() - days)
		return { start, end: now }
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
	): Promise<PropertyPerformanceData[]> {
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

		// Get token and client
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.warn('[ANALYTICS:PERFORMANCE] No auth token', { user_id })
			throw new BadRequestException('Authentication required')
		}
		const client = this.supabase.getUserClient(token)

		// Parse timeframe
		const { start, end } = this.parseTimeframe(query.timeframe)

		let result: PropertyPerformanceData[]

		if (query.property_id) {
			// Single property
			const { data: propertyData, error } = await client
				.from('properties')
				.select(`
					id, name,
					units (
						id, status,
						leases (
							id, lease_status, start_date, end_date,
							rent_payments (amount, status, paid_date)
						),
						maintenance_requests (
							id, status, created_at, estimated_cost, actual_cost, completed_at,
							expenses (amount, expense_date)
						)
					)
				`)
				.eq('id', query.property_id)
				.single()

			if (error || !propertyData) {
				this.logger.warn('[ANALYTICS:PERFORMANCE] Property not found', {
					user_id,
					property_id: query.property_id,
					error
				})
				return []
			}

			result = [this.processPropertyData(propertyData, start, end, query.timeframe)]
		} else {
			// All properties
			const { data: propertiesData, error } = await client
				.from('properties')
				.select(`
					id, name,
					units (
						id, status,
						leases (
							id, lease_status, start_date, end_date,
							rent_payments (amount, status, paid_date)
						),
						maintenance_requests (
							id, status, created_at, estimated_cost, actual_cost, completed_at,
							expenses (amount, expense_date)
						)
					)
				`)
				.limit(query.limit || 50)

			if (error || !propertiesData) {
				this.logger.warn('[ANALYTICS:PERFORMANCE] Failed to fetch properties', {
					user_id,
					error
				})
				return []
			}

			result = propertiesData.map(p => this.processPropertyData(p, start, end, query.timeframe))
		}

		this.logger.log('[ANALYTICS:PERFORMANCE:COMPLETE] Performance analytics completed', {
			user_id,
			property_id: query.property_id,
			resultCount: result.length,
			duration_ms: Date.now() - startTime
		})
		return result
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
	): Promise<PropertyOccupancyData[]> {
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

		// Get token and client
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.warn('[ANALYTICS:OCCUPANCY] No auth token', { user_id })
			throw new BadRequestException('Authentication required')
		}
		const client = this.supabase.getUserClient(token)

		let result: PropertyOccupancyData[]

		if (query.property_id) {
			// Single property
			const { data: propertyData, error } = await client
				.from('properties')
				.select(`
					id, name,
					units (
						id, status,
						leases (
							id, lease_status, start_date, end_date
						)
					)
				`)
				.eq('id', query.property_id)
				.single()

			if (error || !propertyData) {
				this.logger.warn('[ANALYTICS:OCCUPANCY] Property not found', {
					user_id,
					property_id: query.property_id,
					error
				})
				return []
			}

			result = [this.processOccupancyData(propertyData, query.period || 'current')]
		} else {
			// All properties
			const { data: propertiesData, error } = await client
				.from('properties')
				.select(`
					id, name,
					units (
						id, status,
						leases (
							id, lease_status, start_date, end_date
						)
					)
				`)

			if (error || !propertiesData) {
				this.logger.warn('[ANALYTICS:OCCUPANCY] Failed to fetch properties', {
					user_id,
					error
				})
				return []
			}

			result = propertiesData.map(p => this.processOccupancyData(p, query.period || 'current'))
		}

		this.logger.log('[ANALYTICS:OCCUPANCY:COMPLETE] Occupancy analytics completed', {
			user_id,
			property_id: query.property_id,
			resultCount: result.length,
			duration_ms: Date.now() - startTime
		})
		return result
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
	): Promise<PropertyFinancialData[]> {
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

		// Get token and client
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.warn('[ANALYTICS:FINANCIAL] No auth token', { user_id })
			throw new BadRequestException('Authentication required')
		}
		const client = this.supabase.getUserClient(token)

		// Parse timeframe
		const timeframe = query.timeframe || '30d'
		const { start, end } = this.parseTimeframe(timeframe)

		let result: PropertyFinancialData[]

		if (query.property_id) {
			// Single property
			const { data: propertyData, error } = await client
				.from('properties')
				.select(`
					id, name,
					units (
						id, status,
						leases (
							id, lease_status, start_date, end_date,
							rent_payments (amount, status, paid_date)
						),
						maintenance_requests (
							id, status, created_at, estimated_cost, actual_cost, completed_at,
							expenses (amount, expense_date)
						)
					)
				`)
				.eq('id', query.property_id)
				.single()

			if (error || !propertyData) {
				this.logger.warn('[ANALYTICS:FINANCIAL] Property not found', {
					user_id,
					property_id: query.property_id,
					error
				})
				return []
			}

			result = [this.processFinancialData(propertyData, start, end, timeframe)]
		} else {
			// All properties
			const { data: propertiesData, error } = await client
				.from('properties')
				.select(`
					id, name,
					units (
						id, status,
						leases (
							id, lease_status, start_date, end_date,
							rent_payments (amount, status, paid_date)
						),
						maintenance_requests (
							id, status, created_at, estimated_cost, actual_cost, completed_at,
							expenses (amount, expense_date)
						)
					)
				`)

			if (error || !propertiesData) {
				this.logger.warn('[ANALYTICS:FINANCIAL] Failed to fetch properties', {
					user_id,
					error
				})
				return []
			}

			result = propertiesData.map(p => this.processFinancialData(p, start, end, timeframe))
		}

		this.logger.log('[ANALYTICS:FINANCIAL:COMPLETE] Financial analytics completed', {
			user_id,
			property_id: query.property_id,
			resultCount: result.length,
			duration_ms: Date.now() - startTime
		})
		return result
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
	): Promise<PropertyMaintenanceData[]> {
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

		// Get token and client
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.warn('[ANALYTICS:MAINTENANCE] No auth token', { user_id })
			throw new BadRequestException('Authentication required')
		}
		const client = this.supabase.getUserClient(token)

		// Parse timeframe
		const timeframe = query.timeframe || '30d'
		const { start, end } = this.parseTimeframe(timeframe)

		let result: PropertyMaintenanceData[]

		if (query.property_id) {
			// Single property
			const { data: propertyData, error } = await client
				.from('properties')
				.select(`
					id, name,
					units (
						id,
						maintenance_requests (
							id, status, created_at, estimated_cost, actual_cost, completed_at,
							expenses (amount, expense_date)
						)
					)
				`)
				.eq('id', query.property_id)
				.single()

			if (error || !propertyData) {
				this.logger.warn('[ANALYTICS:MAINTENANCE] Property not found', {
					user_id,
					property_id: query.property_id,
					error
				})
				return []
			}

			result = [this.processMaintenanceData(propertyData, start, end, timeframe)]
		} else {
			// All properties
			const { data: propertiesData, error } = await client
				.from('properties')
				.select(`
					id, name,
					units (
						id,
						maintenance_requests (
							id, status, created_at, estimated_cost, actual_cost, completed_at,
							expenses (amount, expense_date)
						)
					)
				`)

			if (error || !propertiesData) {
				this.logger.warn('[ANALYTICS:MAINTENANCE] Failed to fetch properties', {
					user_id,
					error
				})
				return []
			}

			result = propertiesData.map(p => this.processMaintenanceData(p, start, end, timeframe))
		}

		this.logger.log('[ANALYTICS:MAINTENANCE:COMPLETE] Maintenance analytics completed', {
			user_id,
			property_id: query.property_id,
			resultCount: result.length,
			duration_ms: Date.now() - startTime
		})
		return result
	}

	/**
	 * Process property data to calculate performance metrics
	 */
	private processPropertyData(
		property: DetailedQueryProperty,
		start: Date,
		end: Date,
		timeframe: string
	): PropertyPerformanceData {
		const units = property.units || []
		const totalUnits = units.length
		const occupiedUnits = units.filter((unit: DetailedQueryUnit) => {
			const activeLease = unit.leases?.find((lease: DetailedQueryLease) =>
				lease.lease_status === 'active' &&
				new Date(lease.start_date) <= new Date() &&
				new Date(lease.end_date) >= new Date()
			)
			return activeLease
		}).length
		const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0

		let totalRevenue = 0
		let totalExpenses = 0

		units.forEach((unit: DetailedQueryUnit) => {
			// Revenue from payments
			unit.leases?.forEach((lease: DetailedQueryLease) => {
				lease.rent_payments?.forEach((payment) => {
					if (
						payment.status === 'succeeded' &&
						payment.paid_date &&
						new Date(payment.paid_date) >= start &&
						new Date(payment.paid_date) <= end
					) {
						totalRevenue += payment.amount || 0
					}
				})
			})

			// Expenses from maintenance
			unit.maintenance_requests?.forEach((req) => {
				if (
					req.completed_at &&
					new Date(req.completed_at) >= start &&
					new Date(req.completed_at) <= end
				) {
					totalExpenses += req.actual_cost || req.estimated_cost || 0
				}
				req.expenses?.forEach((exp) => {
					if (
						exp.expense_date &&
						new Date(exp.expense_date) >= start &&
						new Date(exp.expense_date) <= end
					) {
						totalExpenses += exp.amount
					}
				})
			})
		})

		const netIncome = totalRevenue - totalExpenses

		return {
			property_id: property.id,
			property_name: property.name,
			occupancy_rate: occupancyRate,
			total_revenue: totalRevenue / 100, // Convert cents to dollars
			total_expenses: totalExpenses / 100,
			net_income: netIncome / 100,
			timeframe
		}
	}

	/**
	 * Process property data to calculate occupancy metrics
	 */
	private processOccupancyData(property: QueryProperty, period: string): PropertyOccupancyData {
		const units = property.units || []
		const totalUnits = units.length
		const occupiedUnits = units.filter((unit) => {
			const activeLease = unit.leases?.find((lease) =>
				lease.lease_status === 'active' &&
				new Date(lease.start_date) <= new Date() &&
				new Date(lease.end_date) >= new Date()
			)
			return activeLease
		}).length
		const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0
		const vacantUnits = totalUnits - occupiedUnits

		return {
			property_id: property.id,
			property_name: property.name,
			period,
			occupancy_rate: occupancyRate,
			total_units: totalUnits,
			occupied_units: occupiedUnits,
			vacant_units: vacantUnits
		}
	}

	/**
	 * Process property data to calculate financial metrics
	 */
	private processFinancialData(
		property: DetailedQueryProperty,
		start: Date,
		end: Date,
		timeframe: string
	): PropertyFinancialData {
		let totalRevenue = 0
		let totalExpenses = 0

		const units = property.units || []
		units.forEach((unit: DetailedQueryUnit) => {
			// Revenue from payments
			unit.leases?.forEach((lease: DetailedQueryLease) => {
				lease.rent_payments?.forEach((payment) => {
					if (
						payment.status === 'succeeded' &&
						payment.paid_date &&
						new Date(payment.paid_date) >= start &&
						new Date(payment.paid_date) <= end
					) {
						totalRevenue += payment.amount || 0
					}
				})
			})

			// Expenses from maintenance
			unit.maintenance_requests?.forEach((req) => {
				if (
					req.completed_at &&
					new Date(req.completed_at) >= start &&
					new Date(req.completed_at) <= end
				) {
					totalExpenses += req.actual_cost || req.estimated_cost || 0
				}
				req.expenses?.forEach((exp) => {
					if (
						exp.expense_date &&
						new Date(exp.expense_date) >= start &&
						new Date(exp.expense_date) <= end
					) {
						totalExpenses += exp.amount || 0
					}
				})
			})
		})

		const netIncome = totalRevenue - totalExpenses
		const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0

		return {
			property_id: property.id,
			property_name: property.name,
			timeframe,
			total_revenue: totalRevenue / 100,
			total_expenses: totalExpenses / 100,
			net_income: netIncome / 100,
			profit_margin: profitMargin
		}
	}

	/**
	 * Process property data to calculate maintenance metrics
	 */
	private processMaintenanceData(
		property: MaintenanceQueryProperty,
		start: Date,
		end: Date,
		timeframe: string
	): PropertyMaintenanceData {
		let totalRequests = 0
		let completedRequests = 0
		let totalCost = 0

		const units = property.units || []
		units.forEach((unit) => {
			unit.maintenance_requests?.forEach((req) => {
				// Count requests in timeframe
				if (
					req.created_at &&
					new Date(req.created_at) >= start &&
					new Date(req.created_at) <= end
				) {
					totalRequests++
					if (req.status === 'completed') {
						completedRequests++
					}
					// Add costs
					if (req.completed_at && new Date(req.completed_at) >= start && new Date(req.completed_at) <= end) {
						totalCost += req.actual_cost || req.estimated_cost || 0
					}
				}
				// Add expenses
				req.expenses?.forEach((exp) => {
					if (
						exp.expense_date &&
						new Date(exp.expense_date) >= start &&
						new Date(exp.expense_date) <= end
					) {
						totalCost += exp.amount || 0
					}
				})
			})
		})

		const averageCostPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0

		return {
			property_id: property.id,
			property_name: property.name,
			timeframe,
			total_requests: totalRequests,
			completed_requests: completedRequests,
			total_cost: totalCost / 100,
			average_cost_per_request: averageCostPerRequest / 100
		}
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
