/**
 * PropertyAnalyticsService - Consolidated Analytics Service
 *
 * Combines property performance, occupancy, financial, and maintenance analytics
 * into a single service following CLAUDE.md consolidation guidelines.
 *
 * Consolidates:
 * - PropertyAnalyticsService (performance via RPC)
 * - PropertyOccupancyAnalyticsService
 * - PropertyFinancialAnalyticsService
 * - PropertyMaintenanceAnalyticsService
 */
import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseService } from '../../../database/supabase.service'
import { AppLogger } from '../../../logger/app-logger.service'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import { getTokenFromRequest } from '../../../database/auth-token.utils'

// Valid timeframes for analytics queries
const VALID_TIMEFRAMES = ['7d', '30d', '90d', '365d'] as const
const VALID_PERIODS = ['current', 'month', 'quarter', 'year'] as const

// Result types for analytics - exported for controller type annotations
export interface PropertyPerformanceData {
	property_id: string
	property_name: string
	occupancy_rate: number
	total_revenue: number
	total_expenses: number
	net_income: number
	timeframe: string
}

export interface PropertyOccupancyData {
	property_id: string
	property_name: string
	period: string
	occupancy_rate: number
	total_units: number
	occupied_units: number
	vacant_units: number
}

export interface PropertyFinancialData {
	property_id: string
	property_name: string
	timeframe: string
	total_revenue: number
	total_expenses: number
	net_income: number
	profit_margin: number
}

export interface PropertyMaintenanceData {
	property_id: string
	property_name: string
	timeframe: string
	total_requests: number
	completed_requests: number
	total_cost: number
	average_cost_per_request: number
}

// Query types for database results
interface QueryProperty {
	id: string
	name: string
	units?: QueryUnit[]
}

interface QueryUnit {
	id: string
	status: string
	leases?: QueryLease[]
	maintenance_requests?: QueryMaintenanceRequest[]
}

interface QueryLease {
	id: string
	lease_status: string
	start_date: string
	end_date: string
	rent_payments?: QueryPayment[]
}

interface QueryPayment {
	amount: number
	status: string
	paid_date: string | null
}

interface QueryMaintenanceRequest {
	id: string
	status: string
	created_at: string
	estimated_cost: number | null
	actual_cost: number | null
	completed_at: string | null
	expenses?: QueryExpense[]
}

interface QueryExpense {
	amount: number
	expense_date: string
}

// RPC types for performance analytics
interface PropertyPerformanceRpcParams {
	p_user_id: string
	p_property_id: string | null
	p_timeframe: string
	p_limit: number | null
}

interface PropertyPerformanceRpcResult {
	property_id?: string
	property_name?: string
	propertyName?: string
	name?: string
	occupancy_rate?: number
	occupancyRate?: number
	total_revenue?: number
	totalRevenue?: number
	total_expenses?: number
	totalExpenses?: number
	net_income?: number
	netIncome?: number
	timeframe?: string
}

type AnalyticsRpcFn = (
	fn: string,
	params: PropertyPerformanceRpcParams
) => Promise<{ data: PropertyPerformanceRpcResult[] | null; error: unknown }>

@Injectable()
export class PropertyAnalyticsService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	// ============================================
	// PUBLIC API METHODS
	// ============================================

	/**
	 * Get property performance analytics (via RPC)
	 * Performance metrics per property (occupancy, revenue, expenses)
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

		this.validateTimeframe(query.timeframe, user_id, 'PERFORMANCE')

		// SECURITY: Verify property ownership before calling RPC
		if (query.property_id) {
			await this.verifyPropertyAccess(req, query.property_id, 'PERFORMANCE')
		}

		// Get authenticated client
		const client = this.getAuthenticatedClient(req, 'PERFORMANCE')

		// Use type assertion for RPC function not in generated types
		const rpcParams: PropertyPerformanceRpcParams = {
			p_user_id: user_id,
			p_property_id: query.property_id ?? null,
			p_timeframe: query.timeframe,
			p_limit: query.limit ?? null
		}
		const { data, error } = await (client.rpc as unknown as AnalyticsRpcFn)(
			'get_property_performance_analytics',
			rpcParams
		)

		if (error) {
			this.logger.warn('[ANALYTICS:PERFORMANCE] RPC failed', {
				user_id,
				error
			})
			return []
		}

		const toNumber = (value: unknown) =>
			typeof value === 'number' && Number.isFinite(value)
				? value
				: Number(value ?? 0) || 0

		const rawResults: PropertyPerformanceRpcResult[] = data ?? []
		const result: PropertyPerformanceData[] = rawResults
			.filter(item => Boolean(item.property_id))
			.map(item => ({
				property_id: item.property_id as string,
				property_name:
					item.property_name ??
					item.propertyName ??
					item.name ??
					'Unknown property',
				occupancy_rate: toNumber(item.occupancy_rate ?? item.occupancyRate),
				total_revenue: toNumber(item.total_revenue ?? item.totalRevenue),
				total_expenses: toNumber(item.total_expenses ?? item.totalExpenses),
				net_income: toNumber(item.net_income ?? item.netIncome),
				timeframe: item.timeframe ?? query.timeframe
			}))

		this.logger.log(
			'[ANALYTICS:PERFORMANCE:COMPLETE] Performance analytics completed',
			{
				user_id,
				property_id: query.property_id,
				resultCount: result.length,
				duration_ms: Date.now() - startTime
			}
		)
		return result
	}

	/**
	 * Get property occupancy analytics
	 * Occupancy rates and trends over time per property
	 */
	async getPropertyOccupancyAnalytics(
		req: AuthenticatedRequest,
		query: { property_id?: string; period?: string }
	): Promise<PropertyOccupancyData[]> {
		const user_id = req.user.id
		const startTime = Date.now()
		const period = query.period ?? 'current'

		this.logger.log(
			'[ANALYTICS:OCCUPANCY:START] Occupancy analytics request received',
			{
				user_id,
				property_id: query.property_id,
				period
			}
		)

		this.validatePeriod(period, user_id)

		// SECURITY: Verify property ownership before proceeding
		if (query.property_id) {
			await this.verifyPropertyAccess(req, query.property_id, 'OCCUPANCY')
		}

		const client = this.getAuthenticatedClient(req, 'OCCUPANCY')

		// Build query - fetch properties with units and leases
		let propertiesQuery = client.from('properties').select(`
			id,
			name,
			units (
				id,
				status,
				leases (
					id,
					lease_status,
					start_date,
					end_date
				)
			)
		`)

		if (query.property_id) {
			propertiesQuery = propertiesQuery.eq('id', query.property_id)
		}

		const { data: properties, error } = await propertiesQuery

		if (error) {
			this.logger.error('[ANALYTICS:OCCUPANCY] Query failed', {
				user_id,
				error: error.message
			})
			return []
		}

		const result = (properties ?? []).map(property =>
			this.processOccupancyData(property as QueryProperty, period)
		)

		this.logger.log(
			'[ANALYTICS:OCCUPANCY:COMPLETE] Occupancy analytics completed',
			{
				user_id,
				property_id: query.property_id,
				resultCount: result.length,
				duration_ms: Date.now() - startTime
			}
		)

		return result
	}

	/**
	 * Get property financial analytics
	 * Revenue, expenses, and profit metrics per property
	 */
	async getPropertyFinancialAnalytics(
		req: AuthenticatedRequest,
		query: { property_id?: string; timeframe: string }
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

		this.validateTimeframe(query.timeframe, user_id, 'FINANCIAL')

		const { start, end } = this.parseTimeframe(query.timeframe)

		// SECURITY: Verify property ownership before proceeding
		if (query.property_id) {
			await this.verifyPropertyAccess(req, query.property_id, 'FINANCIAL')
		}

		const client = this.getAuthenticatedClient(req, 'FINANCIAL')

		// Build query - fetch properties with units, leases, payments, and maintenance
		let propertiesQuery = client.from('properties').select(`
			id,
			name,
			units (
				id,
				leases (
					id,
					rent_payments (
						amount,
						status,
						paid_date
					)
				),
				maintenance_requests (
					id,
					status,
					estimated_cost,
					actual_cost,
					completed_at,
					expenses (
						amount,
						expense_date
					)
				)
			)
		`)

		if (query.property_id) {
			propertiesQuery = propertiesQuery.eq('id', query.property_id)
		}

		const { data: properties, error } = await propertiesQuery

		if (error) {
			this.logger.error('[ANALYTICS:FINANCIAL] Query failed', {
				user_id,
				error: error.message
			})
			return []
		}

		const result = (properties ?? []).map(property =>
			this.processFinancialData(
				property as QueryProperty,
				start,
				end,
				query.timeframe
			)
		)

		this.logger.log(
			'[ANALYTICS:FINANCIAL:COMPLETE] Financial analytics completed',
			{
				user_id,
				property_id: query.property_id,
				resultCount: result.length,
				duration_ms: Date.now() - startTime
			}
		)

		return result
	}

	/**
	 * Get property maintenance analytics
	 * Maintenance request counts, completion rates, and costs per property
	 */
	async getPropertyMaintenanceAnalytics(
		req: AuthenticatedRequest,
		query: { property_id?: string; timeframe: string }
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

		this.validateTimeframe(query.timeframe, user_id, 'MAINTENANCE')

		const { start, end } = this.parseTimeframe(query.timeframe)

		// SECURITY: Verify property ownership before proceeding
		if (query.property_id) {
			await this.verifyPropertyAccess(req, query.property_id, 'MAINTENANCE')
		}

		const client = this.getAuthenticatedClient(req, 'MAINTENANCE')

		// Build query - fetch properties with units and maintenance requests
		let propertiesQuery = client.from('properties').select(`
			id,
			name,
			units (
				id,
				maintenance_requests (
					id,
					status,
					created_at,
					estimated_cost,
					actual_cost,
					completed_at,
					expenses (
						amount,
						expense_date
					)
				)
			)
		`)

		if (query.property_id) {
			propertiesQuery = propertiesQuery.eq('id', query.property_id)
		}

		const { data: properties, error } = await propertiesQuery

		if (error) {
			this.logger.error('[ANALYTICS:MAINTENANCE] Query failed', {
				user_id,
				error: error.message
			})
			return []
		}

		const result = (properties ?? []).map(property =>
			this.processMaintenanceData(
				property as QueryProperty,
				start,
				end,
				query.timeframe
			)
		)

		this.logger.log(
			'[ANALYTICS:MAINTENANCE:COMPLETE] Maintenance analytics completed',
			{
				user_id,
				property_id: query.property_id,
				resultCount: result.length,
				duration_ms: Date.now() - startTime
			}
		)

		return result
	}

	// ============================================
	// PRIVATE HELPER METHODS
	// ============================================

	/**
	 * Validate timeframe parameter
	 */
	private validateTimeframe(
		timeframe: string,
		user_id: string,
		context: string
	): void {
		if (
			!VALID_TIMEFRAMES.includes(timeframe as (typeof VALID_TIMEFRAMES)[number])
		) {
			this.logger.warn(`[ANALYTICS:${context}:VALIDATION] Invalid timeframe`, {
				user_id,
				timeframe
			})
			throw new BadRequestException(
				`Invalid timeframe. Must be one of: ${VALID_TIMEFRAMES.join(', ')}`
			)
		}
	}

	/**
	 * Validate period parameter
	 */
	private validatePeriod(period: string, user_id: string): void {
		if (!VALID_PERIODS.includes(period as (typeof VALID_PERIODS)[number])) {
			this.logger.warn('[ANALYTICS:OCCUPANCY:VALIDATION] Invalid period', {
				user_id,
				period
			})
			throw new BadRequestException(
				`Invalid period. Must be one of: ${VALID_PERIODS.join(', ')}`
			)
		}
	}

	/**
	 * Parse timeframe string to date range
	 */
	private parseTimeframe(timeframe: string): { start: Date; end: Date } {
		const now = new Date()
		const days = parseInt(timeframe.replace('d', ''), 10)
		const start = new Date(now)
		start.setDate(now.getDate() - days)
		return { start, end: now }
	}

	/**
	 * Get authenticated Supabase client
	 */
	private getAuthenticatedClient(
		req: AuthenticatedRequest,
		context: string
	): SupabaseClient {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.warn(`[ANALYTICS:${context}] No auth token`, {
				user_id: req.user.id
			})
			throw new BadRequestException('Authentication required')
		}
		return this.supabase.getUserClient(token)
	}

	/**
	 * Verify property ownership/access
	 */
	private async verifyPropertyAccess(
		req: AuthenticatedRequest,
		property_id: string,
		context: string
	): Promise<void> {
		this.logger.debug(
			`[ANALYTICS:${context}:SECURITY] Verifying property access`,
			{
				user_id: req.user.id,
				property_id
			}
		)

		const { data: property } = await this.getPropertyForUser(req, property_id)
		if (!property) {
			this.logger.warn(`[ANALYTICS:${context}:SECURITY] Property not found`, {
				user_id: req.user.id,
				property_id
			})
			throw new BadRequestException('Property not found or access denied')
		}

		this.logger.debug(
			`[ANALYTICS:${context}:SECURITY] Property access verified`,
			{
				user_id: req.user.id,
				property_id
			}
		)
	}

	/**
	 * Get single property for authenticated user
	 * Verifies ownership and returns property data
	 */
	private async getPropertyForUser(
		req: AuthenticatedRequest,
		property_id: string
	): Promise<{ data: { id: string } | null }> {
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

	// ============================================
	// DATA PROCESSING METHODS
	// ============================================

	/**
	 * Process property data to calculate occupancy metrics
	 */
	private processOccupancyData(
		property: QueryProperty,
		period: string
	): PropertyOccupancyData {
		const units = property.units || []
		const totalUnits = units.length
		const occupiedUnits = units.filter(unit => {
			const activeLease = unit.leases?.find(
				lease =>
					lease.lease_status === 'active' &&
					new Date(lease.start_date) <= new Date() &&
					new Date(lease.end_date) >= new Date()
			)
			return activeLease
		}).length
		const occupancyRate =
			totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0
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
		property: QueryProperty,
		start: Date,
		end: Date,
		timeframe: string
	): PropertyFinancialData {
		let totalRevenue = 0
		let totalExpenses = 0

		const units = property.units || []
		units.forEach(unit => {
			// Revenue from payments
			unit.leases?.forEach(lease => {
				lease.rent_payments?.forEach(payment => {
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
			unit.maintenance_requests?.forEach(req => {
				if (
					req.completed_at &&
					new Date(req.completed_at) >= start &&
					new Date(req.completed_at) <= end
				) {
					totalExpenses += req.actual_cost || req.estimated_cost || 0
				}
				req.expenses?.forEach(exp => {
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
		property: QueryProperty,
		start: Date,
		end: Date,
		timeframe: string
	): PropertyMaintenanceData {
		let totalRequests = 0
		let completedRequests = 0
		let totalCost = 0

		const units = property.units || []
		units.forEach(unit => {
			unit.maintenance_requests?.forEach(req => {
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
					if (
						req.completed_at &&
						new Date(req.completed_at) >= start &&
						new Date(req.completed_at) <= end
					) {
						totalCost += req.actual_cost || req.estimated_cost || 0
					}
				}
				// Add expenses
				req.expenses?.forEach(exp => {
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

		const averageCostPerRequest =
			totalRequests > 0 ? totalCost / totalRequests : 0

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
}
