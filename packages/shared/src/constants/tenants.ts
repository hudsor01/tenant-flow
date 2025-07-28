/**
 * Tenant constants
 * Runtime constants and enums for tenant management
 */

export const TENANT_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  EVICTED: 'EVICTED',
  PENDING: 'PENDING'
} as const

export type TenantStatus = typeof TENANT_STATUS[keyof typeof TENANT_STATUS]
