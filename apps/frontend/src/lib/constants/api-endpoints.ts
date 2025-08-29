/**
 * API Endpoints Constants - DRY Principle
 * Centralized endpoint definitions to avoid duplication
 */

export const API_ENDPOINTS = {
  DASHBOARD: {
    OVERVIEW: 'dashboard/overview',
    ACTIVITY: 'dashboard/activity', 
    TASKS: 'dashboard/tasks',
    ALERTS: 'dashboard/alerts'
  },
  PROPERTIES: {
    BASE: 'properties',
    STATS: 'properties/stats',
    WITH_UNITS: 'properties/with-units',
    BY_ID: (id: string) => `properties/${id}`
  },
  TENANTS: {
    BASE: 'tenants',
    STATS: 'tenants/stats',
    BY_ID: (id: string) => `tenants/${id}`
  },
  UNITS: {
    BASE: 'units',
    STATS: 'units/stats',
    BY_ID: (id: string) => `units/${id}`
  },
  LEASES: {
    BASE: 'leases',
    STATS: 'leases/stats',
    BY_ID: (id: string) => `leases/${id}`
  },
  MAINTENANCE: {
    BASE: 'maintenance',
    STATS: 'maintenance/stats',
    BY_ID: (id: string) => `maintenance/${id}`
  },
  AUTH: {
    BASE: 'auth',
    LOGIN: 'auth/login',
    LOGOUT: 'auth/logout',
    REFRESH: 'auth/refresh'
  }
} as const

export type ApiEndpoint = typeof API_ENDPOINTS[keyof typeof API_ENDPOINTS]