import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import Stripe from 'stripe'
import type {
	AttachPaymentMethodParams,
	CreateTenantCustomerParams
} from '@repo/shared/types/stripe'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'
import { StripeClientService } from '../../shared/stripe-client.service'
import type { PostgrestError } from '@supabase/supabase-js'

type TenantRow = Database['public']['Tables']['tenants']['Row']

// Type for tenant with joined user data
type TenantWithUser = TenantRow & {
	users: {
		email: string
		first_name: string | null
		last_name: string | null
	} | null
}

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
				.from('tenants' as never)
				.select('stripe_customer_id' as never)
				.eq('id' as never, params.tenant_id as never)
				.single()

			if (tenantError) {
				this.logger.error('Failed to fetch tenant', {
					tenant_id: params.tenant_id,
					error: tenantError
				})
				throw new NotFoundException(`Tenant not found: ${params.tenant_id}`)
			}

			const tenant = existingTenant as { stripe_customer_id: string | null }

			// If Customer already exists, return it
			if (tenant.stripe_customer_id) {
				this.logger.log(
					`Tenant ${params.tenant_id} already has Stripe Customer: ${tenant.stripe_customer_id}`
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
			this.logger.log(`Creating Stripe Customer for Tenant: ${params.tenant_id}`)
			const customerParams: Stripe.CustomerCreateParams = {
				metadata: {
					tenant_id: params.tenant_id,
					platform: 'tenantflow',
					user_type: 'tenants',
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
				.from('tenants' as never)
				.update({ stripe_customer_id: customer.id } as never)
				.eq('id' as never, params.tenant_id as never)

			if (updateError) {
				this.logger.error('Failed to update tenant with stripe_customer_id', {
					tenant_id: params.tenant_id,
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
				`Created Stripe Customer ${customer.id} for Tenant ${params.tenant_id}`
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
		tenant_id: string
	): Promise<Stripe.Customer | null> {
		try {
			const { data, error } = await this.supabase
				.getAdminClient()
				.from('tenants' as never)
				.select('stripe_customer_id' as never)
				.eq('id' as never, tenant_id as never)
				.single()

			if (error) {
				this.logger.error('Failed to fetch tenant', { tenant_id, error })
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
				tenant_id,
				error
			})
			return null
		}
	}

	async ensureStripeCustomer(params: {
		tenant_id: string
		email?: string | null
		name?: string | null
		user_id?: string
		metadata?: Record<string, string>
		invitedByOwnerId?: string
	}): Promise<{ customer: Stripe.Customer; status: 'existing' | 'created' }> {
		const existingCustomer = await this.getStripeCustomerForTenant(
			params.tenant_id
		)

		if (existingCustomer) {
			this.logger.log('Tenant Stripe customer resolved', {
				tenant_id: params.tenant_id,
				customerId: existingCustomer.id,
				status: 'existing'
			})

			return { customer: existingCustomer, status: 'existing' }
		}

		const { data, error } = await this.supabase
			.getAdminClient()
			.from('tenants' as never)
			.select(
				'id, stripe_customer_id, user_id, users!inner(email, first_name, last_name)' as never
			)
			.eq('id' as never, params.tenant_id as never)
			.single()

		if (error || !data) {
			const message = 'Tenant record not found while ensuring customer'
			const err = (error as PostgrestError | null) ?? null
			const errCode = err?.code
			const errMsg = err?.message

			const isNotFound = errCode === 'PGRST116' || (errMsg ? /not found/i.test(errMsg) : false)

			if (isNotFound) {
				this.logger.warn('Tenant not found while ensuring Stripe customer', {
					tenant_id: params.tenant_id,
					error: errMsg ?? undefined
				})
			} else {
				this.logger.error(message, { tenant_id: params.tenant_id, error })
			}

			throw new NotFoundException(`Tenant not found: ${params.tenant_id}`)
		}

		const tenant = data as TenantWithUser

		const resolvedEmail = params.email ?? tenant.users?.email ?? undefined
		const resolvedName =
			params.name ?? this.buildTenantName(tenant)

		const metadata: Record<string, string> = {
			...(params.metadata ?? {}),
			...(params.user_id ? { user_id: params.user_id } : {}),
			...(params.invitedByOwnerId
				? { invited_by: params.invitedByOwnerId }
				: {}),
			source: params.metadata?.source ?? 'tenant_service'
		}

		const customerParams: CreateTenantCustomerParams = {
			tenant_id: params.tenant_id,
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
			tenant_id: params.tenant_id,
			customerId: customer.id,
			status: 'created'
		})

		return { customer, status: 'created' }
	}

	private buildTenantName(tenant: TenantWithUser): string | undefined {
		const parts = [
			tenant.users?.first_name?.trim() || '',
			tenant.users?.last_name?.trim() || ''
		].filter(Boolean)

		const composite = parts.join(' ').trim()

		if (composite.length > 0) {
			return composite
		}

		// No name available
		return undefined
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
			const customer = await this.getStripeCustomerForTenant(params.tenant_id)

			if (!customer) {
				throw new NotFoundException(
					`Stripe Customer not found for Tenant: ${params.tenant_id}`
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
	async listPaymentMethods(tenant_id: string): Promise<Stripe.PaymentMethod[]> {
		try {
			const customer = await this.getStripeCustomerForTenant(tenant_id)

			if (!customer) {
				return []
			}

			const paymentMethods = await this.stripe.paymentMethods.list({
				customer: customer.id,
				type: 'card' // Can be extended to support 'us_bank_account' for ACH
			})

			return paymentMethods.data
		} catch (error) {
			this.logger.error('Failed to list payment methods', { tenant_id, error })
			return []
		}
	}

	/**
	 * Get default payment method for Tenant
	 */
	async getDefaultPaymentMethod(
		tenant_id: string
	): Promise<Stripe.PaymentMethod | null> {
		try {
			const customer = await this.getStripeCustomerForTenant(tenant_id)

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
				tenant_id,
				error
			})
			return null
		}
	}

	/**
	 * Set default payment method for Tenant
	 */
	async setDefaultPaymentMethod(
		tenant_id: string,
		paymentMethodId: string
	): Promise<void> {
		try {
			const customer = await this.getStripeCustomerForTenant(tenant_id)

			if (!customer) {
				throw new NotFoundException(
					`Stripe Customer not found for Tenant: ${tenant_id}`
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
				tenant_id,
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
		tenant_id: string,
		paymentMethodId: string
	): Promise<void> {
		try {
			await this.stripe.paymentMethods.detach(paymentMethodId)

			this.logger.log(
				`Detached payment method ${paymentMethodId} for Tenant ${tenant_id}`
			)
		} catch (error) {
			this.logger.error('Failed to detach payment method', {
				tenant_id,
				paymentMethodId,
				error
			})
			throw error
		}
	}
}
