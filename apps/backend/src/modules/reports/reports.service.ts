/**
 * Reports Service
 * Phase 5: Advanced Features - Custom Reports & Analytics
 *
 * Provides revenue, payment, and occupancy analytics
 */

import { Injectable, Optional } from '@nestjs/common'
import type {
	FinancialReport,
	MaintenanceReport,
	OccupancyMetrics,
	PaymentAnalytics,
	PropertyReport,
	RevenueData,
	TenantReport
} from '@repo/shared/types/reports'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'

@Injectable()
export class ReportsService {

	constructor(@Optional() private readonly logger: AppLogger, private readonly supabase?: SupabaseService) {}

	private ensureSupabase(): boolean {
		if (!this.supabase) {
			this.logger.warn('Supabase service not available')
			return false
		}
		return true
	}

	private get sb(): SupabaseService {
		return this.supabase!
	}

	private parseDateRange(start_date?: string, end_date?: string) {
		const now = new Date()
		const end = end_date ? new Date(end_date) : now
		const start = start_date ? new Date(start_date) : new Date(now.getFullYear(), now.getMonth() - 11, 1)
		return { start, end }
	}

	private buildMonthBuckets(start: Date, end: Date) {
		const buckets = new Map<string, { income: number; expenses: number }>()
		const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
		const last = new Date(end.getFullYear(), end.getMonth(), 1)

		while (cursor <= last) {
			const key = cursor.toISOString().substring(0, 7)
			buckets.set(key, { income: 0, expenses: 0 })
			cursor.setMonth(cursor.getMonth() + 1)
		}

		return buckets
	}

	private async getPropertyIdsByOwner(user_id: string): Promise<string[]> {
		if (!this.supabase) return []
		const { data, error } = await this.sb
			.getAdminClient()
			.from('properties')
			.select('id')
			.eq('owner_user_id', user_id)

		if (error) {
			this.logger.error('Failed to load properties', { error: error.message })
			return []
		}

		return (data ?? []).map(row => row.id)
	}

	private getEmptyFinancialReport(): FinancialReport {
		return {
			summary: {
				totalIncome: 0,
				totalExpenses: 0,
				netIncome: 0,
				cashFlow: 0,
				rentRollOccupancyRate: 0
			},
			monthly: [],
			expenseBreakdown: [],
			rentRoll: []
		}
	}

	private getEmptyPropertyReport(): PropertyReport {
		return {
			summary: {
				totalProperties: 0,
				totalUnits: 0,
				occupiedUnits: 0,
				occupancyRate: 0
			},
			byProperty: [],
			occupancyTrend: [],
			vacancyTrend: []
		}
	}

	private getEmptyTenantReport(): TenantReport {
		return {
			summary: {
				totalTenants: 0,
				activeLeases: 0,
				leasesExpiringNext90: 0,
				turnoverRate: 0,
				onTimePaymentRate: 0
			},
			paymentHistory: [],
			leaseExpirations: [],
			turnover: []
		}
	}

	private getEmptyMaintenanceReport(): MaintenanceReport {
		return {
			summary: {
				totalRequests: 0,
				openRequests: 0,
				avgResolutionHours: 0,
				totalCost: 0,
				averageCost: 0
			},
			byStatus: [],
			byPriority: [],
			monthlyCost: [],
			vendorPerformance: []
		}
	}

	/**
	 * Get monthly revenue data for charts
	 */
	async getMonthlyRevenue(
		user_id: string,
		months: number = 12
	): Promise<RevenueData[]> {
		if (!this.ensureSupabase()) return []

		try {
			// Get user's properties
			const { data: properties } = await this.sb
				.getAdminClient()
				.from('properties')
				.select('id')
				.eq('user_id', user_id)

			if (!properties || properties.length === 0) {
				return []
			}

			const property_ids = properties.map(p => p.id)

			// Get payments for the last N months
			const start_date = new Date()
			start_date.setMonth(start_date.getMonth() - months)

			const { data: payments } = await this.sb
				.getAdminClient()
				.from('rent_payments')
				.select(
					`
					id,
					amount,
					status,
					created_at,
					lease:leases!rent_payments_lease_id_fkey!inner(
						unit:units!leases_unit_id_fkey(property_id)
					)
				`
				)
				.in('lease.unit.property_id', property_ids)
				.gte('created_at', start_date.toISOString())
				.eq('status', 'succeeded')

			// Group by month
			const monthlyData = new Map<string, RevenueData>()

			// Initialize all months
			for (let i = 0; i < months; i++) {
				const date = new Date()
				date.setMonth(date.getMonth() - i)
				const monthKey = date.toISOString().substring(0, 7) // YYYY-MM

				monthlyData.set(monthKey, {
					month: monthKey,
					revenue: 0,
					expenses: 0,
					profit: 0,
					propertyCount: property_ids.length,
					unitCount: 0,
					occupiedUnits: 0
				})
			}

			// Aggregate payments by month
			if (payments) {
				payments.forEach(payment => {
					const monthKey = payment.created_at?.substring(0, 7)
					if (!monthKey) return

					const existing = monthlyData.get(monthKey)
					if (existing) {
						existing.revenue += payment.amount / 100 // Convert cents to dollars
						existing.profit = existing.revenue - existing.expenses
					}
				})
			}

			// Get occupancy data for each month
			// For now, use current occupancy for all months
			const { data: units } = await this.sb
				.getAdminClient()
				.from('units')
				.select('id, property_id')
				.in('property_id', property_ids)

			// Get unit_ids for the properties first
			const unitIds = units?.map(u => u.id) ?? []
			const { data: activeLeases } = await this.sb
				.getAdminClient()
				.from('leases')
				.select('id, unit_id')
				.in('unit_id', unitIds)
				.eq('status', 'active')

			const totalUnits = units?.length || 0
			const occupiedUnits = activeLeases?.length || 0

			// Update all months with occupancy data
			monthlyData.forEach(data => {
				data.unitCount = totalUnits
				data.occupiedUnits = occupiedUnits
			})

			return Array.from(monthlyData.values())
				.sort((a, b) => a.month.localeCompare(b.month))
				.reverse()
		} catch (error) {
			this.logger.error('Failed to get monthly revenue', { error })
			throw error
		}
	}

	/**
	 * Get payment analytics for dashboard
	 */
	async getPaymentAnalytics(
		user_id: string,
		start_date?: string,
		end_date?: string
	): Promise<PaymentAnalytics> {
		if (!this.ensureSupabase()) return this.getEmptyPaymentAnalytics()

		try {
			// Get user's properties
			const { data: properties } = await this.sb
				.getAdminClient()
				.from('properties')
				.select('id')
				.eq('user_id', user_id)

			if (!properties || properties.length === 0) {
				return this.getEmptyPaymentAnalytics()
			}

			const property_ids = properties.map(p => p.id)

			// Build query
			let query = this.sb
				.getAdminClient()
				.from('rent_payments')
				.select(
					`
					id,
					amount,
					status,
					created_at,
					payment_method_type,
					lease!rent_payments_lease_id_fkey!inner(
						id,
						unit_id
					)
					`
				)

			// Get unit IDs for the properties
			const { data: units } = await this.sb
				.getAdminClient()
				.from('units')
				.select('id')
				.in('property_id', property_ids)

			const unitIds = (units || []).map(u => u.id)
			query = query.in('lease.unit_id', unitIds)

			if (start_date) {
				query = query.gte('created_at', start_date)
			}

			if (end_date) {
				query = query.lte('created_at', end_date)
			}

			const { data: payments } = await query

			if (!payments) {
				return this.getEmptyPaymentAnalytics()
			}

			// Calculate analytics
			const analytics: PaymentAnalytics = {
				totalPayments: payments.length,
				successfulPayments: payments.filter(p => p.status === 'succeeded')
					.length,
				failedPayments: payments.filter(p => p.status === 'failed').length,
				totalRevenue:
					payments
						.filter(p => p.status === 'succeeded')
						.reduce((sum: number, p) => sum + (p.amount || 0), 0) / 100,
				averagePayment:
					payments.length > 0
						? payments.reduce((sum: number, p) => sum + (p.amount || 0), 0) /
							payments.length /
							100
						: 0,
				paymentsByMethod: {
				card: payments.filter(p => p.payment_method_type === 'card').length,
				ach: payments.filter(p => p.payment_method_type === 'ach').length
			},
				paymentsByStatus: {
					completed: payments.filter(p => p.status === 'succeeded').length,
					pending: payments.filter(p => p.status === 'pending').length,
					failed: payments.filter(p => p.status === 'failed').length
				}
			}

			return analytics
		} catch (error) {
			this.logger.error('Failed to get payment analytics', { error })
			throw error
		}
	}

	/**
	 * Get occupancy metrics across all properties
	 */
	async getOccupancyMetrics(user_id: string): Promise<OccupancyMetrics> {
		if (!this.ensureSupabase()) return this.getEmptyOccupancyMetrics()

		try {
			const client = this.sb.getAdminClient()

			// Get user's properties with units (owner_user_id is now directly on properties table)
			const { data: properties } = await client
				.from('properties')
				.select(
					`
					id,
					name,
					units(
						id,
						leases(id, lease_status)
					)
					`
				)
				.eq('owner_user_id', user_id)

			if (!properties) {
				return this.getEmptyOccupancyMetrics()
			}

			let totalUnits = 0
			let occupiedUnits = 0
			const byProperty: OccupancyMetrics['byProperty'] = []

			type PropertyWithUnitsAndLeases = {
				id: string
				name: string
				units: Array<{
					id: string
					leases: Array<{ id: string; lease_status: string }> | null
				}>
			}

			properties.forEach((property: PropertyWithUnitsAndLeases) => {
				const units = property.units || []
				const occupied = units.filter(unit =>
					unit.leases?.some(lease => lease.lease_status === 'active')
				).length

				totalUnits += units.length
				occupiedUnits += occupied

				byProperty.push({
					property_id: property.id,
					propertyName: property.name,
					totalUnits: units.length,
					occupiedUnits: occupied,
					occupancyRate: units.length > 0 ? (occupied / units.length) * 100 : 0
				})
			})

			return {
				totalUnits,
				occupiedUnits,
				vacantUnits: totalUnits - occupiedUnits,
				occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
				byProperty
			}
		} catch (error) {
			this.logger.error('Failed to get occupancy metrics', { error })
			throw error
		}
	}

	private getEmptyPaymentAnalytics(): PaymentAnalytics {
		return {
			totalPayments: 0,
			successfulPayments: 0,
			failedPayments: 0,
			totalRevenue: 0,
			averagePayment: 0,
			paymentsByMethod: { card: 0, ach: 0 },
			paymentsByStatus: { completed: 0, pending: 0, failed: 0 }
		}
	}

	private getEmptyOccupancyMetrics(): OccupancyMetrics {
		return {
			totalUnits: 0,
			occupiedUnits: 0,
			vacantUnits: 0,
			occupancyRate: 0,
			byProperty: []
		}
	}

	/**
	 * Financial report data: income/expenses, cash flow, rent roll
	 */
	async getFinancialReport(
		user_id: string,
		start_date?: string,
		end_date?: string
	): Promise<FinancialReport> {
		if (!this.ensureSupabase()) return this.getEmptyFinancialReport()

		const { start, end } = this.parseDateRange(start_date, end_date)
		const property_ids = await this.getPropertyIdsByOwner(user_id)

		if (property_ids.length === 0) {
			return this.getEmptyFinancialReport()
		}

		const monthBuckets = this.buildMonthBuckets(start, end)

		const { data: payments, error: paymentError } = await this.sb
			.getAdminClient()
			.from('rent_payments')
			.select(
				`
				amount,
				status,
				created_at,
				lease:leases!rent_payments_lease_id_fkey(
					unit:units!leases_unit_id_fkey(property_id)
				)
			`
			)
			.in('lease.unit.property_id', property_ids)
			.gte('created_at', start.toISOString())
			.lte('created_at', end.toISOString())

		if (paymentError) {
			this.logger.error('Failed to load rent payments', {
				error: paymentError.message
			})
		}

		const { data: maintenance, error: maintenanceError } = await this.sb
			.getAdminClient()
			.from('maintenance_requests')
			.select(
				`
				id,
				created_at,
				completed_at,
				actual_cost,
				estimated_cost,
				unit:units!maintenance_requests_unit_id_fkey(property_id)
			`
			)
			.in('unit.property_id', property_ids)
			.gte('created_at', start.toISOString())
			.lte('created_at', end.toISOString())

		if (maintenanceError) {
			this.logger.error('Failed to load maintenance requests', {
				error: maintenanceError.message
			})
		}

		const { data: expenses, error: expenseError } = await this.sb
			.getAdminClient()
			.from('expenses')
			.select(
				`
				amount,
				expense_date,
				vendor_name,
				maintenance_requests!expenses_maintenance_request_id_fkey(
					units!maintenance_requests_unit_id_fkey(property_id)
				)
			`
			)
			.in(
				'maintenance_requests.units.property_id',
				property_ids
			)
			.gte('expense_date', start.toISOString())
			.lte('expense_date', end.toISOString())

		if (expenseError) {
			this.logger.error('Failed to load expenses', { error: expenseError.message })
		}

		let totalIncome = 0
		let totalExpenses = 0
		const expenseBreakdown = new Map<string, number>()

		;(payments ?? []).forEach(payment => {
			if (payment.status !== 'succeeded') return
			const monthKey = payment.created_at?.substring(0, 7)
			const amount = payment.amount ? payment.amount / 100 : 0
			totalIncome += amount
			if (monthKey && monthBuckets.has(monthKey)) {
				const bucket = monthBuckets.get(monthKey)
				if (bucket) bucket.income += amount
			}
		})

		;(maintenance ?? []).forEach(request => {
			const cost = (request.actual_cost ?? request.estimated_cost ?? 0) / 100
			totalExpenses += cost
			expenseBreakdown.set('Maintenance', (expenseBreakdown.get('Maintenance') ?? 0) + cost)
			const monthKey = request.completed_at?.substring(0, 7) ?? request.created_at?.substring(0, 7)
			if (monthKey && monthBuckets.has(monthKey)) {
				const bucket = monthBuckets.get(monthKey)
				if (bucket) bucket.expenses += cost
			}
		})

		;(expenses ?? []).forEach(expense => {
			const amount = expense.amount / 100
			totalExpenses += amount
			const category = expense.vendor_name ? `Vendor: ${expense.vendor_name}` : 'Other'
			expenseBreakdown.set(category, (expenseBreakdown.get(category) ?? 0) + amount)
			const monthKey = expense.expense_date?.substring(0, 7)
			if (monthKey && monthBuckets.has(monthKey)) {
				const bucket = monthBuckets.get(monthKey)
				if (bucket) bucket.expenses += amount
			}
		})

		const { data: units } = await this.sb
			.getAdminClient()
			.from('units')
			.select('id, property_id, rent_amount')
			.in('property_id', property_ids)

		const { data: activeLeases } = await this.sb
			.getAdminClient()
			.from('leases')
			.select('id, unit_id, unit:units!leases_unit_id_fkey(property_id)')
			.in('unit.property_id', property_ids)
			.eq('lease_status', 'active')

		const unitCountByProperty = new Map<string, { total: number; occupied: number; rentPotential: number }>()

		;(units ?? []).forEach(unit => {
			const entry = unitCountByProperty.get(unit.property_id) ?? { total: 0, occupied: 0, rentPotential: 0 }
			entry.total += 1
			entry.rentPotential += unit.rent_amount ? unit.rent_amount / 100 : 0
			unitCountByProperty.set(unit.property_id, entry)
		})

		type LeaseWithUnit = { id: string; unit_id: string; unit: { property_id: string } | null }
		;((activeLeases ?? []) as LeaseWithUnit[]).forEach(lease => {
			const propertyId = lease.unit?.property_id
			if (!propertyId) return
			const entry = unitCountByProperty.get(propertyId) ?? { total: 0, occupied: 0, rentPotential: 0 }
			entry.occupied += 1
			unitCountByProperty.set(propertyId, entry)
		})

		const { data: properties } = await this.sb
			.getAdminClient()
			.from('properties')
			.select('id, name')
			.in('id', property_ids)

		const rentRoll = (properties ?? []).map(property => {
			const entry = unitCountByProperty.get(property.id) ?? { total: 0, occupied: 0, rentPotential: 0 }
			const occupancyRate = entry.total ? (entry.occupied / entry.total) * 100 : 0
			return {
				propertyId: property.id,
				propertyName: property.name,
				unitCount: entry.total,
				occupiedUnits: entry.occupied,
				occupancyRate,
				rentPotential: entry.rentPotential
			}
		})

		const rentRollOccupancyRate =
			rentRoll.reduce((sum, row) => sum + row.occupiedUnits, 0) /
			Math.max(1, rentRoll.reduce((sum, row) => sum + row.unitCount, 0)) *
			100

		const monthly = Array.from(monthBuckets.entries()).map(([month, values]) => ({
			month,
			income: values.income,
			expenses: values.expenses,
			net: values.income - values.expenses
		}))

		const expenseBreakdownArray = Array.from(expenseBreakdown.entries()).map(
			([category, amount]) => ({
				category,
				amount
			})
		)

		const netIncome = totalIncome - totalExpenses

		return {
			summary: {
				totalIncome,
				totalExpenses,
				netIncome,
				cashFlow: netIncome,
				rentRollOccupancyRate: Number.isFinite(rentRollOccupancyRate)
					? rentRollOccupancyRate
					: 0
			},
			monthly,
			expenseBreakdown: expenseBreakdownArray,
			rentRoll
		}
	}

	/**
	 * Property report data: occupancy, vacancy, performance metrics
	 */
	async getPropertyReport(
		user_id: string,
		start_date?: string,
		end_date?: string
	): Promise<PropertyReport> {
		if (!this.ensureSupabase()) return this.getEmptyPropertyReport()

		const { start, end } = this.parseDateRange(start_date, end_date)
		const property_ids = await this.getPropertyIdsByOwner(user_id)

		if (property_ids.length === 0) {
			return this.getEmptyPropertyReport()
		}

		const monthBuckets = this.buildMonthBuckets(start, end)

		const { data: properties } = await this.sb
			.getAdminClient()
			.from('properties')
			.select('id, name')
			.in('id', property_ids)

		const { data: units } = await this.sb
			.getAdminClient()
			.from('units')
			.select('id, property_id')
			.in('property_id', property_ids)

		// Get unit_ids for properties first
		const unitIds = units?.map(u => u.id) ?? []
		const { data: activeLeases } = await this.sb
			.getAdminClient()
			.from('leases')
			.select('id, unit_id, unit:units!leases_unit_id_fkey(property_id)')
			.in('unit_id', unitIds)
			.eq('lease_status', 'active')

		const { data: payments } = await this.sb
			.getAdminClient()
			.from('rent_payments')
			.select(
				`
				amount,
				status,
				created_at,
				lease:leases!rent_payments_lease_id_fkey(
					unit:units!leases_unit_id_fkey(property_id)
				)
			`
			)
			.in('lease.unit.property_id', property_ids)
			.gte('created_at', start.toISOString())
			.lte('created_at', end.toISOString())

		const { data: maintenance } = await this.sb
			.getAdminClient()
			.from('maintenance_requests')
			.select(
				`
				actual_cost,
				estimated_cost,
				completed_at,
				created_at,
				unit:units!maintenance_requests_unit_id_fkey(property_id)
			`
			)
			.in('unit.property_id', property_ids)
			.gte('created_at', start.toISOString())
			.lte('created_at', end.toISOString())

		const unitMap = new Map<string, { total: number; occupied: number }>()
		;(units ?? []).forEach(unit => {
			const entry = unitMap.get(unit.property_id) ?? { total: 0, occupied: 0 }
			entry.total += 1
			unitMap.set(unit.property_id, entry)
		})

		type LeaseWithUnitRef = { id: string; unit_id: string; unit: { property_id: string } | null }
		;((activeLeases ?? []) as LeaseWithUnitRef[]).forEach(lease => {
			const propertyId = lease.unit?.property_id
			if (!propertyId) return
			const entry = unitMap.get(propertyId) ?? { total: 0, occupied: 0 }
			entry.occupied += 1
			unitMap.set(propertyId, entry)
		})

		const revenueByProperty = new Map<string, number>()
		type PaymentWithLeaseUnit = { amount: number | null; status: string | null; created_at: string | null; lease: { unit: { property_id: string } | null } | null }
		;((payments ?? []) as PaymentWithLeaseUnit[]).forEach(payment => {
			if (payment.status !== 'succeeded') return
			const propertyId = payment.lease?.unit?.property_id
			if (!propertyId) return
			const amount = payment.amount ? payment.amount / 100 : 0
			revenueByProperty.set(propertyId, (revenueByProperty.get(propertyId) ?? 0) + amount)
		})

		const expensesByProperty = new Map<string, number>()
		;(maintenance ?? []).forEach(request => {
			const propertyId = request.unit?.property_id
			if (!propertyId) return
			const cost = (request.actual_cost ?? request.estimated_cost ?? 0) / 100
			expensesByProperty.set(propertyId, (expensesByProperty.get(propertyId) ?? 0) + cost)
			const monthKey = request.completed_at?.substring(0, 7) ?? request.created_at?.substring(0, 7)
			if (monthKey && monthBuckets.has(monthKey)) {
				const bucket = monthBuckets.get(monthKey)
				if (bucket) bucket.expenses += cost
			}
		})

		;(payments ?? []).forEach(payment => {
			if (payment.status !== 'succeeded') return
			const monthKey = payment.created_at?.substring(0, 7)
			const amount = payment.amount ? payment.amount / 100 : 0
			if (monthKey && monthBuckets.has(monthKey)) {
				const bucket = monthBuckets.get(monthKey)
				if (bucket) bucket.income += amount
			}
		})

		const byProperty = (properties ?? []).map(property => {
			const entry = unitMap.get(property.id) ?? { total: 0, occupied: 0 }
			const occupancyRate = entry.total ? (entry.occupied / entry.total) * 100 : 0
			const revenue = revenueByProperty.get(property.id) ?? 0
			const expenses = expensesByProperty.get(property.id) ?? 0
			return {
				propertyId: property.id,
				propertyName: property.name,
				occupancyRate,
				vacantUnits: Math.max(0, entry.total - entry.occupied),
				revenue,
				expenses,
				netOperatingIncome: revenue - expenses
			}
		})

		const totalUnits = Array.from(unitMap.values()).reduce((sum, row) => sum + row.total, 0)
		const occupiedUnits = Array.from(unitMap.values()).reduce((sum, row) => sum + row.occupied, 0)
		const occupancyRate = totalUnits ? (occupiedUnits / totalUnits) * 100 : 0

		const occupancyTrend = Array.from(monthBuckets.entries()).map(([month, _values]) => {
			const monthlyRate = totalUnits ? (occupiedUnits / totalUnits) * 100 : 0
			return { month, occupancyRate: monthlyRate }
		})

		const vacancyTrend = Array.from(monthBuckets.entries()).map(([month]) => ({
			month,
			vacantUnits: Math.max(0, totalUnits - occupiedUnits)
		}))

		return {
			summary: {
				totalProperties: property_ids.length,
				totalUnits,
				occupiedUnits,
				occupancyRate
			},
			byProperty,
			occupancyTrend,
			vacancyTrend
		}
	}

	/**
	 * Tenant report data: payment history, expirations, turnover
	 */
	async getTenantReport(
		user_id: string,
		start_date?: string,
		end_date?: string
	): Promise<TenantReport> {
		if (!this.ensureSupabase()) return this.getEmptyTenantReport()

		const { start, end } = this.parseDateRange(start_date, end_date)
		const property_ids = await this.getPropertyIdsByOwner(user_id)

		if (property_ids.length === 0) {
			return this.getEmptyTenantReport()
		}

		const monthBuckets = this.buildMonthBuckets(start, end)

		const { data: units } = await this.sb
			.getAdminClient()
			.from('units')
			.select('id, property_id, unit_number')
			.in('property_id', property_ids)

		// Get unit_ids for properties first
		const unitIds = units?.map(u => u.id) ?? []
		const { data: leases } = await this.sb
			.getAdminClient()
			.from('leases')
			.select(
				'id, start_date, end_date, unit_id, lease_status, primary_tenant_id, unit:units!leases_unit_id_fkey(property_id)'
			)
			.in('unit_id', unitIds)

		const { data: properties } = await this.sb
			.getAdminClient()
			.from('properties')
			.select('id, name')
			.in('id', property_ids)

		const { data: payments } = await this.sb
			.getAdminClient()
			.from('rent_payments')
			.select(
				`
				id,
				created_at,
				due_date,
				paid_date,
				status,
				amount,
				lease:leases!rent_payments_lease_id_fkey(
					unit:units!leases_unit_id_fkey(property_id)
				)
			`
			)
			.in('lease.unit.property_id', property_ids)
			.gte('created_at', start.toISOString())
			.lte('created_at', end.toISOString())

		const paymentSummary = new Map<string, { total: number; onTime: number }>()
		;(payments ?? []).forEach(payment => {
			const monthKey = payment.created_at?.substring(0, 7)
			if (!monthKey || !monthBuckets.has(monthKey)) return
			const entry = paymentSummary.get(monthKey) ?? { total: 0, onTime: 0 }
			entry.total += 1
			if (payment.status === 'succeeded' && payment.paid_date && payment.paid_date <= payment.due_date) {
				entry.onTime += 1
			}
			paymentSummary.set(monthKey, entry)
		})

		const paymentHistory = Array.from(monthBuckets.keys()).map(month => {
			const entry = paymentSummary.get(month) ?? { total: 0, onTime: 0 }
			const onTimeRate = entry.total ? (entry.onTime / entry.total) * 100 : 0
			return {
				month,
				paymentsReceived: entry.total,
				onTimeRate
			}
		})

		const unitMap = new Map<string, { propertyId: string; unitLabel: string }>()
		;(units ?? []).forEach(unit => {
			unitMap.set(unit.id, {
				propertyId: unit.property_id,
				unitLabel: unit.unit_number ? `Unit ${unit.unit_number}` : 'Unit'
			})
		})

		const propertyMap = new Map<string, string>()
		;(properties ?? []).forEach(property => {
			propertyMap.set(property.id, property.name)
		})

		const now = new Date()
		const ninetyDays = new Date(now)
		ninetyDays.setDate(ninetyDays.getDate() + 90)

		type LeaseWithUnitProp = { id: string; start_date: string | null; end_date: string; unit_id: string; lease_status: string | null; primary_tenant_id: string | null; unit: { property_id: string } | null }
		const leaseExpirations = ((leases ?? []) as LeaseWithUnitProp[])
			.filter(lease => lease.end_date && new Date(lease.end_date) <= ninetyDays)
			.map(lease => {
				const unitInfo = unitMap.get(lease.unit_id)
				const propertyId = unitInfo?.propertyId ?? lease.unit?.property_id
				const propertyName = propertyId ? propertyMap.get(propertyId) ?? 'Property' : 'Property'
				return {
					leaseId: lease.id,
					propertyName,
					unitLabel: unitInfo?.unitLabel ?? 'Unit',
					endDate: lease.end_date
				}
			})

		const moveInsByMonth = new Map<string, number>()
		const moveOutsByMonth = new Map<string, number>()
		;(leases ?? []).forEach(lease => {
			if (lease.lease_status !== 'active') return
			const startKey = lease.start_date?.substring(0, 7)
			const endKey = lease.end_date?.substring(0, 7)
			if (startKey && monthBuckets.has(startKey)) {
				moveInsByMonth.set(startKey, (moveInsByMonth.get(startKey) ?? 0) + 1)
			}
			if (endKey && monthBuckets.has(endKey)) {
				moveOutsByMonth.set(endKey, (moveOutsByMonth.get(endKey) ?? 0) + 1)
			}
		})

		const turnover = Array.from(monthBuckets.keys()).map(month => ({
			month,
			moveIns: moveInsByMonth.get(month) ?? 0,
			moveOuts: moveOutsByMonth.get(month) ?? 0
		}))

		const totalPayments = paymentHistory.reduce((sum, row) => sum + row.paymentsReceived, 0)
		const onTimePayments = paymentHistory.reduce(
			(sum, row) => sum + (row.onTimeRate / 100) * row.paymentsReceived,
			0
		)
		const onTimePaymentRate = totalPayments ? (onTimePayments / totalPayments) * 100 : 0

		const activeLeases = (leases ?? []).filter(lease => lease.lease_status === 'active').length

		const tenantIds = new Set<string>()
		;(leases ?? []).forEach(lease => {
			if (lease.primary_tenant_id) tenantIds.add(lease.primary_tenant_id)
		})
		const totalTenants = tenantIds.size
		const totalMoveIns = turnover.reduce((sum, row) => sum + row.moveIns, 0)
		const totalMoveOuts = turnover.reduce((sum, row) => sum + row.moveOuts, 0)
		const turnoverRate = totalTenants ? ((totalMoveIns + totalMoveOuts) / Math.max(1, totalTenants)) * 100 : 0

		return {
			summary: {
				totalTenants,
				activeLeases,
				leasesExpiringNext90: leaseExpirations.length,
				turnoverRate,
				onTimePaymentRate
			},
			paymentHistory,
			leaseExpirations,
			turnover
		}
	}

	/**
	 * Maintenance report data: work orders, cost analysis, vendor performance
	 */
	async getMaintenanceReport(
		user_id: string,
		start_date?: string,
		end_date?: string
	): Promise<MaintenanceReport> {
		if (!this.ensureSupabase()) return this.getEmptyMaintenanceReport()

		const { start, end } = this.parseDateRange(start_date, end_date)
		const property_ids = await this.getPropertyIdsByOwner(user_id)

		if (property_ids.length === 0) {
			return this.getEmptyMaintenanceReport()
		}

		const { data: maintenance } = await this.sb
			.getAdminClient()
			.from('maintenance_requests')
			.select(
				`
				id,
				status,
				priority,
				created_at,
				completed_at,
				actual_cost,
				estimated_cost,
				unit:units!maintenance_requests_unit_id_fkey(property_id)
			`
			)
			.in('unit.property_id', property_ids)
			.gte('created_at', start.toISOString())
			.lte('created_at', end.toISOString())

		const { data: expenses } = await this.sb
			.getAdminClient()
			.from('expenses')
			.select(
				`
				amount,
				expense_date,
				vendor_name,
				maintenance_requests!expenses_maintenance_request_id_fkey(
					units!maintenance_requests_unit_id_fkey(property_id)
				)
			`
			)
			.in('maintenance_requests.units.property_id', property_ids)
			.gte('expense_date', start.toISOString())
			.lte('expense_date', end.toISOString())

		const byStatus = new Map<string, number>()
		const byPriority = new Map<string, number>()
		const monthlyCostBuckets = this.buildMonthBuckets(start, end)
		let totalCost = 0
		let totalRequests = 0
		let openRequests = 0
		let totalResolutionHours = 0
		let resolutionCount = 0

		;(maintenance ?? []).forEach(request => {
			totalRequests += 1
			if (request.status !== 'completed') openRequests += 1
			byStatus.set(request.status, (byStatus.get(request.status) ?? 0) + 1)
			byPriority.set(request.priority, (byPriority.get(request.priority) ?? 0) + 1)
			const cost = (request.actual_cost ?? request.estimated_cost ?? 0) / 100
			totalCost += cost
			const monthKey = request.completed_at?.substring(0, 7) ?? request.created_at?.substring(0, 7)
			if (monthKey && monthlyCostBuckets.has(monthKey)) {
				const bucket = monthlyCostBuckets.get(monthKey)
				if (bucket) bucket.expenses += cost
			}
			if (request.completed_at && request.created_at) {
				const duration =
					(new Date(request.completed_at).getTime() - new Date(request.created_at).getTime()) /
					(1000 * 60 * 60)
				totalResolutionHours += duration
				resolutionCount += 1
			}
		})

		;(expenses ?? []).forEach(expense => {
			const cost = expense.amount / 100
			totalCost += cost
			const monthKey = expense.expense_date?.substring(0, 7)
			if (monthKey && monthlyCostBuckets.has(monthKey)) {
				const bucket = monthlyCostBuckets.get(monthKey)
				if (bucket) bucket.expenses += cost
			}
		})

		const vendorPerformanceMap = new Map<string, { totalSpend: number; jobs: number }>()
		;(expenses ?? []).forEach(expense => {
			const vendor = expense.vendor_name ?? 'Unknown'
			const entry = vendorPerformanceMap.get(vendor) ?? { totalSpend: 0, jobs: 0 }
			entry.totalSpend += expense.amount / 100
			entry.jobs += 1
			vendorPerformanceMap.set(vendor, entry)
		})

		const monthlyCost = Array.from(monthlyCostBuckets.entries()).map(([month, values]) => ({
			month,
			cost: values.expenses
		}))

		const averageCost = totalRequests ? totalCost / totalRequests : 0
		const avgResolutionHours = resolutionCount ? totalResolutionHours / resolutionCount : 0

		return {
			summary: {
				totalRequests,
				openRequests,
				avgResolutionHours,
				totalCost,
				averageCost
			},
			byStatus: Array.from(byStatus.entries()).map(([status, count]) => ({
				status,
				count
			})),
			byPriority: Array.from(byPriority.entries()).map(([priority, count]) => ({
				priority,
				count
			})),
			monthlyCost,
			vendorPerformance: Array.from(vendorPerformanceMap.entries()).map(
				([vendorName, values]) => ({
					vendorName,
					totalSpend: values.totalSpend,
					jobs: values.jobs
				})
			)
		}
	}
}
