import type { NotificationType } from './entities'

// Activity types - can be expanded based on actual needs
export interface ActivityItem {
	id: string
	userId: string
	userName?: string
	action: string
	entityType: NotificationType
	entityId: string
	entityName?: string
	metadata?: Record<string, unknown>
	createdAt: string
	priority?: 'low' | 'medium' | 'high'
	// Legacy fields for backwards compatibility
	type?: 'payment' | 'maintenance' | 'lease' | 'tenant' | 'property'
	description?: string
	timestamp?: string
}

export interface ActivityFeed {
	items: ActivityItem[]
	hasMore: boolean
	nextCursor?: string
}

export interface ActivityQuery {
	limit?: number
	cursor?: string
	type?: string
	since?: string
	userId?: string
	[key: string]: unknown
}

export type ActivityPriority = 'low' | 'medium' | 'high'

export type Activity = ActivityItem & {
	entityType: NotificationType
	metadata?: ActivityMetadata
	priority?: ActivityPriority
}

// Strongly typed metadata
export interface ActivityMetadata {
	propertyName?: string
	unitNumber?: string | number
	amount?: string | number
	status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
	tenantName?: string
	leaseEndDate?: string
	maintenanceType?: string
	paymentMethod?: string
	[key: string]: unknown
}