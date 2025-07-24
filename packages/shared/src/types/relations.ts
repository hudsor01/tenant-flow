/**
 * Complex relationship types
 * Extended entity types with proper relations to avoid circular imports
 */

import type { User } from './auth'
import type { Property, Unit } from './properties'
import type { Tenant, InvitationStatus } from './tenants'
import type { Lease } from './leases'
import type { Expense } from './properties'
import type { MaintenanceRequest } from './maintenance'
import type { NotificationData } from './notifications'
import type { Document } from './documents'

// Property relations
export interface PropertyWithDetails extends Property {
  units: Unit[]
  owner: User
  totalUnits: number
  occupiedUnits: number
  monthlyRevenue: number
}

export interface UnitWithDetails extends Unit {
  property: Property
  leases: Lease[]
  maintenanceRequests: MaintenanceRequest[]
}

// Tenant relations
export interface TenantWithDetails extends Omit<Tenant, 'invitationStatus'> {
  invitationStatus: InvitationStatus
  user: User | null
  leases: Lease[]
  units: Unit[]
  maintenanceRequests: MaintenanceRequest[]
}

// Property subset returned by lease endpoints
interface LeasePropertySubset {
  id: string
  name: string
  address: string
  city: string
  state: string
}

// Lease relations - matches actual backend response structure
export interface LeaseWithDetails extends Lease {
  property: LeasePropertySubset
  unit: Unit & {
    property: LeasePropertySubset
  }
  tenant: Tenant & {
    User?: {
      id: string
      name: string | null
      email: string
      phone: string | null
      avatarUrl: string | null
    } | null
  }
  documents: Document[]
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