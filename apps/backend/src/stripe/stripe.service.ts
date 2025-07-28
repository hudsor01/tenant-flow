import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'
import { STRIPE_ERRORS } from '@tenantflow/shared/types/billing'



@Injectable()
export class StripeService {
	private readonly logger = new Logger(StripeService.name)
	private _stripe: Stripe | null = null

	constructor(private readonly configService: ConfigService) {
		this.logger.log('StripeService constructor called')
	}

	private get stripe(): Stripe {
		if (!this._stripe) {
			const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY')
			if (!secretKey) {
				throw new Error(STRIPE_ERRORS.CONFIGURATION_ERROR + ': Missing STRIPE_SECRET_KEY')
			}

			this._stripe = new Stripe(secretKey, {
				apiVersion: '2025-06-30.basil',
				typescript: true
			})

			this.logger.log('Stripe SDK initialized')
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
		try {
			return await this.stripe.customers.create({
				email: params.email,
				name: params.name,
				metadata: params.metadata
			})
		} catch (error) {
			this.handleStripeError(error as Error | Stripe.errors.StripeError)
		}
	}

	async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
		try {
			const customer = await this.stripe.customers.retrieve(customerId)
			if (customer.deleted) {
				return null
			}
			return customer as Stripe.Customer
		} catch (error) {
			if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') {
				return null
			}
			throw error
		}
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

			// Note: Removed billing_mode as it's not part of the current Stripe API

			return await this.stripe.checkout.sessions.create(sessionParams)
		} catch (error) {
			this.handleStripeError(error as Error | Stripe.errors.StripeError)
		}
	}

	async createPortalSession(params: {
		customerId: string
		returnUrl: string
	}): Promise<Stripe.BillingPortal.Session> {
		try {
			return await this.stripe.billingPortal.sessions.create({
				customer: params.customerId,
				return_url: params.returnUrl
			})
		} catch (error) {
			this.handleStripeError(error as Error | Stripe.errors.StripeError)
		}
	}

	async getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
		try {
			return await this.stripe.subscriptions.retrieve(subscriptionId)
		} catch (error) {
			if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') {
				return null
			}
			throw error
		}
	}

	async updateSubscription(
		subscriptionId: string,
		params: Stripe.SubscriptionUpdateParams
	): Promise<Stripe.Subscription> {
		try {
			return await this.stripe.subscriptions.update(subscriptionId, params)
		} catch (error) {
			this.handleStripeError(error as Error | Stripe.errors.StripeError)
		}
	}

	async cancelSubscription(
		subscriptionId: string,
		immediately = false
	): Promise<Stripe.Subscription> {
		try {
			if (immediately) {
				return await this.stripe.subscriptions.cancel(subscriptionId)
			}
			return await this.stripe.subscriptions.update(subscriptionId, {
				cancel_at_period_end: true
			})
		} catch (error) {
			this.handleStripeError(error as Error | Stripe.errors.StripeError)
		}
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
		try {
			return await this.stripe.invoices.createPreview({
				customer: params.customerId,
				subscription: params.subscriptionId
			})
		} catch (error) {
			this.handleStripeError(error as Error | Stripe.errors.StripeError)
		}
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
	): Promise<Stripe.Subscription> {
		try {
			return await this.stripe.subscriptions.update(subscriptionId, {
				items: params.items,
				proration_behavior: params.prorationBehavior || 'create_prorations',
				proration_date: params.prorationDate
			})
		} catch (error) {
			this.handleStripeError(error as Error | Stripe.errors.StripeError)
		}
	}

	constructWebhookEvent(
		payload: string | Buffer, 
		signature: string, 
		secret: string, 
		tolerance?: number
	): Stripe.Event {
		try {
			return this.stripe.webhooks.constructEvent(payload, signature, secret, tolerance)
		} catch (error) {
			this.logger.error('Failed to construct webhook event', error)
			throw new Error(STRIPE_ERRORS.WEBHOOK_SIGNATURE_INVALID)
		}
	}

	private handleStripeError(error: Error | Stripe.errors.StripeError): never {
		if (error instanceof Stripe.errors.StripeError) {
			switch (error.type) {
				case 'StripeCardError':
					this.logger.warn('Card error:', error.message)
					throw new Error(STRIPE_ERRORS.CARD_DECLINED)
				case 'StripeRateLimitError':
					this.logger.warn('Rate limit exceeded:', error.message)
					throw new Error(STRIPE_ERRORS.RATE_LIMIT_EXCEEDED)
				case 'StripeInvalidRequestError':
					this.logger.error('Invalid request:', error.message)
					throw new Error(STRIPE_ERRORS.INVALID_REQUEST)
				case 'StripeAPIError':
					this.logger.error('Stripe API error:', error.message)
					throw new Error(STRIPE_ERRORS.PROCESSING_ERROR)
				case 'StripeConnectionError':
					this.logger.error('Connection error:', error.message)
					throw new Error(STRIPE_ERRORS.API_CONNECTION_ERROR)
				case 'StripeAuthenticationError':
					this.logger.error('Authentication error:', error.message)
					throw new Error(STRIPE_ERRORS.AUTHENTICATION_FAILED)
				default:
					this.logger.error('Unknown Stripe error:', error.message)
					throw new Error(STRIPE_ERRORS.PROCESSING_ERROR)
			}
		}
		
		this.logger.error('Non-Stripe error:', error)
		throw error
	}
}