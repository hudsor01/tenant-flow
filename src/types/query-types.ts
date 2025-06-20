// Query-specific types for Supabase queries that return different shapes than our base types

import type { Lease, Unit, Property } from './entities'

// Type for tenant queries with nested lease/unit/property data
export interface TenantWithLeaseAccess {
  id: string
  leases: Array<{
    unit?: {
      property?: {
        ownerId: string
      }
    }
  }>
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