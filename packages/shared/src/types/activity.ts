/**
 * Activity types for audit trail and activity feed
 * These are domain types shared between frontend and backend
 */

export type ActivityPriority = 'low' | 'medium' | 'high'

export type ActivityType = 
  | 'payment' 
  | 'maintenance' 
  | 'lease' 
  | 'tenant' 
  | 'property'
  | 'unit'
  | 'billing'
  | 'auth'

export type ActivityStatus = 
  | 'PENDING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'CANCELLED'

/**
 * Strongly typed metadata for activities
 */
export interface ActivityMetadata {
  propertyName?: string
  unitNumber?: string | number
  amount?: string | number
  status?: ActivityStatus
  tenantName?: string
  leaseEndDate?: string
  maintenanceType?: string
  paymentMethod?: string
  [key: string]: string | number | boolean | null | undefined
}

/**
 * Core activity item interface
 */
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
  priority?: ActivityPriority
  type?: ActivityType
  description?: string
  timestamp?: string
}

/**
 * Activity with enhanced typing
 */
export type Activity = ActivityItem & {
  entityType: string
  metadata?: ActivityMetadata
  priority?: ActivityPriority
}

/**
 * Activity feed pagination
 */
export interface ActivityFeed {
  items: ActivityItem[]
  hasMore: boolean
  nextCursor?: string
}

/**
 * Query parameters for activity filtering
 */
export interface ActivityQuery {
  limit?: number
  cursor?: string
  type?: string
  since?: string
  userId?: string
  [key: string]: string | number | boolean | null | undefined
}

/**
 * Activity creation payload
 */
export interface CreateActivityInput {
  action: string
  entityType: string
  entityId: string
  entityName: string
  type?: ActivityType
  priority?: ActivityPriority
  description?: string
  metadata?: ActivityMetadata
}

/**
 * Activity update payload
 */
export interface UpdateActivityInput {
  priority?: ActivityPriority
  description?: string
  metadata?: ActivityMetadata
}