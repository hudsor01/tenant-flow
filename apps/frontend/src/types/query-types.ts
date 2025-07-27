// Frontend-specific query and relationship types
// Note: Use direct imports from @tenantflow/shared for PropertyQuery, TenantQuery, etc.
import type { Lease, Unit, Property, RequestStatus } from '@tenantflow/shared'

// Lease query interface for frontend filtering
export interface LeaseQuery {
  tenantId?: string
  unitId?: string
  propertyId?: string
  status?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

// Maintenance query interface for frontend filtering
export interface MaintenanceQuery {
  status?: RequestStatus
  propertyId?: string
  priority?: string
  limit?: number
  offset?: number
}

// Unit query interface for frontend filtering
export interface UnitQuery {
  propertyId?: string
  status?: string
  type?: string
  limit?: number
  offset?: number
}

// Type for tenant queries with nested lease/unit/property data (frontend-specific)
export interface TenantWithLeaseAccess {
	id: string
	leases: {
		unit?: {
			property?: {
				ownerId: string
			}
		}
	}[]
}

// Type for unit queries with nested property data (frontend-specific)
export interface UnitWithPropertyAccess {
	id: string
	property: {
		ownerId: string
	}
}

// Extended Lease type with full nested relations (frontend-specific)
export interface LeaseWithFullRelations extends Lease {
	unit: Unit & {
		property: Property
	}
}

// Frontend-specific payment query type (not in shared package yet)
export type PaymentQuery = Record<string, unknown> & {
	leaseId?: string
	status?: string
	type?: string
	dateFrom?: string
	dateTo?: string
	search?: string
	limit?: number
	offset?: number
}
