/**
 * Property utilities
 * Helper functions for property and unit display
 */

type PropertyType = 'SINGLE_FAMILY' | 'MULTI_UNIT' | 'APARTMENT' | 'COMMERCIAL'
type UnitStatus = 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'

export const getPropertyTypeLabel = (type: PropertyType): string => {
  const labels: Record<PropertyType, string> = {
    SINGLE_FAMILY: 'Single Family',
    MULTI_UNIT: 'Multi Unit',
    APARTMENT: 'Apartment',
    COMMERCIAL: 'Commercial'
  }
  return labels[type] || type
}

export const getUnitStatusLabel = (status: UnitStatus): string => {
  const labels: Record<UnitStatus, string> = {
    VACANT: 'Vacant',
    OCCUPIED: 'Occupied',
    MAINTENANCE: 'Under Maintenance',
    RESERVED: 'Reserved'
  }
  return labels[status] || status
}

export const getUnitStatusColor = (status: UnitStatus): string => {
  const colors: Record<UnitStatus, string> = {
    VACANT: 'bg-yellow-100 text-yellow-800',
    OCCUPIED: 'bg-green-100 text-green-800',
    MAINTENANCE: 'bg-orange-100 text-orange-800',
    RESERVED: 'bg-blue-100 text-blue-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}