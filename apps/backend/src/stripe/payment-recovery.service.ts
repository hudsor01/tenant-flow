import { Injectable, Logger } from '@nestjs/common'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { SubscriptionSupabaseRepository } from '../subscriptions/subscription-supabase.repository'
import { StripeService } from './stripe.service'
import type { StripeInvoice } from '@repo/shared/types/stripe-core-objects'

export interface PaymentRecoveryOptions {
	maxRetries?: number
	retryDelayHours?: number[]
	sendReminders?: boolean
	pauseOnFailure?: boolean
}

export interface RecoveryAttempt {
	attemptNumber: number
	status: 'success' | 'failed' | 'pending'
	error?: string
	timestamp: Date
}

/**
 * Service for handling payment failures and recovery strategies
 * Implements Stripe's best practices for dunning and payment recovery
 *
 * TEMPORARY IMPLEMENTATION: This service has been simplified to resolve compilation errors.
 * The original implementation had corrupted syntax from incomplete Prisma->Supabase migration.
 * This needs to be properly implemented with Supabase operations.
 */
@Injectable()
export class PaymentRecoveryService {
	private readonly logger = new Logger(PaymentRecoveryService.name)

	constructor(
		private readonly errorHandler: ErrorHandlerService,
		private readonly subscriptionRepository: SubscriptionSupabaseRepository,
		private readonly stripeService: StripeService
	) {}

	/**
	 * Handle payment failure from webhook
	 */
	async handlePaymentFailure(
		invoice: StripeInvoice,
		_options?: PaymentRecoveryOptions
	): Promise<void> {
		try {
			this.logger.warn(
				`Processing payment failure for invoice: ${invoice.id}`,
				{
					invoiceId: invoice.id,
					customerId: invoice.customer,
					amount: invoice.amount_due,
					currency: invoice.currency,
					attemptCount: invoice.attempt_count
				}
			)

			// Get subscription details from the invoice
			const subscriptionId = (invoice as { subscription?: string | null })
				.subscription
			if (!subscriptionId) {
				this.logger.warn('No subscription found for failed payment', {
					invoiceId: invoice.id
				})
				return
			}

			// Update subscription status in database
			await this.subscriptionRepository.updateStatusByStripeId(
				subscriptionId,
				'PAST_DUE'
			)

			// Get subscription details for further processing
			const subscription =
				await this.subscriptionRepository.findByStripeSubscriptionId(
					subscriptionId
				)
			if (subscription) {
				this.logger.log(
					`Updated subscription ${subscriptionId} to PAST_DUE status`,
					{
						userId: subscription.userId,
						planType: subscription.planType,
						attemptCount: invoice.attempt_count
					}
				)
			}
		} catch (error) {
			this.logger.error('Error handling payment failure:', error)
			throw this.errorHandler.handleError(error as Error, {
				operation: 'handlePaymentFailure',
				resource: 'payment-recovery',
				metadata: { invoiceId: invoice.id }
			})
		}
	}

	/**
	 * Retry a failed payment for a subscription
	 */
	async retryFailedPayment(
		subscriptionId: string,
		paymentMethodId?: string
	): Promise<{ success: boolean; error?: string }> {
		try {
			this.logger.log(
				`Attempting to retry failed payment for subscription: ${subscriptionId}`,
				{
					subscriptionId,
					paymentMethodId: paymentMethodId ? '***' : 'none'
				}
			)

			// Get subscription details
			const subscription =
				await this.subscriptionRepository.findByStripeSubscriptionId(
					subscriptionId
				)
			if (!subscription) {
				return {
					success: false,
					error: 'Subscription not found in database'
				}
			}

			// Retry payment using Stripe
			const stripeSubscription =
				await this.stripeService.client.subscriptions.retrieve(
					subscriptionId
				)
			if (!stripeSubscription) {
				return {
					success: false,
					error: 'Subscription not found in Stripe'
				}
			}

			// If payment method provided, update default payment method
			if (paymentMethodId) {
				await this.stripeService.client.customers.update(
					stripeSubscription.customer as string,
					{
						invoice_settings: {
							default_payment_method: paymentMethodId
						}
					}
				)
			}

			// Get latest invoice and retry payment
			const latestInvoice = stripeSubscription.latest_invoice
			if (latestInvoice && typeof latestInvoice === 'string') {
				const invoice =
					await this.stripeService.client.invoices.retrieve(
						latestInvoice
					)
				if (invoice.status === 'open' && invoice.id) {
					await this.stripeService.client.invoices.pay(invoice.id)
					this.logger.log(
						`Successfully retried payment for subscription: ${subscriptionId}`
					)
					return { success: true }
				}
			}

			return { success: false, error: 'No open invoice found to retry' }
		} catch (error) {
			this.logger.error('Failed to retry payment:', error)
			throw this.errorHandler.handleError(error as Error, {
				operation: 'retryFailedPayment',
				resource: 'payment-recovery',
				metadata: { subscriptionId }
			})
		}
	}

	/**
	 * Get payment failure status for a subscription
	 */
	async getPaymentRetryStatus(subscriptionId: string): Promise<{
		hasFailedPayments: boolean
		lastFailure?: Date
		nextRetry?: Date
		attemptCount: number
		canRetry: boolean
	}> {
		try {
			this.logger.log(
				`Getting payment retry status for subscription: ${subscriptionId}`
			)

			// Get subscription details from Supabase
			const subscription =
				await this.subscriptionRepository.findByStripeSubscriptionId(
					subscriptionId
				)
			if (!subscription) {
				return {
					hasFailedPayments: false,
					attemptCount: 0,
					canRetry: false
				}
			}

			// Get current subscription from Stripe for latest status
			const stripeSubscription =
				await this.stripeService.client.subscriptions.retrieve(
					subscriptionId
				)
			const hasFailedPayments =
				stripeSubscription.status === 'past_due' ||
				subscription.status === 'PAST_DUE'

			// If there are failed payments, get latest invoice details
			let attemptCount = 0
			let lastFailure: Date | undefined
			let nextRetry: Date | undefined

			if (hasFailedPayments && stripeSubscription.latest_invoice) {
				const invoice =
					await this.stripeService.client.invoices.retrieve(
						stripeSubscription.latest_invoice as string
					)

				attemptCount = invoice.attempt_count || 0

				// Calculate last failure and next retry based on invoice timestamps
				if (invoice.status_transitions?.finalized_at) {
					lastFailure = new Date(
						invoice.status_transitions.finalized_at * 1000
					)
				}

				// Next retry calculation would depend on Stripe's retry settings
				// For now, assume 24 hours between retries
				if (lastFailure && attemptCount < 4) {
					nextRetry = new Date(
						lastFailure.getTime() + 24 * 60 * 60 * 1000
					)
				}
			}

			return {
				hasFailedPayments,
				lastFailure,
				nextRetry,
				attemptCount,
				canRetry: hasFailedPayments && attemptCount < 4
			}
		} catch (error) {
			throw this.errorHandler.handleError(error as Error, {
				operation: 'getPaymentRetryStatus',
				resource: 'payment-recovery',
				metadata: { subscriptionId }
			})
		}
	}

	/**
	 * Update customer payment method and retry all failed payments
	 */
	async updatePaymentMethodAndRetry(
		customerId: string,
		paymentMethodId: string
	): Promise<{ success: boolean; retriedInvoices: number }> {
		try {
			this.logger.log(
				`Updating payment method and retrying failed payments for customer: ${customerId}`,
				{
					customerId,
					paymentMethodId: '***'
				}
			)

			// Update customer's default payment method
			await this.stripeService.client.customers.update(customerId, {
				invoice_settings: {
					default_payment_method: paymentMethodId
				}
			})

			// Get all subscriptions for this customer
			const subscriptions =
				await this.stripeService.client.subscriptions.list({
					customer: customerId,
					status: 'past_due'
				})

			let retriedInvoices = 0
			let allSuccessful = true

			// Retry payment for each past due subscription
			for (const subscription of subscriptions.data) {
				try {
					const result = await this.retryFailedPayment(
						subscription.id,
						paymentMethodId
					)
					if (result.success) {
						retriedInvoices++
					} else {
						allSuccessful = false
						this.logger.warn(
							`Failed to retry payment for subscription ${subscription.id}: ${result.error}`
						)
					}
				} catch (error) {
					allSuccessful = false
					this.logger.error(
						`Error retrying payment for subscription ${subscription.id}:`,
						error
					)
				}
			}

			this.logger.log(
				`Updated payment method and retried ${retriedInvoices} invoices for customer ${customerId}`
			)

			return {
				success: allSuccessful,
				retriedInvoices
			}
		} catch (error) {
			throw this.errorHandler.handleError(error as Error, {
				operation: 'updatePaymentMethodAndRetry',
				resource: 'payment-recovery',
				metadata: { customerId }
			})
		}
	}
}
