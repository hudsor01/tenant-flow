/**
 * Lease constants
 * Runtime constants and enums for lease management
 */

export const LEASE_STATUS = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  TERMINATED: 'TERMINATED',
  PENDING: 'PENDING',
  DRAFT: 'DRAFT',
  INACTIVE: 'INACTIVE'
} as const

export type LeaseStatus = typeof LEASE_STATUS[keyof typeof LEASE_STATUS]

export const LEASE_STATUS_OPTIONS = Object.values(LEASE_STATUS)

export const LEASE_TYPE = {
  FIXED_TERM: 'FIXED_TERM',
  MONTH_TO_MONTH: 'MONTH_TO_MONTH',
  WEEK_TO_WEEK: 'WEEK_TO_WEEK'
} as const

export type LeaseType = typeof LEASE_TYPE[keyof typeof LEASE_TYPE]

export const LEASE_TYPE_OPTIONS = Object.values(LEASE_TYPE)