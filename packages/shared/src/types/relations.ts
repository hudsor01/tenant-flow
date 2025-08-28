/**
 * Complex relationship types
 * Extended entity types with proper relations to avoid circular imports
 */

import type { User } from './auth'
import type { Database } from './supabase-generated'

// Define types properly from Database schema
type Property = Database['public']['Tables']['Property']['Row']
type Unit = Database['public']['Tables']['Unit']['Row']
type Tenant = Database['public']['Tables']['Tenant']['Row']
type Lease = Database['public']['Tables']['Lease']['Row']
type MaintenanceRequest = Database['public']['Tables']['MaintenanceRequest']['Row']
type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED'

import type { NotificationData } from './notifications'
import type { Document } from './files'

// Property relations
export interface PropertyWithDetails extends Property {
	units: UnitWithDetails[]
	owner: User
	totalUnits: number
	occupiedUnits: number
	monthlyRevenue: number
}

export interface UnitWithDetails extends Unit {
	property: Property
	leases: Lease[]
	currentLease?: Lease
	tenant?: Tenant
	maintenanceRequests: MaintenanceRequest[]
	
	// Computed fields
	isOccupied?: boolean
	monthlyRent?: number
	leaseEndDate?: string
	tenantName?: string
}

// Tenant relations
export interface TenantWithDetails extends Omit<Tenant, 'invitationStatus'> {
	invitationStatus: InvitationStatus
	user: User | null
	leases: Lease[]
	units: Unit[]
	maintenanceRequests: MaintenanceRequest[]
}

// Property subset returned by lease endpoints
interface LeasePropertySubset {
	id: string
	name: string
	address: string
	city: string
	state: string
}

// Lease relations - matches actual backend response structure
export interface LeaseWithDetails extends Lease {
	property: LeasePropertySubset
	unit: Unit & {
		property: LeasePropertySubset
	}
	tenant: Tenant & {
		User?: {
			id: string
			name: string | null
			email: string
			phone: string | null
			avatarUrl: string | null
		} | null
	}
	documents: Document[]
}

// Maintenance relations
export interface MaintenanceWithDetails extends MaintenanceRequest {
	unit: UnitWithDetails
}

export interface MaintenanceRequestWithDetails extends MaintenanceRequest {
	unit: Unit & {
		property: Property
	}
	tenant?: Tenant
	// Flattened fields for compatibility with MaintenanceRequestApiResponse
	unitNumber: string
}

// Notification relations
export interface NotificationWithDetails extends NotificationData {
	property: Property | null
	user: User
}

// Complex query result types
export interface PropertyWithUnits extends Property {
	// Core relations - units is optional since not all queries include it
	units?: Unit[]
	
	// Computed fields that components expect
	totalUnits?: number
	occupiedUnits?: number
	availableUnits?: number
	monthlyRent?: number
	monthlyRevenue?: number
	squareFeet?: number
	totalSize?: number  // Alias for squareFeet
	bedrooms?: number
	bathrooms?: number
	yearBuilt?: number
	securityDeposit?: number
	
	// Property management fields
	manager?: string
	managerId?: string
	managerName?: string
	managerEmail?: string
	managerPhone?: string
	
	// Amenities and features
	amenities?: string[]
	petsAllowed?: boolean
	parkingSpaces?: number
	
	// Remove conflicting status field - use the database PropertyStatus instead
	occupancyRate?: number
	averageRent?: number
	rentAmount?: number  // Alias for monthlyRent
	
	// Financial calculations
	totalMonthlyRent?: number
	potentialMonthlyRent?: number
	
	// UI-specific fields  
	images?: string[]
	notes?: string
	
	// Lease-related computed fields
	activeLeases?: number
	expiringSoon?: number
	vacantUnits?: number
}

export interface PropertyWithUnitsAndLeases extends Property {
	units: Array<
		Unit & {
			leases: Array<
				Lease & {
					tenant: Tenant
				}
			>
		}
	>
}

export interface TenantWithLeases extends Tenant {
	leases: Array<
		Lease & {
			unit: Unit & {
				property: Property
			}
		}
	>
}

export interface UnitWithProperty extends Unit {
	property: Property
	leases: Array<
		Lease & {
			tenant: Tenant
		}
	>
}

export interface LeaseWithRelations extends Lease {
	unit: Unit & {
		property: Property
	}
	tenant: Tenant
	documents: Document[]
	reminders: Array<{
		id: string
		type:
			| 'RENT_REMINDER'
			| 'LEASE_EXPIRATION'
			| 'MAINTENANCE_DUE'
			| 'PAYMENT_OVERDUE'
		status: 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED' | 'OPENED'
		recipientEmail: string
		recipientName: string | null
		subject: string | null
		content: string | null
		sentAt: string | null
		deliveredAt: string | null
		openedAt: string | null
		errorMessage: string | null
		retryCount: number
		createdAt: string
		updatedAt: string
	}>
}

export interface MaintenanceRequestWithRelations extends MaintenanceRequest {
	unit: Unit & {
		property: Property
		leases: Array<
			Lease & {
				tenant: Tenant
			}
		>
	}
	files: Array<{
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

export interface UserWithProperties extends User {
	properties: Array<
		Property & {
			units: Array<
				Unit & {
					leases: Array<
						Lease & {
							tenant: Tenant
						}
					>
				}
			>
		}
	>
}

export interface NotificationWithRelations extends NotificationData {
	property?: Property | null
	tenant?: Tenant | null
	lease?:
		| (Lease & {
				unit: Unit & {
					property: Property
				}
		  })
		| null
	maintenance?:
		| (MaintenanceRequest & {
				unit: Unit & {
					property: Property
				}
		  })
		| null
}

// =============================================================================
// ADDITIONAL TYPES FOR COMPONENT COMPATIBILITY
// =============================================================================

/**
 * PropertyWithFullDetails - Complete property with all relations for detailed views
 */
export interface PropertyWithFullDetails extends PropertyWithUnits {
	owner?: User
	leases?: LeaseWithDetails[]
	tenants?: TenantWithDetails[]
	maintenanceRequests?: MaintenanceRequestWithDetails[]
	
	// Extended analytics
	averageRent?: number
	totalRevenue?: number
	expiredLeases?: number
	pendingMaintenance?: number
}

/**
 * PropertySummary - Minimal property data for lists and cards
 */
export interface PropertySummary {
	id: string
	name: string
	address: string
	city: string
	state: string
	imageUrl: string | null
	totalUnits?: number
	occupiedUnits?: number
	monthlyRent?: number
	monthlyRevenue?: number
}

/**
 * PropertyFormData - Data structure for property forms
 */
export interface PropertyFormData {
	name: string
	address: string
	city: string
	state: string
	zipCode: string
	propertyType: Database['public']['Enums']['PropertyType']
	description?: string
	imageUrl?: string
	
	// Form-specific computed fields
	totalUnits?: number
	monthlyRent?: number
	squareFeet?: number
	bedrooms?: number
	bathrooms?: number
	yearBuilt?: number
	manager?: string
	amenities?: string[]
	petsAllowed?: boolean
	parkingSpaces?: number
}

/**
 * PropertyStatsExtended - Property statistics for dashboard
 */
export interface PropertyStatsExtended {
	total: number
	active: number
	inactive: number
	maintenance: number
	totalUnits: number
	occupiedUnits: number
	vacantUnits: number
	occupancyRate: number
	totalRevenue: number
	averageRent: number
}

/**
 * PropertySearchResult - Property with search relevance
 */
export interface PropertySearchResult extends PropertyWithUnits {
	searchScore?: number
	highlightedFields?: string[]
}

/**
 * PropertyFilters - Common property filtering options
 */
export interface PropertyFilters {
	propertyType?: Database['public']['Enums']['PropertyType']
	status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'
	minUnits?: number
	maxUnits?: number
	minRent?: number
	maxRent?: number
	city?: string
	state?: string
}
