import { Injectable, Logger } from '@nestjs/common'
import type {
	ExpenseRecord,
	FinancialMetrics,
	Lease,
	MaintenanceRequest,
	PropertyFinancialMetrics,
	UnitStatus
} from '@repo/shared/types/core'
import { THIRTY_DAYS_IN_MS } from '@repo/shared/constants/time'
import { SupabaseService } from '../../database/supabase.service'

@Injectable()
export class FinancialService {
	private readonly logger = new Logger(FinancialService.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Helper: Get unit IDs for user's properties
	 * Used to filter leases/maintenance since they don't have org_id/owner_id
	 */
	private async getUserunit_ids(token: string): Promise<string[]> {
		const client = this.supabaseService.getUserClient(token)

		// Get user's property IDs - RLS automatically filters to user's properties
		const { data: properties } = await client
			.from('properties')
			.select('id')

		const property_ids = properties?.map(p => p.id) || []
		if (property_ids.length === 0) return []

		// Get unit IDs for those properties - RLS enforces property ownership
		const { data: units } = await client
			.from('units')
			.select('id')
			.in('property_id', property_ids)

		return units?.map(u => u.id) || []
	}

	/**
	 * Get expense summary - replaces get_expense_summary function
	 * Uses repository pattern instead of database function
	 */
	async getExpenseSummary(
		token: string,
		year?: number
	): Promise<Record<string, unknown>> {
		try {
			const targetYear = year || new Date().getFullYear()
			this.logger.log('Getting expense summary via repositories', {
				targetYear
			})

			const property_ids = await this.getUserproperty_ids(token)
			const { start_date, end_date } = this.calculateYearRange(targetYear)
			const expenses = await this.fetchExpenses(property_ids, start_date, end_date)

			const totalExpenses = expenses.reduce(
				(sum, expense) => sum + (expense.amount ?? 0),
				0
			)
			// NOTE: expenses table does NOT have a category column
			// Category would need to come from maintenance_requests or be added to expenses table
			const expensesByCategory: Record<string, number> = {
				'Uncategorized': totalExpenses
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
				year
			})
			return {}
		}
	}

	/**
	 * Get financial overview - Direct Supabase queries
	 */
	async getOverview(
		token: string,
		year?: number
	): Promise<Record<string, unknown>> {
		try {
			const targetYear = year || new Date().getFullYear()
			this.logger.log(
				'Getting financial overview via direct Supabase queries',
				{
					targetYear
				}
			)

			const client = this.supabaseService.getUserClient(token)

			// Get user's property IDs - RLS automatically filters
			const { data: properties } = await client
				.from('properties')
				.select('id')

			const propertyRows = (properties ?? []) as Array<{ id: string }>
			const property_ids = propertyRows.map(p => p.id)
			if (property_ids.length === 0) {
				return this.getEmptyOverview(targetYear)
			}

			// Get unit IDs for user's properties
			const { data: units } = await client
				.from('units')
				.select('id, status')
				.in('property_id', property_ids)

			const unitRows = (units ?? []).map(unit => ({
				id: unit.id,
				status: unit.status as UnitStatus
			}))
			const unit_ids = unitRows.map(u => u.id)
			if (unit_ids.length === 0) {
				return this.getEmptyOverview(targetYear)
			}

			// Fetch leases and maintenance data using unit IDs
			const [leasesData, maintenanceData] = await Promise.all([
				client.from('leases').select('*').in('unit_id', unit_ids),
				client
					.from('maintenance_requests')
					.select('estimated_cost, status')
					.in('unit_id', unit_ids)
			])

			const leases = leasesData.data || []
			const maintenanceRows = (maintenanceData.data ?? []) as unknown as Array<
				Pick<MaintenanceRequest, 'estimated_cost' | 'status'>
			>

			// Calculate stats
			const totalRevenue = leases.reduce(
				(sum, lease: Lease) => sum + (lease.rent_amount || 0),
				0
			)
			const expenses = await this.fetchExpenses(
				property_ids,
				new Date(targetYear, 0, 1),
				new Date(targetYear + 1, 0, 1)
			)
			const totalExpenses = expenses.reduce(
				(sum, exp) => sum + (exp.amount || 0),
				0
			)
			const netIncome = totalRevenue - totalExpenses
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
				(sum: number, m) => sum + (m.estimated_cost || 0),
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
					active: leases.filter((l: Lease) => l.lease_status === 'active').length,
				expiring: leases.filter((l: Lease) => {
						// Skip month-to-month leases (end_date is null)
						if (!l.end_date) return false
						const end_date = new Date(l.end_date)
						const now = new Date()
						const thirtyDaysFromNow = new Date(
							now.getTime() + THIRTY_DAYS_IN_MS
						)
						return end_date > now && end_date <= thirtyDaysFromNow
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
				year
			})
			return {}
		}
	}

	/**
	 * Get lease financial summary - Direct Supabase queries
	 */
	async getLeaseFinancialSummary(
		token: string
	): Promise<Record<string, unknown>> {
		try {
			this.logger.log(
				'Getting lease financial summary via direct Supabase queries'
			)

			const client = this.supabaseService.getUserClient(token)

			// Get user's unit IDs - RLS enforces ownership
			const unit_ids = await this.getUserunit_ids(token)
			if (unit_ids.length === 0) {
				return this.getEmptyLeaseSummary()
			}

			const { data: leases, error } = await client
				.from('leases')
				.select('*')
				.in('unit_id', unit_ids)

			if (error) {
				throw new Error(`Failed to fetch leases: ${error.message}`)
			}

			const leaseList = leases || []
			const now = new Date()
			const thirtyDaysFromNow = new Date(
				now.getTime() + THIRTY_DAYS_IN_MS
			)

			// Calculate lease financial metrics
			const totalRevenue = leaseList.reduce(
				(sum, lease: Lease) => sum + (lease.rent_amount || 0),
				0
			)

			const averageRent =
				leaseList.length > 0 ? totalRevenue / leaseList.length : 0

			// Calculate lease duration analytics
			const totalDuration = leaseList.reduce((sum, lease: Lease) => {
				// Skip month-to-month leases (end_date is null)
				if (!lease.end_date) return sum
				const start = new Date(lease.start_date)
				const end = new Date(lease.end_date)
				const durationMonths =
					(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
				return sum + durationMonths
			}, 0)

			const averageDuration =
				leaseList.length > 0 ? totalDuration / leaseList.length : 0

			return {
				summary: {
					totalLeases: leaseList.length,
					activeLeases: leaseList.filter((l: Lease) => l.lease_status === 'ACTIVE')
						.length,
					expiredLeases: leaseList.filter(
					(l: Lease) => l.end_date && new Date(l.end_date) < now
				).length,
					expiringSoon: leaseList.filter((l: Lease) => {
					if (!l.end_date) return false
					const end_date = new Date(l.end_date)
					return end_date > now && end_date <= thirtyDaysFromNow
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
				error: error instanceof Error ? error.message : String(error)
			})
			return {}
		}
	}

	/**
	 * Get revenue trends - Direct Supabase queries
	 */
	async getRevenueTrends(
		token: string,
		year?: number
	): Promise<FinancialMetrics[]> {
		try {
			const targetYear = year || new Date().getFullYear()
			this.logger.log('Getting revenue trends via direct Supabase queries', {
				targetYear
			})

			const property_ids = await this.getUserproperty_ids(token)
			const unit_ids = await this.getUserunit_ids(token)

			if (unit_ids.length === 0) {
				return this.getEmptyMonthlyMetrics(targetYear)
			}

			const yearStart = new Date(targetYear, 0, 1)
			const yearEnd = new Date(targetYear + 1, 0, 1)

			const client = this.supabaseService.getUserClient(token)
			const { data: leases } = await client
				.from('leases')
				.select('*')
				.in('unit_id', unit_ids)

			const expenses = await this.fetchExpenses(property_ids, yearStart, yearEnd)

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
				year
			})
			return []
		}
	}


	/**
	 * Get expense breakdown by month - Direct Supabase queries
	 * Alias for getRevenueTrends with focus on expense analysis
	 */
	async getExpenseBreakdown(
		token: string,
		year?: number
	): Promise<FinancialMetrics[]> {
		return this.getRevenueTrends(token, year)
	}

	/**
	 * Get Net Operating Income - Direct Supabase queries
	 */
	async getNetOperatingIncome(
		token: string,
		period = 'monthly'
	): Promise<PropertyFinancialMetrics[]> {
		try {
			this.logger.log(
				'Getting Net Operating Income via direct Supabase queries',
				{
					period
				}
			)

			const client = this.supabaseService.getUserClient(token)
			const { data: properties } = await client
				.from('properties')
				.select('id, name')

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
						.from('units')
						.select('id')
						.eq('property_id', property.id)

					const unit_ids = units?.map(u => u.id) || []

					let revenue = 0
					if (unit_ids.length > 0) {
						const { data: leases } = await client
							.from('leases')
							.select('rent_amount')
							.in('unit_id', unit_ids)
							.eq('lease_status', 'ACTIVE')

						revenue = (
							(leases ?? []) as unknown as Array<{
                rent_amount: number | null
}>
						).reduce((sum, lease) => sum + (lease.rent_amount ?? 0), 0)
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
				period
			})
			return []
		}
	}

	private async getUserproperty_ids(token: string) {
		const client = this.supabaseService.getUserClient(token)
		const { data } = await client
			.from('properties')
			.select('id')
		const rows = (data ?? []) as Array<{ id: string }>
		return rows.map(property => property.id)
	}

	private calculateYearRange(year: number) {
		const start_date = new Date(year, 0, 1)
		start_date.setHours(0, 0, 0, 0)
		const end_date = new Date(year + 1, 0, 1)
		end_date.setHours(23, 59, 59, 999)
		return { start_date, end_date }
	}

	private async fetchExpenses(
		property_ids: string[],
		start_date?: Date,
		end_date?: Date
	) {
		if (!property_ids.length) {
			return [] as ExpenseRecord[]
		}

		try {
			// NOTE: expenses table does NOT have property_id column
			// Expenses link through: expenses → maintenance_requests → units → properties
			// We need to join through the relationship chain to filter by property
			let query = this.supabaseService
				.getAdminClient()
				.from('expenses')
				.select(`
					*,
					maintenance_requests!inner (
						unit_id,
						units!inner (
							property_id
						)
					)
				`)

			if (start_date) {
				query = query.gte('expense_date', start_date.toISOString())
			}
			if (end_date) {
				query = query.lte('expense_date', end_date.toISOString())
			}

			const { data, error } = await query
			if (error) {
				this.logger.error(
					'Failed to fetch expense data for financial metrics',
					{
						error: error.message,
						propertyCount: property_ids.length,
						start_date: start_date?.toISOString(),
						end_date: end_date?.toISOString()
					}
				)
				return []
			}

			// Filter by property_id through the join and map back to ExpenseRecord format
			const filtered = (data ?? []).filter((row: {
				maintenance_requests?: { units?: { property_id?: string } }
			}) => {
				const property_id = row.maintenance_requests?.units?.property_id
				return property_id ? property_ids.includes(property_id) : false
			})

			return filtered.map((row: {
				id: string
				maintenance_request_id: string
				vendor_name: string | null
				amount: number
				expense_date: string
				created_at: string | null
				updated_at: string | null
				description?: string
			}) => ({
				id: row.id,
				maintenance_request_id: row.maintenance_request_id,
				vendor_name: row.vendor_name ?? 'Unknown Vendor',
				amount: row.amount,
				expense_date: row.expense_date,
				created_at: row.created_at ?? new Date().toISOString(),
				updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString()
			})) as ExpenseRecord[]
		} catch (error) {
			this.logger.error(
				'Unexpected error fetching expenses for financial metrics',
				{
					error: error instanceof Error ? error.message : String(error),
					propertyCount: property_ids.length,
					start_date: start_date?.toISOString(),
					end_date: end_date?.toISOString()
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
				const start_date = new Date(lease.start_date)
				// Month-to-month leases (end_date is null) are always active
				const end_date = lease.end_date ? new Date(lease.end_date) : new Date('9999-12-31')
				if (start_date <= monthEnd && end_date >= monthStart) {
					monthlyRevenue += lease.rent_amount || 0
				}
			}

			map.set(key, monthlyRevenue)
		}
		return map
	}

	private groupExpensesByMonth(expenses: ExpenseRecord[]) {
		const map = new Map<string, number>()
		for (const expense of expenses) {
			if (!expense.expense_date) {
				continue
			}
			const expenseDate = new Date(expense.expense_date)
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
