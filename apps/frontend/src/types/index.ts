/**
 * Central type exports - NOW USING SHARED TYPES
 * All types moved to @repo/shared for centralization
 */

// Import all types from shared package - this eliminates local type duplication
export type * from '@repo/shared'

// Re-export specific frequently used types for convenience
export type {
	// Core Entity types
	Property,
	Tenant,
	Lease,
	Unit,
	MaintenanceRequest,
	User,
	AuthUser,

	// Auth types
	AuthError,
	AuthErrorCode,
	LoginCredentials,
	SignupCredentials,
	ValidatedUser,

	// Form data types
	LoginFormData,
	SignupFormData,
	PropertyFormData,
	TenantFormData,
	LeaseFormData,
	MaintenanceFormData,

	// Component prop types
	BaseProps,
	FormProps,
	TableProps,
	PropertyCardProps,
	TenantCardProps,
	LeaseCardProps,

	// Enums and constants
	PropertyType,
	UnitStatus,
	LeaseStatus,
	Priority as MaintenancePriority,
	MaintenanceStatus,

	// API Input types
	CreateTenantInput,
	UpdateTenantInput,
	CreateLeaseInput,
	UpdateLeaseInput,
	CreateUnitInput,
	UpdateUnitInput,
	CreateMaintenanceInput,
	UpdateMaintenanceInput,

	// Common types
	ApiResponse,
	LoadingState,
	FormState,
	ErrorResponse
} from '@repo/shared'
