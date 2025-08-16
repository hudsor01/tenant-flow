/**
 * Property management types
 * All types related to properties, units, and property management
 */

import type { PROPERTY_TYPE, UNIT_STATUS } from '../constants/properties'

// Types derived from constants
export type PropertyType = (typeof PROPERTY_TYPE)[keyof typeof PROPERTY_TYPE]
export type UnitStatus = (typeof UNIT_STATUS)[keyof typeof UNIT_STATUS]

// Display helpers are now in utils/properties.ts to avoid duplication

// Property entity types
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
	propertyType: PropertyType
	yearBuilt?: number | null
	totalSize?: number | null
	createdAt: Date
	updatedAt: Date
	// Optional relations
	units?: Unit[]
	manager?: {
		name: string
		email: string
		phone: string
	} | null
}

export interface Unit {
	id: string
	unitNumber: string
	propertyId: string
	bedrooms: number
	bathrooms: number
	squareFeet: number | null
	rent?: number // For backwards compatibility with monthlyRent
	monthlyRent?: number // Primary field used by API
	rentAmount?: number // Another alias for rent/monthlyRent
	securityDeposit?: number
	description?: string
	amenities?: string[]
	status: UnitStatus | string // Allow both enum and string for flexibility
	lastInspectionDate: Date | null
	createdAt: Date
	updatedAt: Date
}

export interface Inspection {
	id: string
	propertyId: string
	unitId: string | null
	inspectorId: string
	type: string
	scheduledDate: Date
	completedDate: Date | null
	status: string
	notes: string | null
	reportUrl: string | null
	createdAt: Date
	updatedAt: Date
}

export interface Expense {
	id: string
	propertyId: string
	maintenanceId: string | null
	amount: number
	category: string
	description: string
	date: Date
	receiptUrl: string | null
	vendorName: string | null
	vendorContact: string | null
	createdAt: Date
	updatedAt: Date
}

// Extended property types with relations are defined in relations.ts
// to avoid circular imports and provide full relation details
// See: PropertyWithUnitsAndLeases, PropertyWithDetails, UnitWithDetails

// Property statistics for dashboard and detail views
export interface PropertyStats {
	totalUnits: number
	occupiedUnits: number
	vacantUnits: number
	occupancyRate: number
	totalMonthlyRent: number
	potentialRent: number
	totalProperties?: number
	totalRent?: number
	collectedRent?: number
	pendingRent?: number
}

// Property input types for API operations
export interface CreatePropertyInput extends Record<string, unknown> {
	name: string
	address: string
	city: string
	state: string
	zipCode: string
	description?: string
	imageUrl?: string
	propertyType: PropertyType
	yearBuilt?: number
	totalSize?: number
}

export interface UpdatePropertyInput extends Record<string, unknown> {
	name?: string
	address?: string
	city?: string
	state?: string
	zipCode?: string
	description?: string
	imageUrl?: string
	propertyType?: PropertyType
	yearBuilt?: number
	totalSize?: number
}

// Property creation and management entitlements
export interface PropertyEntitlements {
	isLoading: boolean
	canCreateProperties: boolean
	canCreateTenants: boolean
	canCreateUnits: boolean
	subscription: unknown // SubscriptionData | undefined but using unknown to avoid import issues
}
