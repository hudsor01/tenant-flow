import { useMemo } from 'react'
import type { PropertyFormData } from '@repo/shared/validation/properties'
import type { Property } from '@repo/shared'

/**
 * DRY: Reusable Property Form Default Values
 * Eliminates duplicate default value logic across property form components
 */
export function usePropertyFormDefaults(property?: Property): PropertyFormData {
	return useMemo(
		() =>
			property
				? {
						name: property.name || '',
						description: property.description || undefined,
						propertyType: property.propertyType || 'SINGLE_FAMILY',
						address: property.address || '',
						city: property.city || '',
						state: property.state || '',
						zipCode: property.zipCode || ''
					}
				: {
						name: '',
						description: undefined,
						propertyType: 'SINGLE_FAMILY',
						address: '',
						city: '',
						state: '',
						zipCode: ''
					},
		[property]
	)
}
