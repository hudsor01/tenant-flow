/**
 * Maintenance Management Types
 * Centralized type definitions for maintenance requests and management
 */

// Priority enum
export const PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
} as const

export type Priority = typeof PRIORITY[keyof typeof PRIORITY]

// Request status enum
export const REQUEST_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  ON_HOLD: 'ON_HOLD'
} as const

export type RequestStatus = typeof REQUEST_STATUS[keyof typeof REQUEST_STATUS]

// Core maintenance request interface
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
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
  assignedTo: string | null
  estimatedCost: number | null
  actualCost: number | null
}

// Maintenance request with related data
export interface MaintenanceWithDetails extends MaintenanceRequest {
  property: {
    id: string
    name: string
    address: string
  }
  unit: {
    id: string
    unitNumber: string
  }
  tenant?: {
    id: string
    name: string
    email: string
    phone: string | null
  }
  assignedUser?: {
    id: string
    name: string
    email: string
  }
}

// Maintenance creation DTO
export interface CreateMaintenanceDTO {
  unitId: string
  title: string
  description: string
  category?: string
  priority: Priority
  preferredDate?: Date
  allowEntry: boolean
  contactPhone?: string
  requestedBy?: string
  photos?: string[]
}

// Maintenance update DTO
export interface UpdateMaintenanceDTO extends Partial<CreateMaintenanceDTO> {
  status?: RequestStatus
  assignedTo?: string
  notes?: string
  estimatedCost?: number
  actualCost?: number
  completedAt?: Date
}