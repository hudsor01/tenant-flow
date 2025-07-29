import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useDeleteProperty } from '@/hooks/useProperties'
import { useAppStore } from '@/stores/app-store'
import type { Unit } from '@tenantflow/shared/types/properties'

interface UsePropertyActionsProps {
	propertyId: string
	propertyName: string
}

/**
 * Custom hook for managing property detail actions and modal states
 * Handles all user interactions, modal states, and property operations
 */
export function usePropertyActions({
	propertyId,
	propertyName
}: UsePropertyActionsProps) {
	const router = useRouter()
	const deleteProperty = useDeleteProperty()
	const { modals, openModal, closeModal } = useAppStore()

	// Local state for editing entities
	const [editingUnit, setEditingUnit] = useState<Unit | undefined>()
	const [selectedUnitForLease, setSelectedUnitForLease] = useState<
		string | undefined
	>(undefined)

	// Property deletion handler
	const handleDelete = async () => {
		if (
			confirm(
				`Are you sure you want to delete "${propertyName}"? This action cannot be undone.`
			)
		) {
			try {
				await deleteProperty.mutateAsync(propertyId)
				router.navigate({ to: '/properties' })
			} catch (error) {
				console.error('Error deleting property:', error)
			}
		}
	}

	// Unit operations
	const handleAddUnit = () => {
		setEditingUnit(undefined)
		openModal('unitForm')
	}

	const handleEditUnit = (unit: Unit) => {
		setEditingUnit(unit)
		openModal('editUnit')
	}

	// Lease operations
	const handleCreateLease = (unitId: string) => {
		setSelectedUnitForLease(unitId)
		openModal('leaseForm')
	}

	// Navigation
	const handleBackToProperties = () => {
		router.navigate({ to: '/properties' })
	}

	const handleEditProperty = () => {
		openModal('editProperty')
	}

	const handleInviteTenant = () => {
		openModal('inviteTenant')
	}

	// Modal close handlers
	const closeLeaseModal = () => {
		closeModal('leaseForm')
		setSelectedUnitForLease(undefined)
	}

	return {
		// Modal states
		isEditModalOpen: modals.editProperty,
		isUnitModalOpen: modals.unitForm || modals.editUnit,
		isInviteModalOpen: modals.inviteTenant,
		isLeaseModalOpen: modals.leaseForm,
		editingUnit,
		selectedUnitForLease,

		// Action handlers
		handleDelete,
		handleAddUnit,
		handleEditUnit,
		handleCreateLease,
		handleBackToProperties,
		handleEditProperty,
		handleInviteTenant,

		// Modal controls
		closeEditModal: () => closeModal('editProperty'),
		closeUnitModal: () => { 
			closeModal('unitForm')
			closeModal('editUnit')
			setEditingUnit(undefined) 
		},
		closeInviteModal: () => closeModal('inviteTenant'),
		closeLeaseModal,

		// Loading states
		isDeleting: deleteProperty.isPending
	}
}
