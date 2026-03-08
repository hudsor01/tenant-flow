import type { Property as ApiProperty, Unit } from '#types/core'
import type {
	PropertyItem,
	PropertySummary,
	PropertyType as DesignPropertyType
} from '#components/properties/types'

/**
 * Map API property type to design-os PropertyType
 */
function mapPropertyType(
	apiType: string | null | undefined
): DesignPropertyType {
	const typeMap: Record<string, DesignPropertyType> = {
		single_family: 'single_family',
		multi_family: 'multi_family',
		multi_unit: 'multi_family',
		apartment: 'apartment',
		condo: 'condo',
		townhouse: 'townhouse',
		duplex: 'duplex'
	}
	return typeMap[apiType?.toLowerCase() ?? ''] ?? 'single_family'
}

/**
 * Transform API property to design-os PropertyItem format
 */
export function transformToPropertyItem(
	property: ApiProperty,
	units: Unit[] | undefined,
	imageUrl: string | undefined
): PropertyItem {
	const safeUnits = Array.isArray(units) ? units : []
	const totalUnits = safeUnits.length || 1
	const occupiedUnits = safeUnits.filter(u => u.status === 'occupied').length
	const availableUnits = safeUnits.filter(u => u.status === 'available').length
	const maintenanceUnits = safeUnits.filter(
		u => u.status === 'maintenance'
	).length
	const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0
	const monthlyRevenue = safeUnits
		.filter(u => u.status === 'occupied')
		.reduce((sum, u) => sum + (u.rent_amount ?? 0) * 100, 0) // Convert to cents

	return {
		id: property.id,
		name: property.name,
		addressLine1: property.address_line1,
		addressLine2: property.address_line2 ?? null,
		city: property.city,
		state: property.state,
		postalCode: property.postal_code,
		propertyType: mapPropertyType(property.property_type),
		status:
			property.status === 'active'
				? 'active'
				: property.status === 'inactive'
					? 'inactive'
					: 'active',
		imageUrl,
		totalUnits,
		occupiedUnits,
		availableUnits,
		maintenanceUnits,
		occupancyRate,
		monthlyRevenue
	}
}

/**
 * Calculate portfolio summary from properties
 */
export function calculateSummary(properties: PropertyItem[]): PropertySummary {
	const totalProperties = properties.length
	const totalUnits = properties.reduce((sum, p) => sum + p.totalUnits, 0)
	const occupiedUnits = properties.reduce((sum, p) => sum + p.occupiedUnits, 0)
	const availableUnits = properties.reduce(
		(sum, p) => sum + p.availableUnits,
		0
	)
	const maintenanceUnits = properties.reduce(
		(sum, p) => sum + p.maintenanceUnits,
		0
	)
	const overallOccupancyRate =
		totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0
	const totalMonthlyRevenue = properties.reduce(
		(sum, p) => sum + p.monthlyRevenue,
		0
	)

	return {
		totalProperties,
		totalUnits,
		occupiedUnits,
		availableUnits,
		maintenanceUnits,
		overallOccupancyRate,
		totalMonthlyRevenue
	}
}
