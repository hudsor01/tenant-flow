/**
 * Tenant management types
 * All types related to tenants, invitations, and tenant management
 */

// Invitation status enum
export type InvitationStatus = 
  | 'PENDING'
  | 'ACCEPTED'
  | 'EXPIRED'
  | 'CANCELLED'

export const INVITATION_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
} as const

export const INVITATION_STATUS_OPTIONS = Object.values(INVITATION_STATUS)

// Invitation status display helpers
export const getInvitationStatusLabel = (status: InvitationStatus): string => {
  const labels: Record<InvitationStatus, string> = {
    PENDING: 'Pending',
    ACCEPTED: 'Accepted',
    EXPIRED: 'Expired',
    CANCELLED: 'Cancelled'
  }
  return labels[status] || status
}

export const getInvitationStatusColor = (status: InvitationStatus): string => {
  const colors: Record<InvitationStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    ACCEPTED: 'bg-green-100 text-green-800',
    EXPIRED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

// Tenant entity types
export interface Tenant {
  id: string
  name: string
  email: string
  phone: string | null
  emergencyContact: string | null
  userId: string | null
  invitationStatus: InvitationStatus
  invitationToken: string | null
  invitedBy: string | null
  invitedAt: Date | null
  acceptedAt: Date | null
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}

// Extended tenant types with relations
// Note: For complex relations, import from relations file to avoid circular imports
// import type { TenantWithDetails, TenantWithLeases } from '@tenantflow/types/src/relations'