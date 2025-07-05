import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useProperties } from '@/hooks/useProperties'
import type { Unit } from '@/types/entities'

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
	const navigate = useNavigate()
	const properties = useProperties()

	// Modal states
	const [isEditModalOpen, setIsEditModalOpen] = useState(false)
	const [isUnitModalOpen, setIsUnitModalOpen] = useState(false)
	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
	const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false)
	const [editingUnit, setEditingUnit] = useState<Unit | undefined>(undefined)
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
				await properties.remove(propertyId)
				toast.success('Property deleted successfully')
				navigate('/properties')
			} catch (error) {
				console.error('Error deleting property:', error)
				toast.error('Failed to delete property')
			}
		}
	}

	// Unit operations
	const handleAddUnit = () => {
		setEditingUnit(undefined)
		setIsUnitModalOpen(true)
	}

	const handleEditUnit = (unit: Unit) => {
		setEditingUnit(unit)
		setIsUnitModalOpen(true)
	}

	// Lease operations
	const handleCreateLease = (unitId: string) => {
		setSelectedUnitForLease(unitId)
		setIsLeaseModalOpen(true)
	}

	// Navigation
	const handleBackToProperties = () => {
		navigate('/properties')
	}

	const handleEditProperty = () => {
		setIsEditModalOpen(true)
	}

	const handleInviteTenant = () => {
		setIsInviteModalOpen(true)
	}

	// Modal close handlers
	const closeEditModal = () => setIsEditModalOpen(false)
	const closeUnitModal = () => {
		setIsUnitModalOpen(false)
		setEditingUnit(undefined)
	}
	const closeInviteModal = () => setIsInviteModalOpen(false)
	const closeLeaseModal = () => {
		setIsLeaseModalOpen(false)
		setSelectedUnitForLease(undefined)
	}

	return {
		// Modal states
		isEditModalOpen,
		isUnitModalOpen,
		isInviteModalOpen,
		isLeaseModalOpen,
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
		closeEditModal,
		closeUnitModal,
		closeInviteModal,
		closeLeaseModal,

		// Loading states
		isDeleting: properties.deleting
	}
}
