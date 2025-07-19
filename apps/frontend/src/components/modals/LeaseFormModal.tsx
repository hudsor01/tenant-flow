import React, { useEffect } from 'react'
import { BaseFormModal } from '@/components/modals/BaseFormModal'
import { Form } from '@/components/ui/form'
import { FileText } from 'lucide-react'
import type { Lease, Unit, Property, Tenant } from '@/types/entities'
import { useLeaseForm } from '@/hooks/useLeaseForm'
import { useLeaseFormData } from '@/hooks/useLeaseFormData'
import { PropertySelectionSection } from '@/components/leases/sections/PropertySelectionSection'
import { UnitSelectionSection } from '@/components/leases/sections/UnitSelectionSection'
import { TenantSelectionSection } from '@/components/leases/sections/TenantSelectionSection'
import { LeaseTermsSection } from '@/components/leases/sections/LeaseTermsSection'

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

	// Early return if form is undefined (error case)
	if (!form) {
		return null
	}

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
			const unit = propertyUnits.find((u: any) => u.id === selectedUnitId)
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
			maxWidth="2xl"
			onSubmit={() => form.handleSubmit(handleSubmit)()}
			submitLabel={mode === 'create' ? 'Create Lease' : 'Update Lease'}
			cancelLabel="Cancel"
			isSubmitting={isPending}
			submitDisabled={isPending}
		>
			<Form {...form}>
				<PropertySelectionSection form={form} properties={properties as unknown as Property[]} />

				<UnitSelectionSection
					form={form}
					selectedProperty={selectedProperty}
					propertyUnits={propertyUnits as any}
					availableUnits={availableUnits as any}
					hasUnits={hasUnits}
					mode={mode}
					existingLeaseUnitId={lease?.unitId}
				/>

				<TenantSelectionSection
					form={form}
					tenants={tenants as unknown as Tenant[]}
					selectedProperty={selectedProperty || null}
				/>

				<LeaseTermsSection
					form={form}
					selectedProperty={selectedProperty || null}
					mode={mode}
				/>
			</Form>
		</BaseFormModal>
	)
}
