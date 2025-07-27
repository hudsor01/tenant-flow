/**
 * Property management types
 * All types related to properties, units, and property management
 */

// Import constants from the single source of truth
import { PROPERTY_TYPE, UNIT_STATUS } from '../constants/properties'

// Types derived from constants
export type PropertyType = typeof PROPERTY_TYPE[keyof typeof PROPERTY_TYPE]
export type UnitStatus = typeof UNIT_STATUS[keyof typeof UNIT_STATUS]

// Property type display helpers
export const getPropertyTypeLabel = (type: PropertyType): string => {
  const labels: Record<PropertyType, string> = {
    SINGLE_FAMILY: 'Single Family',
    MULTI_FAMILY: 'Multi Family',
    MULTI_UNIT: 'Multi Unit',
    APARTMENT: 'Apartment',
    CONDO: 'Condo',
    TOWNHOUSE: 'Townhouse',
    COMMERCIAL: 'Commercial'
  }
  return labels[type] || type
}

// Unit status display helpers
export const getUnitStatusLabel = (status: UnitStatus): string => {
  const labels: Record<UnitStatus, string> = {
    AVAILABLE: 'Available',
    VACANT: 'Vacant',
    OCCUPIED: 'Occupied',
    MAINTENANCE: 'Under Maintenance',
    RESERVED: 'Reserved'
  }
  return labels[status] || status
}

export const getUnitStatusColor = (status: UnitStatus): string => {
  const colors: Record<UnitStatus, string> = {
    AVAILABLE: 'bg-green-100 text-green-800',
    VACANT: 'bg-yellow-100 text-yellow-800',
    OCCUPIED: 'bg-blue-100 text-blue-800',
    MAINTENANCE: 'bg-orange-100 text-orange-800',
    RESERVED: 'bg-purple-100 text-purple-800'
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