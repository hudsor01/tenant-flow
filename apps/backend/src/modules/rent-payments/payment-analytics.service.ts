/**
 * Payment Analytics Service
 *
 * Provides analytics and metrics for rent payments including:
 * - Collection rates and trends
 * - Payment timing analysis
 * - Overdue payment tracking
 * - Monthly trend data
 */

import { Injectable } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import type { PaymentStatus } from '@repo/shared/types/core'

export interface PaymentAnalytics {
	totalCollected: number
	totalPending: number
	totalOverdue: number
	collectionRate: number
	averagePaymentTime: number
	onTimePaymentRate: number
	monthlyTrend: MonthlyPaymentTrend[]
}

export interface MonthlyPaymentTrend {
	month: string
	monthNumber: number
	collected: number
	pending: number
	failed: number
}

export interface UpcomingPayment {
	id: string
	tenantId: string
	tenantName: string
	propertyName: string
	unitNumber: string
	amount: number
	dueDate: string
	autopayEnabled: boolean
	paymentMethodConfigured: boolean
}

export interface OverduePayment {
	id: string
	tenantId: string
	tenantName: string
	tenantEmail: string
	propertyName: string
	unitNumber: string
	amount: number
	dueDate: string
	daysOverdue: number
	lateFeeAmount: number
	lateFeeApplied: boolean
}

@Injectable()
export class PaymentAnalyticsService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Get payment analytics for the authenticated user
	 */
	async getPaymentAnalytics(token: string): Promise<PaymentAnalytics> {
		const client = this.supabase.getUserClient(token)
		const now = new Date()
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
		const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

		// Get all rent payments for the current month
		const { data: payments, error } = await client
			.from('rent_payments')
			.select(`
				id,
				amount,
				status,
				due_date,
				paid_date,
				created_at,
				lease_id
			`)
			.gte('due_date', startOfMonth.toISOString())
			.lte('due_date', endOfMonth.toISOString())

		if (error) {
			this.logger.error('Failed to fetch payment analytics', { error: error.message })
			return this.getEmptyAnalytics()
		}

		const paymentsList = payments || []

		// Calculate metrics
		const succeeded = paymentsList.filter(p => p.status === 'succeeded')
		const pending = paymentsList.filter(p => p.status === 'pending')
		const failed = paymentsList.filter(p => p.status === 'failed')

		const totalCollected = succeeded.reduce((sum, p) => sum + p.amount, 0)
		const totalPending = pending.reduce((sum, p) => sum + p.amount, 0)
		const totalFailed = failed.reduce((sum, p) => sum + p.amount, 0)

		// Calculate overdue amount (pending payments past due date)
		const overduePayments = pending.filter(p => {
			if (!p.due_date) return false
			return new Date(p.due_date) < now
		})
		const totalOverdue = overduePayments.reduce((sum, p) => sum + p.amount, 0)

		// Collection rate
		const total = totalCollected + totalPending + totalFailed
		const collectionRate = total > 0 ? (totalCollected / total) * 100 : 0

		// Average payment time (days from due date to paid date)
		const paidWithDates = succeeded.filter(p => p.paid_date && p.due_date)
		const avgPaymentTime = paidWithDates.length > 0
			? paidWithDates.reduce((sum, p) => {
				const dueDate = new Date(p.due_date!)
				const paidDate = new Date(p.paid_date!)
				const days = (paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
				return sum + days
			}, 0) / paidWithDates.length
			: 0

		// On-time payment rate (paid on or before due date)
		const onTimePayments = paidWithDates.filter(p => {
			const dueDate = new Date(p.due_date!)
			const paidDate = new Date(p.paid_date!)
			return paidDate <= dueDate
		})
		const onTimePaymentRate = paidWithDates.length > 0
			? (onTimePayments.length / paidWithDates.length) * 100
			: 0

		// Get monthly trend (last 4 months)
		const monthlyTrend = await this.getMonthlyTrend(token, 4)

		return {
			totalCollected,
			totalPending,
			totalOverdue,
			collectionRate: Math.round(collectionRate * 10) / 10,
			averagePaymentTime: Math.round(avgPaymentTime * 10) / 10,
			onTimePaymentRate: Math.round(onTimePaymentRate * 10) / 10,
			monthlyTrend
		}
	}

	/**
	 * Get monthly payment trends
	 */
	async getMonthlyTrend(token: string, months: number = 4): Promise<MonthlyPaymentTrend[]> {
		const client = this.supabase.getUserClient(token)
		const trends: MonthlyPaymentTrend[] = []
		const now = new Date()

		for (let i = months - 1; i >= 0; i--) {
			const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
			const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
			const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)

			const { data: payments, error } = await client
				.from('rent_payments')
				.select('amount, status')
				.gte('due_date', startOfMonth.toISOString())
				.lte('due_date', endOfMonth.toISOString())

			if (error) {
				this.logger.warn('Failed to fetch monthly trend data', { month: monthDate.toISOString(), error: error.message })
				continue
			}

			const paymentsList = payments || []
			const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' })

			trends.push({
				month: monthName,
				monthNumber: monthDate.getMonth() + 1,
				collected: paymentsList.filter(p => p.status === 'succeeded').reduce((sum, p) => sum + p.amount, 0),
				pending: paymentsList.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
				failed: paymentsList.filter(p => p.status === 'failed').reduce((sum, p) => sum + p.amount, 0)
			})
		}

		return trends
	}

	/**
	 * Get upcoming payments (next 30 days)
	 */
	async getUpcomingPayments(token: string): Promise<UpcomingPayment[]> {
		const client = this.supabase.getUserClient(token)
		const now = new Date()
		const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

		// Get active leases with tenant and property info
		const { data: leases, error } = await client
			.from('leases')
			.select(`
				id,
				rent_amount,
				start_date,
				end_date,
				lease_status,
				primary_tenant_id,
				unit_id,
				units!leases_unit_id_fkey (
					id,
					unit_number,
					property_id,
					properties!units_property_id_fkey (
						id,
						name
					)
				),
				tenants!leases_primary_tenant_id_fkey (
					id,
					user_id,
					stripe_customer_id,
					users!tenants_user_id_fkey (
						id,
						first_name,
						last_name,
						email
					)
				)
			`)
			.eq('lease_status', 'active')

		if (error) {
			this.logger.error('Failed to fetch upcoming payments', { error: error.message })
			return []
		}

		const upcomingPayments: UpcomingPayment[] = []

		for (const lease of leases || []) {
			// Check if there's a payment method configured
			const tenants = lease.tenants as unknown as {
				id: string
				user_id: string
				stripe_customer_id: string | null
				users: { id: string; first_name: string | null; last_name: string | null; email: string | null } | null
			}

			if (!tenants?.users) continue

			const { data: paymentMethods } = await client
				.from('payment_methods')
				.select('id')
				.eq('tenant_id', tenants.id)
				.limit(1)

			const units = lease.units as unknown as {
				id: string
				unit_number: string | null
				property_id: string
				properties: { id: string; name: string } | null
			}

			// Calculate next due date (1st of next month for simplicity)
			const nextDueDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)

			if (nextDueDate > thirtyDaysFromNow) continue

			const tenantName = tenants.users.first_name && tenants.users.last_name
				? `${tenants.users.first_name} ${tenants.users.last_name}`
				: tenants.users.email || 'Unknown'

			upcomingPayments.push({
				id: lease.id,
				tenantId: tenants.id,
				tenantName,
				propertyName: units?.properties?.name || 'Unknown Property',
				unitNumber: units?.unit_number || 'N/A',
				amount: lease.rent_amount || 0,
				dueDate: nextDueDate.toISOString(),
				autopayEnabled: !!tenants.stripe_customer_id,
				paymentMethodConfigured: (paymentMethods?.length || 0) > 0
			})
		}

		return upcomingPayments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
	}

	/**
	 * Get overdue payments
	 */
	async getOverduePayments(token: string): Promise<OverduePayment[]> {
		const client = this.supabase.getUserClient(token)
		const now = new Date()

		const { data: payments, error } = await client
			.from('rent_payments')
			.select(`
				id,
				amount,
				due_date,
				late_fee_amount,
				tenant_id,
				lease_id,
				leases!rent_payments_lease_id_fkey (
					id,
					unit_id,
					units!leases_unit_id_fkey (
						id,
						unit_number,
						property_id,
						properties!units_property_id_fkey (
							id,
							name
						)
					)
				),
				tenants!rent_payments_tenant_id_fkey (
					id,
					user_id,
					users!tenants_user_id_fkey (
						id,
						first_name,
						last_name,
						email
					)
				)
			`)
			.in('status', ['pending', 'failed'] as PaymentStatus[])
			.lt('due_date', now.toISOString())
			.order('due_date', { ascending: true })

		if (error) {
			this.logger.error('Failed to fetch overdue payments', { error: error.message })
			return []
		}

		return (payments || []).map(payment => {
			const tenants = payment.tenants as unknown as {
				id: string
				user_id: string
				users: { id: string; first_name: string | null; last_name: string | null; email: string | null } | null
			}

			const leases = payment.leases as unknown as {
				id: string
				unit_id: string
				units: {
					id: string
					unit_number: string | null
					property_id: string
					properties: { id: string; name: string } | null
				} | null
			}

			const dueDate = new Date(payment.due_date)
			const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

			const tenantName = tenants?.users?.first_name && tenants?.users?.last_name
				? `${tenants.users.first_name} ${tenants.users.last_name}`
				: tenants?.users?.email || 'Unknown'

			return {
				id: payment.id,
				tenantId: payment.tenant_id,
				tenantName,
				tenantEmail: tenants?.users?.email || '',
				propertyName: leases?.units?.properties?.name || 'Unknown Property',
				unitNumber: leases?.units?.unit_number || 'N/A',
				amount: payment.amount,
				dueDate: payment.due_date,
				daysOverdue,
				lateFeeAmount: payment.late_fee_amount || 0,
				lateFeeApplied: (payment.late_fee_amount || 0) > 0
			}
		})
	}

	/**
	 * Export payments to CSV format
	 */
	async exportPaymentsCSV(
		token: string,
		filters?: { status?: string; startDate?: string; endDate?: string }
	): Promise<string> {
		const client = this.supabase.getUserClient(token)

		let query = client
			.from('rent_payments')
			.select(`
				id,
				amount,
				status,
				due_date,
				paid_date,
				payment_method_type,
				late_fee_amount,
				created_at,
				tenant_id,
				lease_id,
				leases!rent_payments_lease_id_fkey (
					units!leases_unit_id_fkey (
						unit_number,
						properties!units_property_id_fkey (
							name
						)
					)
				),
				tenants!rent_payments_tenant_id_fkey (
					users!tenants_user_id_fkey (
						first_name,
						last_name,
						email
					)
				)
			`)
			.order('due_date', { ascending: false })

		if (filters?.status && filters.status !== 'all') {
			query = query.eq('status', filters.status as PaymentStatus)
		}

		if (filters?.startDate) {
			query = query.gte('due_date', filters.startDate)
		}

		if (filters?.endDate) {
			query = query.lte('due_date', filters.endDate)
		}

		const { data: payments, error } = await query

		if (error) {
			this.logger.error('Failed to export payments', { error: error.message })
			throw new Error('Failed to export payments')
		}

		// Build CSV
		const headers = [
			'Payment ID',
			'Tenant Name',
			'Tenant Email',
			'Property',
			'Unit',
			'Amount',
			'Late Fee',
			'Total',
			'Status',
			'Due Date',
			'Paid Date',
			'Payment Method'
		]

		const rows = (payments || []).map(payment => {
			const tenants = payment.tenants as unknown as {
				users: { first_name: string | null; last_name: string | null; email: string | null } | null
			}

			const leases = payment.leases as unknown as {
				units: {
					unit_number: string | null
					properties: { name: string } | null
				} | null
			}

			const tenantName = tenants?.users?.first_name && tenants?.users?.last_name
				? `${tenants.users.first_name} ${tenants.users.last_name}`
				: tenants?.users?.email || 'Unknown'

			return [
				payment.id,
				tenantName,
				tenants?.users?.email || '',
				leases?.units?.properties?.name || '',
				leases?.units?.unit_number || '',
				(payment.amount / 100).toFixed(2),
				((payment.late_fee_amount || 0) / 100).toFixed(2),
				((payment.amount + (payment.late_fee_amount || 0)) / 100).toFixed(2),
				payment.status,
				payment.due_date,
				payment.paid_date || '',
				payment.payment_method_type || ''
			]
		})

		const csvContent = [
			headers.join(','),
			...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
		].join('\n')

		return csvContent
	}

	private getEmptyAnalytics(): PaymentAnalytics {
		return {
			totalCollected: 0,
			totalPending: 0,
			totalOverdue: 0,
			collectionRate: 0,
			averagePaymentTime: 0,
			onTimePaymentRate: 0,
			monthlyTrend: []
		}
	}
}
