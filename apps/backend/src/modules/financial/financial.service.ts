import { Injectable } from '@nestjs/common'
import type {
	FinancialMetrics,
	Lease,
	MaintenanceRequest,
	PropertyFinancialMetrics,
	UnitStatus
} from '@repo/shared/types/core'
import { THIRTY_DAYS_IN_MS } from '@repo/shared/constants/time'
import { SupabaseService } from '../../database/supabase.service'
import { FinancialExpenseService } from './financial-expense.service'
import { FinancialRevenueService } from './financial-revenue.service'
import { AppLogger } from '../../logger/app-logger.service'
import { PropertyAccessService } from '../properties/services/property-access.service'

/**
 * Financial Service
 *
 * Orchestrates financial data aggregation across properties, units, and leases.
 * Delegates expense and revenue calculations to focused services.
 *
 * @todo SEC-003: Add Zod validation schemas for all financial DTOs and query parameters.
 *       Currently accepts unvalidated query parameters.
 *       See TODO.md for details.
 */
@Injectable()
export class FinancialService {
	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly expenseService: FinancialExpenseService,
		private readonly revenueService: FinancialRevenueService,
		private readonly propertyAccessService: PropertyAccessService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Get expense summary - delegates to expense service
	 */
	async getExpenseSummary(
		token: string,
		year?: number
	): Promise<Record<string, unknown>> {
		try {
			const property_ids = await this.propertyAccessService.getPropertyIds(token)
			return this.expenseService.getExpenseSummary(property_ids, year, token)
		} catch (error) {
			this.logger.error('Failed to get expense summary', {
				error: error instanceof Error ? error.message : String(error),
				year
			})
			return {}
		}
	}

	/**
	 * Get financial overview - aggregates data from multiple sources
	 */
	async getOverview(
		token: string,
		year?: number
	): Promise<Record<string, unknown>> {
		try {
			const targetYear = year || new Date().getFullYear()
			this.logger.log('Getting financial overview', { targetYear })

			const client = this.supabaseService.getUserClient(token)
			const property_ids = await this.propertyAccessService.getPropertyIds(token)

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

			const expenses = await this.expenseService.fetchExpenses(
				property_ids,
				new Date(targetYear, 0, 1),
				new Date(targetYear + 1, 0, 1),
				token
			)
			const totalExpenses = expenses.reduce(
				(sum, exp) => sum + (exp.amount || 0),
				0
			)

			const netIncome = totalRevenue - totalExpenses
			const occupancyRate =
				unitRows.length > 0
					? Math.round(
							(unitRows.filter(u => u.status === 'occupied').length /
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
					total: property_ids.length,
					avgValue:
						property_ids.length > 0 ? totalRevenue / property_ids.length : 0
				},
				units: {
					total: unitRows.length,
					occupied: unitRows.filter(u => u.status === 'occupied').length,
					vacant: unitRows.filter(u => u.status === 'available').length,
					occupancyRate
				},
				leases: {
					total: leases.length,
					active: leases.filter((l: Lease) => l.lease_status === 'active')
						.length,
					expiring: leases.filter((l: Lease) => {
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
	 * Get lease financial summary
	 */
	async getLeaseFinancialSummary(
		token: string
	): Promise<Record<string, unknown>> {
		try {
			this.logger.log('Getting lease financial summary')

			const client = this.supabaseService.getUserClient(token)
			const unit_ids = await this.propertyAccessService.getUnitIds(token)

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
			const thirtyDaysFromNow = new Date(now.getTime() + THIRTY_DAYS_IN_MS)

			// Calculate lease financial metrics
			const totalRevenue = leaseList.reduce(
				(sum, lease: Lease) => sum + (lease.rent_amount || 0),
				0
			)

			const averageRent =
				leaseList.length > 0 ? totalRevenue / leaseList.length : 0

			// Calculate lease duration analytics
			const totalDuration = leaseList.reduce((sum, lease: Lease) => {
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
					activeLeases: leaseList.filter(
						(l: Lease) => l.lease_status === 'active'
					).length,
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
	 * Get revenue trends - delegates to revenue service
	 */
	async getRevenueTrends(
		token: string,
		year?: number
	): Promise<FinancialMetrics[]> {
		try {
			const property_ids = await this.propertyAccessService.getPropertyIds(token)
			const unit_ids = await this.propertyAccessService.getUnitIds(token)
			return this.revenueService.getRevenueTrends(
				token,
				property_ids,
				unit_ids,
				year
			)
		} catch (error) {
			this.logger.error('Failed to get revenue trends', {
				error: error instanceof Error ? error.message : String(error),
				year
			})
			return []
		}
	}

	/**
	 * Get expense breakdown - delegates to revenue service
	 */
	async getExpenseBreakdown(
		token: string,
		year?: number
	): Promise<FinancialMetrics[]> {
		return this.getRevenueTrends(token, year)
	}

	/**
	 * Get Net Operating Income - delegates to revenue service
	 */
	async getNetOperatingIncome(
		token: string,
		period = 'monthly'
	): Promise<PropertyFinancialMetrics[]> {
		try {
			return this.revenueService.getNetOperatingIncome(token, period)
		} catch (error) {
			this.logger.error('Failed to get Net Operating Income', {
				error: error instanceof Error ? error.message : String(error),
				period
			})
			return []
		}
	}

	// -------------------------------------------------------------------------
	// Private helpers
	// -------------------------------------------------------------------------

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
}
