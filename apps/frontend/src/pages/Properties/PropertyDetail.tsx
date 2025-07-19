import React from 'react'
import { usePropertyDetailData } from '@/hooks/usePropertyDetailData'
import { usePropertyActions } from '@/hooks/usePropertyActions'
import PropertyHeaderSection from '@/components/properties/PropertyHeaderSection'
import PropertyStatsSection from '@/components/properties/PropertyStatsSection'
import PropertyTabsSection from '@/components/properties/PropertyTabsSection'
import PropertyLoadingState from '@/components/properties/PropertyLoadingState'
import PropertyErrorState from '@/components/properties/PropertyErrorState'
import PropertyFormModal from '@/components/modals/PropertyFormModal'
import UnitFormModal from '@/components/modals/UnitFormModal'
import LeaseFormModal from '@/components/modals/LeaseFormModal'
import { useParams } from '@tanstack/react-router'

/**
 * Property detail page component
 * Displays comprehensive property information with units, tenants, and payments
 */
export default function PropertyDetail() {
	const { propertyId } = useParams({ from: "/_authenticated/properties/$propertyId" })

	// Get property data and statistics
	const { property, isLoading, error, stats, fadeInUp } =
		usePropertyDetailData({ propertyId })

	// Get all action handlers and modal states
	const {
		isEditModalOpen,
		isUnitModalOpen,
		isLeaseModalOpen,
		editingUnit,
		selectedUnitForLease,
		handleAddUnit,
		handleEditUnit,
		handleCreateLease,
		handleBackToProperties,
		handleEditProperty,
		handleInviteTenant,
		handleDelete,
		closeEditModal,
		closeUnitModal,
		closeLeaseModal,
		isDeleting
	} = usePropertyActions({
		propertyId: propertyId!,
		propertyName: property?.name || ''
	})

	// Loading state
	if (isLoading) {
		return <PropertyLoadingState />
	}

	// Error state
	if (error || !property) {
		return (
			<PropertyErrorState onBackToProperties={handleBackToProperties} />
		)
	}

	return (
		<div className="space-y-6">
			<PropertyHeaderSection
				property={property}
				fadeInUp={fadeInUp}
				onBackToProperties={handleBackToProperties}
				onEditProperty={handleEditProperty}
				onInviteTenant={handleInviteTenant}
				onDelete={handleDelete}
				isDeleting={isDeleting}
			/>

			<PropertyStatsSection stats={stats} fadeInUp={fadeInUp} />

			<PropertyTabsSection
				property={property}
				totalUnits={stats.totalUnits}
				fadeInUp={fadeInUp}
				onAddUnit={handleAddUnit}
				onEditUnit={handleEditUnit}
				onCreateLease={handleCreateLease}
				onInviteTenant={handleInviteTenant}
			/>

			{/* Modals */}
			<PropertyFormModal
				isOpen={isEditModalOpen}
				onClose={closeEditModal}
				property={{
					...property,
					createdAt: property.createdAt instanceof Date ? property.createdAt.toISOString() : property.createdAt,
					updatedAt: property.updatedAt instanceof Date ? property.updatedAt.toISOString() : property.updatedAt
				}}
				mode="edit"
			/>

			<UnitFormModal
				isOpen={isUnitModalOpen}
				onClose={closeUnitModal}
				propertyId={propertyId!}
				unit={editingUnit}
				mode={editingUnit ? 'edit' : 'create'}
			/>


			<LeaseFormModal
				isOpen={isLeaseModalOpen}
				onClose={closeLeaseModal}
				unitId={selectedUnitForLease}
				onSuccess={closeLeaseModal}
			/>
		</div>
	)
}
