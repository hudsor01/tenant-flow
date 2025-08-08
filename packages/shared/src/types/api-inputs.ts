/**
 * API Request Input Types
 * All input types for API requests across the application
 * These types define the structure of data sent to backend endpoints
 */

import type { PLAN_TYPE } from '../constants/billing'
import type { PropertyType } from './properties'
import type { PropertyQuery, MaintenanceQuery } from './queries'
import type { Lease } from './leases'
import type { Property } from './properties'

// ========================
// Subscription API Inputs
// ========================

/**
 * Input for creating a checkout session
 * Used by useCreateCheckoutSession hook
 */
export interface CreateCheckoutInput {
  planType: string
  billingInterval?: 'monthly' | 'yearly'
  uiMode?: 'hosted' | 'embedded'
}

/**
 * Input for creating a customer portal session
 * Used by useCreatePortalSession hook
 */
export interface CreatePortalInput {
  returnUrl?: string
}

/**
 * Parameters for direct subscription creation (without checkout)
 * Used by useDirectSubscription hook
 */
export interface DirectSubscriptionParams {
  priceId: string
  planType: keyof typeof PLAN_TYPE
  billingName?: string
  paymentMethodId?: string
  defaultPaymentMethod?: boolean
}

/**
 * Parameters for updating an existing subscription
 * Used by useDirectSubscription hook for plan changes
 */
export interface SubscriptionUpdateParams extends Record<string, unknown> {
  subscriptionId: string
  newPriceId: string
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
}

/**
 * Checkout parameters for basic checkout flow
 * Used by useCheckout hook
 */
export interface CheckoutParams {
  planType: keyof typeof PLAN_TYPE
  billingInterval: 'monthly' | 'annual'
  billingName?: string
}

/**
 * Trial activation parameters
 * Used by useCheckout hook for starting trials
 */
export interface TrialParams {
  onSuccess?: (subscriptionId: string) => void
}

// ========================
// Property API Inputs
// ========================

/**
 * Input for creating a new property
 * Used by property management hooks
 */
export interface CreatePropertyInput {
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  description?: string
  propertyType?: PropertyType
  [key: string]: unknown
}

/**
 * Input for updating an existing property
 * Used by property management hooks
 */
export interface UpdatePropertyInput {
  name?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  description?: string
  propertyType?: PropertyType
  imageUrl?: string
  [key: string]: unknown
}

/**
 * Query parameters for filtering properties (extends from queries.ts)
 * Used by property listing hooks
 */
export type PropertyQueryInput = PropertyQuery

// ========================
// Unit API Inputs
// ========================

/**
 * Input for creating a new unit
 * Used by unit management hooks
 */
export interface CreateUnitInput {
  propertyId: string
  unitNumber: string
  bedrooms: number
  bathrooms: number
  squareFeet?: number
  monthlyRent: number
  securityDeposit?: number
  description?: string
  amenities?: string[]
  [key: string]: unknown
}

/**
 * Input for updating an existing unit
 * Used by unit management hooks
 */
export interface UpdateUnitInput {
  unitNumber?: string
  bedrooms?: number
  bathrooms?: number
  squareFeet?: number
  monthlyRent?: number
  securityDeposit?: number
  description?: string
  amenities?: string[]
  status?: string
  lastInspectionDate?: string | Date
  [key: string]: unknown
}

// ========================
// Tenant API Inputs
// ========================

/**
 * Input for creating a new tenant
 * Used by tenant management hooks
 */
export interface CreateTenantInput {
  name: string
  email: string
  phone?: string
  emergencyContact?: string
  emergencyPhone?: string
  moveInDate?: string
  notes?: string
  [key: string]: unknown
}

/**
 * Input for updating an existing tenant
 * Used by tenant management hooks
 */
export interface UpdateTenantInput {
  name?: string
  email?: string
  phone?: string
  emergencyContact?: string
  emergencyPhone?: string
  moveInDate?: string
  moveOutDate?: string
  notes?: string
  [key: string]: unknown
}

// ========================
// Lease API Inputs
// ========================

/**
 * Input for creating a new lease
 * Used by lease management hooks
 */
export interface CreateLeaseInput {
  unitId: string
  tenantId: string
  propertyId?: string
  startDate: string
  endDate: string
  rentAmount: number
  securityDeposit?: number
  lateFeeDays?: number
  lateFeeAmount?: number
  leaseTerms?: string
  [key: string]: unknown
}

/**
 * Input for updating an existing lease
 * Used by lease management hooks
 */
export interface UpdateLeaseInput {
  startDate?: string
  endDate?: string
  rentAmount?: number
  securityDeposit?: number
  lateFeeDays?: number
  lateFeeAmount?: number
  leaseTerms?: string
  status?: string
  [key: string]: unknown
}

// ========================
// Maintenance API Inputs
// ========================

/**
 * Input for creating a maintenance request
 * Used by maintenance management hooks
 */
export interface CreateMaintenanceInput {
  unitId: string
  title: string
  description: string
  category: string
  priority?: string
  status?: string
  preferredDate?: string
  allowEntry?: boolean
  contactPhone?: string
  requestedBy?: string
  notes?: string
  photos?: string[]
  [key: string]: unknown
}

/**
 * Input for updating a maintenance request
 * Used by maintenance management hooks
 */
export interface UpdateMaintenanceInput {
  title?: string
  description?: string
  category?: string
  priority?: string
  status?: string
  preferredDate?: string
  allowEntry?: boolean
  contactPhone?: string
  assignedTo?: string
  estimatedCost?: number
  actualCost?: number
  completedAt?: string
  notes?: string
  photos?: string[]
  [key: string]: unknown
}

/**
 * Query parameters for maintenance request search (extends from queries.ts)
 * Used by maintenance list endpoints
 */
export type MaintenanceQueryInput = MaintenanceQuery

// ========================
// Form Data Types (moved from frontend)
// ========================

/**
 * Property form data structure
 * Extended version of CreatePropertyInput with UI-specific fields
 */
export interface PropertyFormData {
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  imageUrl?: string
  description?: string
  propertyType?: PropertyType
  hasGarage?: boolean
  hasPool?: boolean
  numberOfUnits?: number
  createUnitsNow?: boolean
}

/**
 * Lease form props for modal components
 */
export interface UseLeaseFormProps {
  lease?: Lease
  mode?: 'create' | 'edit'
  propertyId?: string
  unitId?: string
  tenantId?: string
  onSuccess: () => void
  onClose: () => void
}

/**
 * Property form data props for modal components
 */
export interface UsePropertyFormDataProps {
  property?: Property
  mode: 'create' | 'edit'
  isOpen: boolean
}

/**
 * Form field context types for React Hook Form integration
 */
export interface FormFieldContextValue<
  TFieldValues extends Record<string, unknown> = Record<string, unknown>,
  TName extends keyof TFieldValues = keyof TFieldValues
> {
  name: TName
}

export interface FormItemContextValue {
  id: string
}

// ========================
// File Upload Types
// ========================

/**
 * File upload request structure
 */
export interface FileUploadRequest {
  file: string // base64 encoded file
  filename: string
  contentType: string
  folder?: string
}

// Note: FileUploadResponse is defined in api.ts
// Note: Invoice types (EmailCaptureData, InvoiceDownloadResponse, InvoiceGenerationRequest) are defined in invoice-lead.ts

// ========================
// Authentication API Inputs
// ========================

/**
 * Input for user registration
 * Used by auth registration endpoints
 */
export interface RegisterInput {
  email: string
  password: string
  firstName: string
  lastName: string
}

/**
 * Input for user login
 * Used by auth login endpoints
 */
export interface LoginInput {
  email: string
  password: string
}

/**
 * Input for refresh token request
 * Used by auth token refresh endpoints
 */
export interface RefreshTokenInput {
  refreshToken: string
}

/**
 * Input for forgot password request
 * Used by auth forgot password endpoints
 */
export interface ForgotPasswordInput {
  email: string
}

/**
 * Input for password reset
 * Used by auth reset password endpoints
 */
export interface ResetPasswordInput {
  token: string
  password: string
}

/**
 * Input for changing password
 * Used by auth change password endpoints
 */
export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

/**
 * Input for auth callback (OAuth)
 * Used by auth callback endpoints
 */
export interface AuthCallbackInput {
  access_token: string
  refresh_token: string
  type?: string
}

// ========================
// User Management API Inputs
// ========================

/**
 * Input for ensuring user exists
 * Used by user management endpoints
 */
export interface EnsureUserExistsInput {
  authUser: {
    id: string
    email: string
    user_metadata?: {
      name?: string
      full_name?: string
    }
  }
  options?: {
    role?: 'OWNER' | 'TENANT' | 'MANAGER' | 'ADMIN'
    name?: string
    maxRetries?: number
    retryDelayMs?: number
  }
}

/**
 * Input for updating user profile
 * Used by user profile update endpoints
 */
export interface UpdateUserProfileInput {
  name?: string
  phone?: string
  bio?: string
  avatarUrl?: string
  [key: string]: unknown
}