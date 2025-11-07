/**
 * Evicts oldest entries from a cache when it exceeds the maximum size.
 * Simple LRU (Least Recently Used) approximation based on timestamps.
 *
 * Performance: O(n log n) due to sorting, where n = cache.size.
 * For high-frequency eviction, consider using a proper LRU data structure
 * with O(1) eviction (e.g., Map + doubly-linked list).
 *
 * @param cache - Map where values contain a timestamp field
 * @param maxSize - Maximum number of entries to keep in the cache (must be > 0)
 * @throws {Error} If maxSize is not a positive integer
 */
export function evictOldestEntries<K, V extends { timestamp: number }>(
	cache: Map<K, V>,
	maxSize: number
): void {
	// Validate maxSize
	if (!Number.isInteger(maxSize) || maxSize <= 0) {
		throw new Error('maxSize must be a positive integer')
	}

	if (cache.size <= maxSize) return

	const entries = Array.from(cache.entries())
	entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
	const toRemove = cache.size - maxSize

	// Remove oldest entries (guaranteed to exist since toRemove <= cache.size)
	for (let i = 0; i < toRemove; i++) {
		const [key] = entries[i] as [K, V]
		cache.delete(key)
	}
}
