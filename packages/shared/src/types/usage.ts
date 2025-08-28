/**
 * Usage tracking and analytics types
 * All types related to usage metrics, tracking, and analytics
 */

// Usage tracking entity types
// TEMPORARILY REMOVED - lease generator removed, see GitHub issue #202
// export interface UsageLeaseGeneratorRecord {
// 	id: string
// 	userId: string | null
// 	email: string
// 	ipAddress: string | null
// 	userAgent: string | null
// 	usageCount: number | null
// 	paymentStatus: string | null
// 	stripeSessionId: string | null
// 	stripeCustomerId: string | null
// 	amountPaid: number | null
// 	currency: string | null
// 	paymentDate: Date | null
// 	accessExpiresAt: Date | null
// 	createdAt: Date | null
// 	updatedAt: Date | null
// }

/**
 * Lead magnet tracking - TEMPORARILY REMOVED - see GitHub issue #202
 */
// export interface LeaseGenerationLead {
// 	email: string
// 	state: string // US state for lease generation
// 	firstName?: string
// 	lastName?: string
// 	company?: string
// 	phone?: string
// 	source?: string // 'organic', 'google-ads', 'social', etc.
// 	medium?: string // 'cpc', 'email', 'referral', etc.
// 	campaign?: string // specific campaign name
// 	ipAddress?: string
// 	userAgent?: string
// 	referrer?: string
// }

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

/**
 * Lead generation analytics - TEMPORARILY REMOVED - see GitHub issue #202
 */
// export interface LeadAnalytics {
// 	totalLeads: number
// 	uniqueEmails: number
// 	topStates: Array<{ state: string; count: number }>
// 	topSources: Array<{ source: string; count: number }>
// 	conversionsByPeriod: Array<{
// 		period: string
// 		leads: number
// 		signups: number
// 		conversionRate: number
// 	}>
// 	recentLeads: UsageLeaseGeneratorRecord[]
// }
