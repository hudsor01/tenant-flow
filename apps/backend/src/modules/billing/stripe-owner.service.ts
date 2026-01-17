import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException
} from '@nestjs/common'
import type Stripe from 'stripe'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'
import { StripeClientService } from '../../shared/stripe-client.service'
import { AppLogger } from '../../logger/app-logger.service'
import { StripeSharedService } from './stripe-shared.service'

type UserRow = Database['public']['Tables']['users']['Row']

interface EnsureOwnerCustomerParams {
	user_id: string
	email?: string | null
	name?: string | null
	additionalMetadata?: Record<string, string>
}

interface EnsureOwnerCustomerResult {
	customer: Stripe.Customer
	status: 'existing' | 'created'
}

@Injectable()
export class StripeOwnerService {
	private readonly stripe: Stripe
	// Cache user profile data for 10 minutes (stable data, rarely changes)
	private readonly CACHE_TTL_MS = 600_000
	private readonly MAX_CACHE_SIZE = 1000
	private readonly ownerCache = new Map<
		string,
		{ user: UserRow; cachedAt: number }
	>()

	private pruneExpiredCache(): void {
		const now = Date.now()
		const entries = Array.from(this.ownerCache.entries())

		// Remove expired entries
		for (const [key, value] of entries) {
			if (now - value.cachedAt >= this.CACHE_TTL_MS) {
				this.ownerCache.delete(key)
			}
		}

		// If cache is still too large, remove oldest entries
		if (this.ownerCache.size > this.MAX_CACHE_SIZE) {
			const sortedEntries = Array.from(this.ownerCache.entries())
				.sort((a, b) => a[1].cachedAt - b[1].cachedAt)
				.slice(0, this.ownerCache.size - this.MAX_CACHE_SIZE)

			for (const [key] of sortedEntries) {
				this.ownerCache.delete(key)
			}
		}
	}

	constructor(
		private readonly stripeClientService: StripeClientService,
		private readonly supabaseService: SupabaseService,
		private readonly logger: AppLogger,
		private readonly sharedService: StripeSharedService
	) {
		this.stripe = this.stripeClientService.getClient()
	}

	async ensureOwnerCustomer(
		params: EnsureOwnerCustomerParams
	): Promise<EnsureOwnerCustomerResult> {
		const owner = await this.getOwner(params.user_id)

		if (owner.user_type !== 'OWNER') {
			this.logger.warn('Rejected Stripe customer ensure for non-owner user', {
				user_id: params.user_id,
				user_type: owner.user_type
			})
			throw new ForbiddenException(
				'Only property owners can manage Stripe billing profiles'
			)
		}

		if (owner.stripe_customer_id) {
			try {
				const existingCustomer = await this.stripe.customers.retrieve(
					owner.stripe_customer_id
				)

				if (!('deleted' in existingCustomer)) {
					this.logger.log('Owner Stripe customer resolved', {
						user_id: params.user_id,
						customerId: existingCustomer.id,
						status: 'existing'
					})
					return { customer: existingCustomer, status: 'existing' }
				}

				this.logger.warn('Existing owner customer was deleted; recreating', {
					user_id: params.user_id,
					customerId: owner.stripe_customer_id
				})
			} catch (error) {
				this.logger.error('Failed to retrieve owner Stripe customer', {
					user_id: params.user_id,
					customerId: owner.stripe_customer_id,
					error: error instanceof Error ? error.message : String(error)
				})
			}
		}

		const resolvedEmail = params.email ?? owner.email ?? undefined
		const resolvedName =
			params.name ?? owner.full_name ?? this.buildOwnerName(owner)

		// Validate that an email is present before creating Stripe customer
		if (!resolvedEmail) {
			throw new BadRequestException(
				`Cannot create Stripe customer without email address for user ${params.user_id}`
			)
		}

		const metadata: Record<string, string> = {
			customer_type: 'property_owner',
			user_id: params.user_id,
			user_type: 'OWNER',
			platform: 'tenantflow',
			...(params.additionalMetadata ?? {})
		}

		const idempotencyKey = `owner_customer_${params.user_id}`

		const customer = await this.stripe.customers.create(
			{
				email: resolvedEmail,
				...(resolvedName && { name: resolvedName }),
				metadata
			},
			{ idempotencyKey }
		)

		// Use consistent timestamp for both DB and cache
		const updated_at = new Date().toISOString()
		const { error: updateError } = await this.supabaseService
			.getAdminClient()
			.from('users')
			.update({
				stripe_customer_id: customer.id,
				updated_at
			})
			.eq('id', params.user_id)

		if (updateError) {
			this.logger.error('Failed to persist owner Stripe customer ID', {
				user_id: params.user_id,
				customerId: customer.id,
				error: updateError.message
			})

			// Attempt to clean up orphaned Stripe customer
			try {
				const idempotencyKey = this.sharedService.generateIdempotencyKey(
					'cus_del_orphan',
					params.user_id,
					customer.id
				)
				await this.stripe.customers.del(customer.id, { idempotencyKey })
				this.logger.log('Successfully deleted orphaned Stripe customer', {
					customerId: customer.id,
					user_id: params.user_id
				})
			} catch (deletionError) {
				this.logger.error('Failed to delete orphaned Stripe customer', {
					customerId: customer.id,
					user_id: params.user_id,
					error:
						deletionError instanceof Error
							? deletionError.message
							: String(deletionError)
				})
			}

			// Propagate the error to prevent silent success and orphaned Stripe customers
			throw new Error(
				`Failed to update user with Stripe customer ID: ${updateError.message}`,
				{ cause: updateError }
			)
		} else {
			// Update cache with same timestamp as DB to maintain consistency
			this.ownerCache.set(params.user_id, {
				user: { ...owner, stripe_customer_id: customer.id, updated_at },
				cachedAt: Date.now()
			})
			// Prune expired cache entries only when cache size exceeds threshold (performance optimization)
			if (this.ownerCache.size > this.MAX_CACHE_SIZE * 0.8) {
				this.pruneExpiredCache()
			}
		}

		this.logger.log('Owner Stripe customer resolved', {
			user_id: params.user_id,
			customerId: customer.id,
			status: 'created'
		})

		return { customer, status: 'created' }
	}

	/**
	 * Create a PaymentIntent for rent payment with destination charges
	 * Routes payment to property owner's Stripe Connect account with platform application fee
	 */
	async createRentPaymentIntent(params: {
		leaseId: string
		paymentMethodId: string
		tenantStripeCustomerId: string
	}): Promise<Stripe.PaymentIntent> {
		const { leaseId, paymentMethodId, tenantStripeCustomerId } = params

		const client = this.supabaseService.getAdminClient()

		// Get lease with property owner's Connect account
		const { data: lease, error: leaseError } = await client
			.from('leases')
			.select(
				`
				id,
				rent_amount,
				rent_currency,
				primary_tenant_id,
				owner_user_id,
				stripe_connected_accounts!inner(
					stripe_account_id,
					default_platform_fee_percent,
					charges_enabled
				)
			`
			)
			.eq('id', leaseId)
			.single()

		if (leaseError || !lease) {
			this.logger.error('Lease not found for rent payment', {
				leaseId,
				error: leaseError?.message
			})
			throw new NotFoundException('Lease not found')
		}

		const stripeConnectedAccount =
			lease.stripe_connected_accounts as unknown as {
				stripe_account_id: string | null
				default_platform_fee_percent: number
				charges_enabled: boolean
			}

		// Validate property owner has completed Stripe Connect onboarding
		if (!stripeConnectedAccount.stripe_account_id) {
			this.logger.error('Property owner has not connected Stripe account', {
				leaseId,
				stripeConnectedAccountId: lease.owner_user_id
			})
			throw new BadRequestException(
				'Property owner has not completed Stripe Connect setup'
			)
		}

		if (!stripeConnectedAccount.charges_enabled) {
			this.logger.error('Property owner Stripe account cannot accept charges', {
				leaseId,
				stripeConnectedAccountId: lease.owner_user_id,
				stripeAccountId: stripeConnectedAccount.stripe_account_id
			})
			throw new BadRequestException(
				'Property owner Stripe account is not fully verified'
			)
		}

		// Calculate application fee (platform revenue) - default 1%
		const platformFeePercent =
			stripeConnectedAccount.default_platform_fee_percent ?? 1.0
		const applicationFeeAmount = Math.round(
			lease.rent_amount * (platformFeePercent / 100)
		)

		// Calculate period dates
		const today = new Date()
		const periodStart = new Date(today.getFullYear(), today.getMonth(), 1)
		const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
		const periodStartStr = periodStart.toISOString().slice(0, 10) // YYYY-MM-DD
		const periodEndStr = periodEnd.toISOString().slice(0, 10)
		const dueDateStr = periodStart.toISOString().slice(0, 10)

		this.logger.log('Creating rent payment intent', {
			leaseId,
			rentAmount: lease.rent_amount,
			applicationFeeAmount,
			destinationAccount: stripeConnectedAccount.stripe_account_id
		})

		// Create PaymentIntent with destination charges
		const paymentIntent = await this.stripe.paymentIntents.create({
			amount: lease.rent_amount,
			currency: lease.rent_currency || 'usd',
			payment_method: paymentMethodId,
			customer: tenantStripeCustomerId,
			application_fee_amount: applicationFeeAmount,
			transfer_data: {
				destination: stripeConnectedAccount.stripe_account_id
			},
			// Shows property owner's business name on tenant's bank statement
			on_behalf_of: stripeConnectedAccount.stripe_account_id,
			metadata: {
				lease_id: leaseId,
				tenant_id: lease.primary_tenant_id,
				owner_user_id: lease.owner_user_id || '',
				period_start: periodStartStr,
				period_end: periodEndStr,
				platform: 'tenantflow'
			},
			confirm: true,
			// Automatic payment methods allows ACH and cards
			automatic_payment_methods: {
				enabled: true,
				allow_redirects: 'never'
			}
		})

		// Record rent payment in database using idempotent RPC
		// Note: upsert_rent_payment is service_role-only, not in public types
		const { data: upsertResult, error: upsertError } = (await (
			client.rpc as CallableFunction
		)('upsert_rent_payment', {
			p_lease_id: leaseId,
			p_tenant_id: lease.primary_tenant_id,
			p_amount: lease.rent_amount,
			p_currency: lease.rent_currency || 'usd',
			p_status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'pending',
			p_due_date: dueDateStr,
			p_paid_date:
				paymentIntent.status === 'succeeded' ? new Date().toISOString() : null,
			p_period_start: periodStartStr,
			p_period_end: periodEndStr,
			p_payment_method_type: paymentIntent.payment_method_types?.[0] || 'card',
			p_stripe_payment_intent_id: paymentIntent.id,
			p_application_fee_amount: applicationFeeAmount
		})) as {
			data: { id: string; was_inserted: boolean }[] | null
			error: Error | null
		}

		if (upsertError) {
			this.logger.error('Failed to record rent payment in database', {
				leaseId,
				paymentIntentId: paymentIntent.id,
				error: upsertError.message
			})
			// Don't throw - payment was successful, just log the db error
		} else if (upsertResult?.[0]?.was_inserted === false) {
			this.logger.warn('Rent payment already exists (idempotent duplicate)', {
				leaseId,
				paymentIntentId: paymentIntent.id,
				existingPaymentId: upsertResult[0].id
			})
		}

		this.logger.log('Rent payment intent created', {
			paymentIntentId: paymentIntent.id,
			status: paymentIntent.status,
			amount: paymentIntent.amount,
			applicationFee: applicationFeeAmount
		})

		return paymentIntent
	}

	private async getOwner(user_id: string): Promise<UserRow> {
		const cached = this.ownerCache.get(user_id)
		if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL_MS) {
			return cached.user
		}

		const { data, error } = await this.supabaseService
			.getAdminClient()
			.from('users')
			.select(
				'id, email, first_name, last_name, full_name, user_type, stripe_customer_id, updated_at'
			)
			.eq('id', user_id)
			.single()

		if (error || !data) {
			this.logger.error('Owner record not found', {
				user_id,
				error: error?.message
			})
			throw new NotFoundException('Owner not found')
		}

		const user = data as UserRow
		this.ownerCache.set(user_id, { user, cachedAt: Date.now() })
		return user
	}

	private buildOwnerName(owner: UserRow): string | undefined {
		const parts = [
			owner.first_name?.trim() || '',
			owner.last_name?.trim() || ''
		].filter(Boolean)

		const composite = parts.join(' ').trim()

		if (composite.length > 0) {
			return composite
		}

		const fallback = owner.full_name?.trim() || null
		return fallback && fallback.length > 0 ? fallback : undefined
	}
}
