import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException
} from '@nestjs/common'
import Stripe from 'stripe'
import { SupabaseService } from '../../database/supabase.service'
import { StripeClientService } from '../../shared/stripe-client.service'

@Injectable()
export class PaymentMethodsService {
	private readonly logger = new Logger(PaymentMethodsService.name)
	private readonly stripe: Stripe

	constructor(
		private readonly supabase: SupabaseService,
		private readonly stripeClientService: StripeClientService
	) {
		this.stripe = this.stripeClientService.getClient()
	} /**
	 * Get or create Stripe customer for a user.
	 * Caches the Stripe customer ID on the User record to avoid duplicate customers.
	 */
	async getOrCreateStripeCustomer(userId: string, email?: string) {
		const adminClient = this.supabase.getAdminClient()

		const { data: user, error } = await adminClient
			.from('users')
			.select('stripeCustomerId, email')
			.eq('id', userId)
			.single()

		if (error) {
			this.logger.error('Failed to load user while resolving Stripe customer', {
				userId,
				error: error.message
			})
			throw new NotFoundException('User not found for Stripe customer lookup')
		}

		if (user?.stripeCustomerId) {
			return user.stripeCustomerId
		}

		this.logger.log(`Creating Stripe customer for user ${userId}`)
		const customerParams: Stripe.CustomerCreateParams = {
			metadata: { userId }
		}
		const resolvedEmail = email || user?.email
		if (resolvedEmail) {
			customerParams.email = resolvedEmail
		}

		//Add idempotency key to prevent duplicate customers
		// Include timestamp to allow retries after failures (Stripe idempotency keys expire after 24h)
		const idempotencyKey = `customer-create-${userId}-${Date.now()}`
		const customer = await this.stripe.customers.create(customerParams, {
			idempotencyKey
		})

		const { error: updateError } = await adminClient
			.from('users')
			.update({
				stripeCustomerId: customer.id,
				updatedAt: new Date().toISOString()
			})
			.eq('id', userId)

		if (updateError) {
			this.logger.error('Failed to persist Stripe customer ID', {
				userId,
				error: updateError.message
			})
		}

		return customer.id
	}

	/**
	 * DRY: Resolve tenant ID from auth user ID
	 *
	 * Prevents code duplication across listPaymentMethods/setDefaultPaymentMethod/deletePaymentMethod.
	 * RLS policies check: tenant.auth_user_id = auth.uid()
	 *
	 * @param token - JWT token for RLS-protected Supabase client
	 * @param userId - Auth user ID (NOT tenant table ID)
	 * @returns Tenant ID from tenant table
	 * @throws NotFoundException if tenant not found for user
	 */
	private async resolveTenantId(
		token: string,
		userId: string
	): Promise<string> {
		const client = this.supabase.getUserClient(token)

		const { data: tenant, error: tenantError } = await client
			.from('tenant')
			.select('id')
			.eq('auth_user_id', userId)
			.single()

		if (tenantError || !tenant) {
			this.logger.warn('Tenant not found for user', { userId })
			throw new NotFoundException('Tenant not found')
		}

		return tenant.id
	}

	/**
	 * List payment methods saved by the authenticated tenant.
	 */
	async listPaymentMethods(token: string, userId: string) {
		if (!token) {
			this.logger.warn('List payment methods requested without token')
			throw new BadRequestException('Authentication token is required')
		}

		// Resolve tenant ID from auth_user_id using DRY helper
		const tenantId = await this.resolveTenantId(token, userId)
		const client = this.supabase.getUserClient(token)

		// Now query payment methods using the correct tenant ID
		const { data, error } = await client
			.from('tenant_payment_method')
			.select(
				'id, tenantId, stripePaymentMethodId, type, last4, brand, bankName, isDefault, verificationStatus, createdAt, updatedAt'
			)
			.eq('tenantId', tenantId)
			.order('createdAt', { ascending: false })

		if (error) {
			this.logger.error('Failed to fetch tenant payment methods', {
				userId,
				error: error.message
			})
			throw new BadRequestException('Failed to load payment methods')
		}

		return data ?? []
	}

	/**
	 * Mark a tenant payment method as the default option.
	 */
	async setDefaultPaymentMethod(
		token: string,
		userId: string,
		paymentMethodId: string
	) {
		if (!token) {
			this.logger.warn('Set default payment method requested without token')
			throw new BadRequestException('Authentication token is required')
		}

		const client = this.supabase.getUserClient(token)

		// Get tenant with Stripe customer ID
		const { data: tenant, error: tenantError } = await client
			.from('tenant')
			.select('id, stripe_customer_id')
			.eq('auth_user_id', userId)
			.single()

		if (tenantError || !tenant) {
			this.logger.warn('Tenant not found for user', {
				userId,
				error: tenantError?.message
			})
			throw new NotFoundException('Tenant not found')
		}

		if (!tenant.stripe_customer_id) {
			this.logger.warn('No Stripe customer for tenant', {
				userId,
				tenantId: tenant.id
			})
			throw new BadRequestException('No Stripe customer found for tenant')
		}

		try {
			// Verify payment method belongs to this customer
			const paymentMethod =
				await this.stripe.paymentMethods.retrieve(paymentMethodId)

			if (paymentMethod.customer !== tenant.stripe_customer_id) {
				throw new BadRequestException(
					'Payment method does not belong to this customer'
				)
			}

			// Set as default on Stripe customer
			await this.stripe.customers.update(tenant.stripe_customer_id, {
				invoice_settings: {
					default_payment_method: paymentMethodId
				}
			})

			this.logger.log('Set default payment method via Stripe API', {
				userId,
				tenantId: tenant.id,
				paymentMethodId
			})

			return { success: true }
		} catch (error) {
			this.logger.error('Failed to set default payment method', {
				userId,
				paymentMethodId,
				error: error instanceof Error ? error.message : String(error)
			})
			throw new BadRequestException('Failed to set default payment method')
		}
	}

	/**
	 * Delete a tenant payment method both in Stripe and in the database.
	 * If the deleted method was default, promote the next oldest method.
	 */
	async deletePaymentMethod(
		token: string,
		userId: string,
		paymentMethodId: string
	) {
		if (!token) {
			this.logger.warn('Delete payment method requested without token')
			throw new BadRequestException('Authentication token is required')
		}

		const client = this.supabase.getUserClient(token)

		// Resolve tenant ID from auth user ID
		const { data: tenant, error: tenantError } = await client
			.from('tenant')
			.select('id')
			.eq('auth_user_id', userId)
			.single()

		if (tenantError || !tenant) {
			this.logger.warn('Tenant not found for user', {
				userId,
				error: tenantError?.message
			})
			throw new NotFoundException('Tenant not found')
		}

		const { data: paymentMethod, error: fetchError } = await client
			.from('tenant_payment_method')
			.select('stripePaymentMethodId, isDefault')
			.eq('id', paymentMethodId)
			.eq('tenantId', tenant.id)
			.single()

		if (fetchError || !paymentMethod) {
			this.logger.warn('Attempted to delete unknown payment method', {
				userId,
				paymentMethodId,
				error: fetchError?.message
			})
			throw new NotFoundException('Payment method not found')
		}

		if (paymentMethod.stripePaymentMethodId) {
			await this.stripe.paymentMethods.detach(
				paymentMethod.stripePaymentMethodId
			)
		}

		const { error } = await client
			.from('tenant_payment_method')
			.delete()
			.eq('id', paymentMethodId)
			.eq('tenantId', tenant.id)

		if (error) {
			this.logger.error('Failed to delete payment method', {
				userId,
				paymentMethodId,
				error: error.message
			})
			throw new BadRequestException('Failed to delete payment method')
		}

		if (paymentMethod.isDefault) {
			const { data: nextDefault } = await client
				.from('tenant_payment_method')
				.select('id')
				.eq('tenantId', tenant.id)
				.order('createdAt', { ascending: true })
				.limit(1)

			if (nextDefault && nextDefault.length > 0) {
				const firstMethod = nextDefault[0]
				if (firstMethod) {
					await client
						.from('tenant_payment_method')
						.update({
							isDefault: true,
							updatedAt: new Date().toISOString()
						})
						.eq('id', firstMethod.id)
				}
			}
		}

		return { success: true }
	}
}
