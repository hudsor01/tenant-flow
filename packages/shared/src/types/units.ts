/**
 * UNIT TYPES - All unit-related interfaces
 * CONSOLIDATED from scattered unit definitions
 */

// =============================================================================
// CORE UNIT ENTITY
// =============================================================================

export interface Unit {
  id: string
  property_id: string
  name: string
  description?: string
  rent: number
  status: UnitStatus
  created_at: string
  updated_at: string
}

export type UnitStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'

// =============================================================================
// UNIT API TYPES - CONSOLIDATED from backend schemas
// =============================================================================

// Backend schema types - MIGRATED from apps/backend/src/schemas/units.schema.ts
export interface CreateUnitRequest {
  propertyId: string
  unitNumber: string
  bedrooms: number
  bathrooms: number
  squareFeet?: number
  rent: number
  status?: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
}

export interface UpdateUnitRequest {
  unitNumber?: string
  bedrooms?: number
  bathrooms?: number
  squareFeet?: number
  rent?: number
  status?: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
}

export interface UnitQueryRequest {
  propertyId?: string
  status?: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
  search?: string
  bedroomsMin?: number
  bedroomsMax?: number
  rentMin?: number
  rentMax?: number
  limit?: number
  offset?: number
  sortBy?: 'createdAt' | 'unitNumber' | 'bedrooms' | 'rent' | 'status'
  sortOrder?: 'asc' | 'desc'
}

// =============================================================================
// UNIT WITH RELATIONS - for API responses
// =============================================================================

export interface UnitWithProperty extends Unit {
  property?: {
    id: string
    name: string
    address: string
  }
}

export interface UnitWithLease extends Unit {
  current_lease?: {
    id: string
    tenant_name: string
    start_date: string
    end_date: string
  }
}

// =============================================================================
// UNIT STATS & AGGREGATIONS
// =============================================================================

export interface UnitStats {
  totalUnits: number
  availableUnits: number
  occupiedUnits: number
  maintenanceUnits: number
  occupancyRate: number
}

// =============================================================================
// UNIT FORM TYPES
// =============================================================================

export interface UnitFormData {
  property_id: string
  name: string
  description?: string
  rent: number
}

export interface UnitFormProps {
  initialData?: Partial<Unit>
  onSubmit: (data: UnitFormData) => void
  isLoading?: boolean
}

// =============================================================================
// ADDITIONAL UNIT TYPES - MIGRATED from inline definitions
// =============================================================================

export interface UnitFormState {
	success: boolean
	error?: string
	message?: string
}