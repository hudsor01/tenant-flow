/**
 * Lease Financial Service
 * Handles statistics, expiring leases, analytics, and payment history
 * Extracted from LeasesService for SRP compliance
 */

import { BadRequestException, Injectable } from '@nestjs/common'
import type { Lease, LeaseStatsResponse } from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'

@Injectable()
export class LeaseFinancialService {

	constructor(private readonly supabase: SupabaseService, private readonly logger: AppLogger) {}

	/**
	 * Get lease statistics
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's leases
	 */
	async getStats(token: string): Promise<LeaseStatsResponse> {
		if (!token) {
			this.logger.warn('Lease stats requested without token')
			throw new BadRequestException('Authentication token is required')
		}

		this.logger.log('Getting lease stats via RLS-protected query')

		const client = this.supabase.getUserClient(token)

		const { data, error } = await client.from('leases').select('*')

		if (error) {
			this.logger.error('Failed to get lease stats from Supabase', {
				error: error.message
			})
			throw new BadRequestException('Failed to get lease statistics')
		}

		const leases = data || []
		const now = new Date()
		const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

		type LeaseRow = Database['public']['Tables']['leases']['Row']

		const stats = {
			totalLeases: leases.length,
			activeLeases: leases.filter((l: LeaseRow) => l.lease_status === 'active').length,
			expiredLeases: leases.filter((l: LeaseRow) => l.lease_status === 'ended').length,
			terminatedLeases: leases.filter((l: LeaseRow) => l.lease_status === 'terminated').length,
			totalMonthlyRent: leases
				.filter((l: LeaseRow) => l.lease_status === 'active')
				.reduce((sum: number, l: LeaseRow) => sum + (l.rent_amount || 0), 0),
			averageRent:
				leases.length > 0
					? leases.reduce((sum: number, l: LeaseRow) => sum + (l.rent_amount || 0), 0) / leases.length
					: 0,
			totalsecurity_deposits: leases.reduce(
				(sum: number, l: LeaseRow) => sum + (l.security_deposit || 0),
				0
			),
			expiringLeases: leases.filter((l: LeaseRow) => {
				// Skip month-to-month leases (end_date is null)
				if (!l.end_date) return false
				const end_date = new Date(l.end_date)
				return end_date > now && end_date <= thirtyDaysFromNow
			}).length
		}

		return stats
	}

	/**
	 * Get leases expiring soon
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's leases
	 */
	async getExpiring(token: string, days: number = 30): Promise<Lease[]> {
		if (!token) {
			this.logger.warn('Expiring leases requested without token')
			throw new BadRequestException('Authentication token is required')
		}

		this.logger.log('Getting expiring leases via RLS-protected query', { days })

		const client = this.supabase.getUserClient(token)

		const now = new Date()
		const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

		const { data, error } = await client
			.from('leases')
			.select('*')
			.eq('lease_status', 'active')
			.gte('end_date', now.toISOString())
			.lte('end_date', futureDate.toISOString())
			.order('end_date', { ascending: true })

		if (error) {
			this.logger.error('Failed to get expiring leases from Supabase', {
				error: error.message,
				days
			})
			throw new BadRequestException('Failed to get expiring leases')
		}

		return data as Lease[]
	}

	/**
	 * Get lease analytics - consolidated single method
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's leases
	 */
	async getAnalytics(
		token: string,
		options: {
			lease_id?: string
			property_id?: string
			timeframe: string
			period?: string
		}
	): Promise<Database['public']['Tables']['leases']['Row'][]> {
		if (!token) {
			this.logger.warn('Lease analytics requested without token')
			throw new BadRequestException('Authentication token is required')
		}

		this.logger.log('Getting lease analytics via RLS-protected query', { options })

		const client = this.supabase.getUserClient(token)

		let queryBuilder = client.from('leases').select('*')

		if (options.lease_id) {
			queryBuilder = queryBuilder.eq('id', options.lease_id)
		}

		if (options.property_id) {
			queryBuilder = queryBuilder.eq('property_id', options.property_id)
		}

		const { data, error } = await queryBuilder

		if (error) {
			this.logger.error('Failed to fetch lease analytics from Supabase', {
				error: error.message,
				options
			})
			throw new BadRequestException('Failed to get lease analytics')
		}

		return data || []
	}

	/**
	 * Get lease payment history
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically validates ownership
	 */
	async getPaymentHistory(token: string, lease_id: string): Promise<Database['public']['Tables']['rent_payments']['Row'][]> {
		if (!token || !lease_id) {
			this.logger.warn('Payment history requested with missing parameters', { lease_id })
			throw new BadRequestException('Authentication token and lease ID are required')
		}

		const client = this.supabase.getUserClient(token)

		// Verify ownership (RLS will enforce ownership)
		const { data: lease, error: leaseError } = await client
			.from('leases')
			.select('*')
			.eq('id', lease_id)
			.single()

		if (leaseError || !lease) {
			throw new BadRequestException('Lease not found or access denied')
		}

		this.logger.log('Getting lease payment history via RLS-protected query', { lease_id })

		const { data, error } = await client
			.from('rent_payments')
			.select('*')
			.eq('lease_id', lease_id)
			.order('payment_date', { ascending: false })

		if (error) {
			this.logger.error('Failed to fetch payment history from Supabase', {
				error: error.message,
				lease_id
			})
			return []
		}

		return data || []
	}
}
