/**
 * Router output types for API responses
 * These types represent the structure of data returned from backend routes
 */

import type { Database } from './supabase-generated'

type MaintenanceRequest = Database['public']['Tables']['MaintenanceRequest']['Row']
type Property = Database['public']['Tables']['Property']['Row']
type Tenant = Database['public']['Tables']['Tenant']['Row']
type Unit = Database['public']['Tables']['Unit']['Row']
type Lease = Database['public']['Tables']['Lease']['Row']

// Maintenance router outputs
export interface MaintenanceRequestListOutput {
	requests: MaintenanceRequest[]
	total: number
	page: number
	limit: number
}

export interface MaintenanceRequestDetailOutput {
	request: MaintenanceRequest
}

// Property router outputs
export interface PropertyListOutput {
	properties: Property[]
	total: number
	page: number
	limit: number
}

// Main RouterOutputs type
export interface RouterOutputs {
	maintenance: {
		list: MaintenanceRequestListOutput
		detail: MaintenanceRequestDetailOutput
	}
	properties: {
		list: PropertyListOutput
	}
	tenants: {
		list: {
			tenants: Tenant[]
			total: number
			page: number
			limit: number
		}
	}
	units: {
		list: {
			units: Unit[]
			total: number
			page: number
			limit: number
		}
	}
	leases: {
		list: {
			leases: Lease[]
			total: number
			page: number
			limit: number
		}
	}
}
