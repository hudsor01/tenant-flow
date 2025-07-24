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
// Note: For complex relations, import from relations file to avoid circular imports
// import type { TenantWithDetails, TenantWithLeases } from '@tenantflow/shared/src/relations'