import type { Database } from './supabase-generated'

// Extract base types from database
type User = Database['public']['Tables']['User']['Row']
type Property = Database['public']['Tables']['Property']['Row']
type Unit = Database['public']['Tables']['Unit']['Row']
type Tenant = Database['public']['Tables']['Tenant']['Row']
type Lease = Database['public']['Tables']['Lease']['Row']
type Payment = Database['public']['Tables']['Payment']['Row']
type MaintenanceRequest =
	Database['public']['Tables']['MaintenanceRequest']['Row']
type Notification = Database['public']['Tables']['Notification']['Row']

// Property with all its units and their leases
export interface PropertyWithUnits extends Property {
	units: (Unit & {
		leases: Lease[]
	})[]
}

// Property with units and their active leases with tenant info
export interface PropertyWithUnitsAndLeases extends Property {
	units: (Unit & {
		leases: (Lease & {
			tenant: Tenant
		})[]
	})[]
}

// Tenant with all their leases and related data
export interface TenantWithLeases extends Tenant {
	leases: (Lease & {
		unit: Unit & {
			property: Property
		}
		payments: Payment[]
	})[]
}

// Unit with property and current lease
export interface UnitWithProperty extends Unit {
	property: Property
	leases: (Lease & {
		tenant: Tenant
		payments: Payment[]
	})[]
}

// Lease with all related data
export interface LeaseWithRelations extends Lease {
	unit: Unit & {
		property: Property
	}
	tenant: Tenant
	payments: Payment[]
}

// Payment with lease and tenant info
export interface PaymentWithRelations extends Payment {
	lease: Lease & {
		unit: Unit & {
			property: Property
		}
		tenant: Tenant
	}
}

// Maintenance request with full context
export interface MaintenanceRequestWithRelations extends MaintenanceRequest {
	status: string
	priority: string
	createdAt: string
	completedAt: string | null
	unit: Unit & {
		property: Property
		leases: (Lease & {
			tenant: Tenant
		})[]
	}
}

// User with properties and their units
export interface UserWithProperties extends User {
	properties: (Property & {
		units: (Unit & {
			leases: (Lease & {
				tenant: Tenant
			})[]
		})[]
	})[]
}

// Notification with all related data
export interface NotificationWithRelations extends Notification {
	property?: Property | null
	tenant?: Tenant | null
	lease?:
		| (Lease & {
				unit: Unit & {
					property: Property
				}
		  })
		| null
	payment?: Payment | null
	maintenance?:
		| (MaintenanceRequest & {
				unit: Unit & {
					property: Property
				}
		  })
		| null
}
