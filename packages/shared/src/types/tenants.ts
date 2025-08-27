/**
 * TENANT TYPES - All tenant-related interfaces
 * CONSOLIDATED from 8+ scattered tenant definitions (including duplicate InvitationStatus)
 */

// =============================================================================
// CORE TENANT ENTITY  
// =============================================================================

export interface Tenant {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  status: TenantStatus
  created_at: string
  updated_at: string
  user_id: string
}

export type TenantStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED'

// CONSOLIDATED from multiple files that defined this
export type InvitationStatus = 'PENDING' | 'SENT' | 'ACCEPTED' | 'EXPIRED'

// =============================================================================
// TENANT API TYPES - CONSOLIDATED from backend schemas
// =============================================================================

export interface CreateTenantRequest {
  first_name: string
  last_name: string
  email: string
  phone?: string
}

export interface UpdateTenantRequest {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  status?: TenantStatus
}

export interface TenantQueryRequest {
  status?: TenantStatus
  search?: string
  page?: number
  limit?: number
}

// =============================================================================
// TENANT WITH RELATIONS - for API responses
// =============================================================================

export interface TenantWithLeases extends Tenant {
  leases?: Array<{
    id: string
    property_name: string
    unit_name?: string
    start_date: string
    end_date: string
    status: string
  }>
}

// =============================================================================
// TENANT STATS & AGGREGATIONS
// =============================================================================

export interface TenantStats {
  totalTenants: number
  activeTenants: number
  inactiveTenants: number
  newTenants: number
}

// =============================================================================
// TENANT FORM TYPES
// =============================================================================

export interface TenantFormData {
  first_name: string
  last_name: string
  email: string
  phone?: string
}

export interface TenantFormProps {
  initialData?: Partial<Tenant>
  onSubmit: (data: TenantFormData) => void
  isLoading?: boolean
}

// =============================================================================
// TENANT INVITATIONS
// =============================================================================

export interface TenantInvitation {
  id: string
  email: string
  first_name?: string
  last_name?: string
  status: InvitationStatus
  expires_at: string
  created_at: string
}

export interface CreateInvitationRequest {
  email: string
  first_name?: string
  last_name?: string
}

// =============================================================================
// ADDITIONAL TENANT TYPES - MIGRATED from inline definitions
// =============================================================================

export interface TenantWithRelations extends Tenant {
	leases?: unknown[]
	properties?: unknown[]
	maintenanceRequests?: unknown[]
}

export interface TenantStatsResult {
	totalTenants: number
	activeTenants: number
	inactiveTenants: number
	newThisMonth: number
	recentActivity: unknown[]
}