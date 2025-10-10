/**
 * Late Fees Service - Ultra-Native Pattern
 *
 * - NO ABSTRACTIONS: Direct Stripe API + Supabase calls
 * - KISS: Simple late fee calculation logic
 * - DRY: Reuse existing patterns from payment modules
 * - Production: Battle-tested late fee formula
 */

import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import Stripe from 'stripe'
import { SupabaseService } from '../database/supabase.service'

export interface LateFeeConfig {
	leaseId: string
	gracePeriodDays: number // Default: 5 days
	flatFeeAmount: number // Default: $50
}

export interface LateFeeCalculation {
	rentAmount: number
	daysLate: number
	gracePeriod: number
	lateFeeAmount: number
	shouldApplyFee: boolean
	reason: string
}

@Injectable()
export class LateFeesService {
	private readonly logger = new Logger(LateFeesService.name)
	private readonly stripe: Stripe

	constructor(private readonly supabase: SupabaseService) {
		this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
			apiVersion: '2025-08-27' as Stripe.LatestApiVersion
		})
	}

	/**
	 * Calculate late fee based on days late
	 * Formula: Flat fee (user-configurable, default $50)
	 */
	calculateLateFee(
		rentAmount: number,
		daysLate: number,
		config?: Partial<LateFeeConfig>
	): LateFeeCalculation {
		const gracePeriod = config?.gracePeriodDays ?? 5
		const flatFee = config?.flatFeeAmount ?? 50

		// No late fee if within grace period
		if (daysLate <= gracePeriod) {
			return {
				rentAmount,
				daysLate,
				gracePeriod,
				lateFeeAmount: 0,
				shouldApplyFee: false,
				reason: `Within ${gracePeriod}-day grace period`
			}
		}

		return {
			rentAmount,
			daysLate,
			gracePeriod,
			lateFeeAmount: flatFee,
			shouldApplyFee: true,
			reason: `${daysLate - gracePeriod} days past due (after ${gracePeriod}-day grace period)`
		}
	}

	/**
	 * Get late fee configuration for a lease
	 */
	async getLateFeeConfig(leaseId: string): Promise<LateFeeConfig> {
		try {
			const { data: lease, error } = await this.supabase
				.getAdminClient()
				.from('lease')
				.select(
					`
					id,
					gracePeriodDays,
					lateFeeAmount,
					lateFeePercentage,
					tenant!lease_tenantId_fkey(
						users!tenant_userId_fkey(id, email, firstName, lastName)
					)
				`
				)
				.eq('id', leaseId)
				.single()

			if (error) throw error

			return {
				leaseId: lease.id,
				gracePeriodDays: lease.gracePeriodDays ?? 5,
				flatFeeAmount: lease.lateFeeAmount ?? 50
			}
		} catch (error) {
			this.logger.error('Failed to get late fee config', {
				error: error instanceof Error ? error.message : String(error),
				leaseId
			})

			// Return defaults if database fetch fails
			return {
				leaseId,
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
		leaseId: string,
		rentPaymentId: string,
		lateFeeAmount: number,
		reason: string
	): Promise<Stripe.InvoiceItem> {
		try {
			this.logger.log('Applying late fee to Stripe invoice', {
				customerId,
				leaseId,
				rentPaymentId,
				lateFeeAmount,
				reason
			})

			// Create invoice item (will be added to next invoice)
			const invoiceItem = await this.stripe.invoiceItems.create({
				customer: customerId,
				amount: Math.round(lateFeeAmount * 100), // Convert to cents
				currency: 'usd',
				description: `Late Fee: ${reason}`,
				metadata: {
					type: 'late_fee',
					leaseId,
					rentPaymentId,
					reason
				}
			})

			// Update RentPayment to mark late fee applied
			await this.supabase
				.getAdminClient()
				.from('rent_payment')
				.update({
					lateFeeApplied: true,
					lateFeeAmount: Math.round(lateFeeAmount * 100), // Store in cents
					lateFeeAppliedAt: new Date().toISOString()
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
				leaseId,
				rentPaymentId,
				lateFeeAmount
			})
			throw new BadRequestException('Failed to apply late fee')
		}
	}

	/**
	 * Get overdue rent payments for a lease
	 */
	async getOverduePayments(
		leaseId: string,
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
			const { data: payments, error } = await this.supabase
				.getAdminClient()
				.from('rent_payment')
				.select('id, amount, dueDate, lateFeeApplied, status')
				.eq('leaseId', leaseId)
				.in('status', ['PENDING', 'FAILED'])
				.order('dueDate', { ascending: true })

			if (error) throw error

			const now = new Date()
			const overduePayments = (payments || [])
				.filter(payment => payment.dueDate !== null) // Filter out payments without due dates
				.map(payment => {
					const dueDate = new Date(payment.dueDate!)
					const daysOverdue = Math.floor(
						(now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
					)

					return {
						id: payment.id,
						amount: payment.amount / 100, // Convert from cents to dollars
						dueDate: payment.dueDate!,
						daysOverdue,
						lateFeeApplied: payment.lateFeeApplied ?? false
					}
				})
				.filter(p => p.daysOverdue > gracePeriodDays && !p.lateFeeApplied)

			return overduePayments
		} catch (error) {
			this.logger.error('Failed to get overdue payments', {
				error: error instanceof Error ? error.message : String(error),
				leaseId
			})
			throw new BadRequestException('Failed to get overdue payments')
		}
	}

	/**
	 * Process late fees for all overdue payments on a lease
	 */
	async processLateFees(
		leaseId: string,
		landlordId: string
	): Promise<{
		processed: number
		totalLateFees: number
		details: Array<{
			paymentId: string
			lateFeeAmount: number
			daysOverdue: number
		}>
	}> {
		try {
			this.logger.log('Processing late fees for lease', {
				leaseId,
				landlordId
			})

			// Get late fee config
			const config = await this.getLateFeeConfig(leaseId)

			// Get overdue payments
			const overduePayments = await this.getOverduePayments(
				leaseId,
				config.gracePeriodDays
			)

			if (overduePayments.length === 0) {
				this.logger.log('No overdue payments found', { leaseId })
				return {
					processed: 0,
					totalLateFees: 0,
					details: []
				}
			}

			// Get Stripe customer ID from landlord
			const { data: landlord, error: landlordError } = await this.supabase
				.getAdminClient()
				.from('users')
				.select('stripeCustomerId')
				.eq('id', landlordId)
				.single()

			if (landlordError || !landlord?.stripeCustomerId) {
				throw new BadRequestException('Landlord Stripe customer not found')
			}

			// Process each overdue payment
			const results: Array<{
				paymentId: string
				lateFeeAmount: number
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
						landlord.stripeCustomerId,
						leaseId,
						payment.id,
						calculation.lateFeeAmount,
						calculation.reason
					)

					results.push({
						paymentId: payment.id,
						lateFeeAmount: calculation.lateFeeAmount,
						daysOverdue: payment.daysOverdue
					})
				}
			}

			const totalLateFees = results.reduce((sum, r) => sum + r.lateFeeAmount, 0)

			this.logger.log('Late fees processed successfully', {
				leaseId,
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
				leaseId,
				landlordId
			})
			throw new BadRequestException('Failed to process late fees')
		}
	}

	/**
	 * Update late fee configuration for a lease
	 */
	async updateLateFeeConfig(
		leaseId: string,
		userId: string,
		config: Partial<LateFeeConfig>
	): Promise<void> {
		try {
			this.logger.log('Updating late fee config', {
				leaseId,
				userId,
				config
			})

			await this.supabase
				.getAdminClient()
				.from('lease')
				.update({
					gracePeriodDays: config.gracePeriodDays,
					lateFeeAmount: config.flatFeeAmount,
					updatedAt: new Date().toISOString()
				})
				.eq('id', leaseId)

			this.logger.log('Late fee config updated successfully', { leaseId })
		} catch (error) {
			this.logger.error('Failed to update late fee config', {
				error: error instanceof Error ? error.message : String(error),
				leaseId,
				userId
			})
			throw new BadRequestException('Failed to update late fee configuration')
		}
	}
}
