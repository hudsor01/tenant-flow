import { Injectable } from '@nestjs/common'
import type {
	FinancialMetrics,
	Lease,
	PropertyFinancialMetrics
} from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'
import { FinancialExpenseService } from './financial-expense.service'
import { AppLogger } from '../../logger/app-logger.service'

/**
 * Financial Revenue Service
 *
 * Handles revenue calculations, NOI, and financial trend analysis.
 * Computes monthly revenue from leases and calculates property-level metrics.
 */
@Injectable()
export class FinancialRevenueService {
	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly expenseService: FinancialExpenseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Get revenue trends by month for a given year
	 */
	async getRevenueTrends(
		token: string,
		property_ids: string[],
		unit_ids: string[],
		year?: number
	): Promise<FinancialMetrics[]> {
		const targetYear = year || new Date().getFullYear()
		this.logger.log('Getting revenue trends', { targetYear })

		if (unit_ids.length === 0) {
			return this.getEmptyMonthlyMetrics(targetYear)
		}

		const yearStart = new Date(targetYear, 0, 1)
		const yearEnd = new Date(targetYear + 1, 0, 1)

		const client = this.supabaseService.getUserClient(token)
		const { data: leases } = await client
			.from('leases')
			.select('auto_pay_enabled, created_at, docuseal_submission_id, end_date, governing_state, grace_period_days, id, late_fee_amount, late_fee_days, lead_paint_disclosure_acknowledged, lease_status, max_occupants, owner_signature_ip, owner_signature_method, owner_signed_at, owner_user_id, payment_day, pet_deposit, pet_rent, pets_allowed, primary_tenant_id, property_built_before_1978, property_rules, rent_amount, rent_currency, security_deposit, sent_for_signature_at, start_date, stripe_connected_account_id, stripe_subscription_id, stripe_subscription_status, subscription_failure_reason, subscription_last_attempt_at, subscription_retry_count, tenant_responsible_utilities, tenant_signature_ip, tenant_signature_method, tenant_signed_at, unit_id, updated_at, utilities_included')
			.in('unit_id', unit_ids)

		const expenses = await this.expenseService.fetchExpenses(
			property_ids,
			yearStart,
			yearEnd,
			token
		)

		const revenueByMonth = this.calculateMonthlyRevenue(
			leases || [],
			targetYear
		)
		const expensesByMonth = this.expenseService.groupExpensesByMonth(expenses)
		const monthlyMetrics: FinancialMetrics[] = []

		for (let month = 0; month < 12; month++) {
			const monthKey = this.expenseService.buildMonthKey(targetYear, month)
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
	}

	/**
	 * Get expense breakdown by month (alias for getRevenueTrends)
	 */
	async getExpenseBreakdown(
		token: string,
		property_ids: string[],
		unit_ids: string[],
		year?: number
	): Promise<FinancialMetrics[]> {
		return this.getRevenueTrends(token, property_ids, unit_ids, year)
	}

	/**
	 * Get Net Operating Income by property
	 */
	async getNetOperatingIncome(
		token: string,
		period = 'monthly'
	): Promise<PropertyFinancialMetrics[]> {
		this.logger.log('Getting Net Operating Income', { period })

		const client = this.supabaseService.getUserClient(token)

		// Query 1: Get all properties
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

		const property_ids = propertyRows.map(p => p.id)

		// Query 2: Get ALL units for ALL properties at once (batch query)
		const { data: allUnits } = await client
			.from('units')
			.select('id, property_id')
			.in('property_id', property_ids)

		const unitsData = (allUnits ?? []) as Array<{
			id: string
			property_id: string
		}>

		// Group units by property_id for quick lookup
		const unitsByProperty = new Map<string, string[]>()
		for (const unit of unitsData) {
			const existing = unitsByProperty.get(unit.property_id) || []
			existing.push(unit.id)
			unitsByProperty.set(unit.property_id, existing)
		}

		// Query 3: Get ALL leases for ALL units at once (batch query)
		const allUnitIds = unitsData.map(u => u.id)
		let leasesData: Array<{ unit_id: string; rent_amount: number | null }> = []

		if (allUnitIds.length > 0) {
			const { data: leases } = await client
				.from('leases')
				.select('unit_id, rent_amount')
				.in('unit_id', allUnitIds)
				.eq('lease_status', 'active')

			leasesData = (leases ?? []) as Array<{
				unit_id: string
				rent_amount: number | null
			}>
		}

		// Group leases by unit_id for quick lookup
		const leasesByUnit = new Map<string, number>()
		for (const lease of leasesData) {
			const existingRent = leasesByUnit.get(lease.unit_id) || 0
			leasesByUnit.set(lease.unit_id, existingRent + (lease.rent_amount ?? 0))
		}

		// Query 4: Get ALL expenses for ALL properties at once (batch query)
		const expenses = await this.expenseService.fetchExpenses(property_ids, undefined, undefined, token)
		const expensesByProperty = new Map<string, number>()
		for (const exp of expenses) {
			const propertyId = (exp as { property_id?: string }).property_id
			if (propertyId) {
				const existing = expensesByProperty.get(propertyId) || 0
				expensesByProperty.set(propertyId, existing + (exp.amount || 0))
			}
		}

		// Calculate financial metrics for each property
		const metrics = propertyRows.map(property => {
			const propertyUnitIds = unitsByProperty.get(property.id) || []

			// Calculate revenue from leases for this property's units
			let revenue = 0
			for (const unitId of propertyUnitIds) {
				revenue += leasesByUnit.get(unitId) || 0
			}

			const totalExpenses = expensesByProperty.get(property.id) || 0
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

		return metrics
	}

	/**
	 * Calculate monthly revenue from leases for a given year
	 */
	calculateMonthlyRevenue(
		leases: Lease[],
		targetYear: number
	): Map<string, number> {
		const map = new Map<string, number>()

		// Initialize all months with 0 revenue
		for (let month = 0; month < 12; month++) {
			map.set(this.expenseService.buildMonthKey(targetYear, month), 0)
		}

		// Compute year boundaries for the target year
		const yearStart = new Date(`${targetYear}-01-01`)
		const yearEnd = new Date(`${targetYear}-12-31`)

		// Single pass through leases to calculate revenue for each overlapping month
		for (const lease of leases) {
			const start_date = new Date(lease.start_date)
			// Month-to-month leases (end_date is null) are always active
			const end_date = lease.end_date
				? new Date(lease.end_date)
				: new Date('9999-12-31')
			const rent = lease.rent_amount || 0

			// Skip leases that don't overlap the target year
			if (end_date < yearStart || start_date > yearEnd) {
				continue
			}

			// Clamp lease interval to target year
			const effectiveStart = start_date < yearStart ? yearStart : start_date
			const effectiveEnd = end_date > yearEnd ? yearEnd : end_date

			// Determine which months this lease spans within the target year
			const startMonth = effectiveStart.getMonth()
			const endMonth = effectiveEnd.getMonth()

			// Add rent to each month in the lease period
			for (let month = startMonth; month <= endMonth; month++) {
				const key = this.expenseService.buildMonthKey(targetYear, month)
				map.set(key, (map.get(key) ?? 0) + rent)
			}
		}

		return map
	}

	/**
	 * Generate empty monthly metrics for a year
	 */
	private getEmptyMonthlyMetrics(targetYear: number): FinancialMetrics[] {
		const monthlyMetrics: FinancialMetrics[] = []
		for (let month = 0; month < 12; month++) {
			monthlyMetrics.push({
				period: this.expenseService.buildMonthKey(targetYear, month),
				revenue: 0,
				expenses: 0,
				netIncome: 0,
				profitMargin: 0
			})
		}
		return monthlyMetrics
	}
}
