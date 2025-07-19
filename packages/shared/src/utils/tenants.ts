/**
 * Tenant utilities
 * Helper functions for tenant invitation status display
 */

type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'DECLINED' | 'CANCELLED'

export const getInvitationStatusLabel = (status: InvitationStatus): string => {
  const labels: Record<InvitationStatus, string> = {
    PENDING: 'Pending',
    ACCEPTED: 'Accepted',
    EXPIRED: 'Expired',
    DECLINED: 'Declined',
    CANCELLED: 'Cancelled'
  }
  return labels[status] || status
}

export const getInvitationStatusColor = (status: InvitationStatus): string => {
  const colors: Record<InvitationStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    ACCEPTED: 'bg-green-100 text-green-800',
    EXPIRED: 'bg-red-100 text-red-800',
    DECLINED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}