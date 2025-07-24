import type { Tenant, LeaseWithDetails } from '@tenantflow/shared'
import type { MaintenanceRequestWithRelations } from '@/types/relationships'

/**
 * Tenant with optional relations
 * Supports both 'leases' and 'Lease' properties for compatibility
 */
export interface TenantWithRelations extends Tenant {
  leases?: LeaseWithDetails[]
  Lease?: LeaseWithDetails[] // For backwards compatibility
  maintenanceRequests?: MaintenanceRequestWithRelations[]
  User?: {
    id: string
    name: string
    email: string
    avatarUrl: string | null
  }
}

/**
 * Type guard to check if tenant has leases
 */
export function tenantHasLeases(tenant: TenantWithRelations): tenant is TenantWithRelations & { leases: LeaseWithDetails[] } {
  return Array.isArray(tenant.leases) || Array.isArray(tenant.Lease)
}

/**
 * Get leases from tenant, handling both property names
 */
export function getTenantLeases(tenant: TenantWithRelations): LeaseWithDetails[] {
  return tenant.leases || tenant.Lease || []
}