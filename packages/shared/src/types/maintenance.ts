/**
 * Maintenance management types
 * All types related to maintenance requests, priorities, and maintenance operations
 */

// Import constants from the single source of truth
import { PRIORITY, REQUEST_STATUS } from '../constants/maintenance'

// Types derived from constants
export type Priority = typeof PRIORITY[keyof typeof PRIORITY]
export type RequestStatus = typeof REQUEST_STATUS[keyof typeof REQUEST_STATUS]

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
  preferredDate: string | null
  allowEntry: boolean
  contactPhone: string | null
  requestedBy: string | null
  notes: string | null
  photos: string[]
  assignedTo: string | null
  estimatedCost: number | null
  actualCost: number | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  Unit?: {
    id: string
    unitNumber: string
    property?: {
      id: string
      name: string
    }
  }
  Expense?: Array<{
    id: string
    propertyId: string
    maintenanceId: string | null
    amount: number
    category: string
    description: string
    date: string
    receiptUrl: string | null
    vendorName: string | null
    vendorContact: string | null
    createdAt: string
    updatedAt: string
  }>
  files?: Array<{
    id: string
    filename: string
    originalName: string
    mimeType: string
    size: number | null
    url: string
    uploadedById: string | null
    propertyId: string | null
    maintenanceRequestId: string | null
    createdAt: string
  }>
}

// Extended maintenance types with relations

// Maintenance request with unit and property details
export interface MaintenanceRequestWithDetails extends Omit<MaintenanceRequest, 'Unit'> {
  Unit?: {
    id: string
    unitNumber: string
    property?: {
      id: string
      name: string
    }
    Property?: {
      id: string
      name: string
    }
  }
}

// Simplified maintenance request data for display
export interface MaintenanceRequestData {
  id: number
  property: string
  issue: string
  reportedDate: string
  status: 'Completed' | 'In Progress' | 'Open'
}

// Note: For complex relations, import from relations file to avoid circular imports
// import type { MaintenanceWithDetails, MaintenanceRequestWithRelations } from '@repo/shared/src/relations'