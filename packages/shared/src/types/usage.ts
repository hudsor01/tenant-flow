/**
 * Usage tracking and analytics types
 * All types related to usage metrics, tracking, and analytics
 */

/**
 * Basic usage metrics for dashboard display
 */
export interface BasicUsageMetrics {
	properties: number
	tenants: number
	leases: number
	documents: number
	storage: number
	// leaseGeneration: number // TEMPORARILY REMOVED - see GitHub issue #202
}
