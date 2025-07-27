// Frontend-specific tenant utilities
// Note: Use direct imports from @tenantflow/shared for Tenant, TenantWithDetails, etc.
import type { TenantWithDetails, Lease } from '@tenantflow/shared'

/**
 * Type guard to check if tenant has leases
 */
export function tenantHasLeases(tenant: TenantWithDetails): tenant is TenantWithDetails & { leases: Lease[] } {
  return Array.isArray(tenant.leases) && tenant.leases.length > 0
}

/**
 * Get leases from tenant
 */
export function getTenantLeases(tenant: TenantWithDetails): Lease[] {
  return tenant.leases || []
}