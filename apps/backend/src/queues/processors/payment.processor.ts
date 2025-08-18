import { Process, Processor } from '@nestjs/bull'
import { Job } from 'bull'
import { Injectable } from '@nestjs/common'
import { QUEUE_NAMES } from '../constants/queue-names'
import { BaseProcessor, ProcessorResult } from '../base/base.processor'
import { PaymentJobData } from '../types/job.interfaces'
import { StripeService } from '../../stripe/stripe.service'
import { SubscriptionSupabaseRepository } from '../../subscriptions/subscription-supabase.repository'
import { UserSupabaseRepository } from '../../auth/user-supabase.repository'
import { EventEmitter2 } from '@nestjs/event-emitter'
import Stripe from 'stripe'

@Processor(QUEUE_NAMES.PAYMENTS)
@Injectable()
export class PaymentProcessor extends BaseProcessor<PaymentJobData> {
	constructor(
		private readonly stripeService: StripeService,
		private readonly subscriptionRepository: SubscriptionSupabaseRepository,
		private readonly userRepository: UserSupabaseRepository,
		private readonly eventEmitter: EventEmitter2
	) {
		super('PaymentProcessor')
	}

	@Process('process-charge')
	async handleCharge(job: Job<PaymentJobData>): Promise<void> {
		const result = await this.handleJob(job)
		if (!result.success) {
			throw new Error(result.error || 'Payment processing failed')
		}
	}

	@Process('process-refund')
	async handleRefund(job: Job<PaymentJobData>): Promise<void> {
		const result = await this.handleJob(job)
		if (!result.success) {
			throw new Error(result.error || 'Payment refund failed')
		}
	}

	@Process('process-subscription')
	async handleSubscription(job: Job<PaymentJobData>): Promise<void> {
		const result = await this.handleJob(job)
		if (!result.success) {
			throw new Error(result.error || 'Subscription processing failed')
		}
	}

	@Process('process-invoice')
	async handleInvoice(job: Job<PaymentJobData>): Promise<void> {
		const result = await this.handleJob(job)
		if (!result.success) {
			throw new Error(result.error || 'Invoice processing failed')
		}
	}

	/**
	 * Main processing method implementing BaseProcessor interface
	 */
	protected async processJob(
		job: Job<PaymentJobData>
	): Promise<ProcessorResult> {
		this.validateJobData(job.data)

		const { type, paymentId } = job.data

		await this.updateProgress(job, 25, `Starting ${type} processing`)

		switch (type) {
			case 'charge':
				await this.processPaymentCharge(job.data)
				break
			case 'refund':
				await this.processPaymentRefund(job.data)
				break
			case 'subscription':
				await this.processSubscriptionPayment(job.data)
				break
			case 'invoice':
				await this.processInvoicePayment(job.data)
				break
			default:
				throw new Error(`Unknown payment type: ${type}`)
		}

		await this.updateProgress(job, 100, `${type} processing completed`)

		return {
			success: true,
			data: { paymentId, type },
			processingTime: 0, // Will be set by base class
			timestamp: new Date()
		}
	}

	/**
	 * Override validation for payment-specific rules
	 */
	protected override validateJobData(data: PaymentJobData): void {
		super.validateJobData(data)

		if (!data.paymentId) {
			throw new Error('paymentId is required')
		}

		if (!data.customerId) {
			throw new Error('customerId is required')
		}

		if (
			!data.type ||
			!['charge', 'refund', 'subscription', 'invoice'].includes(data.type)
		) {
			throw new Error('Invalid payment type')
		}

		if (data.type === 'charge' && (!data.amount || data.amount <= 0)) {
			throw new Error(
				'Amount is required and must be positive for charges'
			)
		}
	}

	// Sanitization handled by base class using DataSanitizationService

	private async processPaymentCharge(data: PaymentJobData): Promise<void> {
		try {
			this.logger.log(`Processing payment charge: ${data.paymentId}`)

			// Validate payment data
			if (!data.paymentId || !data.customerId) {
				throw new Error('Missing required payment data')
			}

			// Process charge via Stripe
			const paymentIntent =
				await this.stripeService.client.paymentIntents.confirm(
					data.paymentId,
					{
						return_url: `${process.env.FRONTEND_URL}/payment/success`
					}
				)

			if (paymentIntent.status === 'succeeded') {
				// Update payment status in database
				await this.updatePaymentStatus(data.paymentId, 'succeeded')

				// Send confirmation notifications
				await this.sendPaymentConfirmation(data.customerId, data)

				// Emit success event for analytics
				this.eventEmitter.emit('payment.charge.succeeded', {
					paymentId: data.paymentId,
					customerId: data.customerId,
					amount: data.amount,
					currency: data.currency || 'usd'
				})

				this.logger.log(`Payment charge succeeded: ${data.paymentId}`)
			} else {
				throw new Error(`Payment failed: ${paymentIntent.status}`)
			}
		} catch (error) {
			this.logger.error(`Payment charge failed: ${data.paymentId}`, error)

			// Emit failure event for analytics
			this.eventEmitter.emit('payment.charge.failed', {
				paymentId: data.paymentId,
				customerId: data.customerId,
				error: error instanceof Error ? error.message : 'Unknown error'
			})

			throw error
		}
	}

	private async processPaymentRefund(data: PaymentJobData): Promise<void> {
		try {
			this.logger.log(`Processing payment refund: ${data.paymentId}`)

			// Validate refund request
			if (!data.paymentId || !data.customerId) {
				throw new Error('Missing required refund data')
			}

			// Create refund via Stripe
			const refund = await this.stripeService.client.refunds.create({
				payment_intent: data.paymentId,
				amount: data.amount,
				reason:
					(data.refundReason as
						| 'duplicate'
						| 'fraudulent'
						| 'requested_by_customer'
						| undefined) || 'requested_by_customer',
				metadata: {
					customerId: data.customerId,
					processedBy: 'payment-processor'
				}
			})

			if (refund.status === 'succeeded') {
				// Update refund status in database
				await this.updateRefundStatus(
					data.paymentId,
					refund.id,
					'succeeded'
				)

				// Send refund notifications
				await this.sendRefundConfirmation(data.customerId, data, refund)

				// Emit success event for analytics
				this.eventEmitter.emit('payment.refund.succeeded', {
					paymentId: data.paymentId,
					refundId: refund.id,
					customerId: data.customerId,
					amount: refund.amount,
					currency: refund.currency
				})

				this.logger.log(`Payment refund succeeded: ${refund.id}`)
			} else {
				throw new Error(`Refund failed: ${refund.status}`)
			}
		} catch (error) {
			this.logger.error(`Payment refund failed: ${data.paymentId}`, error)

			// Emit failure event for analytics
			this.eventEmitter.emit('payment.refund.failed', {
				paymentId: data.paymentId,
				customerId: data.customerId,
				error: error instanceof Error ? error.message : 'Unknown error'
			})

			throw error
		}
	}

	private async processSubscriptionPayment(
		data: PaymentJobData
	): Promise<void> {
		try {
			this.logger.log(
				`Processing subscription payment: ${data.paymentId}`
			)

			// Validate subscription payment data
			if (!data.paymentId || !data.customerId) {
				throw new Error('Missing required subscription payment data')
			}

			// Get subscription details from Stripe
			const subscription =
				(await this.stripeService.client.subscriptions.retrieve(
					data.paymentId
				)) as Stripe.Subscription

			// Handle recurring payment processing
			if (subscription.status === 'active') {
				// Update subscription status in database
				await this.subscriptionRepository.updateStatusByStripeId(
					subscription.id,
					'ACTIVE'
				)

				// Send subscription payment confirmation
				await this.sendSubscriptionPaymentConfirmation(
					data.customerId,
					data,
					subscription
				)

				// Emit success event for analytics
				this.eventEmitter.emit('payment.subscription.succeeded', {
					subscriptionId: subscription.id,
					customerId: data.customerId,
					status: subscription.status,
					currentPeriodEnd:
						(
							subscription as Stripe.Subscription & {
								current_period_end?: number
							}
						).current_period_end || Date.now() / 1000
				})

				this.logger.log(
					`Subscription payment succeeded: ${subscription.id}`
				)
			} else {
				throw new Error(
					`Subscription payment failed: ${subscription.status}`
				)
			}
		} catch (error) {
			this.logger.error(
				`Subscription payment failed: ${data.paymentId}`,
				error
			)

			// Emit failure event for analytics
			this.eventEmitter.emit('payment.subscription.failed', {
				subscriptionId: data.paymentId,
				customerId: data.customerId,
				error: error instanceof Error ? error.message : 'Unknown error'
			})

			throw error
		}
	}

	private async processInvoicePayment(data: PaymentJobData): Promise<void> {
		try {
			this.logger.log(`Processing invoice payment: ${data.paymentId}`)

			// Validate invoice payment data
			if (!data.paymentId || !data.customerId) {
				throw new Error('Missing required invoice payment data')
			}

			// Get invoice details from Stripe
			const invoice = await this.stripeService.client.invoices.retrieve(
				data.paymentId
			)

			// Process invoice payment
			if (invoice.status === 'paid') {
				// Apply payment to outstanding balance (handled by Stripe)
				// Update local records if needed

				// Generate payment receipt and send confirmation
				await this.sendInvoicePaymentConfirmation(
					data.customerId,
					data,
					invoice
				)

				// Emit success event for analytics
				const subscriptionId = (
					invoice as { subscription?: string | null }
				).subscription
				this.eventEmitter.emit('payment.invoice.succeeded', {
					invoiceId: invoice.id,
					customerId: data.customerId,
					amount: invoice.amount_paid,
					currency: invoice.currency,
					subscriptionId: subscriptionId
				})

				this.logger.log(`Invoice payment succeeded: ${invoice.id}`)
			} else {
				throw new Error(`Invoice payment failed: ${invoice.status}`)
			}
		} catch (error) {
			this.logger.error(
				`Invoice payment failed: ${data.paymentId}`,
				error
			)

			// Emit failure event for analytics
			this.eventEmitter.emit('payment.invoice.failed', {
				invoiceId: data.paymentId,
				customerId: data.customerId,
				error: error instanceof Error ? error.message : 'Unknown error'
			})

			throw error
		}
	}

	/**
	 * Update payment status in database/audit log
	 */
	private async updatePaymentStatus(
		paymentId: string,
		status: string
	): Promise<void> {
		this.logger.debug(`Updating payment ${paymentId} status to ${status}`)

		// TODO: you would update a PaymentAttempt or PaymentLog table
		// For now, we'll just emit an event for audit tracking
		this.eventEmitter.emit('payment.status.updated', {
			paymentId,
			status,
			timestamp: new Date().toISOString()
		})
	}

	/**
	 * Update refund status in database/audit log
	 */
	private async updateRefundStatus(
		paymentId: string,
		refundId: string,
		status: string
	): Promise<void> {
		this.logger.debug(`Updating refund ${refundId} status to ${status}`)

		// Emit event for audit tracking
		this.eventEmitter.emit('refund.status.updated', {
			paymentId,
			refundId,
			status,
			timestamp: new Date().toISOString()
		})
	}

	/**
	 * Send payment confirmation notification
	 */
	private async sendPaymentConfirmation(
		customerId: string,
		data: PaymentJobData
	): Promise<void> {
		try {
			// Get user details
			const user =
				await this.userRepository.findByStripeCustomerId(customerId)

			if (user) {
				this.eventEmitter.emit('payment.confirmation', {
					type: 'payment_confirmed',
					userId: user.id,
					email: user.email,
					templateData: {
						userName: user.name || 'valued customer',
						paymentId: data.paymentId,
						amount: data.amount
							? (data.amount / 100).toFixed(2)
							: '0.00',
						currency: data.currency?.toUpperCase() || 'USD',
						receiptUrl: `${process.env.FRONTEND_URL}/billing/receipt/${data.paymentId}`
					},
					metadata: {
						paymentId: data.paymentId,
						customerId,
						source: 'payment_processor'
					}
				})
			}
		} catch (error) {
			this.logger.error('Failed to send payment confirmation:', error)
		}
	}

	/**
	 * Send refund confirmation notification
	 */
	private async sendRefundConfirmation(
		customerId: string,
		data: PaymentJobData,
		refund: Stripe.Refund
	): Promise<void> {
		try {
			const user =
				await this.userRepository.findByStripeCustomerId(customerId)

			if (user) {
				this.eventEmitter.emit('refund.confirmation', {
					type: 'refund_confirmed',
					userId: user.id,
					email: user.email,
					templateData: {
						userName: user.name || 'valued customer',
						refundId: refund.id,
						originalPaymentId: data.paymentId,
						amount: (refund.amount / 100).toFixed(2),
						currency: refund.currency.toUpperCase(),
						reason: data.refundReason || 'Customer request'
					},
					metadata: {
						refundId: refund.id,
						paymentId: data.paymentId,
						customerId,
						source: 'payment_processor'
					}
				})
			}
		} catch (error) {
			this.logger.error('Failed to send refund confirmation:', error)
		}
	}

	/**
	 * Send subscription payment confirmation
	 */
	private async sendSubscriptionPaymentConfirmation(
		customerId: string,
		_data: PaymentJobData,
		subscription: Stripe.Subscription
	): Promise<void> {
		try {
			const user =
				await this.userRepository.findByStripeCustomerId(customerId)
			if (user) {
				this.eventEmitter.emit('subscription.payment_confirmed', {
					type: 'subscription_payment_confirmed',
					userId: user.id,
					email: user.email,
					templateData: {
						userName: user.name || 'valued customer',
						subscriptionId: subscription.id,
						planName:
							subscription.metadata?.planName || 'Subscription',
						nextBillingDate: new Date(
							((
								subscription as Stripe.Subscription & {
									current_period_end?: number
								}
							).current_period_end ??
								Math.floor(Date.now() / 1000)) * 1000
						).toLocaleDateString(),
						amount: subscription.items?.data[0]?.price?.unit_amount
							? (
									subscription.items.data[0].price
										.unit_amount / 100
								).toFixed(2)
							: '0.00',
						currency:
							subscription.items?.data[0]?.price?.currency?.toUpperCase() ||
							'USD'
					},
					metadata: {
						subscriptionId: subscription.id,
						customerId,
						source: 'payment_processor'
					}
				})
			}
		} catch (error) {
			this.logger.error(
				'Failed to send subscription payment confirmation:',
				error
			)
		}
	}

	/**
	 * Send invoice payment confirmation
	 */
	private async sendInvoicePaymentConfirmation(
		customerId: string,
		_data: PaymentJobData,
		invoice: Stripe.Invoice
	): Promise<void> {
		try {
			const user =
				await this.userRepository.findByStripeCustomerId(customerId)

			if (user) {
				this.eventEmitter.emit('invoice.payment_confirmed', {
					type: 'invoice_payment_confirmed',
					userId: user.id,
					email: user.email,
					templateData: {
						userName: user.name || 'valued customer',
						invoiceId: invoice.id,
						invoiceNumber: invoice.number,
						amount: (invoice.amount_paid / 100).toFixed(2),
						currency: invoice.currency.toUpperCase(),
						paidDate: invoice.status_transitions?.paid_at
							? new Date(
									invoice.status_transitions.paid_at * 1000
								).toLocaleDateString()
							: new Date().toLocaleDateString(),
						invoiceUrl: invoice.hosted_invoice_url
					},
					metadata: {
						invoiceId: invoice.id,
						customerId,
						source: 'payment_processor'
					}
				})
			}
		} catch (error) {
			this.logger.error(
				'Failed to send invoice payment confirmation:',
				error
			)
		}
	}
}
