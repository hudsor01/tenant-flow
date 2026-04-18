import type { PropertyStatus, UnitStatus } from '#types/core'

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

export type PropertiesSummary = PropertySummary

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

export interface PropertiesListProps {
	properties: Property[]
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

export interface PropertyDetailProps {
	property: Property
	isLoading?: boolean
	onPropertyEdit?: () => void
	onPropertyDelete?: () => void
	onAddUnit?: () => void
	onUnitClick?: (unitId: string) => void
	onUnitEdit?: (unitId: string) => void
	onUnitDelete?: (unitId: string) => void
	onBack?: () => void
}

export interface AddPropertyModalProps {
	isOpen: boolean
	isSubmitting?: boolean
	onClose: () => void
	onSubmit: (data: PropertyFormData) => void
}

export interface AddUnitPanelProps {
	isOpen: boolean
	propertyId: string
	isSubmitting?: boolean
	onClose: () => void
	onSubmit: (data: UnitFormData) => void
}

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
