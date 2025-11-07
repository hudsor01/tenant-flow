import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import Stripe from 'stripe'
import type {
	AttachPaymentMethodParams,
	CreateTenantCustomerParams
} from '@repo/shared/types/stripe'
import type { Database } from '@repo/shared/types/supabase-generated'
import { SupabaseService } from '../../database/supabase.service'
import { StripeClientService } from '../../shared/stripe-client.service'

type TenantRow = Database['public']['Tables']['tenant']['Row']

/**
 * Stripe Tenant Service
 *
 * Manages Stripe Customer objects for Tenants to enable:
 * - Payment method storage and reuse
 * - Recurring rent payments (autopay via subscriptions)
 * - Tenant Billing Portal access
 *
 * Architecture:
 * - Tenants have Stripe Customers on the platform account
 * - Owners have Stripe Connect accounts to receive payments
 * - Rent payments use destination charges to Owner accounts
 */
@Injectable()
export class StripeTenantService {
	private readonly logger = new Logger(StripeTenantService.name)
	private stripe: Stripe

	constructor(
		private readonly stripeClientService: StripeClientService,
		private readonly supabase: SupabaseService
	) {
		this.stripe = this.stripeClientService.getClient()
		this.logger.log('Stripe Tenant Customer Service initialized')
	}

	/**
	 * Create a Stripe Customer for a Tenant
	 *
	 * Official Stripe Pattern:
	 * - Create Customer object on platform account
	 * - Store Customer ID in tenant.stripe_customer_id
	 * - Customer used for payment method storage and subscriptions
	 */
	async createStripeCustomerForTenant(
		params: CreateTenantCustomerParams
	): Promise<Stripe.Customer> {
		try {
			// Check if Tenant already has a Stripe Customer
			const { data: existingTenant, error: tenantError } = await this.supabase
				.getAdminClient()
				.from('tenant' as never)
				.select('stripe_customer_id' as never)
				.eq('id' as never, params.tenantId as never)
				.single()

			if (tenantError) {
				this.logger.error('Failed to fetch tenant', {
					tenantId: params.tenantId,
					error: tenantError
				})
				throw new NotFoundException(`Tenant not found: ${params.tenantId}`)
			}

			const tenant = existingTenant as { stripe_customer_id: string | null }

			// If Customer already exists, return it
			if (tenant.stripe_customer_id) {
				this.logger.log(
					`Tenant ${params.tenantId} already has Stripe Customer: ${tenant.stripe_customer_id}`
				)
				const customer = await this.stripe.customers.retrieve(
					tenant.stripe_customer_id
				)
				if ('deleted' in customer) {
					this.logger.warn(
						`Customer ${tenant.stripe_customer_id} was deleted, creating new one`
					)
				} else {
					return customer
				}
			}

			// Create new Stripe Customer
			this.logger.log(`Creating Stripe Customer for Tenant: ${params.tenantId}`)
			const customerParams: Stripe.CustomerCreateParams = {
				metadata: {
					tenantId: params.tenantId,
					platform: 'tenantflow',
					role: 'tenant',
					...params.metadata
				}
			}

			if (params.email) {
				customerParams.email = params.email
			}

			// Only add optional fields if they have values
			if (params.name) {
				customerParams.name = params.name
			}
			if (params.phone) {
				customerParams.phone = params.phone
			}

			const customer = await this.stripe.customers.create(customerParams)

			// Update tenant table with Stripe Customer ID
			const { error: updateError } = await this.supabase
				.getAdminClient()
				.from('tenant' as never)
				.update({ stripe_customer_id: customer.id } as never)
				.eq('id' as never, params.tenantId as never)

			if (updateError) {
				this.logger.error('Failed to update tenant with stripe_customer_id', {
					tenantId: params.tenantId,
					customerId: customer.id,
					error: updateError
				})
				// Attempt to delete the orphaned Customer
				await this.stripe.customers.del(customer.id).catch(err => {
					this.logger.error('Failed to delete orphaned customer', {
						customerId: customer.id,
						error: err
					})
				})
				throw updateError
			}

			this.logger.log(
				`Created Stripe Customer ${customer.id} for Tenant ${params.tenantId}`
			)
			return customer
		} catch (error) {
			this.logger.error('Failed to create Stripe Customer for Tenant', {
				params,
				error
			})
			throw error
		}
	}

	/**
	 * Get Stripe Customer for a Tenant
	 *
	 * Returns null if Tenant doesn't have a Customer yet
	 */
	async getStripeCustomerForTenant(
		tenantId: string
	): Promise<Stripe.Customer | null> {
		try {
			const { data, error } = await this.supabase
				.getAdminClient()
				.from('tenant' as never)
				.select('stripe_customer_id' as never)
				.eq('id' as never, tenantId as never)
				.single()

			if (error) {
				this.logger.error('Failed to fetch tenant', { tenantId, error })
				return null
			}

			const tenant = data as { stripe_customer_id: string | null }

			if (!tenant.stripe_customer_id) {
				return null
			}

			const customer = await this.stripe.customers.retrieve(
				tenant.stripe_customer_id,
				{
					expand: ['invoice_settings.default_payment_method']
				}
			)

			if ('deleted' in customer) {
				this.logger.warn(`Customer ${tenant.stripe_customer_id} was deleted`)
				return null
			}

			return customer
		} catch (error) {
			this.logger.error('Failed to get Stripe Customer for Tenant', {
				tenantId,
				error
			})
			return null
		}
	}

	async ensureStripeCustomer(params: {
		tenantId: string
		email?: string | null
		name?: string | null
		userId?: string
		metadata?: Record<string, string>
		invitedByOwnerId?: string
	}): Promise<{ customer: Stripe.Customer; status: 'existing' | 'created' }> {
		const existingCustomer = await this.getStripeCustomerForTenant(
			params.tenantId
		)

		if (existingCustomer) {
			this.logger.log('Tenant Stripe customer resolved', {
				tenantId: params.tenantId,
				customerId: existingCustomer.id,
				status: 'existing'
			})

			return { customer: existingCustomer, status: 'existing' }
		}

		const { data, error } = await this.supabase
			.getAdminClient()
			.from('tenant' as never)
			.select(
				'id, email, name, firstName, lastName, stripe_customer_id, userId' as never
			)
			.eq('id' as never, params.tenantId as never)
			.single()

		if (error || !data) {
			this.logger.error('Tenant record not found while ensuring customer', {
				tenantId: params.tenantId,
				error
			})
			throw new NotFoundException(`Tenant not found: ${params.tenantId}`)
		}

		const tenant = data as TenantRow

		const resolvedEmail = params.email ?? tenant.email ?? undefined
		const resolvedName =
			params.name ?? tenant.name ?? this.buildTenantName(tenant)

		const metadata: Record<string, string> = {
			...(params.metadata ?? {}),
			...(params.userId ? { user_id: params.userId } : {}),
			...(params.invitedByOwnerId
				? { invited_by: params.invitedByOwnerId }
				: {}),
			source: params.metadata?.source ?? 'tenant_service'
		}

		const customerParams: CreateTenantCustomerParams = {
			tenantId: params.tenantId,
			metadata
		}

		if (resolvedEmail) {
			customerParams.email = resolvedEmail
		}

		if (resolvedName) {
			customerParams.name = resolvedName
		}

		const customer = await this.createStripeCustomerForTenant(customerParams)

		this.logger.log('Tenant Stripe customer resolved', {
			tenantId: params.tenantId,
			customerId: customer.id,
			status: 'created'
		})

		return { customer, status: 'created' }
	}

	private buildTenantName(tenant: TenantRow): string | undefined {
		const parts = [
			tenant.firstName?.trim() || '',
			tenant.lastName?.trim() || ''
		].filter(Boolean)

		const composite = parts.join(' ').trim()

		if (composite.length > 0) {
			return composite
		}

		const fallback = tenant.name?.trim() || null
		return fallback && fallback.length > 0 ? fallback : undefined
	}

	/**
	 * Attach payment method to Tenant's Stripe Customer
	 *
	 * Official Stripe Pattern:
	 * - Attach PaymentMethod to Customer
	 * - Optionally set as default payment method
	 */
	async attachPaymentMethod(
		params: AttachPaymentMethodParams
	): Promise<Stripe.PaymentMethod> {
		try {
			const customer = await this.getStripeCustomerForTenant(params.tenantId)

			if (!customer) {
				throw new NotFoundException(
					`Stripe Customer not found for Tenant: ${params.tenantId}`
				)
			}

			// Attach payment method to Customer
			const paymentMethod = await this.stripe.paymentMethods.attach(
				params.paymentMethodId,
				{
					customer: customer.id
				}
			)

			this.logger.log(
				`Attached payment method ${params.paymentMethodId} to Customer ${customer.id}`
			)

			// Set as default if requested
			if (params.setAsDefault) {
				await this.stripe.customers.update(customer.id, {
					invoice_settings: {
						default_payment_method: params.paymentMethodId
					}
				})
				this.logger.log(
					`Set payment method ${params.paymentMethodId} as default for Customer ${customer.id}`
				)
			}

			return paymentMethod
		} catch (error) {
			this.logger.error('Failed to attach payment method', { params, error })
			throw error
		}
	}

	/**
	 * List payment methods for Tenant's Stripe Customer
	 */
	async listPaymentMethods(tenantId: string): Promise<Stripe.PaymentMethod[]> {
		try {
			const customer = await this.getStripeCustomerForTenant(tenantId)

			if (!customer) {
				return []
			}

			const paymentMethods = await this.stripe.paymentMethods.list({
				customer: customer.id,
				type: 'card' // Can be extended to support 'us_bank_account' for ACH
			})

			return paymentMethods.data
		} catch (error) {
			this.logger.error('Failed to list payment methods', { tenantId, error })
			return []
		}
	}

	/**
	 * Get default payment method for Tenant
	 */
	async getDefaultPaymentMethod(
		tenantId: string
	): Promise<Stripe.PaymentMethod | null> {
		try {
			const customer = await this.getStripeCustomerForTenant(tenantId)

			if (!customer) {
				return null
			}

			const defaultPMId =
				typeof customer.invoice_settings?.default_payment_method === 'string'
					? customer.invoice_settings.default_payment_method
					: customer.invoice_settings?.default_payment_method?.id

			if (!defaultPMId) {
				return null
			}

			const paymentMethod =
				await this.stripe.paymentMethods.retrieve(defaultPMId)

			return paymentMethod
		} catch (error) {
			this.logger.error('Failed to get default payment method', {
				tenantId,
				error
			})
			return null
		}
	}

	/**
	 * Set default payment method for Tenant
	 */
	async setDefaultPaymentMethod(
		tenantId: string,
		paymentMethodId: string
	): Promise<void> {
		try {
			const customer = await this.getStripeCustomerForTenant(tenantId)

			if (!customer) {
				throw new NotFoundException(
					`Stripe Customer not found for Tenant: ${tenantId}`
				)
			}

			await this.stripe.customers.update(customer.id, {
				invoice_settings: {
					default_payment_method: paymentMethodId
				}
			})

			this.logger.log(
				`Set default payment method ${paymentMethodId} for Customer ${customer.id}`
			)
		} catch (error) {
			this.logger.error('Failed to set default payment method', {
				tenantId,
				paymentMethodId,
				error
			})
			throw error
		}
	}

	/**
	 * Detach payment method from Tenant's Customer
	 */
	async detachPaymentMethod(
		tenantId: string,
		paymentMethodId: string
	): Promise<void> {
		try {
			await this.stripe.paymentMethods.detach(paymentMethodId)

			this.logger.log(
				`Detached payment method ${paymentMethodId} for Tenant ${tenantId}`
			)
		} catch (error) {
			this.logger.error('Failed to detach payment method', {
				tenantId,
				paymentMethodId,
				error
			})
			throw error
		}
	}
}
