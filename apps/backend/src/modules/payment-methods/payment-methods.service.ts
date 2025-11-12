import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException
} from '@nestjs/common'
import Stripe from 'stripe'
import { SupabaseService } from '../../database/supabase.service'
import { StripeClientService } from '../../shared/stripe-client.service'
import {
	querySingle,
	queryList,
	queryMutation
} from '../../shared/utils/query-helpers'

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

		const user = await querySingle<{
			stripeCustomerId: string | null
			email: string | null
		}>(
			adminClient.from('users').select('stripeCustomerId, email').eq('id', userId).single(),
			{
				resource: 'user',
				id: userId,
				operation: 'fetch',
				logger: this.logger
			}
		)

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
	 * Prevents code duplication across savePaymentMethod and listPaymentMethods.
	 * RLS policies check: tenant.auth_user_id = auth.uid()
	 *
	 * @param token - JWT token for RLS-protected Supabase client
	 * @param userId - Auth user ID (NOT tenant table ID)
	 * @returns Tenant ID from tenant table
	 * @throws NotFoundException if tenant not found for user
	 */
	private async resolveTenantId(token: string, userId: string): Promise<string> {
		const client = this.supabase.getUserClient(token)

		const tenant = await querySingle<{ id: string }>(
			client.from('tenant').select('id').eq('auth_user_id', userId).single(),
			{
				resource: 'tenant',
				operation: 'fetch by auth_user_id',
				logger: this.logger
			}
		)

		return tenant.id
	}

	/**
	 * Create a Stripe SetupIntent so the tenant can add a payment method.
	 * Supports both card and ACH (us_bank_account) payment method types.
	 */
	async createSetupIntent(
		token: string,
		userId: string,
		email: string | undefined,
		paymentMethodType: 'card' | 'us_bank_account'
	) {
		if (!token) {
			this.logger.warn('Create setup intent requested without token')
			throw new BadRequestException('Authentication token is required')
		}

		if (!userId) {
			throw new BadRequestException('User not authenticated')
		}

		this.logger.log('Creating payment method SetupIntent', {
			userId,
			paymentMethodType
		})

		const stripeCustomerId = await this.getOrCreateStripeCustomer(userId, email)

		const setupIntentParams: Stripe.SetupIntentCreateParams = {
			customer: stripeCustomerId,
			payment_method_types: [paymentMethodType],
			usage: 'off_session'
		}

		if (paymentMethodType === 'us_bank_account') {
			setupIntentParams.payment_method_options = {
				us_bank_account: {
					verification_method: 'instant',
					financial_connections: {
						permissions: ['payment_method', 'balances']
					}
				}
			}
		}

		//Add idempotency key to prevent duplicate setup intents
		// Include timestamp to allow retries after failures (Stripe idempotency keys expire after 24h)
		const idempotencyKey = `setup-intent-${userId}-${paymentMethodType}-${Date.now()}`
		const setupIntent = await this.stripe.setupIntents.create(setupIntentParams, {
			idempotencyKey
		})

		return {
			clientSecret: setupIntent.client_secret ?? null,
			setupIntentId: setupIntent.id
		}
	}

	/**
	 * Save a confirmed Stripe payment method in the TenantPaymentMethod table.
	 * Automatically flags the first method as default and ensures ownership checks.
	 */
	async savePaymentMethod(token: string, userId: string, stripePaymentMethodId: string) {
		if (!token) {
			this.logger.warn('Save payment method requested without token')
			throw new BadRequestException('Authentication token is required')
		}

		if (!userId || !stripePaymentMethodId) {
			throw new BadRequestException('Missing required payment method details')
		}

		this.logger.log('Saving tenant payment method', {
			userId,
			stripePaymentMethodId
		})

		// Resolve tenant ID from auth_user_id using DRY helper
		const tenantId = await this.resolveTenantId(token, userId)
		const client = this.supabase.getUserClient(token)

		const stripeCustomerId = await this.getOrCreateStripeCustomer(userId)

		const paymentMethod = await this.stripe.paymentMethods.retrieve(
			stripePaymentMethodId
		)

		if (paymentMethod.customer && paymentMethod.customer !== stripeCustomerId) {
			this.logger.error('Payment method attached to different customer', {
				userId,
				expectedCustomer: stripeCustomerId,
				paymentMethodCustomer: paymentMethod.customer
			})
			throw new BadRequestException(
				'Payment method is linked to a different customer'
			)
		}

		if (!paymentMethod.customer) {
			await this.stripe.paymentMethods.attach(stripePaymentMethodId, {
				customer: stripeCustomerId
			})
		}

		// Now query payment methods using the correct tenant ID
		const { data: existing, error: existingError } = await client
			.from('tenant_payment_method')
			.select('id')
			.match({
				tenantId,
				stripePaymentMethodId
			})
			.maybeSingle()

		if (existingError) {
			this.logger.error('Failed to check for existing payment method', {
				userId,
				stripePaymentMethodId,
				error: existingError.message
			})
			throw new BadRequestException('Failed to save payment method')
		}

		if (existing) {
			this.logger.log('Payment method already saved, skipping insert', {
				userId,
				stripePaymentMethodId
			})
			return { success: true }
		}

		const existingMethods = await queryList<{ id: string }>(
			client.from('tenant_payment_method').select('id').eq('tenantId', tenantId),
			{
				resource: 'tenant payment methods',
				operation: 'fetch',
				logger: this.logger
			}
		)

		const shouldBeDefault = existingMethods.length === 0

		if (shouldBeDefault) {
			await client
				.from('tenant_payment_method')
				.update({
					isDefault: false,
					updatedAt: new Date().toISOString()
				})
				.eq('tenantId', tenantId)
		}

		await queryMutation(
			client.from('tenant_payment_method').insert({
				tenantId,
				stripePaymentMethodId,
				stripeCustomerId,
				type: paymentMethod.type,
				last4:
					paymentMethod.card?.last4 ||
					paymentMethod.us_bank_account?.last4 ||
					null,
				brand: paymentMethod.card?.brand || null,
				bankName: paymentMethod.us_bank_account?.bank_name || null,
				isDefault: shouldBeDefault,
				verificationStatus: 'verified',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}),
			{
				resource: 'tenant payment method',
				operation: 'create',
				logger: this.logger
			}
		)

		return { success: true }
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
		return await queryList(
			client
				.from('tenant_payment_method')
				.select(
					'id, tenantId, stripePaymentMethodId, type, last4, brand, bankName, isDefault, verificationStatus, createdAt, updatedAt'
				)
				.eq('tenantId', tenantId)
				.order('createdAt', { ascending: false }),
			{
				resource: 'tenant payment methods',
				operation: 'fetch',
				logger: this.logger
			}
		)
	}

	/**
	 * Mark a tenant payment method as the default option.
	 */
	async setDefaultPaymentMethod(token: string, userId: string, paymentMethodId: string) {
		if (!token) {
			this.logger.warn('Set default payment method requested without token')
			throw new BadRequestException('Authentication token is required')
		}

		const client = this.supabase.getUserClient(token)

		// Get tenant with Stripe customer ID
		const tenant = await querySingle<{
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
				operation: 'fetch by auth_user_id',
				logger: this.logger
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
			const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId)

			if (paymentMethod.customer !== tenant.stripe_customer_id) {
				throw new BadRequestException('Payment method does not belong to this customer')
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
	async deletePaymentMethod(token: string, userId: string, paymentMethodId: string) {
		if (!token) {
			this.logger.warn('Delete payment method requested without token')
			throw new BadRequestException('Authentication token is required')
		}

		const client = this.supabase.getUserClient(token)

		// Resolve tenant ID from auth user ID
		const tenant = await querySingle<{ id: string }>(
			client.from('tenant').select('id').eq('auth_user_id', userId).single(),
			{
				resource: 'tenant',
				operation: 'fetch by auth_user_id',
				logger: this.logger
			}
		)

		const paymentMethod = await querySingle<{
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
				resource: 'tenant payment method',
				id: paymentMethodId,
				operation: 'fetch',
				logger: this.logger
			}
		)

		if (paymentMethod.stripePaymentMethodId) {
			await this.stripe.paymentMethods.detach(
				paymentMethod.stripePaymentMethodId
			)
		}

		await queryMutation(
			client
				.from('tenant_payment_method')
				.delete()
				.eq('id', paymentMethodId)
				.eq('tenantId', tenant.id),
			{
				resource: 'tenant payment method',
				id: paymentMethodId,
				operation: 'delete',
				logger: this.logger
			}
		)

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
