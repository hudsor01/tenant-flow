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

import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PinoLogger } from 'nestjs-pino'
import Stripe from 'stripe'
import type { EnvironmentVariables } from '../config/config.schema'
import { SupabaseService } from '../database/supabase.service'

@Injectable()
export class StripePortalService {
	private readonly stripe: Stripe
	private readonly frontendUrl: string

	constructor(
		private configService: ConfigService<EnvironmentVariables>,
		private readonly supabaseService: SupabaseService,
		private readonly logger: PinoLogger
	) {
		// PinoLogger context handled automatically via app-level configuration
		if (!this.configService) {
			throw new InternalServerErrorException('ConfigService not available - check module imports')
		}
		
		const secretKey = this.configService.get('STRIPE_SECRET_KEY', {
			infer: true
		})
		if (!secretKey) {
			throw new InternalServerErrorException('STRIPE_SECRET_KEY is required')
		}

        this.stripe = new Stripe(secretKey, {
            apiVersion: '2025-08-27.basil'
        })

		this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
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
	}): Promise<{ url: string; sessionId: string }> {
		// Get or create Stripe customer
		const { data: user, error: userError } = await this.supabaseService
			.getAdminClient()
			.from('User')
			.select(`
				id,
				email,
				name,
				Subscription (
					stripeCustomerId
				)
			`)
			.eq('id', params.userId)
			.single()

		if (userError || !user) {
			throw new NotFoundException('User not found')
		}

		let customerId = user.Subscription?.[0]?.stripeCustomerId

		if (!customerId) {
			const customer = await this.stripe.customers.create({
				email: user.email,
				name: user.name || undefined,
				metadata: { userId: params.userId }
			})
			customerId = customer.id

			// Store customer ID for future use - create or update subscription record
			await this.supabaseService
				.getAdminClient()
				.from('Subscription')
				.upsert({
					userId: params.userId,
					stripeCustomerId: customerId,
					status: 'INCOMPLETE'
				})
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
				params.successUrl ||
				`${this.frontendUrl}/dashboard?success=true`,
			cancel_url:
				params.cancelUrl || `${this.frontendUrl}/pricing?canceled=true`,
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

		this.logger.info(
			`Created checkout session: ${session.id} for user: ${params.userId}`
		)

		if (!session.url) {
			throw new InternalServerErrorException('Checkout session URL not available')
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
	}): Promise<{ url: string }> {
		// Get user's Stripe customer ID
		const { data: user, error: userError } = await this.supabaseService
			.getAdminClient()
			.from('User')
			.select(`
				id,
				Subscription (
					stripeCustomerId
				)
			`)
			.eq('id', params.userId)
			.single()

		if (userError || !user) {
			throw new NotFoundException('User not found')
		}

		const customerId = user.Subscription?.[0]?.stripeCustomerId
		if (!customerId) {
			throw new BadRequestException('No Stripe customer found for user')
		}

		// Create portal session
		const session = await this.stripe.billingPortal.sessions.create({
			customer: customerId,
			return_url: params.returnUrl || `${this.frontendUrl}/dashboard`
		})

		this.logger.info(`Created portal session for user: ${params.userId}`)

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
