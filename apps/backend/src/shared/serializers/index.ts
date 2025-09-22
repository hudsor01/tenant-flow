/**
 * Serialization utilities for TenantFlow Backend
 *
 * Note: Express migration complete - using native JSON serialization.
 * Express handles serialization through native JSON.stringify and middleware.
 */

/**
 * Performance monitoring interface (preserved for compatibility)
 */
export interface SerializerMetrics {
	dateSerializationCount: number
	currencySerializationCount: number
	averageSerializationTime: number
}

let metrics: SerializerMetrics = {
	dateSerializationCount: 0,
	currencySerializationCount: 0,
	averageSerializationTime: 0
}

/**
 * Get serializer performance metrics
 */
export function getSerializerMetrics(): SerializerMetrics {
	return { ...metrics }
}

/**
 * Reset serializer metrics
 */
export function resetSerializerMetrics(): void {
	metrics = {
		dateSerializationCount: 0,
		currencySerializationCount: 0,
		averageSerializationTime: 0
	}
}

/**
 * Express JSON serialization helpers
 */
export function serializeDate(date: Date): string {
	return date.toISOString()
}

export function serializeCurrency(cents: number): string {
	return (cents / 100).toFixed(2)
}

export function parseStripeCents(amount: string | number): number {
	return typeof amount === 'string'
		? Number.parseFloat(amount) * 100
		: amount * 100
}
