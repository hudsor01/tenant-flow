import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { useUserPlan } from './useSubscription'
import { usePropertyEntitlements } from './useEntitlements'
import type { PropertyFormData, UsePropertyFormDataProps } from '@/types/forms'
import { useCreateProperty, useUpdateProperty } from './trpc/useProperties'

// Re-export PropertyFormData for components that need it
export type { PropertyFormData }

/**
 * Custom hook for managing property form data and state
 * Separates data fetching and state management from UI components
 */
export function usePropertyFormData({
	property,
	mode,
	isOpen
}: UsePropertyFormDataProps) {
	// Upgrade modal state
	const [showUpgradeModal, setShowUpgradeModal] = useState(false)

	// Data fetching hooks
	const createProperty = useCreateProperty()
	const updateProperty = useUpdateProperty()
	const { data: userPlan } = useUserPlan()
	const propertyEntitlements = usePropertyEntitlements()

	// Form initialization logic
	const initializeForm = (form: UseFormReturn<PropertyFormData>) => {
		if (isOpen) {
			if (property && mode === 'edit') {
				form.reset({
					name: property.name,
					address: property.address,
					city: property.city,
					state: property.state,
					zipCode: property.zipCode,
					imageUrl: property.imageUrl || '',
					description: property.description || '',
					propertyType:
						property.propertyType as PropertyFormData['propertyType'],
					hasGarage: false,
					hasPool: false,
					numberOfUnits: undefined,
					createUnitsNow: false
				})
			} else {
				// Create mode - reset to defaults
				form.reset({
					name: '',
					address: '',
					city: '',
					state: '',
					zipCode: '',
					imageUrl: '',
					description: '',
					propertyType: 'SINGLE_FAMILY',
					hasGarage: false,
					hasPool: false,
					numberOfUnits: undefined,
					createUnitsNow: false
				})
			}
		} else {
			// Modal closed - reset form
			form.reset()
		}
	}

	// Check if user can create property
	const checkCanCreateProperty = () => {
		if (mode === 'create' && !propertyEntitlements.canCreateProperties) {
			setShowUpgradeModal(true)
			return false
		}
		return true
	}

	// Get form default values
	const getDefaultValues = (): PropertyFormData => ({
		name: '',
		address: '',
		city: '',
		state: '',
		zipCode: '',
		imageUrl: '',
		description: '',
		propertyType: 'SINGLE_FAMILY',
		hasGarage: false,
		hasPool: false,
		numberOfUnits: undefined,
		createUnitsNow: false
	})

	return {
		// State
		showUpgradeModal,
		setShowUpgradeModal,
		userPlan,

		// Mutations
		createProperty,
		updateProperty,

		// Subscription
		canAddProperty: propertyEntitlements.canCreateProperties,
		getUpgradeReason: (_action: string) =>
			'Upgrade your plan to access this feature.',

		// Utilities
		initializeForm,
		checkCanCreateProperty,
		getDefaultValues
	}
}
