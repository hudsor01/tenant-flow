/**
 * Query types for API filtering and pagination
 * These are domain types shared between frontend and backend
 */

import type { RequestStatus } from './maintenance'

/**
 * Base query interface with common pagination params
 */
export interface BaseQuery {
  limit?: number
  offset?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Property query parameters
 */
export interface PropertyQuery extends BaseQuery {
  propertyType?: string
  status?: string
  ownerId?: string
  city?: string
  state?: string
  zipCode?: string
}

/**
 * Lease query parameters
 */
export interface LeaseQuery extends BaseQuery {
  tenantId?: string
  unitId?: string
  propertyId?: string
  status?: string
  startDate?: string
  endDate?: string
  includeExpired?: boolean
}

/**
 * Maintenance query parameters
 */
export interface MaintenanceQuery extends BaseQuery {
  status?: RequestStatus
  propertyId?: string
  unitId?: string
  priority?: string
  category?: string
  assignedTo?: string
  dateFrom?: string
  dateTo?: string
}

/**
 * Unit query parameters
 */
export interface UnitQuery extends BaseQuery {
  propertyId?: string
  status?: string
  type?: string
  bedroomsMin?: number
  bedroomsMax?: number
  bathroomsMin?: number
  bathroomsMax?: number
  rentMin?: number
  rentMax?: number
}

/**
 * Tenant query parameters
 */
export interface TenantQuery extends BaseQuery {
  propertyId?: string
  unitId?: string
  leaseStatus?: string
  moveInDateFrom?: string
  moveInDateTo?: string
  email?: string
  phone?: string
}

/**
 * Payment query parameters
 */
export interface PaymentQuery extends BaseQuery {
  leaseId?: string
  tenantId?: string
  propertyId?: string
  status?: string
  type?: string
  dateFrom?: string
  dateTo?: string
  amountMin?: number
  amountMax?: number
}

/**
 * Invoice query parameters
 */
export interface InvoiceQuery extends BaseQuery {
  customerId?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  overdue?: boolean
}

/**
 * Notification query parameters
 */
export interface NotificationQuery extends BaseQuery {
  userId?: string
  type?: string
  priority?: string
  read?: boolean
  dateFrom?: string
  dateTo?: string
}

/**
 * Activity query parameters (extends from activity types)
 */
export interface ActivityQueryParams extends BaseQuery {
  type?: string
  since?: string
  userId?: string
  entityType?: string
  entityId?: string
}

/**
 * Analytics query parameters
 */
export interface AnalyticsQueryParams extends BaseQuery {
  propertyId?: string
  ownerId?: string
  startDate?: string
  endDate?: string
  metricTypes?: string[]
  includeAlerts?: boolean
  includeTrends?: boolean
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year'
}

/**
 * Pagination response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}