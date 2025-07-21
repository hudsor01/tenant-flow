/**
 * Complex relationship types
 * Extended entity types with proper relations to avoid circular imports
 */

import type { User } from './auth'
import type { Property, Unit } from './properties'
import type { Tenant } from './tenants'
import type { Lease } from './leases'
import type { Expense } from './properties'
import type { MaintenanceRequest } from './maintenance'
import type { NotificationData } from './notifications'

// Property relations
export interface PropertyWithDetails extends Property {
  units: Unit[]
  owner: User
}

export interface UnitWithDetails extends Unit {
  property: Property
  leases: Lease[]
  maintenanceRequests: MaintenanceRequest[]
}

// Tenant relations
export interface TenantWithDetails extends Tenant {
  user: User | null
  leases: Lease[]
}

// Lease relations
export interface LeaseWithDetails extends Lease {
  unit: UnitWithDetails
  tenant: TenantWithDetails
}

// Maintenance relations
export interface MaintenanceWithDetails extends MaintenanceRequest {
  unit: UnitWithDetails
  expenses: Expense[]
}

// Notification relations
export interface NotificationWithDetails extends NotificationData {
  property: Property | null
  user: User
}

// Complex query result types
export interface PropertyWithUnits extends Property {
  units: (Unit & {
    leases: Lease[]
  })[]
}

export interface PropertyWithUnitsAndLeases extends Property {
  units: (Unit & {
    leases: (Lease & {
      tenant: Tenant
    })[]
  })[]
}

export interface TenantWithLeases extends Tenant {
  leases: (Lease & {
    unit: Unit & {
      property: Property
    }
  })[]
}

export interface UnitWithProperty extends Unit {
  property: Property
  leases: (Lease & {
    tenant: Tenant
  })[]
}

export interface LeaseWithRelations extends Lease {
  unit: Unit & {
    property: Property
  }
  tenant: Tenant
}


export interface MaintenanceRequestWithRelations extends MaintenanceRequest {
  unit: Unit & {
    property: Property
    leases: (Lease & {
      tenant: Tenant
    })[]
  }
}

export interface UserWithProperties extends User {
  properties: (Property & {
    units: (Unit & {
      leases: (Lease & {
        tenant: Tenant
      })[]
    })[]
  })[]
}

export interface NotificationWithRelations extends NotificationData {
  property?: Property | null
  tenant?: Tenant | null
  lease?: (Lease & {
    unit: Unit & {
      property: Property
    }
  }) | null
  maintenance?: (MaintenanceRequest & {
    unit: Unit & {
      property: Property
    }
  }) | null
}