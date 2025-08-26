/**
 * Central type exports
 * Single source of truth for all application types
 */

// Core types
<<<<<<< HEAD
export type * from './core/common'
export type * from './core/entities'

// Component types (minimal, only used types)
export type * from './components/forms'
export type * from './components/charts'
export type * from './components/modals'
export type * from './components/invoice'

// Hook types
// (Avoid wildcard re-export to prevent duplicate symbol exports like TenantFilters)
=======
export * from './core/common'
export * from './core/entities'

// Component types (minimal, only used types)
export * from './components/forms'

// Hook types
export * from './hooks'
>>>>>>> origin/main

// Re-export shared types for convenience
export type {
	// Entity types
	Property,
	Tenant,
	Lease,
	Unit,
	MaintenanceRequest,
	User,

	// Auth types
	AuthError,
	AuthSession,
	LoginCredentials,
	SignupCredentials,

	// Enums
	PropertyType,
	UnitStatus,
	LeaseStatus,
	MaintenancePriority,
	MaintenanceStatus,

	// Input types
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
