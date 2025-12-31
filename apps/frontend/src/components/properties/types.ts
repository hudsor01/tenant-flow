// =============================================================================
// Data Types
// =============================================================================
// Import database enums from shared types (single source of truth)
import type { PropertyStatus, UnitStatus } from '@repo/shared/types/core'

// App-specific property type (not a database enum)
export type PropertyType =
	| 'single_family'
	| 'multi_family'
	| 'apartment'
	| 'condo'
	| 'townhouse'
	| 'duplex'

export interface PropertyImage {
	id: string
	url: string
	displayOrder: number
}

export interface UnitTenant {
	id: string
	name: string
	email: string
	leaseEndDate: string
}

export interface Unit {
	id: string
	unitNumber: string
	bedrooms: number
	bathrooms: number
	sqft: number
	rentAmount: number
	status: UnitStatus
	tenant: UnitTenant | null
}

export interface Property {
	id: string
	name: string
	addressLine1: string
	addressLine2: string | null
	city: string
	state: string
	postalCode: string
	propertyType: PropertyType
	status: PropertyStatus
	images: PropertyImage[]
	totalUnits: number
	occupiedUnits: number
	availableUnits: number
	maintenanceUnits: number
	occupancyRate: number
	monthlyRevenue: number
	units: Unit[]
}

export interface PropertySummary {
	totalProperties: number
	totalUnits: number
	occupiedUnits: number
	availableUnits: number
	maintenanceUnits: number
	overallOccupancyRate: number
	totalMonthlyRevenue: number
}

/** Alias for PropertySummary for backward compatibility */
export type PropertiesSummary = PropertySummary

/**
 * PropertyItem - Simplified property type for list/grid views
 * Contains only the fields needed for property cards and tables
 */
export interface PropertyItem {
	id: string
	name: string
	addressLine1: string
	addressLine2: string | null
	city: string
	state: string
	postalCode: string
	propertyType: PropertyType
	status: PropertyStatus
	imageUrl: string | undefined
	totalUnits: number
	occupiedUnits: number
	availableUnits: number
	maintenanceUnits: number
	occupancyRate: number
	monthlyRevenue: number
}

/**
 * PropertiesProps - Props for the main Properties component
 */
export interface PropertiesProps {
	properties: PropertyItem[]
	summary: PropertySummary
	filter?: 'all' | 'occupied' | 'available' | 'maintenance'
	isLoading?: boolean
	onPropertyClick?: (id: string) => void
	onPropertyEdit?: (id: string) => void
	onPropertyDelete?: (id: string) => void
	onAddProperty?: () => void
	onFilterChange?: (
		filter: 'all' | 'occupied' | 'available' | 'maintenance'
	) => void
}

// =============================================================================
// Component Props
// =============================================================================

export interface PropertiesListProps {
	/** List of properties to display */
	properties: Property[]
	/** Portfolio summary metrics */
	summary: PropertySummary
	/** Current filter value */
	filter?: 'all' | 'occupied' | 'available' | 'maintenance'
	/** Loading state */
	isLoading?: boolean
	/** Called when user clicks on a property to view details */
	onPropertyClick?: (id: string) => void
	/** Called when user wants to edit a property */
	onPropertyEdit?: (id: string) => void
	/** Called when user wants to delete a property */
	onPropertyDelete?: (id: string) => void
	/** Called when user wants to create a new property */
	onAddProperty?: () => void
	/** Called when user changes filter */
	onFilterChange?: (
		filter: 'all' | 'occupied' | 'available' | 'maintenance'
	) => void
}

export interface PropertyDetailProps {
	/** The property to display */
	property: Property
	/** Loading state */
	isLoading?: boolean
	/** Called when user wants to edit the property */
	onPropertyEdit?: () => void
	/** Called when user wants to delete the property */
	onPropertyDelete?: () => void
	/** Called when user wants to add a unit */
	onAddUnit?: () => void
	/** Called when user clicks on a unit row */
	onUnitClick?: (unitId: string) => void
	/** Called when user wants to edit a unit */
	onUnitEdit?: (unitId: string) => void
	/** Called when user wants to delete a unit */
	onUnitDelete?: (unitId: string) => void
	/** Called when user wants to go back to the list */
	onBack?: () => void
}

export interface AddPropertyModalProps {
	/** Whether the modal is open */
	isOpen: boolean
	/** Loading state for form submission */
	isSubmitting?: boolean
	/** Called when modal should close */
	onClose: () => void
	/** Called when form is submitted */
	onSubmit: (data: PropertyFormData) => void
}

export interface AddUnitPanelProps {
	/** Whether the panel is open */
	isOpen: boolean
	/** The property to add the unit to */
	propertyId: string
	/** Loading state for form submission */
	isSubmitting?: boolean
	/** Called when panel should close */
	onClose: () => void
	/** Called when form is submitted */
	onSubmit: (data: UnitFormData) => void
}

// =============================================================================
// Form Data Types
// =============================================================================

export interface PropertyFormData {
	name: string
	addressLine1: string
	addressLine2?: string
	city: string
	state: string
	postalCode: string
	propertyType: PropertyType
	image?: File
}

export interface UnitFormData {
	unitNumber: string
	bedrooms: number
	bathrooms: number
	sqft: number
	rentAmount: number
	status: 'available' | 'maintenance'
}
