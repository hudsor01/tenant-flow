import { Injectable } from '@nestjs/common'
import type {
	FinancialReport,
	PaymentAnalytics,
	RevenueData
} from '@repo/shared/types/reports'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import {
	buildMonthBuckets,
	loadPropertyIdsByOwner,
	parseDateRange
} from './reports.utils'

@Injectable()
export class FinancialReportService {
	constructor(
		private readonly logger: AppLogger,
		private readonly supabase: SupabaseService
	) {}

	private get sb(): SupabaseService {
		return this.supabase
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

	/**
	 * Get monthly revenue data for charts
	 */
	async getMonthlyRevenue(
		user_id: string,
		months: number = 12
	): Promise<RevenueData[]> {
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
	 * Financial report data: income/expenses, cash flow, rent roll
	 */
	async getFinancialReport(
		user_id: string,
		start_date?: string,
		end_date?: string
	): Promise<FinancialReport> {
		const { start, end } = parseDateRange(start_date, end_date)
		const property_ids = await loadPropertyIdsByOwner(
			this.sb,
			this.logger,
			user_id
		)

		if (property_ids.length === 0) {
			return this.getEmptyFinancialReport()
		}

		const monthBuckets = buildMonthBuckets(start, end)

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
			.in('maintenance_requests.units.property_id', property_ids)
			.gte('expense_date', start.toISOString())
			.lte('expense_date', end.toISOString())

		if (expenseError) {
			this.logger.error('Failed to load expenses', {
				error: expenseError.message
			})
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
			expenseBreakdown.set(
				'Maintenance',
				(expenseBreakdown.get('Maintenance') ?? 0) + cost
			)
			const monthKey =
				request.completed_at?.substring(0, 7) ??
				request.created_at?.substring(0, 7)
			if (monthKey && monthBuckets.has(monthKey)) {
				const bucket = monthBuckets.get(monthKey)
				if (bucket) bucket.expenses += cost
			}
		})
		;(expenses ?? []).forEach(expense => {
			const amount = expense.amount / 100
			totalExpenses += amount
			const category = expense.vendor_name
				? `Vendor: ${expense.vendor_name}`
				: 'Other'
			expenseBreakdown.set(
				category,
				(expenseBreakdown.get(category) ?? 0) + amount
			)
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

		const unitCountByProperty = new Map<
			string,
			{ total: number; occupied: number; rentPotential: number }
		>()

		;(units ?? []).forEach(unit => {
			const entry = unitCountByProperty.get(unit.property_id) ?? {
				total: 0,
				occupied: 0,
				rentPotential: 0
			}
			entry.total += 1
			entry.rentPotential += unit.rent_amount ? unit.rent_amount / 100 : 0
			unitCountByProperty.set(unit.property_id, entry)
		})

		type LeaseWithUnit = {
			id: string
			unit_id: string
			unit: { property_id: string } | null
		}
		;((activeLeases ?? []) as LeaseWithUnit[]).forEach(lease => {
			const propertyId = lease.unit?.property_id
			if (!propertyId) return
			const entry = unitCountByProperty.get(propertyId) ?? {
				total: 0,
				occupied: 0,
				rentPotential: 0
			}
			entry.occupied += 1
			unitCountByProperty.set(propertyId, entry)
		})

		const { data: properties } = await this.sb
			.getAdminClient()
			.from('properties')
			.select('id, name')
			.in('id', property_ids)

		const rentRoll = (properties ?? []).map(property => {
			const entry = unitCountByProperty.get(property.id) ?? {
				total: 0,
				occupied: 0,
				rentPotential: 0
			}
			const occupancyRate = entry.total
				? (entry.occupied / entry.total) * 100
				: 0
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
			(rentRoll.reduce((sum, row) => sum + row.occupiedUnits, 0) /
				Math.max(
					1,
					rentRoll.reduce((sum, row) => sum + row.unitCount, 0)
				)) *
			100

		const monthly = Array.from(monthBuckets.entries()).map(
			([month, values]) => ({
				month,
				income: values.income,
				expenses: values.expenses,
				net: values.income - values.expenses
			})
		)

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
}
