import React from 'react'
import { Building2 } from 'lucide-react'
import { BaseFormModal } from '@/components/common/BaseFormModal'
import type { Property } from '@/types/entities'
import { UpgradePromptModal } from '../billing/UpgradePromptModal'
import { usePropertyFormData } from '../../hooks/usePropertyFormData'
import { usePropertyForm } from '../../hooks/usePropertyForm'
import { PropertyBasicInfoSection } from './sections/PropertyBasicInfoSection'
import { PropertyLocationSection } from './sections/PropertyLocationSection'
import { PropertyFeaturesSection } from './sections/PropertyFeaturesSection'
import { PropertyMediaSection } from './sections/PropertyMediaSection'

interface PropertyFormModalProps {
	isOpen: boolean
	onClose: () => void
	property?: Property
	mode?: 'create' | 'edit'
}

export default function PropertyFormModal({
	isOpen,
	onClose,
	property,
	mode = 'create'
}: PropertyFormModalProps) {
	// Extract all data and state management
	const {
		showUpgradeModal,
		setShowUpgradeModal,
		userPlan,
		createProperty,
		updateProperty,
		// canAddProperty,
		getUpgradeReason,
		initializeForm,
		checkCanCreateProperty,
		getDefaultValues
	} = usePropertyFormData({ property, mode, isOpen })

	// Extract all form logic
	const { form, propertyType, numberOfUnits, handleSubmit } = usePropertyForm(
		{
			mode,
			property,
			defaultValues: getDefaultValues(),
			checkCanCreateProperty,
			createProperty,
			updateProperty,
			onClose
		}
	)

	// Initialize form when modal state changes
	initializeForm(form)

	const handleClose = () => {
		form.reset()
		onClose()
	}

	return (
		<>
			<BaseFormModal
				isOpen={isOpen}
				onClose={handleClose}
				title={mode === 'edit' ? 'Edit Property' : 'Add New Property'}
				description={
					mode === 'edit'
						? 'Update the essential property information below'
						: 'Add the essential details to quickly create a new property'
				}
				icon={Building2}
				iconBgColor="bg-blue-100"
				iconColor="text-blue-600"
				maxWidth="2xl"
				onSubmit={form.handleSubmit(handleSubmit)}
				submitLabel={
					mode === 'edit' ? 'Update Property' : 'Create Property'
				}
				cancelLabel="Cancel"
				isSubmitting={form.formState.isSubmitting}
				submitDisabled={form.formState.isSubmitting}
			>
				{/* Property Basic Information Section */}
				<PropertyBasicInfoSection
					form={form}
					propertyType={propertyType}
					numberOfUnits={numberOfUnits}
					mode={mode}
				/>

				{/* Property Location Section */}
				<PropertyLocationSection form={form} />

				{/* Property Features Section - Only in edit mode */}
				{mode === 'edit' && <PropertyFeaturesSection form={form} />}

				{/* Property Media Section */}
				<PropertyMediaSection form={form} />
			</BaseFormModal>

			{/* Upgrade Prompt Modal */}
			<UpgradePromptModal
				isOpen={showUpgradeModal}
				onClose={() => setShowUpgradeModal(false)}
				action="Add New Property"
				reason={getUpgradeReason('property')}
				currentPlan={userPlan?.id || 'freeTrial'}
				suggestedPlan="starter"
			/>
		</>
	)
}
