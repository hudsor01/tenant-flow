/**
 * Reports Service
 * Phase 5: Advanced Features - Custom Reports & Analytics
 *
 * Provides revenue, payment, and occupancy analytics
 */

import { Injectable, Logger, Optional } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'

// Use inferred query result types instead of strict Database types
// This allows flexibility with Supabase's actual return types which include nullability

export interface RevenueData {
	month: string
	revenue: number
	expenses: number
	profit: number
	propertyCount: number
	unitCount: number
	occupiedUnits: number
}

export interface PaymentAnalytics {
	totalPayments: number
	successfulPayments: number
	failedPayments: number
	totalRevenue: number
	averagePayment: number
	paymentsByMethod: {
		card: number
		ach: number
	}
	paymentsByStatus: {
		completed: number
		pending: number
		failed: number
	}
}

export interface OccupancyMetrics {
	totalUnits: number
	occupiedUnits: number
	vacantUnits: number
	occupancyRate: number
	byProperty: Array<{
		property_id: string
		propertyName: string
		totalUnits: number
		occupiedUnits: number
		occupancyRate: number
	}>
}

@Injectable()
export class ReportsService {
	private readonly logger = new Logger(ReportsService.name)

	constructor(@Optional() private readonly supabase?: SupabaseService) {}

	/**
	 * Get monthly revenue data for charts
	 */
	async getMonthlyRevenue(
		user_id: string,
		months: number = 12
	): Promise<RevenueData[]> {
		if (!this.supabase) {
			this.logger.warn('Supabase service not available')
			return []
		}

		try {
			// Get user's properties
			const { data: properties } = await this.supabase
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

			const { data: payments } = await this.supabase
				.getAdminClient()
				.from('rent_payments')
				.select(
					`
					id,
					amount,
					status,
					created_at,
					lease!rent_payments_lease_id_fkey!inner(property_id)
				`
				)
				.in('lease.property_id', property_ids)
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
			const { data: units } = await this.supabase
				.getAdminClient()
				.from('units')
				.select('id, property_id')
				.in('property_id', property_ids)

			const { data: activeLeases } = await this.supabase
				.getAdminClient()
				.from('leases')
				.select('id, unit_id')
				.in('property_id', property_ids)
				.eq('status', 'ACTIVE')

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
			this.logger.error('Failed to get monthly revenue', error)
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
		if (!this.supabase) {
			this.logger.warn('Supabase service not available')
			return this.getEmptyPaymentAnalytics()
		}

		try {
			// Get user's properties
			const { data: properties } = await this.supabase
				.getAdminClient()
				.from('properties')
				.select('id')
				.eq('user_id', user_id)

			if (!properties || properties.length === 0) {
				return this.getEmptyPaymentAnalytics()
			}

			const property_ids = properties.map(p => p.id)

			// Build query
			let query = this.supabase
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
			const { data: units } = await this.supabase
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
			this.logger.error('Failed to get payment analytics', error)
			throw error
		}
	}

	/**
	 * Get occupancy metrics across all properties
	 */
	async getOccupancyMetrics(user_id: string): Promise<OccupancyMetrics> {
		if (!this.supabase) {
			this.logger.warn('Supabase service not available')
			return this.getEmptyOccupancyMetrics()
		}

		try {
			// Get user's properties with units
			const { data: properties } = await this.supabase
				.getAdminClient()
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
				.eq('property_owner_id', user_id)

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
			this.logger.error('Failed to get occupancy metrics', error)
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
}
