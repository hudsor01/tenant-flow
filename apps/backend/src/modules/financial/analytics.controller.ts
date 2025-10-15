import {
	BadRequestException,
	Controller,
	Get,
	Logger,
	Query,
	Req,
	UnauthorizedException
} from '@nestjs/common'
import type {
	DashboardSummary,
	FinancialMetrics,
	Lease,
	PropertyFinancialMetrics
} from '@repo/shared/types/core'
import type { Tables } from '@repo/shared/types/supabase'
import type { Request } from 'express'
import { SupabaseService } from '../../database/supabase.service'

type ExpenseRecord = Tables<'expense'>

/**
 * Financial Analytics Controller - Ultra-Native Implementation
 * Direct Supabase queries, no repository dependencies
 */
@Controller('financial/analytics')
export class FinancialAnalyticsController {
	private readonly logger = new Logger(FinancialAnalyticsController.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Helper method to get unit IDs for a user (via property ownership)
	 */
	private async getUserUnitIds(userId: string): Promise<string[]> {
		const client = this.supabaseService.getAdminClient()
		const { data: properties } = await client
			.from('property')
			.select('id')
			.eq('owner_id', userId)
		const propertyIds = properties?.map(p => p.id) || []
		if (propertyIds.length === 0) return []

		const { data: units } = await client
			.from('unit')
			.select('id')
			.in('property_id', propertyIds)
		return units?.map(u => u.id) || []
	}

	/**
	 * Get revenue trends - DIRECT TABLE QUERIES
	 *  - Aggregates data from Supabase tables in TypeScript
	 */
	@Get('revenue-trends')
	async getRevenueTrends(
		@Query('year') year: string,
		@Query('timeRange') _timeRange = '12m',
		@Req() req: Request
	): Promise<FinancialMetrics[]> {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new UnauthorizedException('User not authenticated')
		}

		try {
			const targetYear = year ? parseInt(year, 10) : new Date().getFullYear()

			// Validate year is reasonable (not too far in past/future)
			const currentYear = new Date().getFullYear()
			if (
				isNaN(targetYear) ||
				targetYear < 2000 ||
				targetYear > currentYear + 5
			) {
				throw new BadRequestException(
					`Invalid year: ${year}. Must be between 2000 and ${currentYear + 5}`
				)
			}

			this.logger.log('Getting revenue trends via direct Supabase queries', {
				userId: user.id,
				targetYear
			})

			const yearStart = new Date(targetYear, 0, 1)
			const yearEnd = new Date(targetYear + 1, 0, 1)

			const client = this.supabaseService.getAdminClient()
			const propertyContext = await this.buildPropertyContext(user.id)
			const unitIds = await this.getUserUnitIds(user.id)

			const [leasesData, expenses] = await Promise.all([
				unitIds.length > 0
					? client.from('lease').select('*').in('unit_id', unitIds)
					: Promise.resolve({ data: [] }),
				this.fetchExpensesForProperties(
					propertyContext.propertyIds,
					yearStart,
					yearEnd
				)
			])
			const leases = leasesData.data || []

			const revenueByMonth = this.calculateMonthlyRevenue(leases, targetYear)
			const expensesByMonth = this.groupExpensesByMonth(expenses)

			const monthlyMetrics: FinancialMetrics[] = []
			for (let month = 0; month < 12; month++) {
				const monthKey = this.buildMonthKey(targetYear, month)
				const revenue = revenueByMonth.get(monthKey) ?? 0
				const monthlyExpenses = expensesByMonth.get(monthKey) ?? 0
				const netIncome = revenue - monthlyExpenses
				const profitMargin =
					revenue > 0 ? Number(((netIncome / revenue) * 100).toFixed(2)) : 0

				monthlyMetrics.push({
					period: monthKey,
					revenue,
					expenses: monthlyExpenses,
					netIncome,
					profitMargin
				})
			}

			return monthlyMetrics
		} catch (error) {
			this.logger.error(
				'Failed to get revenue trends via direct Supabase queries',
				{
					error: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
					userId: user.id,
					year
				}
			)

			// Re-throw validation errors with their messages, sanitize other errors
			if (error instanceof BadRequestException) {
				throw error
			}
			// Generic error message to prevent exposing internal details
			throw new BadRequestException('Failed to fetch revenue trends')
		}
	}

	/**
	 * Get dashboard financial metrics - DIRECT TABLE QUERIES
	 *  - Aggregates data from Supabase tables in TypeScript
	 */
	@Get('dashboard-metrics')
	async getDashboardMetrics(@Req() req: Request): Promise<DashboardSummary> {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new UnauthorizedException('User not authenticated')
		}

		try {
			this.logger.log(
				'Getting dashboard financial metrics via direct Supabase queries',
				{
					userId: user.id
				}
			)

			const client = this.supabaseService.getAdminClient()
			const propertyContext = await this.buildPropertyContext(user.id)
			const unitIds = await this.getUserUnitIds(user.id)

			const [propertiesData, unitsData, leasesData, expenses] =
				await Promise.all([
					client.from('property').select('id').eq('owner_id', user.id),
					client
						.from('unit')
						.select('id, status')
						.in('property_id', propertyContext.propertyIds),
					unitIds.length > 0
						? client.from('lease').select('*').in('unit_id', unitIds)
						: Promise.resolve({ data: [] }),
					this.fetchExpensesForProperties(
						propertyContext.propertyIds,
						this.subtractMonths(12),
						new Date()
					)
				])

			const properties = propertiesData.data || []
			const units = unitsData.data || []
			const leaseAnalytics = leasesData.data || []
			const propertyStats = { total: properties.length }
			const unitStats = {
				occupancyRate:
					units.length > 0
						? Math.round(
								(units.filter(
									(u: { id: string; status: string }) => u.status === 'OCCUPIED'
								).length /
									units.length) *
									100
							)
						: 0
			}

			const totalRevenue = leaseAnalytics.reduce(
				(sum: number, lease: Lease) => sum + (lease.rentAmount || 0),
				0
			)
			const totalExpenses = this.sumExpenses(expenses)
			const netIncome = totalRevenue - totalExpenses
			const occupancyRate = unitStats.occupancyRate || 0
			const avgRoi =
				totalRevenue > 0
					? Number(((netIncome / totalRevenue) * 100).toFixed(2))
					: 0

			return {
				totalRevenue,
				totalExpenses,
				netIncome,
				propertyCount: propertyStats.total,
				occupancyRate,
				avgRoi
			}
		} catch (error) {
			this.logger.error(
				'Failed to get dashboard financial metrics via direct Supabase queries',
				{
					error: error instanceof Error ? error.message : String(error),
					userId: user.id
				}
			)
			throw new BadRequestException('Failed to fetch dashboard metrics')
		}
	}

	/**
	 * Get expense breakdown - DIRECT TABLE QUERIES
	 *  - Aggregates expense data from Supabase tables in TypeScript
	 */
	@Get('expense-breakdown')
	async getExpenseBreakdown(
		@Query('year') year: string,
		@Req() req: Request
	): Promise<FinancialMetrics[]> {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new UnauthorizedException('User not authenticated')
		}

		try {
			const targetYear = year ? parseInt(year, 10) : new Date().getFullYear()

			this.logger.log('Getting expense breakdown via direct Supabase queries', {
				userId: user.id,
				targetYear
			})

			const client = this.supabaseService.getAdminClient()
			const yearStart = new Date(targetYear, 0, 1)
			const yearEnd = new Date(targetYear + 1, 0, 1)
			const propertyContext = await this.buildPropertyContext(user.id)
			const unitIds = await this.getUserUnitIds(user.id)

			const [leasesData, expenses] = await Promise.all([
				unitIds.length > 0
					? client.from('lease').select('*').in('unit_id', unitIds)
					: Promise.resolve({ data: [] }),
				this.fetchExpensesForProperties(
					propertyContext.propertyIds,
					yearStart,
					yearEnd
				)
			])
			const leaseAnalytics = leasesData.data || []

			const revenueByMonth = this.calculateMonthlyRevenue(
				leaseAnalytics,
				targetYear
			)
			const expensesByMonth = this.groupExpensesByMonth(expenses)
			const monthlyExpenses: FinancialMetrics[] = []

			for (let month = 0; month < 12; month++) {
				const monthKey = this.buildMonthKey(targetYear, month)
				const revenue = revenueByMonth.get(monthKey) ?? 0
				const totalExpenses = expensesByMonth.get(monthKey) ?? 0
				const netIncome = revenue - totalExpenses
				const profitMargin =
					revenue > 0 ? Number(((netIncome / revenue) * 100).toFixed(2)) : 0

				monthlyExpenses.push({
					period: monthKey,
					revenue,
					expenses: totalExpenses,
					netIncome,
					profitMargin
				})
			}

			return monthlyExpenses
		} catch (error) {
			this.logger.error(
				'Failed to get expense breakdown via direct Supabase queries',
				{
					error: error instanceof Error ? error.message : String(error),
					userId: user.id,
					year
				}
			)
			throw new BadRequestException('Failed to fetch expense breakdown')
		}
	}

	/**
	 * Get Net Operating Income - DIRECT TABLE QUERIES
	 *  - Calculates NOI from Supabase table data in TypeScript
	 */
	@Get('net-operating-income')
	async getNetOperatingIncome(
		@Query('period') _period = 'monthly',
		@Req() req: Request
	): Promise<PropertyFinancialMetrics[]> {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new UnauthorizedException('User not authenticated')
		}

		try {
			this.logger.log(
				'Getting Net Operating Income via direct Supabase queries',
				{
					userId: user.id,
					period: _period
				}
			)

			const client = this.supabaseService.getAdminClient()
			const propertyContext = await this.buildPropertyContext(user.id)
			const unitIds = await this.getUserUnitIds(user.id)

			const [unitsData, leasesData, expenses] = await Promise.all([
				client
					.from('unit')
					.select('*')
					.in('property_id', propertyContext.propertyIds),
				unitIds.length > 0
					? client.from('lease').select('*').in('unit_id', unitIds)
					: Promise.resolve({ data: [] }),
				this.fetchExpensesForProperties(
					propertyContext.propertyIds,
					this.subtractMonths(12),
					new Date()
				)
			])
			const units = unitsData.data || []
			const leases = leasesData.data || []

			const unitToProperty = new Map<string, string>()
			for (const unit of units) {
				if (unit.id && unit.propertyId) {
					unitToProperty.set(unit.id, unit.propertyId)
				}
			}

			const revenueByProperty = new Map<string, number>()
			for (const lease of leases) {
				const propertyId = unitToProperty.get(lease.unitId ?? '')
				if (!propertyId) {
					continue
				}
				revenueByProperty.set(
					propertyId,
					(revenueByProperty.get(propertyId) ?? 0) + (lease.rentAmount || 0)
				)
			}

			const expensesByProperty = this.groupExpensesByProperty(expenses)
			const propertyNOI: PropertyFinancialMetrics[] = []

			const propertiesToEvaluate = new Set<string>([
				...propertyContext.propertyIds,
				...revenueByProperty.keys(),
				...expensesByProperty.keys()
			])

			for (const propertyId of propertiesToEvaluate) {
				const revenue = revenueByProperty.get(propertyId) ?? 0
				const totalExpenses = expensesByProperty.get(propertyId) ?? 0
				if (revenue === 0 && totalExpenses === 0) {
					continue
				}
				const netOperatingIncome = revenue - totalExpenses
				const propertyName =
					propertyContext.propertyMap.get(propertyId) ?? propertyId
				const roi =
					revenue > 0
						? Number(((netOperatingIncome / revenue) * 100).toFixed(2))
						: 0

				propertyNOI.push({
					propertyId,
					propertyName,
					revenue,
					expenses: totalExpenses,
					netIncome: netOperatingIncome,
					roi,
					period: _period
				})
			}

			return propertyNOI
		} catch (error) {
			this.logger.error(
				'Failed to get Net Operating Income via direct Supabase queries',
				{
					error: error instanceof Error ? error.message : String(error),
					userId: user.id,
					period: _period
				}
			)
			throw new BadRequestException('Failed to fetch NOI data')
		}
	}

	private async buildPropertyContext(userId: string) {
		const client = this.supabaseService.getAdminClient()
		const { data: properties } = await client
			.from('property')
			.select('id, name')
			.eq('owner_id', userId)

		const propertyMap = new Map<string, string>()
		const propertyIds: string[] = []
		for (const property of properties || []) {
			propertyIds.push(property.id)
			propertyMap.set(property.id, property.name)
		}
		return { propertyIds, propertyMap }
	}

	private async fetchExpensesForProperties(
		propertyIds: string[],
		start?: Date,
		end?: Date
	) {
		if (!propertyIds.length) {
			return [] as ExpenseRecord[]
		}

		try {
			let query = this.supabaseService
				.getAdminClient()
				.from('expense')
				.select('*')
				.in('propertyId', propertyIds)

			if (start) {
				query = query.gte('date', start.toISOString())
			}
			if (end) {
				query = query.lte('date', end.toISOString())
			}

			const { data, error } = await query
			if (error) {
				this.logger.error('Failed to fetch expenses for properties', {
					error: error.message,
					propertyIds,
					start: start?.toISOString(),
					end: end?.toISOString()
				})
				return []
			}

			return (data as ExpenseRecord[]) ?? []
		} catch (error) {
			this.logger.error('Unexpected error fetching expenses for properties', {
				error: error instanceof Error ? error.message : String(error),
				propertyIds,
				start: start?.toISOString(),
				end: end?.toISOString()
			})
			return []
		}
	}

	private groupExpensesByMonth(expenses: ExpenseRecord[]) {
		const map = new Map<string, number>()
		for (const expense of expenses) {
			if (!expense.date) {
				continue
			}
			const expenseDate = new Date(expense.date)
			const key = this.buildMonthKey(
				expenseDate.getFullYear(),
				expenseDate.getMonth()
			)
			map.set(key, (map.get(key) ?? 0) + (expense.amount ?? 0))
		}
		return map
	}

	private groupExpensesByProperty(expenses: ExpenseRecord[]) {
		const map = new Map<string, number>()
		for (const expense of expenses) {
			if (!expense.propertyId) {
				continue
			}
			map.set(
				expense.propertyId,
				(map.get(expense.propertyId) ?? 0) + (expense.amount ?? 0)
			)
		}
		return map
	}

	private calculateMonthlyRevenue(leases: Lease[], targetYear: number) {
		const revenueByMonth = new Map<string, number>()
		for (let month = 0; month < 12; month++) {
			const monthStart = new Date(targetYear, month, 1)
			const monthEnd = new Date(targetYear, month + 1, 0)
			const monthKey = this.buildMonthKey(targetYear, month)

			let monthlyRevenue = 0
			for (const lease of leases) {
				const startDate = new Date(lease.startDate)
				const endDate = new Date(lease.endDate)
				if (startDate <= monthEnd && endDate >= monthStart) {
					monthlyRevenue += lease.rentAmount || 0
				}
			}

			revenueByMonth.set(monthKey, monthlyRevenue)
		}

		return revenueByMonth
	}

	private sumExpenses(expenses: ExpenseRecord[]) {
		return expenses.reduce((sum, expense) => sum + (expense.amount ?? 0), 0)
	}

	private buildMonthKey(year: number, monthIndex: number) {
		const monthNumber = monthIndex + 1
		return `${year}-${monthNumber.toString().padStart(2, '0')}`
	}

	private subtractMonths(months: number) {
		const date = new Date()
		date.setHours(0, 0, 0, 0)
		date.setMonth(date.getMonth() - months)
		return date
	}
}
