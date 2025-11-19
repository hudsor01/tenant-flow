/**
 * Late Fees Service - Ultra-Native Pattern

 * - NO ABSTRACTIONS: Direct Stripe API + Supabase calls
 * - KISS: Simple late fee calculation logic
 * - DRY: Reuse existing patterns from payment modules
 * - Production: Battle-tested late fee formula
 */

import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'
import Stripe from 'stripe'
import { SupabaseService } from '../../database/supabase.service'
import { StripeClientService } from '../../shared/stripe-client.service'

export interface LateFeeConfig {
	lease_id: string
	gracePeriodDays: number // Default: 5 days
	flatFeeAmount: number // Default: $50
}

export interface LateFeeCalculation {
	rent_amount: number
	daysLate: number
	gracePeriod: number
	late_fee_amount: number
	shouldApplyFee: boolean
	reason: string
}

@Injectable()
export class LateFeesService {
	private readonly logger = new Logger(LateFeesService.name)
	private readonly stripe: Stripe

	constructor(
		private readonly supabase: SupabaseService,
		private readonly stripeClientService: StripeClientService
	) {
		this.stripe = this.stripeClientService.getClient()
	}

	/**
	 * Calculate late fee based on days late
	 * Formula: Flat fee (user-configurable, default $50)
	 */
	calculateLateFee(
		rent_amount: number,
		daysLate: number,
		config?: Partial<LateFeeConfig>
	): LateFeeCalculation {
		const gracePeriod = config?.gracePeriodDays ?? 5
		const flatFee = config?.flatFeeAmount ?? 50

		// No late fee if within grace period
		if (daysLate <= gracePeriod) {
			return {
				rent_amount,
				daysLate,
				gracePeriod,
				late_fee_amount: 0,
				shouldApplyFee: false,
				reason: `Within ${gracePeriod}-day grace period`
			}
		}

		return {
			rent_amount,
			daysLate,
			gracePeriod,
			late_fee_amount: flatFee,
			shouldApplyFee: true,
			reason: `${daysLate - gracePeriod} days past due (after ${gracePeriod}-day grace period)`
		}
	}

	/**
	 * Get late fee configuration for a lease
	 */
	async getLateFeeConfig(
		lease_id: string,
		token: string
	): Promise<LateFeeConfig> {
		try {
			if (!token) {
				this.logger.warn('Get late fee config requested without token')
				throw new BadRequestException('Authentication token is required')
			}

			this.logger.log('Getting late fee config via RLS-protected query', {
				lease_id
			})

			// RLS SECURITY: User-scoped client automatically filters to user's leases
			const client = this.supabase.getUserClient(token)

			const { data: lease, error } = await client
				.from('leases')
				.select(
					`
					id,
					grace_period_days,
					late_fee_amount,
					tenant!lease_tenant_id_fkey(
						users!tenant_user_id_fkey(id, email, first_name, last_name)
					)
				`
				)
				.eq('id', lease_id)
				.single()

			if (error) throw error

			return {
				lease_id: lease.id,
				gracePeriodDays: lease.grace_period_days ?? 5,
				flatFeeAmount: lease.late_fee_amount ?? 50
			}
		} catch (error) {
			this.logger.error('Failed to get late fee config', {
				error: error instanceof Error ? error.message : String(error),
				lease_id
			})

			// Return defaults if database fetch fails
			return {
				lease_id,
				gracePeriodDays: 5,
				flatFeeAmount: 50
			}
		}
	}

	/**
	 * Apply late fee to Stripe invoice as Invoice Item
	 * Stripe's recommended approach: add to next invoice, not separate charge
	 */
	async applyLateFeeToInvoice(
		customerId: string,
		lease_id: string,
		rentPaymentId: string,
		late_fee_amount: number,
		reason: string,
		token: string
	): Promise<Stripe.InvoiceItem> {
		try {
			if (!token) {
				this.logger.warn('Apply late fee to invoice requested without token')
				throw new BadRequestException('Authentication token is required')
			}

			this.logger.log('Applying late fee to Stripe invoice', {
				customerId,
				lease_id,
				rentPaymentId,
				late_fee_amount,
				reason
			})

			// Create invoice item (will be added to next invoice)
			const invoiceItem = await this.stripe.invoiceItems.create({
				customer: customerId,
				amount: Math.round(late_fee_amount * 100), // Convert to cents
				currency: 'usd',
				description: `Late Fee: ${reason}`,
				metadata: {
					type: 'late_fee',
					lease_id,
					rentPaymentId,
					reason
				}
			})

			// RLS SECURITY: User-scoped client automatically filters to user's rent payments
			const client = this.supabase.getUserClient(token)

			// Update RentPayment to mark late fee applied
			await client
				.from('rent_payments')
				.update({
					late_fee_amount: Math.round(late_fee_amount * 100), // Store in cents
					updated_at: new Date().toISOString()
				})
				.eq('id', rentPaymentId)

			this.logger.log('Late fee applied successfully', {
				invoiceItemId: invoiceItem.id,
				rentPaymentId
			})

			return invoiceItem
		} catch (error) {
			this.logger.error('Failed to apply late fee to invoice', {
				error: error instanceof Error ? error.message : String(error),
				customerId,
				lease_id,
				rentPaymentId,
				late_fee_amount
			})
			throw new BadRequestException('Failed to apply late fee')
		}
	}

	/**
	 * Get overdue rent payments for a lease
	 */
	async getOverduePayments(
		lease_id: string,
		token: string,
		gracePeriodDays: number = 5
	): Promise<
		Array<{
			id: string
			amount: number
			dueDate: string
			daysOverdue: number
			lateFeeApplied: boolean
		}>
	> {
		try {
			if (!token) {
				this.logger.warn('Get overdue payments requested without token')
				throw new BadRequestException('Authentication token is required')
			}

			this.logger.log('Getting overdue payments via RLS-protected query', {
				lease_id,
				gracePeriodDays
			})

			// RLS SECURITY: User-scoped client automatically filters to user's rent payments
			const client = this.supabase.getUserClient(token)

			const { data: payments, error } = await client
				.from('rent_payments')
				.select('id, amount, due_date, late_fee_amount, status')
				.eq('lease_id', lease_id)
				.in('status', ['PENDING', 'FAILED'])
				.order('due_date', { ascending: true })

			if (error) throw error

			const now = new Date()
			const overduePayments = (payments || [])
				.filter(payment => payment.due_date !== null) // Filter out payments without due dates
				.map(payment => {
					const dueDate = new Date(payment.due_date!)
					const daysOverdue = Math.floor(
						(now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
					)

					return {
						id: payment.id,
						amount: payment.amount / 100, // Convert from cents to dollars
						dueDate: payment.due_date!,
						daysOverdue,
						lateFeeApplied: payment.late_fee_amount !== null && payment.late_fee_amount > 0
					}
				})
				.filter(p => p.daysOverdue > gracePeriodDays && !p.lateFeeApplied)

			return overduePayments
		} catch (error) {
			this.logger.error('Failed to get overdue payments', {
				error: error instanceof Error ? error.message : String(error),
				lease_id
			})
			throw new BadRequestException('Failed to get overdue payments')
		}
	}

	/**
	 * Process late fees for all overdue payments on a lease
	 */
	async processLateFees(
		lease_id: string,
		token: string,
		owner_id: string // Make required instead of optional
	): Promise<{
		processed: number
		totalLateFees: number
		details: Array<{
			paymentId: string
			late_fee_amount: number
			daysOverdue: number
		}>
	}> {
		try {
			if (!token) {
				this.logger.warn('Process late fees requested without token')
				throw new BadRequestException('Authentication token is required')
			}

			if (!owner_id) {
				this.logger.warn('Process late fees requested without owner_id')
				throw new BadRequestException('Owner ID is required')
			}

			this.logger.log('Processing late fees for lease via RLS', {
				lease_id,
				owner_id
			})

			// Get late fee config
			const config = await this.getLateFeeConfig(lease_id, token)

			// Get overdue payments
			const overduePayments = await this.getOverduePayments(
				lease_id,
				token,
				config.gracePeriodDays
			)

			if (overduePayments.length === 0) {
				this.logger.log('No overdue payments found', { lease_id })
				return {
					processed: 0,
					totalLateFees: 0,
					details: []
				}
			}

			// RLS SECURITY: User-scoped client filters to authenticated user's data
			const client = this.supabase.getUserClient(token)

			// Get Stripe customer ID from authenticated user
			const { data: userData, error: userError } = await client
				.from('users')
				.select('stripe_customer_id')
				.eq('id', owner_id) // Use the validated owner_id
				.single()

			if (userError || !userData?.stripe_customer_id) {
				throw new BadRequestException('Owner Stripe customer not found')
			}

			// Process each overdue payment
			const results: Array<{
				paymentId: string
				late_fee_amount: number
				daysOverdue: number
			}> = []

			for (const payment of overduePayments) {
				const calculation = this.calculateLateFee(
					payment.amount,
					payment.daysOverdue,
					config
				)

				if (calculation.shouldApplyFee) {
					await this.applyLateFeeToInvoice(
						userData.stripe_customer_id,
						lease_id,
						payment.id,
						calculation.late_fee_amount,
						calculation.reason,
						token
					)

					results.push({
						paymentId: payment.id,
						late_fee_amount: calculation.late_fee_amount,
						daysOverdue: payment.daysOverdue
					})
				}
			}

			const totalLateFees = results.reduce((sum, r) => sum + r.late_fee_amount, 0)

			this.logger.log('Late fees processed successfully', {
				lease_id,
				processed: results.length,
				totalLateFees
			})

			return {
				processed: results.length,
				totalLateFees,
				details: results
			}
		} catch (error) {
			this.logger.error('Failed to process late fees', {
				error: error instanceof Error ? error.message : String(error),
				lease_id,
				owner_id
			})
			throw new BadRequestException('Failed to process late fees')
		}
	}

	/**
	 * Update late fee configuration for a lease
	 */
	async updateLateFeeConfig(
		lease_id: string,
		token: string,
		config: Partial<LateFeeConfig>
	): Promise<void> {
		try {
			if (!token) {
				this.logger.warn('Update late fee config requested without token')
				throw new BadRequestException('Authentication token is required')
			}

			this.logger.log('Updating late fee config via RLS-protected query', {
				lease_id,
				config
			})

			const updated_data: Database['public']['Tables']['leases']['Update'] = {
				updated_at: new Date().toISOString()
			}
			if (config.gracePeriodDays !== undefined) {
				updated_data.grace_period_days = config.gracePeriodDays ?? null
			}
			if (config.flatFeeAmount !== undefined) {
				updated_data.late_fee_amount = config.flatFeeAmount ?? null
			}

			// RLS SECURITY: User-scoped client automatically filters to user's leases
			const client = this.supabase.getUserClient(token)

			let updateResponse
			try {
				updateResponse = await client
					.from('leases')
					.update(updated_data)
					.eq('id', lease_id)
					.select()
			} catch (dbError) {
				this.logger.error('Lease update threw unexpected error', {
					lease_id,
					updated_data,
					error:
						dbError instanceof Error ? dbError.message : String(dbError)
				})
				throw new BadRequestException('Failed to update late fee configuration')
			}

			const { error, data } = updateResponse

			if (error) {
				this.logger.error('Failed to update lease for late fee config', {
					error: error.message,
					errorCode: error.code,
					lease_id,
					updated_data
				})
				throw new BadRequestException(
					`Failed to update late fee configuration: ${error.message}`
				)
			}

			if (!data || data.length === 0) {
				this.logger.warn('No lease found to update for late fee config', {
					lease_id
				})
				throw new BadRequestException('Lease not found or unauthorized')
			}

			this.logger.log('Late fee config updated successfully', { lease_id })
		} catch (error) {
			this.logger.error('Failed to update late fee config', {
				error: error instanceof Error ? error.message : String(error),
				lease_id
			})
			// Re-throw HTTP exceptions as-is to preserve specific error messages
			if (error instanceof BadRequestException) {
				throw error
			}
			throw new BadRequestException('Failed to update late fee configuration')
		}
	}
}
