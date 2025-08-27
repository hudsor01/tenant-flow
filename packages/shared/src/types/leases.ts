/**
 * LEASE TYPES - All lease-related interfaces  
 * CONSOLIDATED from 10+ scattered lease definitions (including the 4x duplicate LeaseStatus!)
 */

// =============================================================================
// CORE LEASE ENTITY
// =============================================================================

export interface Lease {
  id: string
  tenant_id: string
  property_id: string
  unit_id?: string
  start_date: string
  end_date: string
  monthly_rent: number
  security_deposit: number
  payment_due_day: number
  lease_type: LeaseType
  status: LeaseStatus
  terms?: string
  special_conditions?: string
  terminated_at?: string
  termination_reason?: string
  created_at: string
  updated_at: string
}

// CONSOLIDATED from 4+ different files that all defined this differently
export type LeaseStatus = 'DRAFT' | 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
export type LeaseType = 'FIXED_TERM' | 'MONTH_TO_MONTH' | 'WEEK_TO_WEEK'

// =============================================================================  
// LEASE API TYPES - CONSOLIDATED from backend schemas
// =============================================================================

export interface CreateLeaseRequest {
  tenant_id: string
  property_id: string
  unit_id?: string
  start_date: string
  end_date: string
  monthly_rent: number
  security_deposit: number
  payment_due_day?: number
  lease_type?: LeaseType
  terms?: string
  special_conditions?: string
}

export interface UpdateLeaseRequest {
  start_date?: string
  end_date?: string
  monthly_rent?: number
  security_deposit?: number
  payment_due_day?: number
  lease_type?: LeaseType
  status?: LeaseStatus
  terms?: string
  special_conditions?: string
}

export interface LeaseQueryRequest {
  status?: LeaseStatus
  property_id?: string
  tenant_id?: string
  search?: string
  page?: number
  limit?: number
}

// =============================================================================
// LEASE WITH RELATIONS - for API responses
// =============================================================================

export interface LeaseWithRelations extends Lease {
  tenant?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  property?: {
    id: string
    name: string
    address: string
  }
  unit?: {
    id: string
    name: string
  }
}

// =============================================================================
// LEASE STATS & AGGREGATIONS
// =============================================================================

export interface LeaseStats {
  activeLeases: number
  expiredLeases: number
  pendingLeases: number
  expiringSoon: number
  totalRevenue: number
}

// =============================================================================
// LEASE FORM TYPES
// =============================================================================

export interface LeaseFormData {
  tenant_id: string
  property_id: string
  unit_id?: string
  start_date: string
  end_date: string
  monthly_rent: number
  security_deposit: number
  payment_due_day: number
  lease_type: LeaseType
  terms?: string
  special_conditions?: string
}

export interface LeaseFormProps {
  initialData?: Partial<Lease>
  onSubmit: (data: LeaseFormData) => void
  isLoading?: boolean
}

// =============================================================================
// ADDITIONAL LEASE TYPES - MIGRATED from inline definitions
// =============================================================================

// MIGRATED from apps/backend/src/leases/leases.service.ts
export interface LeaseWithRelations extends Lease {
  Unit?: {
    id: string
    name: string 
    Property?: {
      id: string
      name: string
      address: string
    }
  }
  Tenant?: {
    id: string
    name: string
    email: string
  }
}

export interface LeaseQueryOptions {
  status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
  unitId?: string
  tenantId?: string
  startDateFrom?: string
  startDateTo?: string
  endDateFrom?: string
  endDateTo?: string
  search?: string
  limit?: number
  offset?: number
  includeTerminated?: boolean
  includeExpired?: boolean
	sortBy?: 'start_date' | 'end_date' | 'monthly_rent'
	sortOrder?: 'ASC' | 'DESC'
}

export interface LeaseTemplate {
	id: string
	name: string
	description: string
	state?: string
	templateData: unknown
}

export interface LeaseWithEnhancedData extends Omit<Lease, 'status'> {
	status: LeaseStatus
	tenant: {
		id: string
		first_name: string
		last_name: string
		email: string
	}
	property: {
		id: string
		name: string
		address: string
		city: string
		state: string
	}
	unit?: {
		id: string
		name: string
		rent: number
	}
}

export interface LeaseFormOptions {
	showTerminationOptions?: boolean
	showAdvancedFields?: boolean
	readonly?: boolean
}