/**
 * API Request Input Types
 * All input types for API requests across the application
 * These types define the structure of data sent to backend endpoints
 */

import type { PLAN_TYPE } from '../constants/billing.js'
import type { MaintenanceQuery, PropertyQuery } from './queries.js'
import type { Database } from './supabase.js'

// Define types properly from Database schema
type Lease = Database['public']['Tables']['leases']['Row']
type Property = Database['public']['Tables']['properties']['Row']

// Subscription API Inputs

/**
 * Input for creating a checkout session
 * Used by useCreateCheckoutSession hook from use-billing
 */
export interface CreateCheckoutInput {
	planType?: string
	planId?: string // Backend expects either planId or planType
	priceId?: string // Alternative to planId
	interval?: 'monthly' | 'annual' // Backend field name
	billingInterval?: 'monthly' | 'yearly' // Frontend compatibility
	uiMode?: 'hosted' | 'embedded'
	successUrl?: string
	cancelUrl?: string
}

/**
 * Input for creating a customer portal session
 * Used by useCreatePortalSession hook from use-billing
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
export interface SubscriptionUpdateParams {
	subscriptionId: string
	newPriceId: string
	prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
	coupon?: string
	metadata?: Record<string, string> // Stripe metadata is always string values
	description?: string
	trialEnd?: number | 'now'
}

/**
 * Checkout parameters for basic checkout flow
 * Used by useCreateCheckout hook from use-billing
 */
export interface CheckoutParams {
	planType: keyof typeof PLAN_TYPE
	billingInterval: 'monthly' | 'annual'
	billingName?: string
}

/**
 * Trial activation parameters
 * Used by useStartFreeTrial hook from use-billing
 */
export interface TrialParams {
	onSuccess?: (subscriptionId: string) => void
}

// Property API Inputs (Re-exported from properties.ts)

// Define property input types from Database schema
export type CreatePropertyInput =
	Database['public']['Tables']['properties']['Insert']
export type UpdatePropertyInput =
	Database['public']['Tables']['properties']['Update']

/**
 * Query parameters for filtering properties (extends from queries.ts)
 * Used by property listing hooks
 */
export type PropertyQueryInput = PropertyQuery

// Unit API Inputs

/**
 * Input for creating a new unit
 * Uses Supabase generated types for type safety
 */
export type CreateUnitInput = Database['public']['Tables']['units']['Insert']

/**
 * Input for updating an existing unit
 * Uses Supabase generated types for type safety
 */
export type UpdateUnitInput = Database['public']['Tables']['units']['Update']

// Tenant API Inputs

/**
 * Input for creating a new tenant
 * Excludes server-managed fields: user_id (from auth), id, created_at, updated_at
 * Backend extracts user_id from authenticated JWT token
 */
export type CreateTenantInput = Omit<
	Database['public']['Tables']['tenants']['Insert'],
	'user_id' | 'id' | 'created_at' | 'updated_at'
>

/**
 * Input for updating an existing tenant
 * Uses Supabase generated types for type safety
 */
export type UpdateTenantInput = Database['public']['Tables']['tenants']['Update']

// Lease API Inputs

/**
 * Input for creating a new lease
 * Uses Supabase generated types for type safety
 */
export type CreateLeaseInput = Database['public']['Tables']['leases']['Insert']

/**
 * Input for updating an existing lease
 * Uses Supabase generated types for type safety
 */
export type UpdateLeaseInput = Database['public']['Tables']['leases']['Update']

// Maintenance API Inputs

/**
 * Input for creating a maintenance request
 * Uses Supabase generated types for type safety
 */
export type CreateMaintenanceInput =
	Database['public']['Tables']['maintenance_requests']['Insert']

/**
 * Input for updating a maintenance request
 * Uses Supabase generated types for type safety
 */
export type UpdateMaintenanceInput =
	Database['public']['Tables']['maintenance_requests']['Update']

/**
 * Query parameters for maintenance request search (extends from queries.ts)
 * Used by maintenance list endpoints
 */
export type MaintenanceQueryInput = MaintenanceQuery

// Form Data Types (moved from frontend)

// PropertyFormData is now defined in validation/properties.ts as z.infer<typeof propertyFormSchema>
// This ensures type safety and alignment with React Hook Form zodResolver

/**
 * Lease form props for modal components
 */
export interface UseLeaseFormProps {
	lease?: Lease
	mode?: 'create' | 'edit'
	property_id?: string
	unit_id?: string
	tenant_id?: string
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
	TFieldValues extends Record<
		string,
		string | number | boolean | null
	> = Record<string, string | number | boolean | null>,
	TName extends keyof TFieldValues = keyof TFieldValues
> {
	name: TName
}

export interface FormItemContextValue {
	id: string
}

// File Upload Types

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

// Authentication API Inputs

/**
 * Input for user registration
 * Used by auth registration endpoints
 */
export interface RegisterInput {
	email: string
	password: string
	first_name: string
	last_name: string
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

// User Management API Inputs

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
		user_type?: 'OWNER' | 'TENANT' | 'MANAGER' | 'ADMIN'
		name?: string
		maxRetries?: number
		retryDelayMs?: number
	}
}

/**
 * Input for updating user profile - Re-export from api.ts (primary source)
 */
export type { UpdateUserProfileInput } from './api.js'
