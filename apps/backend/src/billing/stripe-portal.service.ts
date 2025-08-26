/**
 * Minimal Stripe Portal Service
 *
 * This service provides only the essential methods needed for Stripe integration:
 * 1. Create checkout sessions for new subscriptions
 * 2. Create portal sessions for subscription management
 *
 * Everything else is handled by Stripe's Customer Portal:
 * - Plan upgrades/downgrades
 * - Quantity changes
 * - Payment method updates
 * - Cancellations
 * - Invoice history
 *
 * Replaces: stripe-billing.service.ts (878 lines) with ~50 lines
 */

import {
	Injectable,
	Logger,
	Inject,
	NotFoundException,
	InternalServerErrorException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'
import type { CheckoutResponse, PortalResponse } from '@repo/shared'
import type { EnvironmentVariables } from '../config/config.schema'
import { SupabaseService } from '../database/supabase.service'

@Injectable()
export class StripePortalService {
	private readonly logger = new Logger(StripePortalService.name)
	private readonly stripe: Stripe
	private readonly frontendUrl: string

	constructor(
		@Inject(ConfigService)
		private configService: ConfigService<EnvironmentVariables>,
		private supabaseService: SupabaseService
	) {
		const secretKey = this.configService.get('STRIPE_SECRET_KEY', {
			infer: true
		})
		if (secretKey === undefined) {
			throw new InternalServerErrorException(
				'STRIPE_SECRET_KEY is required'
			)
		}

		this.stripe = new Stripe(secretKey, {
			apiVersion: '2025-07-30.basil'
		})

		const frontendUrl = this.configService.get('FRONTEND_URL', { infer: true })
		if (!frontendUrl) {
			throw new InternalServerErrorException(
				'FRONTEND_URL is required for production deployment'
			)
		}
		this.frontendUrl = frontendUrl
	}

	/**
	 * Create a checkout session for new subscriptions
	 * This is the ONLY way to create new subscriptions
	 */
	async createCheckoutSession(params: {
		userId: string
		priceId: string
		successUrl?: string
		cancelUrl?: string
	}): Promise<CheckoutResponse> {
		// Get or create Stripe customer
		const { data: user } = await this.supabaseService
			.getAdminClient()
			.from('User')
			.select('*, Subscription(*)')
			.eq('id', params.userId)
			.single()

		if (!user) {
			throw new NotFoundException('User not found')
		}

		let customerId = user.Subscription?.[0]?.stripeCustomerId

		if (!customerId) {
			const customer = await this.stripe.customers.create({
				email: user.email,
				name: user.name ?? undefined,
				metadata: { userId: params.userId }
			})
			customerId = customer.id

			// Store customer ID for future use
			await this.supabaseService
				.getAdminClient()
				.from('User')
				.update({ stripeCustomerId: customerId })
				.eq('id', params.userId)
		}

		// Create checkout session
		const session = await this.stripe.checkout.sessions.create({
			customer: customerId,
			line_items: [
				{
					price: params.priceId,
					quantity: 1
				}
			],
			mode: 'subscription',
			success_url:
				params.successUrl ??
				`${this.frontendUrl}/dashboard?success=true`,
			cancel_url:
				params.cancelUrl ?? `${this.frontendUrl}/pricing?canceled=true`,
			// Allow promotion codes
			allow_promotion_codes: true,
			// Collect billing address for tax calculation
			billing_address_collection: 'auto',
			// Save payment method for future use
			payment_method_collection: 'if_required',
			// Enable automatic tax calculation if configured
			automatic_tax: { enabled: true },
			// Add subscription metadata
			subscription_data: {
				metadata: {
					userId: params.userId
				}
			}
		})

		this.logger.log(
			`Created checkout session: ${session.id} for user: ${params.userId}`
		)

		if (!session.url) {
			throw new InternalServerErrorException(
				'Checkout session URL not available'
			)
		}

		return {
			url: session.url,
			sessionId: session.id
		}
	}

	/**
	 * Create a customer portal session for subscription management
	 * The portal handles EVERYTHING - upgrades, downgrades, cancellations, payment methods
	 */
	async createPortalSession(params: {
		userId: string
		returnUrl?: string
	}): Promise<PortalResponse> {
		// Get user's Stripe customer ID
		const { data: user } = await this.supabaseService
			.getAdminClient()
			.from('User')
			.select('*, Subscription(*)')
			.eq('id', params.userId)
			.single()
		if (!user) {
			throw new NotFoundException('User not found')
		}

		const customerId = user.Subscription?.[0]?.stripeCustomerId
		if (!customerId) {
			throw new NotFoundException('No Stripe customer found for user')
		}

		// Create portal session
		const session = await this.stripe.billingPortal.sessions.create({
			customer: customerId,
			return_url: params.returnUrl ?? `${this.frontendUrl}/dashboard`
		})

		this.logger.log(`Created portal session for user: ${params.userId}`)

		return { url: session.url }
	}

	/**
	 * Get Stripe client for webhook verification
	 * This is needed by the webhook controller
	 */
	get client(): Stripe {
		return this.stripe
	}
}
