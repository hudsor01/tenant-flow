/**
 * Maintenance management types
 * All types related to maintenance requests, priorities, and maintenance operations
 */

// Maintenance priority enum
export type Priority = 
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'EMERGENCY'

export const PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  EMERGENCY: 'EMERGENCY'
} as const

export const PRIORITY_OPTIONS = Object.values(PRIORITY)

// Maintenance request status enum
export type RequestStatus = 
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELED'
  | 'ON_HOLD'

export const REQUEST_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELED: 'CANCELED',
  ON_HOLD: 'ON_HOLD'
} as const

export const REQUEST_STATUS_OPTIONS = Object.values(REQUEST_STATUS)

// Priority display helpers
export const getPriorityLabel = (priority: Priority): string => {
  const labels: Record<Priority, string> = {
    LOW: 'Low Priority',
    MEDIUM: 'Medium Priority',
    HIGH: 'High Priority',
    EMERGENCY: 'Emergency'
  }
  return labels[priority] || priority
}

export const getPriorityColor = (priority: Priority): string => {
  const colors: Record<Priority, string> = {
    LOW: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-orange-100 text-orange-800',
    EMERGENCY: 'bg-red-100 text-red-800'
  }
  return colors[priority] || 'bg-gray-100 text-gray-800'
}

// Request status display helpers
export const getRequestStatusLabel = (status: RequestStatus): string => {
  const labels: Record<RequestStatus, string> = {
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELED: 'Canceled',
    ON_HOLD: 'On Hold'
  }
  return labels[status] || status
}

export const getRequestStatusColor = (status: RequestStatus): string => {
  const colors: Record<RequestStatus, string> = {
    OPEN: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELED: 'bg-gray-100 text-gray-800',
    ON_HOLD: 'bg-orange-100 text-orange-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

// Maintenance entity types
export interface MaintenanceRequest {
  id: string
  unitId: string
  title: string
  description: string
  category: string | null
  priority: Priority
  status: RequestStatus
  preferredDate: Date | null
  allowEntry: boolean
  contactPhone: string | null
  requestedBy: string | null
  notes: string | null
  photos: string[]
  assignedTo: string | null
  estimatedCost: number | null
  actualCost: number | null
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
}

// Extended maintenance types with relations
// Note: For complex relations, import from relations file to avoid circular imports
// import type { MaintenanceWithDetails, MaintenanceRequestWithRelations } from '@tenantflow/types/src/relations'