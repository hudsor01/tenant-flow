/**
 * Tenant management types
 * All types related to tenants and tenant management
 */

// Tenant entity types
export interface Tenant {
  id: string
  name: string
  email: string
  phone: string | null
  emergencyContact: string | null
  userId: string | null
  invitationStatus: InvitationStatus
  createdAt: Date
  updatedAt: Date
}

export type InvitationStatus = 'PENDING' | 'SENT' | 'ACCEPTED' | 'EXPIRED'

export const INVITATION_STATUS = {
	PENDING: 'PENDING' as const,
	SENT: 'SENT' as const,
	ACCEPTED: 'ACCEPTED' as const,
	EXPIRED: 'EXPIRED' as const
}

export const INVITATION_STATUS_OPTIONS = Object.values(INVITATION_STATUS)

// Extended tenant types with relations

// Minimal property type for tenant contexts
export interface TenantProperty {
  id: string
  name: string
  address: string
  [key: string]: string | number | boolean | null | undefined
}

// Minimal unit type for tenant contexts
export interface TenantUnit {
  id: string
  unitNumber: string
  property: TenantProperty
  [key: string]: string | number | boolean | null | undefined | TenantProperty
}

// Minimal lease type for tenant contexts
export interface TenantLease {
  id: string
  status: string
  unit: TenantUnit
  unitId: string
  [key: string]: string | number | boolean | null | undefined | TenantUnit
}

// Tenant with associated leases (simplified version)
export interface SimpleTenantWithLeases {
  id: string
  name: string
  email: string
  phone: string | null
  emergencyContact: string | null
  userId: string | null
  invitationStatus: InvitationStatus
  createdAt: Date
  updatedAt: Date
  leases?: TenantLease[]
}

// Tenant with current unit and lease info
export interface TenantWithUnitAndLease extends Tenant {
  currentLease: TenantLease | undefined
  currentUnit: TenantUnit | undefined
  currentProperty: TenantProperty | undefined
}

// Current lease information helper type
export interface CurrentLeaseInfo {
  currentLease: TenantLease | undefined
  currentUnit: TenantUnit | undefined
  currentProperty: TenantProperty | undefined
}

// Tenant statistics for dashboard and analytics
export interface TenantStats {
  totalTenants: number
  activeTenants: number
  inactiveTenants: number
  pendingInvitations: number
}

// Note: For complex relations, import from relations file to avoid circular imports
// import type { TenantWithDetails } from '@repo/shared/src/relations'