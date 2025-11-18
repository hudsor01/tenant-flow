import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException
} from '@nestjs/common'
import Stripe from 'stripe'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'
import { StripeClientService } from '../../shared/stripe-client.service'

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
	private readonly logger = new Logger(StripeOwnerService.name)
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
		private readonly supabaseService: SupabaseService
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
		const resolvedName = params.name ?? owner.full_name ?? this.buildOwnerName(owner)

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
				await this.stripe.customers.del(customer.id)
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
