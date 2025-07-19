// Query-specific types for Supabase queries that return different shapes than our base types

import type { Lease, Unit, Property } from './entities'

// Type for tenant queries with nested lease/unit/property data
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

// Type for unit queries with nested property data
export interface UnitWithPropertyAccess {
	id: string
	property: {
		ownerId: string
	}
}

// Extended Lease type with full nested relations
export interface LeaseWithFullRelations extends Lease {
	unit: Unit & {
		property: Property
	}
}

// API Query types
export type PropertyQuery = Record<string, unknown> & {
	propertyType?: string
	status?: string
	search?: string
	limit?: number
	offset?: number
}

export type TenantQuery = Record<string, unknown> & {
	status?: string
	search?: string
	limit?: number
	offset?: number
}

export type UnitQuery = Record<string, unknown> & {
	propertyId?: string
	status?: string
	search?: string
	limit?: number
	offset?: number
}

export type LeaseQuery = Record<string, unknown> & {
	unitId?: string
	tenantId?: string
	status?: string
	search?: string
	limit?: number
	offset?: number
}

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

export type MaintenanceQuery = Record<string, unknown> & {
	propertyId?: string
	unitId?: string
	tenantId?: string
	status?: string
	priority?: string
	search?: string
	limit?: number
	offset?: number
}

export type NotificationQuery = Record<string, unknown> & {
	read?: boolean
	type?: string
	priority?: string
	limit?: number
	offset?: number
}
