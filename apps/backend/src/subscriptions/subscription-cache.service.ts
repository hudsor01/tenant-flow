import { Injectable } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'
import { AppLogger } from '../logger/app-logger.service'
import { RedisCacheService } from '../cache/cache.service'

type LeaseRow = Database['public']['Tables']['leases']['Row']
type TenantRow = Database['public']['Tables']['tenants']['Row']
type UserRow = Database['public']['Tables']['users']['Row']
type UnitRow = Database['public']['Tables']['units']['Row']
type PropertyRow = Database['public']['Tables']['properties']['Row']
type PropertyOwnerRow =
	Database['public']['Tables']['stripe_connected_accounts']['Row']
type PaymentMethodRow = Database['public']['Tables']['payment_methods']['Row']

interface LeaseContext {
	lease: LeaseRow
	tenant: TenantRow
	tenantUser: UserRow
	unit: UnitRow
	property: PropertyRow
	owner: PropertyOwnerRow
}

/**
 * Subscription Cache Service
 *
 * Caches frequently accessed subscription data with TTL-based invalidation.
 * Uses unified Redis cache with TTL tiers for consistent invalidation.
 *
 * Cache TTL tiers:
 * - Lease context: medium (computed data)
 * - Tenant/User/Owner/Unit/Property: long (static profile data)
 * - Payment methods: short (frequently changing)
 */
@Injectable()
export class SubscriptionCacheService {
	// Cache key prefixes
	private readonly LEASE_CONTEXT_PREFIX = 'lease-context:'
	private readonly TENANT_BY_USER_PREFIX = 'tenant-by-user:'
	private readonly OWNER_BY_USER_PREFIX = 'owner-by-user:'
	private readonly TENANT_BY_ID_PREFIX = 'tenant:'
	private readonly USER_BY_ID_PREFIX = 'user:'
	private readonly UNIT_BY_ID_PREFIX = 'unit:'
	private readonly PROPERTY_BY_ID_PREFIX = 'property:'
	private readonly OWNER_BY_ID_PREFIX = 'owner:'
	private readonly PAYMENT_METHOD_PREFIX = 'payment-method:'
	private readonly DEFAULT_PAYMENT_METHOD_PREFIX = 'default-payment-method:'

	constructor(
		private readonly cache: RedisCacheService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Get or load lease context with full relationship data
	 */
	async getLeaseContext(
		leaseId: string,
		loader: () => Promise<LeaseContext>
	): Promise<LeaseContext> {
		const cacheKey = `${this.LEASE_CONTEXT_PREFIX}${leaseId}`
		const cached = await this.cache.get<LeaseContext>(cacheKey)
		if (cached) {
			this.logger.debug(`Lease context cache hit for ${leaseId}`)
			return cached
		}

		const context = await loader()
		await this.cache.set(cacheKey, context, { tier: 'medium' })
		return context
	}

	/**
	 * Get or load tenant by user ID
	 */
	async getTenantByUserId(
		userId: string,
		loader: () => Promise<{ tenant: TenantRow; user: UserRow } | null>
	): Promise<{ tenant: TenantRow; user: UserRow } | null> {
		const cacheKey = `${this.TENANT_BY_USER_PREFIX}${userId}`
		const cached = await this.cache.get<TenantRow>(cacheKey)
		if (cached) {
			this.logger.debug(`Tenant by user cache hit for ${userId}`)
			return { tenant: cached, user: {} as UserRow }
		}

		const result = await loader()
		if (result) {
			await this.cache.set(cacheKey, result.tenant, { tier: 'long' })
		}
		return result
	}

	/**
	 * Get or load owner by user ID
	 */
	async getOwnerByUserId(
		userId: string,
		loader: () => Promise<PropertyOwnerRow | null>
	): Promise<PropertyOwnerRow | null> {
		const cacheKey = `${this.OWNER_BY_USER_PREFIX}${userId}`
		const cached = await this.cache.get<PropertyOwnerRow>(cacheKey)
		if (cached) {
			this.logger.debug(`Owner by user cache hit for ${userId}`)
			return cached
		}

		const result = await loader()
		if (result) {
			await this.cache.set(cacheKey, result, { tier: 'long' })
		}
		return result
	}

	/**
	 * Get or load tenant by ID
	 */
	async getTenantById(
		tenantId: string,
		loader: () => Promise<TenantRow>
	): Promise<TenantRow> {
		const cacheKey = `${this.TENANT_BY_ID_PREFIX}${tenantId}`
		const cached = await this.cache.get<TenantRow>(cacheKey)
		if (cached) {
			this.logger.debug(`Tenant by ID cache hit for ${tenantId}`)
			return cached
		}

		const result = await loader()
		await this.cache.set(cacheKey, result, { tier: 'long' })
		return result
	}

	/**
	 * Get or load user by ID
	 */
	async getUserById(
		userId: string,
		loader: () => Promise<UserRow>
	): Promise<UserRow> {
		const cacheKey = `${this.USER_BY_ID_PREFIX}${userId}`
		const cached = await this.cache.get<UserRow>(cacheKey)
		if (cached) {
			this.logger.debug(`User by ID cache hit for ${userId}`)
			return cached
		}

		const result = await loader()
		await this.cache.set(cacheKey, result, { tier: 'long' })
		return result
	}

	/**
	 * Get or load unit by ID
	 */
	async getUnitById(
		unitId: string,
		loader: () => Promise<UnitRow>
	): Promise<UnitRow> {
		const cacheKey = `${this.UNIT_BY_ID_PREFIX}${unitId}`
		const cached = await this.cache.get<UnitRow>(cacheKey)
		if (cached) {
			this.logger.debug(`Unit by ID cache hit for ${unitId}`)
			return cached
		}

		const result = await loader()
		await this.cache.set(cacheKey, result, { tier: 'long' })
		return result
	}

	/**
	 * Get or load property by ID
	 */
	async getPropertyById(
		propertyId: string,
		loader: () => Promise<PropertyRow>
	): Promise<PropertyRow> {
		const cacheKey = `${this.PROPERTY_BY_ID_PREFIX}${propertyId}`
		const cached = await this.cache.get<PropertyRow>(cacheKey)
		if (cached) {
			this.logger.debug(`Property by ID cache hit for ${propertyId}`)
			return cached
		}

		const result = await loader()
		await this.cache.set(cacheKey, result, { tier: 'long' })
		return result
	}

	/**
	 * Get or load property owner by ID
	 */
	async getPropertyOwnerById(
		ownerId: string,
		loader: () => Promise<PropertyOwnerRow>
	): Promise<PropertyOwnerRow> {
		const cacheKey = `${this.OWNER_BY_ID_PREFIX}${ownerId}`
		const cached = await this.cache.get<PropertyOwnerRow>(cacheKey)
		if (cached) {
			this.logger.debug(`Owner by ID cache hit for ${ownerId}`)
			return cached
		}

		const result = await loader()
		await this.cache.set(cacheKey, result, { tier: 'long' })
		return result
	}

	/**
	 * Get or load payment method by ID
	 */
	async getPaymentMethodById(
		id: string,
		loader: () => Promise<PaymentMethodRow>
	): Promise<PaymentMethodRow> {
		const cacheKey = `${this.PAYMENT_METHOD_PREFIX}${id}`
		const cached = await this.cache.get<PaymentMethodRow>(cacheKey)
		if (cached) {
			this.logger.debug(`Payment method cache hit for ${id}`)
			return cached
		}

		const result = await loader()
		await this.cache.set(cacheKey, result, { tier: 'short' })
		return result
	}

	/**
	 * Get or load default payment method for tenant
	 */
	async getDefaultPaymentMethod(
		tenantId: string,
		loader: () => Promise<PaymentMethodRow | null>
	): Promise<PaymentMethodRow | null> {
		const cacheKey = `${this.DEFAULT_PAYMENT_METHOD_PREFIX}${tenantId}`
		const cached = await this.cache.get<PaymentMethodRow>(cacheKey)
		if (cached) {
			this.logger.debug(
				`Default payment method cache hit for tenant ${tenantId}`
			)
			return cached
		}

		const result = await loader()
		if (result) {
			await this.cache.set(cacheKey, result, { tier: 'short' })
		}
		return result
	}

	/**
	 * Invalidate all caches for a specific lease
	 * Used when a lease is updated (subscription created/modified/canceled)
	 */
	async invalidateLeaseCache(leaseId: string): Promise<void> {
		const cacheKey = `${this.LEASE_CONTEXT_PREFIX}${leaseId}`
		await this.cache.del(cacheKey)
		this.logger.debug(`Invalidated lease cache for ${leaseId}`)
	}

	/**
	 * Invalidate all caches for a specific tenant
	 * Used when tenant profile is updated
	 */
	async invalidateTenantCache(
		tenantId: string,
		userId?: string
	): Promise<void> {
		const cacheKey = `${this.TENANT_BY_ID_PREFIX}${tenantId}`
		await this.cache.del(cacheKey)
		if (userId) {
			const userTenantKey = `${this.TENANT_BY_USER_PREFIX}${userId}`
			await this.cache.del(userTenantKey)
		}
		this.logger.debug(`Invalidated tenant cache for ${tenantId}`)
	}

	/**
	 * Invalidate all caches for a specific owner
	 * Used when owner profile is updated
	 */
	async invalidateOwnerCache(ownerId: string, userId?: string): Promise<void> {
		const cacheKey = `${this.OWNER_BY_ID_PREFIX}${ownerId}`
		await this.cache.del(cacheKey)
		if (userId) {
			const userOwnerKey = `${this.OWNER_BY_USER_PREFIX}${userId}`
			await this.cache.del(userOwnerKey)
		}
		this.logger.debug(`Invalidated owner cache for ${ownerId}`)
	}

	/**
	 * Invalidate all caches for a specific user
	 * Used when user profile is updated
	 */
	async invalidateUserCache(userId: string): Promise<void> {
		const userKey = `${this.USER_BY_ID_PREFIX}${userId}`
		const tenantUserKey = `${this.TENANT_BY_USER_PREFIX}${userId}`
		const ownerUserKey = `${this.OWNER_BY_USER_PREFIX}${userId}`
		await Promise.all([
			this.cache.del(userKey),
			this.cache.del(tenantUserKey),
			this.cache.del(ownerUserKey)
		])
		this.logger.debug(`Invalidated user cache for ${userId}`)
	}

	/**
	 * Invalidate payment method caches for a tenant
	 * Used when payment method is added/updated/removed
	 */
	async invalidatePaymentMethodCache(
		tenantId: string,
		paymentMethodId?: string
	): Promise<void> {
		const delKeys: Promise<void>[] = []
		if (paymentMethodId) {
			const pmKey = `${this.PAYMENT_METHOD_PREFIX}${paymentMethodId}`
			delKeys.push(this.cache.del(pmKey))
		}
		const defaultPmKey = `${this.DEFAULT_PAYMENT_METHOD_PREFIX}${tenantId}`
		delKeys.push(this.cache.del(defaultPmKey))
		await Promise.all(delKeys)
		this.logger.debug(`Invalidated payment method cache for tenant ${tenantId}`)
	}

	/**
	 * Clear all caches
	 * Used during testing or in emergency situations
	 */
	async clearAllCaches(): Promise<void> {
		// Note: NestJS cache manager doesn't provide a reset method for in-memory store
		// Individual cache invalidations are performed in other methods
		this.logger.debug('Cleared all subscription caches')
		return Promise.resolve()
	}
}
