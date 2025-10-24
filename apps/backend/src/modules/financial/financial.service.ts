import { Injectable, Logger } from '@nestjs/common'
import type {
	FinancialMetrics,
	Lease,
	PropertyFinancialMetrics
} from '@repo/shared/types/core'
import type { Tables } from '@repo/shared/types/supabase'
import type { Database } from '@repo/shared/types/supabase-generated'
import { SupabaseService } from '../../database/supabase.service'

type ExpenseRecord = Tables<'expense'>

@Injectable()
export class FinancialService {
	private readonly logger = new Logger(FinancialService.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Helper: Get unit IDs for user's properties
	 * Used to filter leases/maintenance since they don't have org_id/owner_id
	 */
	private async getUserUnitIds(userId: string): Promise<string[]> {
		const client = this.supabaseService.getAdminClient()

		// Get user's property IDs
		const { data: properties } = await client
			.from('property')
			.select('id')
			.eq('ownerId', userId)

		const propertyIds = properties?.map(p => p.id) || []
		if (propertyIds.length === 0) return []

		// Get unit IDs for those properties
		const { data: units } = await client
			.from('unit')
			.select('id')
			.in('propertyId', propertyIds)

		return units?.map(u => u.id) || []
	}

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
	 * Get financial overview - Direct Supabase queries
	 */
	async getOverview(
		userId: string,
		year?: number
	): Promise<Record<string, unknown>> {
		try {
			const targetYear = year || new Date().getFullYear()
			this.logger.log(
				'Getting financial overview via direct Supabase queries',
				{
					userId,
					targetYear
				}
			)

			const client = this.supabaseService.getAdminClient()

			// Get user's property IDs first
			const { data: properties } = await client
				.from('property')
				.select('id')
				.eq('ownerId', userId)

			const propertyRows = (properties ?? []) as Array<{ id: string }>
			const propertyIds = propertyRows.map(p => p.id)
			if (propertyIds.length === 0) {
				return this.getEmptyOverview(targetYear)
			}

			// Get unit IDs for user's properties
			const { data: units } = await client
				.from('unit')
				.select('id, status')
				.in('propertyId', propertyIds)

			type UnitStatus = Database['public']['Enums']['UnitStatus']
			const unitRows = (units ?? []).map(unit => ({
				id: unit.id,
				status: unit.status as UnitStatus
			}))
			const unitIds = unitRows.map(u => u.id)
			if (unitIds.length === 0) {
				return this.getEmptyOverview(targetYear)
			}

			// Fetch leases and maintenance data using unit IDs
			const [leasesData, maintenanceData] = await Promise.all([
				client.from('lease').select('*').in('unitId', unitIds),
				client
					.from('maintenance_request')
					.select('estimatedCost, status')
					.in('unitId', unitIds)
			])

			const leases = leasesData.data || []
			const maintenanceRows = (maintenanceData.data ?? []) as Array<
				Pick<MaintenanceRow, 'estimatedCost' | 'status'>
			>

			// Calculate stats
			type LeaseRow = Database['public']['Tables']['lease']['Row']
			const totalRevenue = leases.reduce(
				(sum, lease: LeaseRow) => sum + (lease.rentAmount || 0),
				0
			)
			const expenses = await this.fetchExpenses(
				propertyIds,
				new Date(targetYear, 0, 1),
				new Date(targetYear + 1, 0, 1)
			)
			const totalExpenses = expenses.reduce(
				(sum, exp) => sum + (exp.amount || 0),
				0
			)
			const netIncome = totalRevenue - totalExpenses
			type MaintenanceRow =
				Database['public']['Tables']['maintenance_request']['Row']
			const occupancyRate =
				unitRows.length > 0
					? Math.round(
							(unitRows.filter(u => u.status === 'OCCUPIED').length /
								unitRows.length) *
								100
						)
					: 0
			const roi =
				totalRevenue > 0 ? Math.round((netIncome / totalRevenue) * 100) : 0
			const totalMaintenanceCost = maintenanceRows.reduce(
				(sum: number, m) => sum + (m.estimatedCost || 0),
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
					total: propertyRows.length,
					avgValue:
						propertyRows.length > 0 ? totalRevenue / propertyRows.length : 0
				},
				units: {
					total: unitRows.length,
					occupied: unitRows.filter(u => u.status === 'OCCUPIED').length,
					vacant: unitRows.filter(u => u.status === 'VACANT').length,
					occupancyRate
				},
				leases: {
					total: leases.length,
					active: leases.filter((l: LeaseRow) => l.status === 'ACTIVE').length,
					expiring: leases.filter((l: LeaseRow) => {
						const endDate = new Date(l.endDate)
						const now = new Date()
						const thirtyDaysFromNow = new Date(
							now.getTime() + 30 * 24 * 60 * 60 * 1000
						)
						return endDate > now && endDate <= thirtyDaysFromNow
					}).length
				},
				maintenance: {
					totalRequests: maintenanceRows.length,
					totalCost: totalMaintenanceCost,
					avgCost:
						maintenanceRows.length > 0
							? totalMaintenanceCost / maintenanceRows.length
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
	 * Get lease financial summary - Direct Supabase queries
	 */
	async getLeaseFinancialSummary(
		userId: string
	): Promise<Record<string, unknown>> {
		try {
			this.logger.log(
				'Getting lease financial summary via direct Supabase queries',
				{
					userId
				}
			)

			const client = this.supabaseService.getAdminClient()

			// Get user's unit IDs
			const unitIds = await this.getUserUnitIds(userId)
			if (unitIds.length === 0) {
				return this.getEmptyLeaseSummary()
			}

			const { data: leases, error } = await client
				.from('lease')
				.select('*')
				.in('unitId', unitIds)

			if (error) {
				throw new Error(`Failed to fetch leases: ${error.message}`)
			}

			const leaseList = leases || []
			const now = new Date()
			const thirtyDaysFromNow = new Date(
				now.getTime() + 30 * 24 * 60 * 60 * 1000
			)

			// Calculate lease financial metrics
			type LeaseRow = Database['public']['Tables']['lease']['Row']
			const totalRevenue = leaseList.reduce(
				(sum, lease: LeaseRow) => sum + (lease.rentAmount || 0),
				0
			)

			const averageRent =
				leaseList.length > 0 ? totalRevenue / leaseList.length : 0

			// Calculate lease duration analytics
			const totalDuration = leaseList.reduce((sum, lease: LeaseRow) => {
				const start = new Date(lease.startDate)
				const end = new Date(lease.endDate)
				const durationMonths =
					(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
				return sum + durationMonths
			}, 0)

			const averageDuration =
				leaseList.length > 0 ? totalDuration / leaseList.length : 0

			return {
				summary: {
					totalLeases: leaseList.length,
					activeLeases: leaseList.filter((l: LeaseRow) => l.status === 'ACTIVE')
						.length,
					expiredLeases: leaseList.filter(
						(l: LeaseRow) => new Date(l.endDate) < now
					).length,
					expiringSoon: leaseList.filter((l: LeaseRow) => {
						const endDate = new Date(l.endDate)
						return endDate > now && endDate <= thirtyDaysFromNow
					}).length
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
	 * Get revenue trends - Direct Supabase queries
	 */
	async getRevenueTrends(
		userId: string,
		year?: number
	): Promise<FinancialMetrics[]> {
		try {
			const targetYear = year || new Date().getFullYear()
			this.logger.log('Getting revenue trends via direct Supabase queries', {
				userId,
				targetYear
			})

			const propertyIds = await this.getUserPropertyIds(userId)
			const unitIds = await this.getUserUnitIds(userId)

			if (unitIds.length === 0) {
				return this.getEmptyMonthlyMetrics(targetYear)
			}

			const yearStart = new Date(targetYear, 0, 1)
			const yearEnd = new Date(targetYear + 1, 0, 1)

			const client = this.supabaseService.getAdminClient()
			const { data: leases } = await client
				.from('lease')
				.select('*')
				.in('unitId', unitIds)

			const expenses = await this.fetchExpenses(propertyIds, yearStart, yearEnd)

			const revenueByMonth = this.calculateMonthlyRevenue(
				leases || [],
				targetYear
			)
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
	 * Get Net Operating Income - Direct Supabase queries
	 */
	async getNetOperatingIncome(
		userId: string,
		period = 'monthly'
	): Promise<PropertyFinancialMetrics[]> {
		try {
			this.logger.log(
				'Getting Net Operating Income via direct Supabase queries',
				{
					userId,
					period
				}
			)

			const client = this.supabaseService.getAdminClient()
			const { data: properties } = await client
				.from('property')
				.select('id, name')
				.eq('ownerId', userId)

			const propertyRows = (properties ?? []) as Array<{
				id: string
				name: string | null
			}>
			if (propertyRows.length === 0) {
				return []
			}

			// Calculate financial metrics for each property
			const metrics = await Promise.all(
				propertyRows.map(async property => {
					// Get unit IDs for this property
					const { data: units } = await client
						.from('unit')
						.select('id')
						.eq('propertyId', property.id)

					const unitIds = units?.map(u => u.id) || []

					let revenue = 0
					if (unitIds.length > 0) {
						const { data: leases } = await client
							.from('lease')
							.select('rentAmount')
							.in('unitId', unitIds)
							.eq('status', 'ACTIVE')

						revenue = (
							(leases ?? []) as Array<{ rentAmount: number | null }>
						).reduce((sum, lease) => sum + (lease.rentAmount ?? 0), 0)
					}

					const expenses = await this.fetchExpenses([property.id])
					const totalExpenses = expenses.reduce(
						(sum, exp) => sum + (exp.amount || 0),
						0
					)

					const netIncome = revenue - totalExpenses
					const roi = revenue > 0 ? Math.round((netIncome / revenue) * 100) : 0

					return {
						propertyId: property.id,
						propertyName: property.name ?? property.id,
						revenue,
						expenses: totalExpenses,
						netIncome,
						roi,
						period
					}
				})
			)

			return metrics
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
		const client = this.supabaseService.getAdminClient()
		const { data } = await client
			.from('property')
			.select('id')
			.eq('ownerId', userId)
		const rows = (data ?? []) as Array<{ id: string }>
		return rows.map(property => property.id)
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

	private getEmptyOverview(targetYear: number) {
		return {
			summary: {
				totalRevenue: 0,
				totalExpenses: 0,
				netIncome: 0,
				roi: 0,
				occupancyRate: 0
			},
			properties: {
				total: 0,
				avgValue: 0
			},
			units: {
				total: 0,
				occupied: 0,
				vacant: 0,
				occupancyRate: 0
			},
			leases: {
				total: 0,
				active: 0,
				expiring: 0
			},
			maintenance: {
				totalRequests: 0,
				totalCost: 0,
				avgCost: 0
			},
			year: targetYear
		}
	}

	private getEmptyLeaseSummary() {
		return {
			summary: {
				totalLeases: 0,
				activeLeases: 0,
				expiredLeases: 0,
				expiringSoon: 0
			},
			financial: {
				totalRevenue: 0,
				averageRent: 0,
				projectedAnnualRevenue: 0
			},
			duration: {
				averageDurationMonths: 0,
				totalDurationMonths: 0
			}
		}
	}

	private getEmptyMonthlyMetrics(targetYear: number): FinancialMetrics[] {
		const monthlyMetrics: FinancialMetrics[] = []
		for (let month = 0; month < 12; month++) {
			monthlyMetrics.push({
				period: this.buildMonthKey(targetYear, month),
				revenue: 0,
				expenses: 0,
				netIncome: 0,
				profitMargin: 0
			})
		}
		return monthlyMetrics
	}
}
