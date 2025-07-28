/**
 * Frontend utility types and type guards
 * Type guards, utility functions, and frontend-specific relationship types
 */

import type { TenantWithDetails } from './relations'
import type { Lease } from './leases'
import type { Unit, Property } from './properties'

// ========================
// Type Guards
// ========================

/**
 * Type guard to check if tenant has leases
 */
export function tenantHasLeases(tenant: TenantWithDetails): tenant is TenantWithDetails & { leases: Lease[] } {
  return Array.isArray(tenant.leases) && tenant.leases.length > 0
}

/**
 * Type guard to check if a value is a valid string ID
 */
export function isValidId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

/**
 * Type guard to check if a property has units
 */
export function propertyHasUnits(property: Property): property is Property & { units: Unit[] } {
  return 'units' in property && Array.isArray(property.units) && property.units.length > 0
}

/**
 * Type guard to check if a unit has active leases
 */
export function unitHasActiveLeases(unit: Unit): boolean {
  return 'leases' in unit && Array.isArray(unit.leases) && 
    unit.leases.some(lease => lease.status === 'ACTIVE')
}

// ========================
// Frontend-specific Access Control Types
// ========================

/**
 * Type for tenant queries with nested lease/unit/property data
 * Used for frontend access control checks
 */
export interface TenantWithLeaseAccess {
  id: string
  leases: {
    unit?: {
      property?: {
        ownerId: string
      }
    }
  }[]
}

/**
 * Type for unit queries with nested property data
 * Used for frontend permission checks
 */
export interface UnitWithPropertyAccess {
  id: string
  property: {
    ownerId: string
  }
}

/**
 * Extended Lease type with full nested relations
 * Used for frontend display components that need all related data
 */
export interface LeaseWithFullRelations extends Lease {
  unit: Unit & {
    property: Property
  }
}

// ========================
// Utility Functions
// ========================

/**
 * Get leases from tenant safely
 */
export function getTenantLeases(tenant: TenantWithDetails): Lease[] {
  return tenant.leases || []
}

/**
 * Get active leases from tenant
 */
export function getActiveTenantLeases(tenant: TenantWithDetails): Lease[] {
  return getTenantLeases(tenant).filter(lease => lease.status === 'ACTIVE')
}

/**
 * Get units from property safely
 */
export function getPropertyUnits(property: Property): Unit[] {
  return 'units' in property && Array.isArray(property.units) ? property.units : []
}

/**
 * Get occupied units count
 */
export function getOccupiedUnitsCount(property: Property): number {
  const units = getPropertyUnits(property)
  return units.filter(unit => unitHasActiveLeases(unit)).length
}

/**
 * Get total revenue from property
 */
export function getPropertyRevenue(property: Property): number {
  const units = getPropertyUnits(property)
  return units.reduce((total, unit) => {
    if (unitHasActiveLeases(unit)) {
      return total + (unit.rent || 0)
    }
    return total
  }, 0)
}

/**
 * Check if user can access property
 */
export function canAccessProperty(property: Property, userId: string): boolean {
  return property.ownerId === userId
}

/**
 * Check if user can access tenant data
 */
export function canAccessTenant(tenant: TenantWithLeaseAccess, userId: string): boolean {
  return tenant.leases.some(lease => 
    lease.unit?.property?.ownerId === userId
  )
}

/**
 * Check if user can access unit
 */
export function canAccessUnit(unit: UnitWithPropertyAccess, userId: string): boolean {
  return unit.property.ownerId === userId
}

// ========================
// Frontend State Types
// ========================

/**
 * Generic loading state interface
 */
export interface LoadingState {
  isLoading: boolean
  error: Error | null
}

/**
 * Data with loading state
 */
export interface DataWithLoadingState<T> extends LoadingState {
  data: T | null
}

/**
 * List data with loading state
 */
export interface ListWithLoadingState<T> extends LoadingState {
  data: T[]
  total?: number
  hasMore?: boolean
}

/**
 * Form state interface
 */
export interface FormState<T> {
  data: T
  isDirty: boolean
  isValid: boolean
  errors: Record<string, string[]>
}

/**
 * Modal state interface
 */
export interface ModalState {
  isOpen: boolean
  mode: 'create' | 'edit' | 'view'
  data?: unknown
}

// ========================
// API State Types
// ========================

/**
 * Generic API response wrapper
 */
export interface FrontendApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Paginated API response
 */
export interface PaginatedFrontendApiResponse<T> extends FrontendApiResponse<T[]> {
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * File upload state
 */
export interface FileUploadState {
  isUploading: boolean
  progress: number
  file: File | null
  url?: string
  error?: string
}

// ========================
// Component State Types
// ========================

/**
 * Table state interface
 */
export interface TableState<T> {
  data: T[]
  selectedRows: Set<string>
  sortBy?: keyof T
  sortOrder: 'asc' | 'desc'
  filters: Record<string, unknown>
  pagination: {
    page: number
    pageSize: number
    total: number
  }
}

/**
 * Search state interface
 */
export interface SearchState {
  query: string
  isSearching: boolean
  results: unknown[]
  totalResults: number
}

/**
 * Filter state interface
 */
export interface FilterState {
  active: boolean
  filters: Record<string, unknown>
  appliedFilters: Record<string, unknown>
}

// ========================
// Validation Types
// ========================

/**
 * Field validation result
 */
export interface FieldValidation {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

/**
 * Form validation result
 */
export interface FormValidation {
  isValid: boolean
  fields: Record<string, FieldValidation>
  globalErrors?: string[]
}

// ========================
// Navigation Types
// ========================

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  label: string
  href?: string
  isActive?: boolean
}

/**
 * Navigation context
 */
export interface NavigationContext {
  currentPath: string
  breadcrumbs: BreadcrumbItem[]
  canGoBack: boolean
  canGoForward: boolean
}