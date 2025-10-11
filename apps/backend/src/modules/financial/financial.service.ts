import { Inject, Injectable, Logger } from '@nestjs/common'
import type {
	FinancialMetrics,
	Lease,
	PropertyFinancialMetrics
} from '@repo/shared/types/core'
import type { Tables } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'
import type { ILeasesRepository } from '../../repositories/interfaces/leases-repository.interface'
import type { IMaintenanceRepository } from '../../repositories/interfaces/maintenance-repository.interface'
import type { IPropertiesRepository } from '../../repositories/interfaces/properties-repository.interface'
import type { IUnitsRepository } from '../../repositories/interfaces/units-repository.interface'
import { REPOSITORY_TOKENS } from '../../repositories/repositories.module'

type ExpenseRecord = Tables<'expense'>

@Injectable()
export class FinancialService {
	private readonly logger = new Logger(FinancialService.name)

	constructor(
		@Inject(REPOSITORY_TOKENS.PROPERTIES)
		private readonly propertiesRepository: IPropertiesRepository,
		@Inject(REPOSITORY_TOKENS.LEASES)
		private readonly leasesRepository: ILeasesRepository,
		@Inject(REPOSITORY_TOKENS.UNITS)
		private readonly unitsRepository: IUnitsRepository,
		@Inject(REPOSITORY_TOKENS.MAINTENANCE)
		private readonly maintenanceRepository: IMaintenanceRepository,
		private readonly supabaseService: SupabaseService
	) {}

	/**
	 * Get expense summary - replaces get_expense_summary function
	 * Uses repository pattern instead of database function
	 */
	async getExpenseSummary(
		userId: string,
		year?: number
	): Promise<Record<string, unknown>> {
		try {
			const targetYear = year || new Date().getFullYear()
			this.logger.log('Getting expense summary via repositories', {
				userId,
				targetYear
			})

			const propertyIds = await this.getUserPropertyIds(userId)
			const { startDate, endDate } = this.calculateYearRange(targetYear)
			const expenses = await this.fetchExpenses(propertyIds, startDate, endDate)

			const totalExpenses = expenses.reduce(
				(sum, expense) => sum + (expense.amount ?? 0),
				0
			)
			const expensesByCategory: Record<string, number> = {}
			for (const expense of expenses) {
				const category = expense.category || 'General'
				expensesByCategory[category] =
					(expensesByCategory[category] || 0) + (expense.amount ?? 0)
			}

			return {
				totalExpenses,
				expensesByCategory,
				expenseCount: expenses.length,
				averageExpense:
					expenses.length > 0 ? totalExpenses / expenses.length : 0,
				year: targetYear
			}
		} catch (error) {
			this.logger.error('Failed to get expense summary', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				year
			})
			return {}
		}
	}

	/**
	 * Get financial overview - replaces get_financial_overview function
	 * Uses repository pattern instead of database function
	 */
	async getOverview(
		userId: string,
		year?: number
	): Promise<Record<string, unknown>> {
		try {
			const targetYear = year || new Date().getFullYear()
			this.logger.log('Getting financial overview via repositories', {
				userId,
				targetYear
			})

			const [
				propertyStats,
				unitStats,
				leaseStats,
				maintenanceAnalytics,
				financialAnalytics
			] = await Promise.all([
				this.propertiesRepository.getStats(userId),
				this.unitsRepository.getStats(userId),
				this.leasesRepository.getStats(userId),
				this.maintenanceRepository.getAnalytics(userId, { timeframe: '12m' }),
				this.propertiesRepository.getFinancialAnalytics(userId, {
					timeframe: '12m'
				})
			])

			const totalRevenue = financialAnalytics.reduce(
				(sum, metric) => sum + (metric.revenue || 0),
				0
			)
			const totalExpenses = financialAnalytics.reduce(
				(sum, metric) => sum + (metric.expenses || 0),
				0
			)
			const netIncome = totalRevenue - totalExpenses
			const occupancyRate = unitStats.occupancyRate || 0
			const roi =
				totalRevenue > 0 ? Math.round((netIncome / totalRevenue) * 100) : 0
			const avgPropertyRevenue =
				financialAnalytics.length > 0
					? totalRevenue / financialAnalytics.length
					: 0
			const totalMaintenanceCost = financialAnalytics.reduce(
				(sum, metric) => sum + (metric.maintenanceExpenses || 0),
				0
			)

			return {
				summary: {
					totalRevenue,
					totalExpenses,
					netIncome,
					roi,
					occupancyRate
				},
				properties: {
					total: propertyStats.total,
					avgValue: avgPropertyRevenue
				},
				units: {
					total: unitStats.total,
					occupied: unitStats.occupied,
					vacant: unitStats.vacant,
					occupancyRate
				},
				leases: {
					total: leaseStats.total,
					active: leaseStats.active,
					expiring: leaseStats.expiringSoon || 0
				},
				maintenance: {
					totalRequests: maintenanceAnalytics.length,
					totalCost: totalMaintenanceCost,
					avgCost:
						maintenanceAnalytics.length > 0
							? totalMaintenanceCost / maintenanceAnalytics.length
							: 0
				},
				year: targetYear
			}
		} catch (error) {
			this.logger.error('Failed to get financial overview', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				year
			})
			return {}
		}
	}

	/**
	 * Get lease financial summary - replaces get_lease_financial_summary function
	 * Uses repository pattern instead of database function
	 */
	async getLeaseFinancialSummary(
		userId: string
	): Promise<Record<string, unknown>> {
		try {
			this.logger.log('Getting lease financial summary via repositories', {
				userId
			})

			const [leaseStats, leaseAnalytics] = await Promise.all([
				this.leasesRepository.getStats(userId),
				this.leasesRepository.getAnalytics(userId, { timeframe: '12m' })
			])

			// Calculate lease financial metrics
			const totalRevenue = leaseAnalytics.reduce(
				(sum: number, lease: Lease) => {
					return sum + (lease.rentAmount || 0)
				},
				0
			)

			const averageRent =
				leaseAnalytics.length > 0 ? totalRevenue / leaseAnalytics.length : 0

			// Calculate lease duration analytics
			const totalDuration = leaseAnalytics.reduce(
				(sum: number, lease: Lease) => {
					const start = new Date(lease.startDate)
					const end = new Date(lease.endDate)
					const durationMonths =
						(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
					return sum + durationMonths
				},
				0
			)

			const averageDuration =
				leaseAnalytics.length > 0 ? totalDuration / leaseAnalytics.length : 0

			return {
				summary: {
					totalLeases: leaseStats.total,
					activeLeases: leaseStats.active,
					expiredLeases: leaseStats.expired || 0,
					expiringSoon: leaseStats.expiringSoon || 0
				},
				financial: {
					totalRevenue,
					averageRent,
					projectedAnnualRevenue: totalRevenue * 12
				},
				duration: {
					averageDurationMonths: Math.round(averageDuration),
					totalDurationMonths: Math.round(totalDuration)
				}
			}
		} catch (error) {
			this.logger.error('Failed to get lease financial summary', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			return {}
		}
	}

	/**
	 * Get revenue trends - extracted from controller
	 */
	async getRevenueTrends(
		userId: string,
		year?: number
	): Promise<FinancialMetrics[]> {
		try {
			const targetYear = year || new Date().getFullYear()
			this.logger.log('Getting revenue trends via repositories', {
				userId,
				targetYear
			})

			const propertyIds = await this.getUserPropertyIds(userId)
			const yearStart = new Date(targetYear, 0, 1)
			const yearEnd = new Date(targetYear + 1, 0, 1)

			const [leases, expenses] = await Promise.all([
				this.leasesRepository.getAnalytics(userId, { timeframe: '12m' }),
				this.fetchExpenses(propertyIds, yearStart, yearEnd)
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
			this.logger.error('Failed to get revenue trends', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				year
			})
			return []
		}
	}

	/**
	 * Get Net Operating Income - extracted from controller
	 */
	async getNetOperatingIncome(
		userId: string,
		period = 'monthly'
	): Promise<PropertyFinancialMetrics[]> {
		try {
			this.logger.log('Getting Net Operating Income via repositories', {
				userId,
				period
			})

			const timeframe = this.periodToTimeframe(period)
			const financialAnalytics =
				await this.propertiesRepository.getFinancialAnalytics(userId, {
					timeframe
				})
			return financialAnalytics.map(metric => ({
				propertyId: metric.propertyId,
				propertyName: metric.propertyName,
				revenue: metric.revenue,
				expenses: metric.expenses,
				netIncome: metric.netIncome,
				roi:
					metric.revenue > 0
						? Math.round((metric.netIncome / metric.revenue) * 100)
						: 0,
				period
			}))
		} catch (error) {
			this.logger.error('Failed to get Net Operating Income', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				period
			})
			return []
		}
	}

	private async getUserPropertyIds(userId: string) {
		const properties = await this.propertiesRepository.findByUserId(userId)
		return properties.map(property => property.id)
	}

	private calculateYearRange(year: number) {
		const startDate = new Date(year, 0, 1)
		startDate.setHours(0, 0, 0, 0)
		const endDate = new Date(year + 1, 0, 1)
		endDate.setHours(23, 59, 59, 999)
		return { startDate, endDate }
	}

	private async fetchExpenses(
		propertyIds: string[],
		startDate?: Date,
		endDate?: Date
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

			if (startDate) {
				query = query.gte('date', startDate.toISOString())
			}
			if (endDate) {
				query = query.lte('date', endDate.toISOString())
			}

			const { data, error } = await query
			if (error) {
				this.logger.error(
					'Failed to fetch expense data for financial metrics',
					{
						error: error.message,
						propertyCount: propertyIds.length,
						startDate: startDate?.toISOString(),
						endDate: endDate?.toISOString()
					}
				)
				return []
			}

			return (data as ExpenseRecord[]) ?? []
		} catch (error) {
			this.logger.error(
				'Unexpected error fetching expenses for financial metrics',
				{
					error: error instanceof Error ? error.message : String(error),
					propertyCount: propertyIds.length,
					startDate: startDate?.toISOString(),
					endDate: endDate?.toISOString()
				}
			)
			return []
		}
	}

	private calculateMonthlyRevenue(leases: Lease[], targetYear: number) {
		const map = new Map<string, number>()
		for (let month = 0; month < 12; month++) {
			const monthStart = new Date(targetYear, month, 1)
			const monthEnd = new Date(targetYear, month + 1, 0)
			const key = this.buildMonthKey(targetYear, month)

			let monthlyRevenue = 0
			for (const lease of leases) {
				const startDate = new Date(lease.startDate)
				const endDate = new Date(lease.endDate)
				if (startDate <= monthEnd && endDate >= monthStart) {
					monthlyRevenue += lease.rentAmount || 0
				}
			}

			map.set(key, monthlyRevenue)
		}
		return map
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

	private buildMonthKey(year: number, monthIndex: number) {
		return `${year}-${(monthIndex + 1).toString().padStart(2, '0')}`
	}

	private periodToTimeframe(period: string) {
		switch (period.toLowerCase()) {
			case 'daily':
				return '7d'
			case 'weekly':
				return '30d'
			case 'monthly':
				return '30d'
			case 'quarterly':
				return '90d'
			case 'yearly':
				return '365d'
			default:
				return '12m'
		}
	}
}
