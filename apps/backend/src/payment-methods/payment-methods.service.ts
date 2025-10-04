import { Injectable, Logger } from '@nestjs/common'
import Stripe from 'stripe'
import { SupabaseService } from '../database/supabase.service'

@Injectable()
export class PaymentMethodsService {
	private readonly logger = new Logger(PaymentMethodsService.name)
	private readonly stripe: Stripe

	constructor(private readonly supabase: SupabaseService) {
		this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
			apiVersion: '2025-08-27' as Stripe.LatestApiVersion
		})
	}

	/**
	 * Get or create Stripe customer for a user
	 */
	async getOrCreateStripeCustomer(userId: string, email: string) {
		// Check if user already has Stripe customer
		const { data: user } = await this.supabase
			.getAdminClient()
			.from('User')
			.select('stripeCustomerId')
			.eq('id', userId)
			.single()

		if (user?.stripeCustomerId) {
			return user.stripeCustomerId
		}

		// Create new Stripe customer
		this.logger.log(`Creating Stripe customer for user ${userId}`)
		const customer = await this.stripe.customers.create({
			email,
			metadata: { userId }
		})

		// Save customer ID to database
		await this.supabase
			.getAdminClient()
			.from('User')
			.update({ stripeCustomerId: customer.id })
			.eq('id', userId)

		return customer.id
	}

	/**
	 * Create a SetupIntent for saving payment methods
	 * Supports both card and ACH payment methods
	 */
	async createSetupIntent(
		tenantId: string,
		email: string,
		paymentMethodType: 'card' | 'us_bank_account'
	) {
		this.logger.log(`Creating SetupIntent for tenant ${tenantId}`)

		// Get or create Stripe customer
		const stripeCustomerId = await this.getOrCreateStripeCustomer(
			tenantId,
			email
		)

		const setupIntentParams: Stripe.SetupIntentCreateParams = {
			customer: stripeCustomerId,
			payment_method_types: [paymentMethodType],
			usage: 'off_session'
		}

		// Add ACH-specific options for instant verification
		if (paymentMethodType === 'us_bank_account') {
			setupIntentParams.payment_method_options = {
				us_bank_account: {
					verification_method: 'instant', // Use Plaid/Financial Connections
					financial_connections: {
						permissions: ['payment_method', 'balances']
					}
				}
			}
		}

		const setupIntent = await this.stripe.setupIntents.create(setupIntentParams)

		return {
			clientSecret: setupIntent.client_secret,
			setupIntentId: setupIntent.id
		}
	}

	/**
	 * Save payment method to database after confirmation
	 */
	async savePaymentMethod(tenantId: string, stripePaymentMethodId: string) {
		this.logger.log(`Saving payment method for tenant ${tenantId}`)

		const paymentMethod = await this.stripe.paymentMethods.retrieve(
			stripePaymentMethodId
		)

		const { error } = await this.supabase
			.getAdminClient()
			.from('TenantPaymentMethod')
			.insert({
				tenantId,
				stripePaymentMethodId,
				stripeCustomerId: paymentMethod.customer as string,
				type: paymentMethod.type,
				last4:
					paymentMethod.card?.last4 || paymentMethod.us_bank_account?.last4,
				brand: paymentMethod.card?.brand,
				isDefault: true, // First payment method is default
				verificationStatus:
					paymentMethod.type === 'card' ? 'verified' : 'pending'
			})

		if (error) {
			this.logger.error('Failed to save payment method', error)
			throw new Error('Failed to save payment method')
		}

		return { success: true }
	}

	/**
	 * List all payment methods for a tenant
	 */
	async listPaymentMethods(tenantId: string) {
		this.logger.log(`Listing payment methods for tenant ${tenantId}`)

		const { data: paymentMethods, error } = await this.supabase
			.getAdminClient()
			.from('TenantPaymentMethod')
			.select('*')
			.eq('tenantId', tenantId)
			.order('createdAt', { ascending: false })

		if (error) {
			this.logger.error('Failed to list payment methods', error)
			throw new Error('Failed to list payment methods')
		}

		return paymentMethods
	}

	/**
	 * Set a payment method as default
	 */
	async setDefaultPaymentMethod(tenantId: string, paymentMethodId: string) {
		this.logger.log(
			`Setting payment method ${paymentMethodId} as default for tenant ${tenantId}`
		)

		// First, unset all existing defaults for this tenant
		await this.supabase
			.getAdminClient()
			.from('TenantPaymentMethod')
			.update({ isDefault: false })
			.eq('tenantId', tenantId)

		// Then set the new default
		const { error } = await this.supabase
			.getAdminClient()
			.from('TenantPaymentMethod')
			.update({ isDefault: true })
			.eq('id', paymentMethodId)
			.eq('tenantId', tenantId)

		if (error) {
			this.logger.error('Failed to set default payment method', error)
			throw new Error('Failed to set default payment method')
		}

		return { success: true }
	}

	/**
	 * Delete a payment method
	 */
	async deletePaymentMethod(tenantId: string, paymentMethodId: string) {
		this.logger.log(
			`Deleting payment method ${paymentMethodId} for tenant ${tenantId}`
		)

		// Get the payment method from database
		const { data: pm } = await this.supabase
			.getAdminClient()
			.from('TenantPaymentMethod')
			.select('stripePaymentMethodId')
			.eq('id', paymentMethodId)
			.eq('tenantId', tenantId)
			.single()

		if (!pm) {
			throw new Error('Payment method not found')
		}

		// Detach from Stripe
		await this.stripe.paymentMethods.detach(pm.stripePaymentMethodId)

		// Delete from database
		const { error } = await this.supabase
			.getAdminClient()
			.from('TenantPaymentMethod')
			.delete()
			.eq('id', paymentMethodId)
			.eq('tenantId', tenantId)

		if (error) {
			this.logger.error('Failed to delete payment method', error)
			throw new Error('Failed to delete payment method')
		}

		return { success: true }
	}
}
