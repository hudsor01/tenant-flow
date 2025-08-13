/**
 * Business entity types and related interfaces
 * These represent the core domain objects of the application
 */

import type { z } from 'zod'

// Re-export shared entities for convenience
export type { 
  Property, 
  Tenant, 
  Lease, 
  Unit, 
  MaintenanceRequest,
  PropertyType,
  UnitStatus,
  LeaseStatus,
  MaintenancePriority,
  MaintenanceStatus,
  User,
  CreatePropertyInput,
  UpdatePropertyInput,
  CreateTenantInput,
  UpdateTenantInput,
  CreateLeaseInput,
  UpdateLeaseInput,
  CreateUnitInput,
  UpdateUnitInput,
  CreateMaintenanceInput,
  UpdateMaintenanceInput
} from '@repo/shared'

// ============================================
// Form Data Types (Input Forms)
// ============================================

/**
 * Property form data - handles HTML input strings (frontend-specific)
 */
export type PropertyFormData = z.input<typeof import('@/lib/validation/zod-schemas').createPropertyFormSchema>

/**
 * Property API data - transformed for backend
 */
export type PropertyAPIData = z.output<typeof import('@/lib/validation/zod-schemas').createPropertyFormSchema>

/**
 * Unit form data - handles HTML input strings
 */
export type UnitFormData = z.input<typeof import('@/lib/validation/zod-schemas').createUnitFormSchema>

/**
 * Unit API data - transformed for backend
 */
export type UnitAPIData = z.infer<typeof import('@/lib/validation/zod-schemas').createUnitSchema>

/**
 * Tenant form data - handles HTML input strings
 */
export type TenantFormData = z.input<typeof import('@/lib/validation/zod-schemas').createTenantFormSchema>

/**
 * Tenant API data - transformed for backend
 */
export type TenantAPIData = z.infer<typeof import('@/lib/validation/zod-schemas').createTenantSchema>

/**
 * Lease form data - handles HTML input strings
 */
export type LeaseFormData = z.input<typeof import('@/lib/validation/zod-schemas').createLeaseFormSchema>

/**
 * Lease API data - transformed for backend
 */
export type LeaseAPIData = z.infer<typeof import('@/lib/validation/zod-schemas').createLeaseSchema>

// ============================================
// Authentication Types
// ============================================

/**
 * Login form data
 */
export interface LoginFormData {
  email: string
  password: string
  rememberMe?: boolean
}

/**
 * Signup form data
 */
export interface SignupFormData {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
  acceptTerms: boolean
}

/**
 * Forgot password form data
 */
export interface ForgotPasswordFormData {
  email: string
}

/**
 * Reset password form data
 */
export interface ResetPasswordFormData {
  password: string
  confirmPassword: string
}

/**
 * Update password form data
 */
export interface UpdatePasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// ============================================
// Dashboard/Analytics Types
// ============================================

/**
 * Dashboard overview metrics
 */
export interface DashboardMetrics {
  totalProperties: number
  totalTenants: number
  totalUnits: number
  occupancyRate: number
  monthlyRevenue: number
  pendingMaintenance: number
  upcomingLeaseExpirations: number
  recentActivity: ActivityItem[]
}

/**
 * Activity feed item
 */
export interface ActivityItem {
  id: string
  type: 'property' | 'tenant' | 'lease' | 'maintenance' | 'payment'
  description: string
  timestamp: Date
  entityId?: string
  entityType?: string
}

/**
 * Revenue analytics data
 */
export interface RevenueAnalytics {
  period: 'month' | 'quarter' | 'year'
  totalRevenue: number
  projectedRevenue: number
  occupancyRevenue: number
  feeRevenue: number
  monthlyBreakdown: MonthlyRevenue[]
}

/**
 * Monthly revenue breakdown
 */
export interface MonthlyRevenue {
  month: string
  revenue: number
  occupancy: number
  fees: number
}

// ============================================
// Search/Filter Types
// ============================================

/**
 * Property search filters
 */
export interface PropertyFilters {
  search?: string
  propertyType?: import('@repo/shared').PropertyType
  city?: string
  state?: string
  minRent?: number
  maxRent?: number
  bedrooms?: number
  bathrooms?: number
  status?: 'active' | 'inactive' | 'maintenance'
}

/**
 * Tenant search filters
 */
export interface TenantFilters {
  search?: string
  propertyId?: string
  unitId?: string
  leaseStatus?: import('@repo/shared').LeaseStatus
  moveInDateFrom?: Date
  moveInDateTo?: Date
}

/**
 * Maintenance request filters
 */
export interface MaintenanceFilters {
  search?: string
  propertyId?: string
  unitId?: string
  priority?: import('@repo/shared').MaintenancePriority
  status?: import('@repo/shared').MaintenanceStatus
  category?: string
  dateFrom?: Date
  dateTo?: Date
}

// ============================================
// File/Document Types
// ============================================

/**
 * Document attached to entity
 */
export interface EntityDocument {
  id: string
  name: string
  type: string
  url: string
  size: number
  uploadedAt: Date
  uploadedBy: string
}

/**
 * Lease document
 */
export interface LeaseDocument extends EntityDocument {
  leaseId: string
  documentType: 'lease_agreement' | 'addendum' | 'inspection' | 'other'
}

/**
 * Property document
 */
export interface PropertyDocument extends EntityDocument {
  propertyId: string
  documentType: 'deed' | 'insurance' | 'inspection' | 'tax_record' | 'other'
}

// ============================================
// Notification Types
// ============================================

/**
 * System notification
 */
export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  read: boolean
  createdAt: Date
  actionUrl?: string
  actionLabel?: string
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  email: {
    leaseExpiration: boolean
    maintenanceUpdates: boolean
    paymentReminders: boolean
    systemUpdates: boolean
  }
  push: {
    leaseExpiration: boolean
    maintenanceUpdates: boolean
    paymentReminders: boolean
    systemUpdates: boolean
  }
  sms: {
    emergencyOnly: boolean
    paymentReminders: boolean
  }
}

// ============================================
// Billing/Subscription Types
// ============================================

/**
 * Subscription status
 */
export type SubscriptionStatus = 
  | 'active' 
  | 'canceled' 
  | 'incomplete' 
  | 'incomplete_expired' 
  | 'past_due' 
  | 'trialing' 
  | 'unpaid'

/**
 * Subscription details
 */
export interface SubscriptionDetails {
  id: string
  status: SubscriptionStatus
  plan: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  trialEnd?: Date
}

/**
 * Feature access based on subscription
 */
export interface FeatureAccess {
  maxProperties: number
  maxUnits: number
  maxTenants: number
  advancedReports: boolean
  apiAccess: boolean
  customBranding: boolean
  prioritySupport: boolean
}

// ============================================
// Import/Export Types
// ============================================

/**
 * Supported export formats
 */
export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json'

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat
  includeHeaders: boolean
  dateRange?: {
    start: Date
    end: Date
  }
  filters?: Record<string, unknown>
}

/**
 * Import status
 */
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed'

/**
 * Import result
 */
export interface ImportResult {
  id: string
  status: ImportStatus
  fileName: string
  totalRows: number
  processedRows: number
  successfulRows: number
  errorRows: number
  errors: string[]
  createdAt: Date
}