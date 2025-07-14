import { useState } from 'react'
import { useProperties } from './useProperties'
import { useUnits } from './useUnits'
import {
	useInviteTenant,
	useResendInvitation,
	useDeletePendingInvitation
} from './useTenants'
import { useCanPerformAction, useUserPlan } from './useSubscription'

/**
 * Custom hook for managing invite tenant modal data and state
 * Separates data fetching and state management from UI components
 */
export function useInviteTenantData(selectedPropertyId?: string) {
	// Property-related state
	const [selectedProperty, setSelectedProperty] = useState(
		selectedPropertyId || ''
	)

	// Error and modal state
	const [showUpgradeModal, setShowUpgradeModal] = useState(false)
	const [pendingInvitationError, setPendingInvitationError] = useState<{
		message: string
		tenantId?: string
	} | null>(null)
	const [alreadyAcceptedTenant, setAlreadyAcceptedTenant] = useState<{
		name: string
		email: string
	} | null>(null)

	// Data queries
	const {
		data: properties = [],
		loading: propertiesLoading,
		error: propertiesError
	} = useProperties()
	const { data: units = [], loading: unitsLoading } = useUnits(
		selectedProperty ? { propertyId: selectedProperty } : undefined
	)

	// Mutations
	const { mutateAsync: inviteTenant, isPending: isInviting } =
		useInviteTenant()
	const { mutateAsync: resendInvitation, isPending: isResending } =
		useResendInvitation()
	const { mutateAsync: deletePendingInvitation, isPending: isDeleting } =
		useDeletePendingInvitation()

	// Subscription checks
	const { canAddTenant, getUpgradeReason } = useCanPerformAction()
	const { data: userPlan } = useUserPlan()

	// Reset states function
	const resetStates = () => {
		setSelectedProperty('')
		setPendingInvitationError(null)
		setAlreadyAcceptedTenant(null)
	}

	// Property selection management
	const updateSelectedProperty = (
		propertyId: string,
		setValue: (name: string, value: string) => void
	) => {
		if (propertyId !== selectedProperty) {
			setSelectedProperty(propertyId)
			setValue('unitId', '') // Reset unit selection when property changes
		}
	}

	// Initialize selected property on modal open
	const initializeProperty = (
		isOpen: boolean,
		setValue: (name: string, value: string) => void
	) => {
		if (isOpen && selectedPropertyId) {
			setSelectedProperty(selectedPropertyId)
			setValue('propertyId', selectedPropertyId)
		}
	}

	return {
		// State
		selectedProperty,
		setSelectedProperty,
		showUpgradeModal,
		setShowUpgradeModal,
		pendingInvitationError,
		setPendingInvitationError,
		alreadyAcceptedTenant,
		setAlreadyAcceptedTenant,

		// Data
		properties,
		propertiesLoading,
		propertiesError,
		units,
		unitsLoading,
		userPlan,

		// Mutations
		inviteTenant,
		isInviting,
		resendInvitation,
		isResending,
		deletePendingInvitation,
		isDeleting,

		// Subscription
		canAddTenant,
		getUpgradeReason,

		// Utilities
		resetStates,
		updateSelectedProperty,
		initializeProperty
	}
}
