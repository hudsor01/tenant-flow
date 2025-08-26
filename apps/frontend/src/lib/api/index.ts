/**
 * API Exports - All frontend API connections
 * Provides centralized access to all backend API endpoints
 */

// Core API client
export { apiClient, createSearchParams } from '@/lib/api-client'
export type { ApiError, RequestConfig } from '@/lib/api-client'

// Response validation
export { ResponseValidator } from './response-validator'
export type { ValidationOptions } from './response-validator'

// Individual API modules with imports
import { authApi, authKeys } from './auth'
import { billingApi, billingKeys } from './billing'
import { dashboardApi, dashboardKeys } from './dashboard'
import { leaseApi, leaseKeys } from './leases'
import { maintenanceApi } from './maintenance'
import { pdfApi, pdfKeys } from './pdf'
import { propertyApi, propertyKeys } from './properties'
import { tenantApi } from './tenants'
import { unitApi } from './units'
import { notificationApi } from './notifications-api'

// Re-export individual modules
export { authApi, authKeys }
export { billingApi, billingKeys }
export { dashboardApi, dashboardKeys }
export { leaseApi, leaseKeys }
export { maintenanceApi }
export { pdfApi, pdfKeys }
export { propertyApi, propertyKeys }
export { tenantApi }
export { unitApi }
export { notificationApi }

/**
 * All API collections for easy access
 */
export const api = {
	auth: authApi,
	billing: billingApi,
	dashboard: dashboardApi,
	leases: leaseApi,
	maintenance: maintenanceApi,
	notifications: notificationApi,
	pdf: pdfApi,
	properties: propertyApi,
	tenants: tenantApi,
	units: unitApi
}

/**
 * All query keys for React Query
 */
export const queryKeys = {
	auth: authKeys,
	billing: billingKeys,
	dashboard: dashboardKeys,
	leases: leaseKeys,
	pdf: pdfKeys,
	properties: propertyKeys
}
