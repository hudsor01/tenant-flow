/**
 * Frontend-specific entity types and interfaces
 * 
 * Core entities are imported directly from @repo/shared
 * This file contains only frontend-specific types not available in shared
 */

// Import shared types directly - no re-exports needed
// Components should import directly from @repo/shared for better tree-shaking

import type { 
  PropertyTypeValidation, 
  LeaseStatus, 
  MaintenancePriorityValidation, 
  MaintenanceStatusValidation 
} from '@repo/shared/validation'

// ============================================
// Frontend-Specific Search/Filter Types
// ============================================

/**
 * Property search filters (frontend-specific UI state)
 */
export interface PropertyFilters {
  search?: string
  propertyType?: PropertyTypeValidation
  city?: string
  state?: string
  minRent?: number
  maxRent?: number
  bedrooms?: number
  bathrooms?: number
  status?: 'active' | 'inactive' | 'maintenance'
}

/**
 * Tenant search filters (frontend-specific UI state)
 */
export interface TenantFilters {
  search?: string
  propertyId?: string
  unitId?: string
  leaseStatus?: LeaseStatus
  moveInDateFrom?: Date
  moveInDateTo?: Date
}

/**
 * Maintenance request filters (frontend-specific UI state)
 */
export interface MaintenanceFilters {
  search?: string
  propertyId?: string
  unitId?: string
  priority?: MaintenancePriorityValidation
  status?: MaintenanceStatusValidation
  category?: string
  dateFrom?: Date
  dateTo?: Date
}

// ============================================
// Authentication Types (Frontend-Specific)
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
// Dashboard/Analytics Types (Frontend-Specific)
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
// File/Document Types (Frontend-Specific)
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
// Notification Types (Frontend-Specific)
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
// Billing/Subscription Types (Frontend-Specific)
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
// Import/Export Types (Frontend-Specific)
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