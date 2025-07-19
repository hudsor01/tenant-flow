// Activity types - can be expanded based on actual needs
export interface ActivityItem {
	id: string
	userId: string
	userName?: string
	action: string
	entityType: string
	entityId: string
	entityName: string
	metadata?: Record<string, string | number | boolean | null>
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
	[key: string]: string | number | boolean | null | undefined
}

export type ActivityPriority = 'low' | 'medium' | 'high'

export type Activity = ActivityItem & {
	entityType: string
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
	[key: string]: string | number | boolean | null | undefined
}