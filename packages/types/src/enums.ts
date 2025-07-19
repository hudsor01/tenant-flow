/**
 * Centralized enum exports for all types
 * This file re-exports all enums and constants from individual type files
 */

// Auth enums
export type { UserRole } from './auth'
export const USER_ROLE = {
  ADMIN: 'ADMIN',
  OWNER: 'OWNER',
  TENANT: 'TENANT',
  MANAGER: 'MANAGER'
} as const

// Property enums
export type {
  PropertyType,
  UnitStatus
} from './properties'

export {
  PROPERTY_TYPE,
  PROPERTY_TYPE_OPTIONS,
  UNIT_STATUS,
  UNIT_STATUS_OPTIONS
} from './properties'

// Lease enums
export type { LeaseStatus } from './leases'
export {
  LEASE_STATUS,
  LEASE_STATUS_OPTIONS
} from './leases'

// Tenant enums
export type { InvitationStatus } from './tenants'
export {
  INVITATION_STATUS,
  INVITATION_STATUS_OPTIONS
} from './tenants'

// Maintenance enums
export type {
  Priority,
  RequestStatus
} from './maintenance'

export {
  PRIORITY,
  PRIORITY_OPTIONS,
  REQUEST_STATUS,
  REQUEST_STATUS_OPTIONS
} from './maintenance'

// Notification enums
export type {
  NotificationData,
  NotificationPriority
} from './notifications'

export {
  NOTIFICATION_PRIORITY,
  NOTIFICATION_PRIORITY_OPTIONS
} from './notifications'

// Billing enums
export type { PlanType } from './billing'

// Plan types and constants for backwards compatibility
export const PLAN_TYPE = {
  FREE: 'FREE',
  GROWTH: 'GROWTH',
  PROFESSIONAL: 'PROFESSIONAL'
} as const