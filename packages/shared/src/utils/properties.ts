import type { UnitStatus } from '../types/core.js'
import type { PropertyType } from '../constants/status-types.js'
/**
 * Property utilities
 * Helper functions for property and unit display
 */

export const getPropertyTypeLabel = (type: PropertyType): string => {
	const labels: Record<PropertyType, string> = {
		SINGLE_FAMILY: 'Single Family',
		MULTI_UNIT: 'Multi Unit',
		APARTMENT: 'Apartment',
		CONDO: 'Condo',
		TOWNHOUSE: 'Townhouse',
		COMMERCIAL: 'Commercial',
		OTHER: 'Other'
	}
	return labels[type] || type
}

export const getUnitStatusLabel = (status: UnitStatus): string => {
	const labels: Record<UnitStatus, string> = {
		available: 'Available',
		occupied: 'Occupied',
		maintenance: 'Under Maintenance',
		reserved: 'Reserved'
	}
	return labels[status] || status
}

export const getUnitStatusColor = (status: UnitStatus): string => {
	const colors: Record<UnitStatus, string> = {
		available: 'bg-yellow-100 text-yellow-800',
		occupied: 'bg-green-100 text-green-800',
		maintenance: 'bg-orange-100 text-orange-800',
		reserved: 'bg-blue-100 text-blue-800'
	}
	return colors[status] || 'bg-muted/100 text-muted/800'
}
