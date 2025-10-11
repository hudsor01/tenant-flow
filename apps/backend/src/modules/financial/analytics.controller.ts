import {
	BadRequestException,
	Controller,
	Get,
	Inject,
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
import type { ILeasesRepository } from '../../repositories/interfaces/leases-repository.interface'
import type { IPropertiesRepository } from '../../repositories/interfaces/properties-repository.interface'
import type { IUnitsRepository } from '../../repositories/interfaces/units-repository.interface'
import { REPOSITORY_TOKENS } from '../../repositories/repositories.module'

type ExpenseRecord = Tables<'expense'>

/**
 * Financial Analytics Controller - Repository Pattern Implementation
 *  - All calculations via repository using direct table queries
 * Aggregates data from multiple repositories for financial metrics
 */
@Controller('financial/analytics')
export class FinancialAnalyticsController {
	private readonly logger = new Logger(FinancialAnalyticsController.name)

	constructor(
		private readonly supabaseService: SupabaseService,
		@Inject(REPOSITORY_TOKENS.PROPERTIES)
		private readonly propertiesRepository: IPropertiesRepository,
		@Inject(REPOSITORY_TOKENS.LEASES)
		private readonly leasesRepository: ILeasesRepository,
		@Inject(REPOSITORY_TOKENS.UNITS)
		private readonly unitsRepository: IUnitsRepository
	) {}

	/**
	 * Get revenue trends via repositories - DIRECT TABLE QUERIES
	 *  - Aggregates data from multiple repositories in TypeScript
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

			this.logger.log('Getting revenue trends via repositories', {
				userId: user.id,
				targetYear
			})

			const yearStart = new Date(targetYear, 0, 1)
			const yearEnd = new Date(targetYear + 1, 0, 1)

			const propertyContext = await this.buildPropertyContext(user.id)
			const [leases, expenses] = await Promise.all([
				this.leasesRepository.getAnalytics(user.id, { timeframe: '12m' }),
				this.fetchExpensesForProperties(
					propertyContext.propertyIds,
					yearStart,
					yearEnd
				)
			])

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
			this.logger.error('Failed to get revenue trends via repositories', {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				userId: user.id,
				year
			})

			// Re-throw validation errors with their messages, sanitize other errors
			if (error instanceof BadRequestException) {
				throw error
			}
			// Generic error message to prevent exposing internal details
			throw new BadRequestException('Failed to fetch revenue trends')
		}
	}

	/**
	 * Get dashboard financial metrics via repositories - DIRECT TABLE QUERIES
	 *  - Aggregates data from multiple repositories in TypeScript
	 */
	@Get('dashboard-metrics')
	async getDashboardMetrics(@Req() req: Request): Promise<DashboardSummary> {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new UnauthorizedException('User not authenticated')
		}

		try {
			this.logger.log('Getting dashboard financial metrics via repositories', {
				userId: user.id
			})

			const propertyContext = await this.buildPropertyContext(user.id)
			const [propertyStats, unitStats, leaseAnalytics, expenses] =
				await Promise.all([
					this.propertiesRepository.getStats(user.id),
					this.unitsRepository.getStats(user.id),
					this.leasesRepository.getAnalytics(user.id, { timeframe: '12m' }),
					this.fetchExpensesForProperties(
						propertyContext.propertyIds,
						this.subtractMonths(12),
						new Date()
					)
				])

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
				'Failed to get dashboard financial metrics via repositories',
				{
					error: error instanceof Error ? error.message : String(error),
					userId: user.id
				}
			)
			throw new BadRequestException('Failed to fetch dashboard metrics')
		}
	}

	/**
	 * Get expense breakdown via repositories - DIRECT TABLE QUERIES
	 *  - Aggregates expense data from maintenance in TypeScript
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

			this.logger.log('Getting expense breakdown via repositories', {
				userId: user.id,
				targetYear
			})

			const yearStart = new Date(targetYear, 0, 1)
			const yearEnd = new Date(targetYear + 1, 0, 1)
			const propertyContext = await this.buildPropertyContext(user.id)
			const [leaseAnalytics, expenses] = await Promise.all([
				this.leasesRepository.getAnalytics(user.id, { timeframe: '12m' }),
				this.fetchExpensesForProperties(
					propertyContext.propertyIds,
					yearStart,
					yearEnd
				)
			])

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
			this.logger.error('Failed to get expense breakdown via repositories', {
				error: error instanceof Error ? error.message : String(error),
				userId: user.id,
				year
			})
			throw new BadRequestException('Failed to fetch expense breakdown')
		}
	}

	/**
	 * Get Net Operating Income via repositories - DIRECT TABLE QUERIES
	 *  - Calculates NOI from property data in TypeScript
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
			this.logger.log('Getting Net Operating Income via repositories', {
				userId: user.id,
				period: _period
			})

			const propertyContext = await this.buildPropertyContext(user.id)
			const [units, leases, expenses] = await Promise.all([
				this.unitsRepository.getAnalytics(user.id, { timeframe: '12m' }),
				this.leasesRepository.getAnalytics(user.id, { timeframe: '12m' }),
				this.fetchExpensesForProperties(
					propertyContext.propertyIds,
					this.subtractMonths(12),
					new Date()
				)
			])

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
			this.logger.error('Failed to get Net Operating Income via repositories', {
				error: error instanceof Error ? error.message : String(error),
				userId: user.id,
				period: _period
			})
			throw new BadRequestException('Failed to fetch NOI data')
		}
	}

	private async buildPropertyContext(userId: string) {
		const properties = await this.propertiesRepository.findByUserId(userId)
		const propertyMap = new Map<string, string>()
		const propertyIds: string[] = []
		for (const property of properties) {
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
