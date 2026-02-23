/**
 * Lease Lifecycle Service
 * Handles lease renewal and termination workflows
 * Extracted from LeasesService for SRP compliance
 */

import { BadRequestException, Injectable } from '@nestjs/common'
import type { Lease } from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'

@Injectable()
export class LeaseLifecycleService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Find one lease by ID (internal helper for ownership verification)
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's leases
	 */
	private async findOne(
		token: string,
		lease_id: string
	): Promise<Lease | null> {
		const client = this.supabase.getUserClient(token)

		const { data, error } = await client
			.from('leases')
			.select('id, unit_id, owner_user_id, primary_tenant_id, start_date, end_date, rent_amount, rent_currency, security_deposit, payment_day, lease_status, stripe_subscription_id, stripe_connected_account_id, stripe_subscription_status, auto_pay_enabled, grace_period_days, late_fee_amount, late_fee_days, pets_allowed, pet_deposit, pet_rent, max_occupants, utilities_included, tenant_responsible_utilities, property_rules, governing_state, property_built_before_1978, lead_paint_disclosure_acknowledged, owner_signed_at, owner_signature_ip, owner_signature_method, tenant_signed_at, tenant_signature_ip, tenant_signature_method, sent_for_signature_at, docuseal_submission_id, subscription_failure_reason, subscription_last_attempt_at, subscription_retry_count, created_at, updated_at')
			.eq('id', lease_id)
			.single()

		if (error) {
			this.logger.error('Failed to fetch lease from Supabase', {
				error: error.message,
				lease_id
			})
			return null
		}

		return data as Lease
	}

	/**
	 * Renew lease - consolidated method with validation
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically validates ownership
	 */
	async renew(
		token: string,
		lease_id: string,
		newEndDate: string,
		newRentAmount?: number
	): Promise<Lease | null> {
		try {
			this.logger.log('Renewing lease via RLS-protected query', {
				lease_id,
				newEndDate,
				newRentAmount
			})

			// Verify ownership and lease exists (RLS will enforce ownership)
			const existingLease = await this.findOne(token, lease_id)
			if (!existingLease) {
				throw new BadRequestException('Lease not found or access denied')
			}

			// Only active leases can be renewed
			if (existingLease.lease_status !== 'active') {
				throw new BadRequestException(
					`Cannot renew lease in '${existingLease.lease_status}' status. Only active leases can be renewed.`
				)
			}

			// Month-to-month leases cannot be renewed (no fixed end date)
			if (!existingLease.end_date) {
				throw new BadRequestException(
					'Cannot renew a month-to-month lease. Convert to fixed-term first.'
				)
			}

			// Validate new end date is after current
			const currentEndDate = new Date(existingLease.end_date)
			const renewalEndDate = new Date(newEndDate)
			if (renewalEndDate <= currentEndDate) {
				throw new BadRequestException(
					'New end date must be after current lease end date'
				)
			}

			// Validate new rent amount if provided
			if (newRentAmount && newRentAmount <= 0) {
				throw new BadRequestException('Rent amount must be positive')
			}

			const client = this.supabase.getUserClient(token)

			const updated_data: Database['public']['Tables']['leases']['Update'] = {
				end_date: newEndDate,
				updated_at: new Date().toISOString()
			}
			if (newRentAmount) {
				updated_data.rent_amount = newRentAmount
			}

			const { data, error } = await client
				.from('leases')
				.update(updated_data)
				.eq('id', lease_id)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to renew lease in Supabase', {
					error: error.message,
					lease_id
				})
				throw new BadRequestException('Failed to renew lease')
			}

			return data as Lease
		} catch (error) {
			this.logger.error('Failed to renew lease', {
				error: error instanceof Error ? error.message : String(error),
				lease_id,
				newEndDate,
				newRentAmount
			})

			if (error instanceof BadRequestException) {
				throw error
			}

			throw new BadRequestException('Failed to renew lease')
		}
	}

	/**
	 * Terminate lease - consolidated method with validation
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically validates ownership
	 */
	async terminate(
		token: string,
		lease_id: string,
		terminationDate: string,
		reason?: string
	): Promise<Lease | null> {
		try {
			this.logger.log('Terminating lease via RLS-protected query', {
				lease_id,
				terminationDate,
				reason
			})

			// Verify ownership and lease exists (RLS will enforce ownership)
			const existingLease = await this.findOne(token, lease_id)
			if (!existingLease) {
				throw new BadRequestException('Lease not found or access denied')
			}

			// Validate lease status - only active or pending_signature leases can be terminated
			// Draft leases should be deleted instead
			const terminableStatuses = ['active', 'pending_signature']
			if (!terminableStatuses.includes(existingLease.lease_status)) {
				if (existingLease.lease_status === 'draft') {
					throw new BadRequestException(
						'Draft leases cannot be terminated. Delete the lease instead.'
					)
				}
				throw new BadRequestException(
					`Lease is already ${existingLease.lease_status} and cannot be terminated`
				)
			}

			// Validate termination date
			const termDate = new Date(terminationDate)
			const currentDate = new Date()
			if (termDate < currentDate) {
				throw new BadRequestException('Termination date cannot be in the past')
			}

			const client = this.supabase.getUserClient(token)

			const { data, error } = await client
				.from('leases')
				.update({
					lease_status: 'terminated',
					end_date: terminationDate,
					updated_at: new Date().toISOString()
				})
				.eq('id', lease_id)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to terminate lease in Supabase', {
					error: error.message,
					lease_id
				})
				throw new BadRequestException('Failed to terminate lease')
			}

			return data as Lease
		} catch (error) {
			this.logger.error('Failed to terminate lease', {
				error: error instanceof Error ? error.message : String(error),
				lease_id,
				terminationDate,
				reason
			})

			if (error instanceof BadRequestException) {
				throw error
			}

			throw new BadRequestException('Failed to terminate lease')
		}
	}
}
