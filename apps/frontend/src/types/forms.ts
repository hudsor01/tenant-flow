/**
 * Form type definitions - NOW USING SHARED TYPES
 * All types moved to @repo/shared for centralization
 * 
 * NOTE: Schema change from camelCase to snake_case to align with database
 * - firstName → first_name
 * - lastName → last_name  
 * - propertyId → property_id
 * - tenantId → tenant_id
 * - unitId → unit_id
 * - startDate → start_date
 * - endDate → end_date
 * - rentAmount → monthly_rent
 * - securityDeposit → security_deposit
 * - paymentDue → payment_due_day
 */

// Base form state types - use shared FormState from common types
export type {
	FormState,
	FormField
} from '@repo/shared'

// Create local FormErrors and FormTouched for frontend-specific usage
export type FormErrors = Record<string, string[] | undefined>
export type FormTouched = Record<string, boolean>

// Auth form types - use shared auth form types
export type {
	LoginFormData,
	SignupFormData,
	ForgotPasswordFormData,
	ResetPasswordFormData,
	UpdatePasswordFormData,
	ProfileFormData,
	ContactFormData
} from '@repo/shared'

// Domain form types - use shared domain form types
export type {
	PropertyFormData,
	TenantFormData,
	LeaseFormData,
	MaintenanceFormData
} from '@repo/shared'

// Form field props - use shared UI form field props
export type {
	FormFieldProps
} from '@repo/shared'
