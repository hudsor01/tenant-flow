import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException
} from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'
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
	async getOrCreateStripeCustomer(user_id: string, email?: string) {
		const adminClient = this.supabase.getAdminClient()

		const { data: user, error } = await adminClient
			.from('users')
			.select('stripe_customer_id, email')
			.eq('id', user_id)
			.single()

		if (error) {
			this.logger.error('Failed to load user while resolving Stripe customer', {
				user_id,
				error: error.message
			})
			throw new NotFoundException('User not found for Stripe customer lookup')
		}

		if (user?.stripe_customer_id) {
			return user.stripe_customer_id
		}

		this.logger.log(`Creating Stripe customer for user ${user_id}`)
		const customerParams: Stripe.CustomerCreateParams = {
			metadata: { user_id }
		}
		const resolvedEmail = email || user?.email
		if (resolvedEmail) {
			customerParams.email = resolvedEmail
		}

		//Add idempotency key to prevent duplicate customers
		// Include timestamp to allow retries after failures (Stripe idempotency keys expire after 24h)
		const idempotencyKey = `customer-create-${user_id}-${Date.now()}`
		const customer = await this.stripe.customers.create(customerParams, {
			idempotencyKey
		})

		const { error: updateError } = await adminClient
			.from('users')
			.update({
				stripe_customer_id: customer.id,
				updated_at: new Date().toISOString()
			})
			.eq('id', user_id)

		if (updateError) {
			this.logger.error('Failed to persist Stripe customer ID', {
				user_id,
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
	 * @param user_id - Auth user ID (NOT tenant table ID)
	 * @returns Tenant ID from tenant table
	 * @throws NotFoundException if tenant not found for user
	 */
	private async resolvetenant_id(
		token: string,
		user_id: string
	): Promise<string> {
		const client = this.supabase.getUserClient(token)

		const { data: tenant, error: tenantError } = await client
			.from('tenants')
			.select('id')
			.eq('user_id', user_id)
			.single()

		if (tenantError || !tenant) {
			this.logger.warn('Tenant not found for user', { user_id })
			throw new NotFoundException('Tenant not found')
		}

		return tenant.id
	}

	/**
	 * List payment methods saved by the authenticated tenant.
	 */
	async listPaymentMethods(
		token: string,
		user_id: string
	): Promise<Database['public']['Tables']['payment_methods']['Row'][]> {
		if (!token) {
			this.logger.warn('List payment methods requested without token')
			throw new BadRequestException('Authentication token is required')
		}

		// Resolve tenant ID from auth_user_id using DRY helper
		const tenant_id = await this.resolvetenant_id(token, user_id)
		const client = this.supabase.getUserClient(token)

		// Now query payment methods using the correct tenant ID
		const { data, error } = await client
			.from('payment_methods')
			.select(
				'id, tenant_id, stripe_payment_method_id, type, last_four, brand, exp_month, exp_year, bank_name, is_default, created_at, updated_at'
			)
			.eq('tenant_id', tenant_id)
			.order('created_at', { ascending: false })

		if (error) {
			this.logger.error('Failed to fetch tenant payment methods', {
				user_id,
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
		user_id: string,
		paymentMethodId: string
	) {
		if (!token) {
			this.logger.warn('Set default payment method requested without token')
			throw new BadRequestException('Authentication token is required')
		}

		const client = this.supabase.getUserClient(token)

		// Get tenant with Stripe customer ID
		const { data: tenant, error: tenantError } = await client
			.from('tenants')
			.select('id, stripe_customer_id')
			.eq('user_id', user_id)
			.single()

		if (tenantError || !tenant) {
			this.logger.warn('Tenant not found for user', {
				user_id,
				error: tenantError?.message
			})
			throw new NotFoundException('Tenant not found')
		}

		if (!tenant.stripe_customer_id) {
			this.logger.warn('No Stripe customer for tenant', {
				user_id,
				tenant_id: tenant.id
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
				user_id,
				tenant_id: tenant.id,
				paymentMethodId
			})

			return { success: true }
		} catch (error) {
			this.logger.error('Failed to set default payment method', {
				user_id,
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
		user_id: string,
		paymentMethodId: string
	) {
		if (!token) {
			this.logger.warn('Delete payment method requested without token')
			throw new BadRequestException('Authentication token is required')
		}

		const client = this.supabase.getUserClient(token)

		// Resolve tenant ID from auth user ID
		const { data: tenant, error: tenantError } = await client
			.from('tenants')
			.select('id')
			.eq('user_id', user_id)
			.single()

		if (tenantError || !tenant) {
			this.logger.warn('Tenant not found for user', {
				user_id,
				error: tenantError?.message
			})
			throw new NotFoundException('Tenant not found')
		}

		const { data: paymentMethod, error: fetchError } = await client
			.from('payment_methods')
			.select('stripe_payment_method_id, is_default')
			.eq('id', paymentMethodId)
			.eq('tenant_id', tenant.id)
			.single()

		if (fetchError || !paymentMethod) {
			this.logger.warn('Attempted to delete unknown payment method', {
				user_id,
				paymentMethodId,
				error: fetchError?.message
			})
			throw new NotFoundException('Payment method not found')
		}

		if (paymentMethod?.stripe_payment_method_id) {
			await this.stripe.paymentMethods.detach(
				paymentMethod?.stripe_payment_method_id
			)
		}

		const { error } = await client
			.from('payment_methods')
			.delete()
			.eq('id', paymentMethodId)
			.eq('tenant_id', tenant.id)

		if (error) {
			this.logger.error('Failed to delete payment method', {
				user_id,
				paymentMethodId,
				error: error.message
			})
			throw new BadRequestException('Failed to delete payment method')
		}

		if (paymentMethod?.is_default) {
			const { data: nextDefault } = await client
				.from('payment_methods')
				.select('id')
				.eq('tenant_id', tenant.id)
				.order('created_at', { ascending: true })
				.limit(1)

			if (nextDefault && nextDefault.length > 0) {
				const firstMethod = nextDefault[0]
				if (firstMethod) {
					await client
						.from('payment_methods')
						.update({
							isDefault: true,
							updated_at: new Date().toISOString()
						})
						.eq('id', firstMethod.id)
				}
			}
		}

		return { success: true }
	}
}
