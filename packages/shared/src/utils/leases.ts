/**
 * Lease utilities
 * Helper functions for lease status display and management
 */

type LeaseStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'

export const getLeaseStatusLabel = (status: LeaseStatus): string => {
  const labels: Record<LeaseStatus, string> = {
    DRAFT: 'Draft',
    ACTIVE: 'Active',
    EXPIRED: 'Expired',
    TERMINATED: 'Terminated'
  }
  return labels[status] || status
}

export const getLeaseStatusColor = (status: LeaseStatus): string => {
  const colors: Record<LeaseStatus, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    ACTIVE: 'bg-green-100 text-green-800',
    EXPIRED: 'bg-red-100 text-red-800',
    TERMINATED: 'bg-orange-100 text-orange-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}