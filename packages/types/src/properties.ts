/**
 * Property management types
 * All types related to properties, units, and property management
 */

// Property type enum (matches Prisma schema)
export type PropertyType = 
  | 'SINGLE_FAMILY'
  | 'MULTI_UNIT'
  | 'APARTMENT'
  | 'COMMERCIAL'

export const PROPERTY_TYPE = {
  SINGLE_FAMILY: 'SINGLE_FAMILY',
  MULTI_UNIT: 'MULTI_UNIT',
  APARTMENT: 'APARTMENT',
  COMMERCIAL: 'COMMERCIAL'
} as const

export const PROPERTY_TYPE_OPTIONS = Object.values(PROPERTY_TYPE)

// Property type display helpers
export const getPropertyTypeLabel = (type: PropertyType): string => {
  const labels: Record<PropertyType, string> = {
    SINGLE_FAMILY: 'Single Family',
    MULTI_UNIT: 'Multi Unit',
    APARTMENT: 'Apartment',
    COMMERCIAL: 'Commercial'
  }
  return labels[type] || type
}

// Unit status enum
export type UnitStatus = 
  | 'VACANT'
  | 'OCCUPIED'
  | 'MAINTENANCE'
  | 'RESERVED'

export const UNIT_STATUS = {
  VACANT: 'VACANT',
  OCCUPIED: 'OCCUPIED',
  MAINTENANCE: 'MAINTENANCE',
  RESERVED: 'RESERVED'
} as const

export const UNIT_STATUS_OPTIONS = Object.values(UNIT_STATUS)

// Unit status display helpers
export const getUnitStatusLabel = (status: UnitStatus): string => {
  const labels: Record<UnitStatus, string> = {
    VACANT: 'Vacant',
    OCCUPIED: 'Occupied',
    MAINTENANCE: 'Under Maintenance',
    RESERVED: 'Reserved'
  }
  return labels[status] || status
}

export const getUnitStatusColor = (status: UnitStatus): string => {
  const colors: Record<UnitStatus, string> = {
    VACANT: 'bg-yellow-100 text-yellow-800',
    OCCUPIED: 'bg-green-100 text-green-800',
    MAINTENANCE: 'bg-orange-100 text-orange-800',
    RESERVED: 'bg-blue-100 text-blue-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

// Property entity types
export interface Property {
  id: string
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  description: string | null
  imageUrl: string | null
  ownerId: string
  propertyType: PropertyType
  createdAt: Date
  updatedAt: Date
}

export interface Unit {
  id: string
  unitNumber: string
  propertyId: string
  bedrooms: number
  bathrooms: number
  squareFeet: number | null
  rent: number
  status: UnitStatus
  lastInspectionDate: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface Inspection {
  id: string
  propertyId: string
  unitId: string | null
  inspectorId: string
  type: string
  scheduledDate: Date
  completedDate: Date | null
  status: string
  notes: string | null
  reportUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Expense {
  id: string
  propertyId: string
  maintenanceId: string | null
  amount: number
  category: string
  description: string
  date: Date
  receiptUrl: string | null
  vendorName: string | null
  vendorContact: string | null
  createdAt: Date
  updatedAt: Date
}

// Extended property types with relations
// Note: For complex relations, import from the relations file to avoid circular imports
// import type { PropertyWithDetails, UnitWithDetails } from '@tenantflow/shared/src/relations'