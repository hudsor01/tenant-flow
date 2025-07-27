/**
 * Lease management types
 * All types related to leases, lease agreements, and lease status
 */

// Import constants from the single source of truth
import { LEASE_STATUS } from '../constants/leases'

// Lease status type derived from constants
export type LeaseStatus = typeof LEASE_STATUS[keyof typeof LEASE_STATUS]

// Lease status display helpers
export const getLeaseStatusLabel = (status: LeaseStatus): string => {
  const labels: Record<LeaseStatus, string> = {
    DRAFT: 'Draft',
    PENDING: 'Pending',
    ACTIVE: 'Active',
    EXPIRED: 'Expired',
    TERMINATED: 'Terminated'
  }
  return labels[status] || status
}

export const getLeaseStatusColor = (status: LeaseStatus): string => {
  const colors: Record<LeaseStatus, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    ACTIVE: 'bg-green-100 text-green-800',
    EXPIRED: 'bg-red-100 text-red-800',
    TERMINATED: 'bg-orange-100 text-orange-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

// Lease entity types
export interface Lease {
  id: string
  unitId: string
  tenantId: string
  startDate: Date
  endDate: Date
  rentAmount: number
  securityDeposit: number
  status: LeaseStatus
  createdAt: Date
  updatedAt: Date
}

// Rent reminder types for alert system
export interface RentReminder {
  daysToDue: number
  reminderType: 'overdue' | 'due_soon' | 'upcoming'
  amount: number
  dueDate: string
  lease: {
    id: string
    rentAmount: number
    dueDay: number
    status: string
  }
  tenant: {
    id: string
    name: string
    email: string
  }
}

// Extended lease types with relations
// Note: For complex relations, import from relations file to avoid circular imports
// import type { LeaseWithDetails, LeaseWithRelations } from '@tenantflow/shared/src/relations'