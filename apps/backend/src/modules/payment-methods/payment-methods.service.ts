import {
	BadRequestException,
	Injectable,
	Logger,
	UnauthorizedException
} from '@nestjs/common'
import Stripe from 'stripe'
import { SupabaseService } from '../../database/supabase.service'
import { SupabaseQueryHelpers } from '../../shared/supabase/supabase-query-helpers'
import { StripeClientService } from '../../shared/stripe-client.service'

/**
 * Tenant payment method record from database.
 * Represents a payment method (card, bank account) attached to a tenant.
 */
export interface TenantPaymentMethodRecord {
	id: string
	tenantId: string
	stripePaymentMethodId: string | null
	type: string | null
	last4: string | null
	brand: string | null
	bankName: string | null
	isDefault: boolean | null
	verificationStatus: string | null
	createdAt: string | null
	updatedAt: string | null
}

@Injectable()
export class PaymentMethodsService {
	private readonly logger = new Logger(PaymentMethodsService.name)
	private readonly stripe: Stripe

	constructor(
		private readonly supabase: SupabaseService,
		private readonly stripeClientService: StripeClientService,
		private readonly queryHelpers: SupabaseQueryHelpers
	) {
		this.stripe = this.stripeClientService.getClient()
	} /**
	 * Get or create Stripe customer for a user.
	 * Caches the Stripe customer ID on the User record to avoid duplicate customers.
	 */
	async getOrCreateStripeCustomer(userId: string, email?: string) {
		const adminClient = this.supabase.getAdminClient()

		const user = await this.queryHelpers.querySingle<{
			stripeCustomerId: string | null
			email: string | null
		}>(
			adminClient
				.from('users')
				.select('stripeCustomerId, email')
				.eq('id', userId)
				.single(),
			{
				resource: 'user',
				id: userId,
				operation: 'findOne'
			}
		)

		if (user.stripeCustomerId) {
			return user.stripeCustomerId
		}

		this.logger.log(`Creating Stripe customer for user ${userId}`)
		const customerParams: Stripe.CustomerCreateParams = {
			metadata: { userId }
		}
		const resolvedEmail = email || user.email
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

		const tenant = await this.queryHelpers.querySingle<{ id: string }>(
			client.from('tenant').select('id').eq('auth_user_id', userId).single(),
			{
				resource: 'tenant',
				operation: 'findOne',
				userId
			}
		)

		return tenant.id
	}

	/**
	 * List payment methods saved by the authenticated tenant.
	 */
	async listPaymentMethods(token: string, userId: string) {
		if (!token) {
			throw new UnauthorizedException('Authentication token is required')
		}

		// Resolve tenant ID from auth_user_id using DRY helper
		const tenantId = await this.resolveTenantId(token, userId)
		const client = this.supabase.getUserClient(token)

		// Now query payment methods using the correct tenant ID
		return this.queryHelpers.queryList<TenantPaymentMethodRecord>(
			client
				.from('tenant_payment_method')
				.select('*')
				.eq('tenantId', tenantId)
				.order('createdAt', { ascending: false }),
			{
				resource: 'tenant_payment_method',
				operation: 'findAll',
				userId
			}
		)
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
			throw new UnauthorizedException('Authentication token is required')
		}

		const client = this.supabase.getUserClient(token)

		// Get tenant with Stripe customer ID
		const tenant = await this.queryHelpers.querySingle<{
			id: string
			stripe_customer_id: string | null
		}>(
			client
				.from('tenant')
				.select('id, stripe_customer_id')
				.eq('auth_user_id', userId)
				.single(),
			{
				resource: 'tenant',
				operation: 'findOne',
				userId
			}
		)

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
			throw new UnauthorizedException('Authentication token is required')
		}

		const client = this.supabase.getUserClient(token)

		// Resolve tenant ID from auth user ID
		const tenant = await this.queryHelpers.querySingle<{ id: string }>(
			client.from('tenant').select('id').eq('auth_user_id', userId).single(),
			{
				resource: 'tenant',
				operation: 'findOne',
				userId
			}
		)

		const paymentMethod = await this.queryHelpers.querySingle<{
			stripePaymentMethodId: string | null
			isDefault: boolean
		}>(
			client
				.from('tenant_payment_method')
				.select('stripePaymentMethodId, isDefault')
				.eq('id', paymentMethodId)
				.eq('tenantId', tenant.id)
				.single(),
			{
				resource: 'tenant_payment_method',
				id: paymentMethodId,
				operation: 'findOne',
				userId
			}
		)

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
