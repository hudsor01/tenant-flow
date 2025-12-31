import { Injectable } from '@nestjs/common'

import { RedisCacheService } from '../../../cache/cache.service'
import { AppLogger } from '../../../logger/app-logger.service'

/**
 * Property Cache Invalidation Service
 * Centralized cache invalidation logic for properties and units
 * Extracted to eliminate code duplication per CLAUDE.md DRY principle
 */
@Injectable()
export class PropertyCacheInvalidationService {
	constructor(
		private readonly cache: RedisCacheService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Invalidate all property-related caches for a user/owner
	 * Uses RedisCacheService surgical invalidation
	 */
	invalidatePropertyCaches(owner_user_id: string, property_id?: string): void {
		if (property_id) {
			void this.cache.invalidateByEntity('properties', property_id)
		}
		void this.cache.invalidate(`properties:owner:${owner_user_id}`)
		this.logger.debug('Invalidated property caches', {
			owner_user_id,
			property_id
		})
	}

	/**
	 * Invalidate all unit-related caches for a property
	 * Uses RedisCacheService surgical invalidation
	 */
	invalidateUnitCaches(property_id: string, unit_id?: string): void {
		if (unit_id) {
			void this.cache.invalidateByEntity('units', unit_id)
		}
		void this.cache.invalidate(`units:property:${property_id}`)
		this.logger.debug('Invalidated unit caches', {
			property_id,
			unit_id
		})
	}
}
