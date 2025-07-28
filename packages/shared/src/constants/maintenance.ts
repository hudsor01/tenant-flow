/**
 * Maintenance constants
 */

export const PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM', 
  HIGH: 'HIGH',
  EMERGENCY: 'EMERGENCY'
} as const

export const MAINTENANCE_CATEGORY = {
  GENERAL: 'GENERAL',
  PLUMBING: 'PLUMBING',
  ELECTRICAL: 'ELECTRICAL',
  HVAC: 'HVAC',
  APPLIANCES: 'APPLIANCES',
  SAFETY: 'SAFETY',
  OTHER: 'OTHER'
} as const

export type MaintenanceCategory = typeof MAINTENANCE_CATEGORY[keyof typeof MAINTENANCE_CATEGORY]

export const REQUEST_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELED: 'CANCELED',
  ON_HOLD: 'ON_HOLD'
} as const

export type Priority = typeof PRIORITY[keyof typeof PRIORITY]
export type RequestStatus = typeof REQUEST_STATUS[keyof typeof REQUEST_STATUS]

// Derived options arrays for frontend use
export const PRIORITY_OPTIONS = Object.values(PRIORITY)
export const REQUEST_STATUS_OPTIONS = Object.values(REQUEST_STATUS)
