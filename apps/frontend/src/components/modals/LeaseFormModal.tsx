import { useEffect } from 'react'
import { BaseFormModal } from '@/components/modals/BaseFormModal'
import { Form } from '@/components/ui/form'
import { FileText } from 'lucide-react'
import type { Unit } from '@repo/shared'
import type { PropertyWithDetails } from '@repo/shared'
import type { Lease } from '@repo/shared'
import { useLeaseForm } from '@/hooks/useLeaseForm'
import { useLeaseFormData } from '@/hooks/useLeaseFormData'
import { createAsyncHandler } from '@/utils/async-handlers'
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

	// Get form data with property-unit relationships - using form?.watch to handle undefined form
	const selectedPropertyId = form?.watch('propertyId')
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
		if (form && selectedPropertyId) {
			form.setValue('unitId', '')
		}
	}, [selectedPropertyId, form])

	// Auto-populate rent from selected unit
	const selectedUnitId = form?.watch('unitId')
	useEffect(() => {
		if (selectedUnitId && mode === 'create' && form) {
			const unit = propertyUnits.find((u: Unit) => u.id === selectedUnitId)
			if (unit && unit.rent) {
				form.setValue('rentAmount', unit.rent)
				form.setValue('securityDeposit', unit.rent * 2) // Default: 2x rent
			}
		}
	}, [selectedUnitId, propertyUnits, form, mode])

	// Early return if form is undefined (error case)
	if (!form) {
		return null
	}

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
			onSubmit={createAsyncHandler(() => form.handleSubmit(handleSubmit)(), 'Failed to save lease')}
			submitLabel={mode === 'create' ? 'Create Lease' : 'Update Lease'}
			cancelLabel="Cancel"
			isSubmitting={isPending}
			submitDisabled={isPending}
		>
			<Form {...form}>
				<PropertySelectionSection form={form} properties={properties} />

				<UnitSelectionSection
					form={form}
					selectedProperty={selectedProperty as PropertyWithDetails | undefined}
					propertyUnits={propertyUnits}
					availableUnits={availableUnits}
					hasUnits={hasUnits}
					mode={mode}
					existingLeaseUnitId={lease?.unitId}
				/>

				<TenantSelectionSection
					form={form}
					tenants={tenants}
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
