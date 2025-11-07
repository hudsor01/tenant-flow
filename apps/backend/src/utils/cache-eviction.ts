/**
 * Evicts oldest entries from a cache when it exceeds the maximum size.
 * Simple LRU (Least Recently Used) approximation based on timestamps.
 *
 * @param cache - Map where values contain a timestamp field
 * @param maxSize - Maximum number of entries to keep in the cache
 */
export function evictOldestEntries<K, V extends { timestamp: number }>(
	cache: Map<K, V>,
	maxSize: number
): void {
	if (cache.size <= maxSize) return

	const entries = Array.from(cache.entries())
	entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
	const toRemove = cache.size - maxSize

	for (let i = 0; i < toRemove; i++) {
		const entry = entries[i]
		if (entry) {
			cache.delete(entry[0])
		}
	}
}
