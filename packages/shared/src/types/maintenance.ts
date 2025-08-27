/**
 * MAINTENANCE TYPES - All maintenance request interfaces
 * CONSOLIDATED from 10+ scattered maintenance definitions (including the 6x duplicate Priority!)
 */

// =============================================================================
// CORE MAINTENANCE ENTITY
// =============================================================================

export interface MaintenanceRequest {
  id: string
  property_id: string
  unit_id?: string
  tenant_id?: string
  title: string
  description: string
  priority: Priority
  status: MaintenanceStatus
  assigned_to?: string
  estimated_cost?: number
  actual_cost?: number
  scheduled_date?: string
  completed_date?: string
  created_at: string
  updated_at: string
}

// CONSOLIDATED from 6+ different files that all defined Priority differently!
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'EMERGENCY'
export type MaintenanceStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

// =============================================================================
// MAINTENANCE API TYPES - CONSOLIDATED from backend schemas
// =============================================================================

export interface CreateMaintenanceRequest {
  property_id: string
  unit_id?: string
  tenant_id?: string
  title: string
  description: string
  priority: Priority
}

export interface UpdateMaintenanceRequest {
  title?: string
  description?: string
  priority?: Priority
  status?: MaintenanceStatus
  assigned_to?: string
  estimated_cost?: number
  actual_cost?: number
  scheduled_date?: string
  completed_date?: string
}

export interface MaintenanceQueryRequest {
  property_id?: string
  unit_id?: string
  status?: MaintenanceStatus
  priority?: Priority
  assigned_to?: string
  search?: string
  page?: number
  limit?: number
}

// =============================================================================
// MAINTENANCE WITH RELATIONS - for API responses
// =============================================================================

export interface MaintenanceWithRelations extends MaintenanceRequest {
  property?: {
    id: string
    name: string
    address: string
  }
  unit?: {
    id: string
    name: string
  }
  tenant?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

// =============================================================================
// MAINTENANCE STATS & AGGREGATIONS
// =============================================================================

export interface MaintenanceStats {
  totalRequests: number
  openRequests: number
  inProgressRequests: number
  completedRequests: number
  averageCompletionTime: number
  totalCost: number
}

// =============================================================================
// MAINTENANCE FORM TYPES
// =============================================================================

export interface MaintenanceFormData {
  property_id: string
  unit_id?: string
  tenant_id?: string
  title: string
  description: string
  priority: Priority
}

export interface MaintenanceFormProps {
  initialData?: Partial<MaintenanceRequest>
  onSubmit: (data: MaintenanceFormData) => void
  isLoading?: boolean
}

// =============================================================================
// MAINTENANCE NOTIFICATIONS
// =============================================================================

export interface MaintenanceNotificationPayload {
  requestId: string
  recipientId: string
  type: 'CREATED' | 'UPDATED' | 'COMPLETED'
  priority: Priority
  title: string
  description: string
}

// =============================================================================
// LEGACY TYPE ALIASES - For backward compatibility during migration
// =============================================================================

export type RequestStatus = MaintenanceStatus

// =============================================================================
// ADDITIONAL MAINTENANCE TYPES - MIGRATED from inline definitions
// =============================================================================

// Maintenance notification types (consolidated from notifications.service.ts)
export type NotificationType = 'maintenance' | 'lease' | 'payment' | 'system'

// Maintenance email props (migrated from email templates)
export interface MaintenanceRequestEmailProps {
	tenantName: string
	propertyName: string
	unitName?: string
	requestTitle: string
	requestDescription: string
	priority: Priority
	managementContactEmail: string
}
