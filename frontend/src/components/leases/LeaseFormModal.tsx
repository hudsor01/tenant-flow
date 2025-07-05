import React, { useEffect } from 'react'
import { BaseFormModal } from '@/components/common/BaseFormModal'
import { Form } from '@/components/ui/form'
import { FileText } from 'lucide-react'
import type { Lease } from '@/types/entities'
import { useLeaseForm } from '@/hooks/useLeaseForm'
import { useLeaseFormData } from '@/hooks/useLeaseFormData'
import { PropertySelectionSection } from './sections/PropertySelectionSection'
import { UnitSelectionSection } from './sections/UnitSelectionSection'
import { TenantSelectionSection } from './sections/TenantSelectionSection'
import { LeaseTermsSection } from './sections/LeaseTermsSection'

interface LeaseFormModalProps {
	isOpen: boolean
	onClose: () => void
	onSuccess: () => void
	lease?: Lease
	mode?: 'create' | 'edit'
	// Pre-selected values (optional)
	propertyId?: string
	unitId?: string
	tenantId?: string
}

export default function LeaseFormModal({
	isOpen,
	onClose,
	onSuccess,
	lease,
	mode = 'create',
	propertyId: defaultPropertyId,
	unitId: defaultUnitId,
	tenantId: defaultTenantId
}: LeaseFormModalProps) {
	// Custom hooks for form logic and data
	const { form, handleSubmit, isPending } = useLeaseForm({
		lease,
		mode,
		propertyId: defaultPropertyId,
		unitId: defaultUnitId,
		tenantId: defaultTenantId,
		onSuccess,
		onClose
	})

	// Get form data with property-unit relationships
	const selectedPropertyId = form.watch('propertyId')
	const {
		properties,
		tenants,
		propertyUnits,
		selectedProperty,
		hasUnits,
		availableUnits
	} = useLeaseFormData(selectedPropertyId)

	// Clear unit selection when property changes
	useEffect(() => {
		form.setValue('unitId', '')
	}, [selectedPropertyId, form])

	// Auto-populate rent from selected unit
	const selectedUnitId = form.watch('unitId')
	useEffect(() => {
		if (selectedUnitId && mode === 'create') {
			const unit = propertyUnits.find(u => u.id === selectedUnitId)
			if (unit) {
				form.setValue('rentAmount', unit.rent)
				form.setValue('securityDeposit', unit.rent * 2) // Default: 2x rent
			}
		}
	}, [selectedUnitId, propertyUnits, form, mode])

	return (
		<BaseFormModal
			isOpen={isOpen}
			onClose={onClose}
			title={mode === 'create' ? 'Create New Lease' : 'Edit Lease'}
			description={
				mode === 'create'
					? 'Select a property, assign tenants, and set lease terms.'
					: 'Update the lease agreement details and status.'
			}
			icon={FileText}
			iconBgColor="bg-blue-100"
			iconColor="text-blue-600"
			maxWidth="4xl"
			onSubmit={handleSubmit}
			submitLabel={mode === 'create' ? 'Create Lease' : 'Update Lease'}
			cancelLabel="Cancel"
			isSubmitting={isPending}
			submitDisabled={isPending}
		>
			<Form {...form}>
				<PropertySelectionSection form={form} properties={properties} />

				<UnitSelectionSection
					form={form}
					selectedProperty={selectedProperty}
					propertyUnits={propertyUnits}
					availableUnits={availableUnits}
					hasUnits={hasUnits}
					mode={mode}
					existingLeaseUnitId={lease?.unitId}
				/>

				<TenantSelectionSection
					form={form}
					tenants={tenants}
					selectedProperty={selectedProperty}
				/>

				<LeaseTermsSection
					form={form}
					selectedProperty={selectedProperty}
					mode={mode}
				/>
			</Form>
		</BaseFormModal>
	)
}
