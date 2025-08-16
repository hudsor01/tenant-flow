/**
 * Central type exports
 * Single source of truth for all application types
 */

// Core types
export * from './core/common'
export * from './core/entities'

// Component types
export * from './components/forms'
export * from './components/dialogs'
export * from './components/ui'

// Hook types
export * from './hooks'

// Re-export shared types for convenience
export type {
	// Entity types
	Property,
	Tenant,
	Lease,
	Unit,
	MaintenanceRequest,
	User,

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
