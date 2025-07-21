/**
 * Centralized enum exports for all types
 * This file re-exports all enums and constants from individual type files
 */

// Auth enums - import from constants
import { USER_ROLE } from '../constants/auth'
export type { UserRole } from './auth'
export { USER_ROLE }

// Property enums - import from constants
import { PROPERTY_TYPE, UNIT_STATUS } from '../constants/properties'
export type { PropertyType, UnitStatus } from './properties'
export { PROPERTY_TYPE, UNIT_STATUS }
export const PROPERTY_TYPE_OPTIONS = Object.values(PROPERTY_TYPE)
export const UNIT_STATUS_OPTIONS = Object.values(UNIT_STATUS)

// Lease enums - import from constants
import { LEASE_STATUS } from '../constants/leases'
export type { LeaseStatus } from './leases'
export { LEASE_STATUS }
export const LEASE_STATUS_OPTIONS = Object.values(LEASE_STATUS)

// Tenant enums
export type { Tenant } from './tenants'

// Maintenance enums - import from constants
import { PRIORITY, REQUEST_STATUS } from '../constants/maintenance'
export type { Priority, RequestStatus } from './maintenance'
export { PRIORITY, REQUEST_STATUS }
export const PRIORITY_OPTIONS = Object.values(PRIORITY)
export const REQUEST_STATUS_OPTIONS = Object.values(REQUEST_STATUS)

// Notification enums
export type {
  NotificationData,
  NotificationPriority
} from './notifications'

export {
  NOTIFICATION_PRIORITY,
  NOTIFICATION_PRIORITY_OPTIONS
} from './notifications'

// Billing enums - import from constants
import { PLAN_TYPE, BILLING_PERIOD, SUB_STATUS } from '../constants/billing'
export type { PlanType, BillingPeriod, SubStatus } from './billing'
export { PLAN_TYPE, BILLING_PERIOD, SUB_STATUS }
export const PLAN_TYPE_OPTIONS = Object.values(PLAN_TYPE)
export const BILLING_PERIOD_OPTIONS = Object.values(BILLING_PERIOD)
export const SUB_STATUS_OPTIONS = Object.values(SUB_STATUS)