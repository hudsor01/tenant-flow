/**
 * Lease constants
 * Runtime constants and enums for lease management
 */


export const LEASE_STATUS = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  TERMINATED: 'TERMINATED'
} as const

export const LEASE_STATUS_OPTIONS = Object.values(LEASE_STATUS)