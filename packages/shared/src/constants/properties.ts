/**
 * Property constants
 * Central source of truth for property-related enums and constants
 */

export const PROPERTY_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  UNDER_CONTRACT: 'UNDER_CONTRACT',
  SOLD: 'SOLD'
} as const

export type PropertyStatus = typeof PROPERTY_STATUS[keyof typeof PROPERTY_STATUS]

// Property type enum - matches Prisma schema PropertyType enum
export const PROPERTY_TYPE = {
  SINGLE_FAMILY: 'SINGLE_FAMILY',
  MULTI_UNIT: 'MULTI_UNIT',
  APARTMENT: 'APARTMENT',
  COMMERCIAL: 'COMMERCIAL'
} as const

export type PropertyType = typeof PROPERTY_TYPE[keyof typeof PROPERTY_TYPE]

// Unit status enum - matches Prisma schema UnitStatus enum
export const UNIT_STATUS = {
  VACANT: 'VACANT',
  OCCUPIED: 'OCCUPIED',
  MAINTENANCE: 'MAINTENANCE',
  RESERVED: 'RESERVED'
} as const

export type UnitStatus = typeof UNIT_STATUS[keyof typeof UNIT_STATUS]

// Derived options arrays for frontend use
export const PROPERTY_TYPE_OPTIONS = Object.values(PROPERTY_TYPE)
export const UNIT_STATUS_OPTIONS = Object.values(UNIT_STATUS)
