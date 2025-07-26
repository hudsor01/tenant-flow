/**
 * Property & Unit Management Types
 * Centralized type definitions for properties and units
 */

// Property type enum
export const PROPERTY_TYPE = {
  SINGLE_FAMILY: 'SINGLE_FAMILY',
  MULTI_FAMILY: 'MULTI_FAMILY',
  APARTMENT: 'APARTMENT',
  CONDO: 'CONDO',
  TOWNHOUSE: 'TOWNHOUSE',
  COMMERCIAL: 'COMMERCIAL'
} as const

export type PropertyType = typeof PROPERTY_TYPE[keyof typeof PROPERTY_TYPE]

// Unit status enum
export const UNIT_STATUS = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  MAINTENANCE: 'MAINTENANCE',
  VACANT: 'VACANT'
} as const

export type UnitStatus = typeof UNIT_STATUS[keyof typeof UNIT_STATUS]

// Core property interface
export interface Property {
  id: string
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  propertyType: PropertyType
  description: string | null
  imageUrls: string[]
  ownerId: string
  totalUnits: number
  createdAt: Date
  updatedAt: Date
}

// Core unit interface
export interface Unit {
  id: string
  propertyId: string
  unitNumber: string
  bedrooms: number
  bathrooms: number
  squareFeet: number | null
  monthlyRent: number
  securityDeposit: number
  status: UnitStatus
  description: string | null
  amenities: string[]
  imageUrls: string[]
  createdAt: Date
  updatedAt: Date
}

// Property with units included
export interface PropertyWithUnits extends Property {
  units: Unit[]
}

// Unit with property included
export interface UnitWithProperty extends Unit {
  property: Property
}

// Property inspection interface
export interface Inspection {
  id: string
  propertyId: string
  unitId: string | null
  inspectorId: string
  scheduledDate: Date
  completedDate: Date | null
  type: string
  notes: string | null
  findings: string[]
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  createdAt: Date
  updatedAt: Date
}

// Property expense interface
export interface Expense {
  id: string
  propertyId: string
  unitId: string | null
  category: string
  description: string
  amount: number
  date: Date
  receiptUrl: string | null
  isRecurring: boolean
  recurringInterval: string | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
}