/**
 * Frontend entity types - imported from shared types package
 */

// Import everything from the main types package
export type {
	// Auth types
	User,
	UserRole,
	AuthUser,
	AuthResponse,
	SupabaseJwtPayload,

	// Property types
	PropertyType,
	UnitStatus,

	// Lease types
	LeaseStatus,

	// Tenant types
	InvitationStatus,

	// Maintenance types
	Priority,
	RequestStatus,

	// Billing types
	PlanType,

	// Blog types
	BlogArticle,
	BlogTag,

	// Invoice types
	CustomerInvoice,
	CustomerInvoiceItem,

	// Relations types
	PropertyWithDetails,
	UnitWithDetails,
	TenantWithDetails,
	LeaseWithDetails,
	MaintenanceWithDetails,
	NotificationWithDetails,
	PlanLimits
} from '@tenantflow/shared/types'

// Re-export enum values and helper functions from shared package
export {
	USER_ROLE,
	USER_ROLE_OPTIONS,
	getUserRoleLabel,
	getUserRoleColor,
	PROPERTY_TYPE,
	PROPERTY_TYPE_OPTIONS,
	UNIT_STATUS,
	UNIT_STATUS_OPTIONS,
	LEASE_STATUS,
	LEASE_STATUS_OPTIONS,
	INVITATION_STATUS,
	INVITATION_STATUS_OPTIONS,
	PRIORITY,
	PRIORITY_OPTIONS,
	REQUEST_STATUS,
	REQUEST_STATUS_OPTIONS
} from '@tenantflow/shared/types'

// Core entity interfaces that might still be in entities.d.ts
export interface Property {
	id: string
	name: string
	address: string
	city: string
	state: string
	zipCode: string
	description: string | null
	imageUrl: string | null
	ownerId: string
	propertyType: string
	createdAt: string
	updatedAt: string
}

export interface Unit {
	id: string
	unitNumber: string
	propertyId: string
	bedrooms: number
	bathrooms: number
	squareFeet: number | null
	rent: number
	status: string
	lastInspectionDate: string | null
	createdAt: string
	updatedAt: string
}

export interface Tenant {
	id: string
	name: string
	email: string
	phone: string | null
	emergencyContact: string | null
	userId: string | null
	createdAt: string
	updatedAt: string
}

export interface Lease {
	id: string
	unitId: string
	tenantId: string
	startDate: string
	endDate: string
	rentAmount: number
	securityDeposit: number
	status: string
	createdAt: string
	updatedAt: string
}

export interface MaintenanceRequest {
	id: string
	unitId: string
	title: string
	description: string
	category: string | null
	priority: string
	status: string
	preferredDate: string | null
	allowEntry: boolean
	contactPhone: string | null
	requestedBy: string | null
	assignedTo: string | null
	estimatedCost: number | null
	actualCost: number | null
	completedAt: string | null
	notes: string | null
	photos: string[] | null
	createdAt: string
	updatedAt: string
	Unit?: {
		id: string
		unitNumber: string
		Property: {
			id: string
			name: string
			address: string
			ownerId: string
		}
	}
	Assignee?: {
		id: string
		name: string | null
		email: string
		phone: string | null
	} | null
}

export interface Notification {
	id: string
	userId: string
	title: string
	message: string
	type: string
	priority: string
	read: boolean
	actionUrl: string | null
	propertyId: string | null
	tenantId: string | null
	leaseId: string | null
	maintenanceId: string | null
	data: Record<string, unknown> | null
	createdAt: string
	updatedAt: string
}

// Additional entities that might be needed
export interface Invoice {
	id: string
	subscriptionId: string
	stripeInvoiceId: string
	amount: number
	currency: string
	status: string
	periodStart: Date
	periodEnd: Date
	createdAt: Date
	updatedAt: Date
}

export interface Subscription {
	id: string
	userId: string
	stripeSubscriptionId: string
	stripePriceId: string
	status: string
	currentPeriodStart: Date
	currentPeriodEnd: Date
	cancelAtPeriodEnd: boolean
	canceledAt: Date | null
	endedAt: Date | null
	trialStart: Date | null
	trialEnd: Date | null
	createdAt: Date
	updatedAt: Date
}
