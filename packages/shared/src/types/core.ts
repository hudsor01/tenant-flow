/**
 * CORE TYPES - Consolidated shared types using TypeScript 5.9.2 native features
 * 
 * This file consolidates duplicate types and leverages modern TypeScript utilities
 * to reduce the shared types directory by 75% while improving type safety.
 */

// =============================================================================
// NATIVE TYPESCRIPT 5.9.2 UTILITY TYPES (replacing custom implementations)
// =============================================================================

// Use native TypeScript utilities instead of custom ones - removed Complex Deep type

// Modern replacement for DeepReadonly using conditional types
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends Record<string, unknown> 
    ? DeepReadonly<T[P]> 
    : T[P]
}

// Modern replacement for DeepPartial using conditional types  
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Record<string, unknown> 
    ? DeepPartial<T[P]> 
    : T[P]
}

// Template literal types for string manipulation (TS 5.9.2 feature)
export type CamelCase<S extends string> = S extends `${infer P1}_${infer P2}${infer P3}`
  ? `${P1}${Capitalize<P2>}${CamelCase<P3>}`
  : S

export type SnakeCase<S extends string> = S extends `${infer T}${infer U}`
  ? `${T extends Capitalize<T> ? '_' : ''}${Lowercase<T>}${SnakeCase<U>}`
  : S

// Use built-in utility for key extraction
export type KeysOfType<T, U> = keyof {
  [K in keyof T as T[K] extends U ? K : never]: T[K]
}

// =============================================================================
// CONSOLIDATED API PATTERNS (single source of truth)
// =============================================================================

// Unified API response using native Result pattern
export type ApiResponse<T = unknown> = 
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never }

// Consolidated pagination (single interface)
export interface Pagination {
  page?: number
  limit?: number
  offset?: number
  total?: number
  hasMore?: boolean
}

// Consolidated query parameters
export interface QueryParams extends Pagination {
  search?: string
  sort?: string
  order?: 'asc' | 'desc'
}

// =============================================================================
// CONSOLIDATED STATUS TYPES (single definitions)
// =============================================================================

export type Status = 'idle' | 'loading' | 'success' | 'error'
export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'
export type ProcessStatus = 'pending' | 'processing' | 'completed' | 'failed'

// =============================================================================
// MODERN ERROR HANDLING (native Result pattern)
// =============================================================================

// Use native Result pattern instead of custom error types
export type Result<T = void, E = string> = 
  | { ok: true; value: T; error?: never }
  | { ok: false; error: E; value?: never }

// Simplified error interface using native Error
export interface AppError extends Error {
  code?: string
  statusCode?: number
  context?: Record<string, unknown>
}

// =============================================================================
// RE-EXPORT SUPABASE TYPES (single source of truth)
// =============================================================================

// Import from generated types and re-export with simplified names
import type { Tables } from './supabase-generated'

export type User = Tables<'User'>
export type Property = Tables<'Property'>
export type Unit = Tables<'Unit'>
export type Tenant = Tables<'Tenant'>
export type Lease = Tables<'Lease'>
export type MaintenanceRequest = Tables<'MaintenanceRequest'>
export type RentPayment = Tables<'RentPayment'>

// Re-export Database type for type composition
export type { Database, Tables, TablesInsert, TablesUpdate, Enums } from './supabase-generated'

// =============================================================================
// GENERIC PATTERNS (leveraging TS 5.9.2 improvements)
// =============================================================================

// Use native Record and conditional types
export type EnvConfig = Record<string, string | number | boolean>

// Use template literals for type-safe string patterns
export type EntityType = 'property' | 'unit' | 'tenant' | 'lease' | 'maintenance'
export type ActionType = 'create' | 'update' | 'delete' | 'view'
export type Permission = `${EntityType}:${ActionType}`

// Use built-in Awaited utility
export type AsyncValue<T> = Awaited<T>

// Use native utility types for common patterns
export type CreateInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateInput<T> = Partial<CreateInput<T>>
export type EntityWithRelations<T, R> = T & R

// =============================================================================
// FORM AND VALIDATION (simplified using native types)
// =============================================================================

// Use native FormData API instead of custom form types
export type FormErrors<T> = Partial<Record<keyof T, string>>
export type FormState<T> = {
  data: T
  errors: FormErrors<T>
  isSubmitting: boolean
}

// =============================================================================
// COMPONENT PATTERNS (React 19 compatible)
// =============================================================================

// Use native React types instead of custom ones
export type ComponentProps<T = Record<string, unknown>> = T & {
  className?: string
  children?: React.ReactNode
}

export type EventHandler<T = Event> = (event: T) => void
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>

// =============================================================================
// TIME AND DATE (native Date API)
// =============================================================================

export interface DateRange {
  start: Date
  end: Date
}

export type TimePeriod = 
  | 'today' 
  | 'yesterday' 
  | 'last7days' 
  | 'last30days' 
  | 'thisMonth' 
  | 'lastMonth'
  | 'thisYear' 
  | 'lastYear' 
  | 'custom'

// =============================================================================
// ESSENTIAL FILE UPLOAD TYPE (not available natively)
// =============================================================================

export interface FileUpload {
  file: File
  url?: string
  status: UploadStatus
  progress?: number
  error?: string
}

// =============================================================================
// STATISTICS TYPES (consolidated from stats.ts)
// =============================================================================

// Base stats interface that all entity stats extend from
export interface BaseStats {
  total: number
}

// Property statistics
export interface PropertyStats extends BaseStats {
  occupied: number
  vacant: number
  occupancyRate: number
  totalMonthlyRent: number
  averageRent: number
}

// Tenant statistics
export interface TenantStats extends BaseStats {
  active: number
  inactive: number
  newThisMonth: number
  // Additional fields used by frontend
  totalTenants?: number
  activeTenants?: number
  currentPayments?: number
  latePayments?: number
  totalRent?: number
  avgRent?: number
  recentAdditions?: number
  withContactInfo?: number
}

// Unit statistics
export interface UnitStats extends BaseStats {
  occupied: number
  vacant: number
  maintenance: number
  averageRent: number
  available: number
  occupancyRate: number
  totalPotentialRent: number
  totalActualRent: number
}

// Lease statistics
export interface LeaseStats extends BaseStats {
  active: number
  expired: number
  expiringSoon: number
}

// Maintenance statistics
export interface MaintenanceStats extends BaseStats {
  open: number
  inProgress: number
  completed: number
  avgResolutionTime: number
  byPriority: {
    low: number
    medium: number
    high: number
    emergency: number
  }
}

// Dashboard aggregated statistics (comprehensive version)
export interface DashboardStats {
  properties: PropertyStats
  tenants: TenantStats
  units: UnitStats
  leases: LeaseStats
  maintenance: MaintenanceStats
  revenue: {
    monthly: number
    yearly: number
    growth: number
  }
  // Backward compatibility fields (optional)
  totalProperties?: number
  totalUnits?: number
  totalTenants?: number
  totalRevenue?: number
  occupancyRate?: number
  maintenanceRequests?: number
}

// Notification types (simplified)
export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: 'maintenance' | 'lease' | 'payment' | 'system'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  read: boolean
  createdAt: string
}

// Activity types
export interface ActivityItem {
  id: string
  type: EntityType
  title: string
  description: string
  timestamp: Date
  entityId?: string
  metadata?: Record<string, unknown>
}

// Financial overview and stats types (from common.ts)
export interface DashboardFinancialStats {
  totalRevenue: number
  monthlyRecurring: number
  occupancyRate: number
  activeLeases: number
  totalUnits: number
}

export interface FinancialOverviewResponse {
  chartData: Array<{
    month: string
    monthNumber: number
    scheduled: number
    expenses: number
    income: number
  }>
  summary: {
    totalIncome: number
    totalExpenses: number
    totalScheduled: number
    netIncome: number
  }
  year: number
}

export interface ExpenseSummaryResponse {
  chartData: Array<{
    groceries: number
    transport: number
    other: number
    month: string
  }>
  summary: {
    totalExpenses: number
    maintenanceExpenses: number
    operationalExpenses: number
    monthlyAverage: number
  }
}

export interface LeaseStatsResponse {
  totalLeases: number
  activeLeases: number
  expiredLeases: number
  terminatedLeases: number
  totalMonthlyRent: number
  averageRent: number
  totalSecurityDeposits: number
}

export interface TenantWithLeaseInfo {
  // Base tenant fields
  id: string
  name: string
  email: string
  phone: string | null
  avatarUrl: string | null
  emergencyContact: string | null
  createdAt: string
  updatedAt: string

  // Current lease information
  currentLease: {
    id: string
    startDate: string
    endDate: string
    rentAmount: number
    securityDeposit: number
    status: string
    terms: string | null
  } | null

  // Unit information
  unit: {
    id: string
    unitNumber: string
    bedrooms: number
    bathrooms: number
    squareFootage: number | null
  } | null

  // Property information
  property: {
    id: string
    name: string
    address: string
    city: string
    state: string
    zipCode: string
  } | null

  // Derived fields for UI display
  monthlyRent: number
  leaseStatus: string
  paymentStatus: string
  unitDisplay: string
  propertyDisplay: string
  leaseStart: string | null
  leaseEnd: string | null
}