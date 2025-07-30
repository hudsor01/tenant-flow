/**
 * Property management types
 * All types related to properties, units, and property management
 */

import { PROPERTY_TYPE, UNIT_STATUS } from '../constants/properties'

// Types derived from constants
export type PropertyType = typeof PROPERTY_TYPE[keyof typeof PROPERTY_TYPE]
export type UnitStatus = typeof UNIT_STATUS[keyof typeof UNIT_STATUS]

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
  // Optional relations
  units?: Unit[]
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

// Extended property types with relations are defined in relations.ts
// to avoid circular imports and provide full relation details
// See: PropertyWithUnitsAndLeases, PropertyWithDetails, UnitWithDetails


// Property statistics for dashboard and detail views
export interface PropertyStats {
  totalUnits: number
  occupiedUnits: number
  vacantUnits: number
  occupancyRate: number
  totalMonthlyRent: number
  potentialRent: number
  totalProperties?: number
  totalRent?: number
  collectedRent?: number
  pendingRent?: number
}

// Property creation and management entitlements
export interface PropertyEntitlements {
  isLoading: boolean
  canCreateProperties: boolean
  canCreateTenants: boolean
  canCreateUnits: boolean
  subscription: unknown // SubscriptionData | undefined but using unknown to avoid import issues
}
