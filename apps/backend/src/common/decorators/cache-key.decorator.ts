/**
 * Utility functions for cache key generation
 */
export class CacheKeyGenerator {
	private static readonly SEPARATOR = ':'

	/**
	 * Generate a standardized cache key
	 * Format: prefix:method:ownerId:entityId:queryHash
	 */
	static generateKey(
		prefix: string,
		method: string,
		ownerId: string,
		entityId?: string,
		query?: Record<string, unknown>
	): string {
		const parts = [prefix, method, ownerId]

		if (entityId) {
			parts.push(entityId)
		}

		if (query && Object.keys(query).length > 0) {
			// Create deterministic hash of query object
			const queryHash = this.hashObject(query)
			parts.push(queryHash)
		}

		return parts.join(this.SEPARATOR)
	}

	/**
	 * Generate cache key for list operations
	 */
	static generateListKey(
		prefix: string,
		ownerId: string,
		query?: Record<string, unknown>
	): string {
		return this.generateKey(prefix, 'list', ownerId, undefined, query)
	}

	/**
	 * Generate cache key for entity operations
	 */
	static generateEntityKey(
		prefix: string,
		method: string,
		ownerId: string,
		entityId: string
	): string {
		return this.generateKey(prefix, method, ownerId, entityId)
	}

	/**
	 * Generate cache key for stats operations
	 */
	static generateStatsKey(prefix: string, ownerId: string): string {
		return this.generateKey(prefix, 'stats', ownerId)
	}

	/**
	 * Generate cache key for relationship operations
	 */
	static generateRelationKey(
		prefix: string,
		relation: string,
		relationId: string,
		ownerId: string,
		query?: Record<string, unknown>
	): string {
		return this.generateKey(prefix, relation, ownerId, relationId, query)
	}

	/**
	 * Generate tags for cache invalidation
	 */
	static generateTags(
		prefix: string,
		ownerId: string,
		entityId?: string
	): string[] {
		const tags = [`user:${ownerId}`, `entity:${prefix}`]

		if (entityId) {
			tags.push(`${prefix}:${entityId}`)
		}

		return tags
	}

	/**
	 * Create deterministic hash from object
	 */
	private static hashObject(obj: Record<string, unknown>): string {
		// Sort keys to ensure consistent hashing
		const sortedKeys = Object.keys(obj).sort()
		const sortedObj = sortedKeys.reduce(
			(result, key) => {
				result[key] = obj[key]
				return result
			},
			{} as Record<string, unknown>
		)

		// Create simple hash (for cache keys, not security)
		const str = JSON.stringify(sortedObj)
		let hash = 0

		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i)
			hash = (hash << 5) - hash + char
			hash = hash & hash // Convert to 32-bit integer
		}

		return Math.abs(hash).toString(36)
	}

	/**
	 * Extract entity prefix from cache key
	 */
	static extractPrefix(key: string): string | null {
		const parts = key.split(this.SEPARATOR)
		return parts.length > 0 ? (parts[0] ?? null) : null
	}

	/**
	 * Extract owner ID from cache key
	 */
	static extractOwnerId(key: string): string | null {
		const parts = key.split(this.SEPARATOR)
		return parts.length > 2 ? (parts[2] ?? null) : null
	}

	/**
	 * Check if key matches pattern
	 */
	static matchesPattern(key: string, pattern: string): boolean {
		// Convert pattern to regex (simple * wildcard support)
		const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.')

		const regex = new RegExp(`^${regexPattern}$`)
		return regex.test(key)
	}
}
