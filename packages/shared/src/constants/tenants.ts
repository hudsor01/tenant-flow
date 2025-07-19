/**
 * Tenant constants
 * Runtime constants and enums for tenant management
 */


export const INVITATION_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
} as const

export const INVITATION_STATUS_OPTIONS = Object.values(INVITATION_STATUS)