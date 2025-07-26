import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { trpc } from '@/lib/utils/trpc'
import { useMultiModalState, useEditModalState } from '@/hooks/useModalState'
import type { Unit } from '@tenantflow/shared'

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
	const deleteProperty = trpc.properties.delete.useMutation()

	// Modal states using consolidated hooks
	const modals = useMultiModalState(['edit', 'invite', 'lease'] as const)
	const unitModal = useEditModalState<Unit>()
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
				await deleteProperty.mutateAsync({ id: propertyId })
				router.navigate({ to: '/properties' })
			} catch (error) {
				console.error('Error deleting property:', error)
			}
		}
	}

	// Unit operations
	const handleAddUnit = () => {
		unitModal.openForCreate()
	}

	const handleEditUnit = (unit: Unit) => {
		unitModal.openForEdit(unit)
	}

	// Lease operations
	const handleCreateLease = (unitId: string) => {
		setSelectedUnitForLease(unitId)
		modals.lease.open()
	}

	// Navigation
	const handleBackToProperties = () => {
		router.navigate({ to: '/properties' })
	}

	const handleEditProperty = () => {
		modals.edit.open()
	}

	const handleInviteTenant = () => {
		modals.invite.open()
	}

	// Modal close handlers
	const closeLeaseModal = () => {
		modals.lease.close()
		setSelectedUnitForLease(undefined)
	}

	return {
		// Modal states
		isEditModalOpen: modals.edit.isOpen,
		isUnitModalOpen: unitModal.isOpen,
		isInviteModalOpen: modals.invite.isOpen,
		isLeaseModalOpen: modals.lease.isOpen,
		editingUnit: unitModal.editingEntity,
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
		closeEditModal: modals.edit.close,
		closeUnitModal: unitModal.close,
		closeInviteModal: modals.invite.close,
		closeLeaseModal,

		// Loading states
		isDeleting: deleteProperty.isPending
	}
}
