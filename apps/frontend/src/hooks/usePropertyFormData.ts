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
}: UsePropertyFormDataProps): {
	upgradeModalOpen: boolean;
	setUpgradeModalOpen: (open: boolean) => void;
	showUpgradeModal: boolean;
	setShowUpgradeModal: (open: boolean) => void;
	userPlan: any;
	propertyEntitlements: any;
	canAddProperty: boolean;
	isLoading: boolean;
	createProperty: any;
	updateProperty: any;
	creating: boolean;
	updating: boolean;
	anyLoading: boolean;
	getUpgradeReason: (action: string) => string;
	initializeForm: (form: UseFormReturn<PropertyFormData>) => void;
	checkCanCreateProperty: () => boolean;
	getDefaultValues: () => PropertyFormData;
} {
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
		// State (dual naming for backward compatibility)
		upgradeModalOpen: showUpgradeModal,
		setUpgradeModalOpen: setShowUpgradeModal,
		showUpgradeModal,
		setShowUpgradeModal,
		userPlan,
		propertyEntitlements,

		// Computed properties
		canAddProperty: propertyEntitlements.canCreateProperties,
		isLoading: createProperty.isPending || updateProperty.isPending,
		creating: createProperty.isPending,
		updating: updateProperty.isPending,
		anyLoading: createProperty.isPending || updateProperty.isPending,

		// Mutations
		createProperty,
		updateProperty,

		// Methods
		getUpgradeReason: (_action: string) =>
			'Upgrade your plan to access this feature.',
		initializeForm,
		checkCanCreateProperty,
		getDefaultValues
	}
}
