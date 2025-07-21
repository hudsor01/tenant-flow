// Re-export all relationship types from centralized types package
export * from '@tenantflow/shared/types'

// Specific relationship types for explicit imports
export type {
	LeaseWithDetails,
	MaintenanceRequestWithRelations,
	UnitWithDetails,
	PropertyWithDetails,
	TenantWithDetails,
	PropertyWithUnits,
	PropertyWithUnitsAndLeases,
	TenantWithLeases,
	UnitWithProperty,
	LeaseWithRelations,
	UserWithProperties,
	NotificationWithRelations
} from '@tenantflow/shared/types'
