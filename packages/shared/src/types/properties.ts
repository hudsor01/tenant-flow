/**
 * PROPERTY TYPES - All property-related interfaces
 * CONSOLIDATED from 15+ scattered property definitions
 */

// =============================================================================
// CORE PROPERTY ENTITY
// =============================================================================

export interface Property {
  id: string
  name: string
  address: string
  city: string
  state: string
  zip: string
  description?: string
  status: PropertyStatus
  created_at: string
  updated_at: string
  user_id: string
  ownerId?: string  // Legacy field for frontend-utils.ts compatibility
}

export type PropertyStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'

// =============================================================================
// PROPERTY API TYPES - CONSOLIDATED from backend schemas
// =============================================================================

export interface CreatePropertyRequest {
  name: string
  address: string
  city: string
  state: string
  zip: string
  description?: string
}

export interface UpdatePropertyRequest {
  name?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  description?: string
  status?: PropertyStatus
}

export interface PropertyQueryRequest {
  status?: PropertyStatus
  search?: string
  page?: number
  limit?: number
}

// =============================================================================
// PROPERTY STATS & AGGREGATIONS
// =============================================================================

export interface PropertyStats {
  totalProperties: number
  activeProperties: number
  totalUnits: number
  occupiedUnits: number
  availableUnits: number
  occupancyRate: number
  // Frontend-dependent properties (required by dashboard components)
  totalMonthlyRent?: number
  potentialRent?: number
  totalRent?: number
  collectedRent?: number
  pendingRent?: number
  total?: number
  singleFamily?: number
  multiFamily?: number
  commercial?: number
}

export interface PropertyWithUnits extends Property {
  units?: Array<{
    id: string
    name: string
    status: string
    rent: number
  }>
}

// =============================================================================
// LEGACY COMPATIBILITY - Unit type referenced in some files
// =============================================================================

export interface Unit {
  id: string
  property_id: string
  name: string
  description?: string
  rent: number
  status: string
  created_at: string
  updated_at: string
}

// Legacy type aliases
export interface Expense {
  id: string
  property_id: string
  amount: number
  description: string
  category: string
  date: string
}

// =============================================================================
// PROPERTY FORM TYPES
// =============================================================================

export interface PropertyFormData {
  name: string
  address: string
  city: string
  state: string
  zip: string
  description: string
  features: string[]
}

export interface PropertyFormProps {
  property?: Property
  mode?: 'create' | 'edit'
  initialData?: Partial<Property>
  onSubmit?: (data: PropertyFormData) => void
  isLoading?: boolean
}

// =============================================================================
// LEGACY COMPATIBILITY - For api-inputs.ts and other files during migration
// =============================================================================

export type CreatePropertyInput = CreatePropertyRequest
export type UpdatePropertyInput = UpdatePropertyRequest

// =============================================================================
// ADDITIONAL PROPERTY TYPES - MIGRATED from inline definitions
// =============================================================================

// MIGRATED from apps/backend/src/properties/properties.service.ts
export interface PropertyWithRelations extends Property {
	Unit?: Unit[]  // Note: capitalized to match backend PostgreSQL naming
}

// Property DTOs (Data Transfer Objects) from backend schemas
export type CreatePropertyDto = CreatePropertyRequest
export type UpdatePropertyDto = UpdatePropertyRequest  
export type QueryPropertyDto = PropertyQueryRequest