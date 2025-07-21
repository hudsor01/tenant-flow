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
  createdAt: Date
  updatedAt: Date
}

// Extended tenant types with relations
// Note: For complex relations, import from relations file to avoid circular imports
// import type { TenantWithDetails, TenantWithLeases } from '@tenantflow/shared/src/relations'