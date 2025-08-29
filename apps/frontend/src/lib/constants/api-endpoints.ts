/**
 * API Endpoints Constants - DRY Principle
 * Centralized endpoint definitions to avoid duplication
 */

export const API_ENDPOINTS = {
  DASHBOARD: {
    OVERVIEW: '/api/dashboard/overview',
    ACTIVITY: '/api/dashboard/activity', 
    TASKS: '/api/dashboard/tasks',
    ALERTS: '/api/dashboard/alerts'
  },
  PROPERTIES: {
    BASE: '/api/properties',
    STATS: '/api/properties/stats',
    WITH_UNITS: '/api/properties/with-units',
    BY_ID: (id: string) => `/api/properties/${id}`
  },
  TENANTS: {
    BASE: '/api/tenants'
  },
  UNITS: {
    BASE: '/api/units'
  },
  MAINTENANCE: {
    BASE: '/api/maintenance'
  },
  AUTH: {
    BASE: '/api/auth'
  }
} as const

export type ApiEndpoint = typeof API_ENDPOINTS[keyof typeof API_ENDPOINTS]