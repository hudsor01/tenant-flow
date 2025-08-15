import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'
import { STRIPE_ERRORS } from '@repo/shared'
import { StripeErrorHandler } from './stripe-error.handler'
import { StripeSubscription, StripeSubscriptionUpdateParams } from '@repo/shared/types/stripe'



@Injectable()
export class StripeService {
	private readonly logger = new Logger(StripeService.name)
	private _stripe: Stripe | null = null

	constructor(
		private readonly configService: ConfigService,
		private readonly errorHandler: StripeErrorHandler
	) {
		// PERFORMANCE: Lazy initialize Stripe on first use
	}

	private get stripe(): Stripe {
		if (!this._stripe) {
			const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY')
			if (!secretKey) {
				throw new Error(STRIPE_ERRORS.CONFIGURATION_ERROR + ': Missing STRIPE_SECRET_KEY')
			}

			// Initialize Stripe with minimal options
			this._stripe = new Stripe(secretKey, {
				apiVersion: '2025-07-30.basil',
				typescript: true,
				timeout: 5000,
			})
			// Stripe client is ready for use
			// No logging needed - Stripe platform provides all activity logs
		}
		return this._stripe
	}

	get client(): Stripe {
		return this.stripe
	}

	async createCustomer(params: {
		email: string
		name?: string
		metadata?: Record<string, string>
	}): Promise<Stripe.Customer> {
		return await this.errorHandler.wrapAsync(
			() => this.stripe.customers.create({
				email: params.email,
				name: params.name,
				metadata: params.metadata
			}),
			'createCustomer'
		)
	}

	async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
		return await this.errorHandler.wrapAsync(
			async () => {
				try {
					const customer = await this.stripe.customers.retrieve(customerId)
					if (customer.deleted) {
						return null
					}
					return customer as Stripe.Customer
				} catch (error: unknown) {
					const stripeError = error as Stripe.StripeRawError
					if (stripeError?.type === 'invalid_request_error' && stripeError?.code === 'resource_missing') {
						return null
					}
					throw error
				}
			},
			'getCustomer'
		)
	}

	async createCheckoutSession(params: {
		customerId?: string
		customerEmail?: string
		priceId?: string
		mode: 'payment' | 'setup' | 'subscription'
		successUrl: string
		cancelUrl: string
		metadata?: Record<string, string>
		subscriptionData?: {
			trialPeriodDays?: number
			metadata?: Record<string, string>
			trialSettings?: {
				endBehavior?: {
					missingPaymentMethod?: 'pause' | 'cancel' | 'create_invoice'
				}
			}
		}
		paymentMethodCollection?: 'if_required' | 'always'
		allowPromotionCodes?: boolean
		uiMode?: 'embedded' | 'hosted'
	}): Promise<Stripe.Checkout.Session> {
		try {
			const sessionParams: Stripe.Checkout.SessionCreateParams = {
				mode: params.mode,
				success_url: params.successUrl,
				cancel_url: params.cancelUrl,
				metadata: params.metadata,
				allow_promotion_codes: params.allowPromotionCodes ?? true,
				payment_method_collection: params.paymentMethodCollection,
				ui_mode: params.uiMode,
				automatic_tax: {
					enabled: true
				}
			}

			// Add customer info
			if (params.customerId) {
				sessionParams.customer = params.customerId
			} else if (params.customerEmail) {
				sessionParams.customer_email = params.customerEmail
			}

			// Add line items for subscription mode
			if (params.mode === 'subscription' && params.priceId) {
				sessionParams.line_items = [{
					price: params.priceId,
					quantity: 1
				}]
			}

			// Add subscription data
			if (params.subscriptionData) {
				sessionParams.subscription_data = {
					trial_period_days: params.subscriptionData.trialPeriodDays,
					metadata: params.subscriptionData.metadata
				}
				
				// Add trial settings if provided
				if (params.subscriptionData.trialSettings?.endBehavior) {
					sessionParams.subscription_data.trial_settings = {
						end_behavior: {
							missing_payment_method: params.subscriptionData.trialSettings.endBehavior.missingPaymentMethod || 'create_invoice'
						}
					}
				}
			}

			return await this.stripe.checkout.sessions.create(sessionParams)
		} catch (error) {
			this.logger.error('Failed to create checkout session:', error)
			throw error
		}
	}

	async createPortalSession(params: {
		customerId: string
		returnUrl: string
	}): Promise<Stripe.BillingPortal.Session> {
		return await this.errorHandler.executeWithRetry({
			operation: () => this.stripe.billingPortal.sessions.create({
				customer: params.customerId,
				return_url: params.returnUrl
			}),
			metadata: {
				operation: 'createPortalSession',
				resource: 'portal_session',
				metadata: { customerId: params.customerId }
			}
		})
	}

	async getSubscription(subscriptionId: string): Promise<StripeSubscription | null> {
		return await this.errorHandler.wrapAsync(
			async () => {
				try {
					const subscription = await this.stripe.subscriptions.retrieve(subscriptionId)
					return subscription as unknown as StripeSubscription
				} catch (error: unknown) {
					const stripeError = error as Stripe.StripeRawError
					if (stripeError?.type === 'invalid_request_error' && stripeError?.code === 'resource_missing') {
						return null
					}
					throw error
				}
			},
			'getSubscription'
		)
	}

	async updateSubscription(
		subscriptionId: string,
		params: StripeSubscriptionUpdateParams
	): Promise<StripeSubscription> {
		return await this.errorHandler.executeWithRetry({
			operation: async () => {
				const updateParams: Record<string, unknown> = {
					...params,
					days_until_due: params.days_until_due || undefined,
					default_payment_method: params.default_payment_method || undefined
				}
				// Remove null values that Stripe doesn't accept
				Object.keys(updateParams).forEach(key => {
					if (updateParams[key] === null) {
						delete updateParams[key]
					}
				})
				const subscription = await this.stripe.subscriptions.update(subscriptionId, updateParams)
				return subscription as unknown as StripeSubscription
			},
			metadata: {
				operation: 'updateSubscription',
				resource: 'subscription',
				metadata: { subscriptionId, updateKeysCount: Object.keys(params).length }
			}
		})
	}

	async cancelSubscription(
		subscriptionId: string,
		immediately = false
	): Promise<StripeSubscription> {
		return await this.errorHandler.executeWithRetry({
			operation: async () => {
				let subscription: Stripe.Subscription
				if (immediately) {
					subscription = await this.stripe.subscriptions.cancel(subscriptionId)
				} else {
					subscription = await this.stripe.subscriptions.update(subscriptionId, {
						cancel_at_period_end: true
					})
				}
				return subscription as unknown as StripeSubscription
			},
			metadata: {
				operation: 'cancelSubscription',
				resource: 'subscription',
				metadata: { subscriptionId, immediately }
			}
		})
	}

	async createPreviewInvoice(params: {
		customerId: string
		subscriptionId?: string
		subscriptionItems?: {
			id?: string
			price?: string
			quantity?: number
		}[]
		subscriptionProrationDate?: number
	}): Promise<Stripe.Invoice> {
		return await this.errorHandler.executeWithRetry({
			operation: () => this.stripe.invoices.createPreview({
				customer: params.customerId,
				subscription: params.subscriptionId
			}),
			metadata: {
				operation: 'createPreviewInvoice',
				resource: 'invoice',
				metadata: { customerId: params.customerId, subscriptionId: params.subscriptionId }
			}
		})
	}

	async updateSubscriptionWithProration(
		subscriptionId: string,
		params: {
			items?: {
				id?: string
				price?: string
				quantity?: number
			}[]
			prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
			prorationDate?: number
		}
	): Promise<StripeSubscription> {
		return await this.errorHandler.executeWithRetry({
			operation: async () => {
				const subscription = await this.stripe.subscriptions.update(subscriptionId, {
					items: params.items,
					proration_behavior: params.prorationBehavior || 'create_prorations',
					proration_date: params.prorationDate
				})
				return subscription as unknown as StripeSubscription
			},
			metadata: {
				operation: 'updateSubscriptionWithProration',
				resource: 'subscription',
				metadata: { subscriptionId, prorationBehavior: params.prorationBehavior }
			}
		})
	}

	constructWebhookEvent(
		payload: string | Buffer, 
		signature: string, 
		secret: string, 
		tolerance?: number
	): Stripe.Event {
		return this.errorHandler.wrapSync(
			() => this.stripe.webhooks.constructEvent(payload, signature, secret, tolerance),
			'constructWebhookEvent'
		)
	}
}