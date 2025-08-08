import { Building2 } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import { BaseFormModal } from '@/components/modals/base-form-modal'
import type { Property, CreatePropertyInput, PropertyFormData } from '@repo/shared'
import { UpgradePromptModal } from './upgrade-prompt-modal'
import { createAsyncHandler } from '@/utils/async-handlers'
import { usePropertyFormData } from '../../hooks/usePropertyFormData'
import { usePropertyForm } from '../../hooks/usePropertyForm'
import { PropertyBasicInfoSection } from '../properties/sections/property-basic-info-section'
import { PropertyLocationSection } from '../properties/sections/property-location-section'
import { PropertyFeaturesSection } from '../properties/sections/property-features-section'
import { PropertyMediaSection } from '../properties/sections/property-media-section'

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
}: Readonly<PropertyFormModalProps>) {
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

	// Wrap mutations to match expected interface
	const wrappedCreateProperty: {
		mutateAsync: (data: CreatePropertyInput) => Promise<Property>
		isPending: boolean
	} = {
		mutateAsync: async (data: CreatePropertyInput) => {
			return await createProperty.mutateAsync(data)
		},
		isPending: createProperty.isPending
	}

	const wrappedUpdateProperty: {
		mutateAsync: (data: { id: string; updates: Partial<PropertyFormData> }) => Promise<void>
		isPending: boolean
	} = {
		mutateAsync: async (data: {
			id: string
			updates: Partial<PropertyFormData>
		}) => {
			await updateProperty.mutateAsync(data)
		},
		isPending: updateProperty.isPending
	}

	// Extract all form logic
	const { form, propertyType, numberOfUnits, handleSubmit } = usePropertyForm(
		{
			mode,
			property,
			defaultValues: getDefaultValues(),
			checkCanCreateProperty,
			createProperty: wrappedCreateProperty,
			updateProperty: wrappedUpdateProperty,
			onClose
		}
	)

	// Initialize form when modal state changes
	initializeForm(form as unknown as UseFormReturn<PropertyFormData>)

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
				onSubmit={createAsyncHandler(form.handleSubmit(handleSubmit), 'Failed to save property')}
				submitLabel={
					mode === 'edit' ? 'Update Property' : 'Create Property'
				}
				cancelLabel="Cancel"
				isSubmitting={form.isSubmitting}
				submitDisabled={form.isSubmitting}
			>
				{/* Property Basic Information Section */}
				<PropertyBasicInfoSection
					form={form as unknown as UseFormReturn<PropertyFormData>}
					propertyType={propertyType as string}
					numberOfUnits={numberOfUnits}
					mode={mode}
				/>

				{/* Property Location Section */}
				<PropertyLocationSection
					form={form as unknown as UseFormReturn<PropertyFormData>}
				/>

				{/* Property Features Section - Only in edit mode */}
				{mode === 'edit' && (
					<PropertyFeaturesSection
						form={
							form as unknown as UseFormReturn<PropertyFormData>
						}
					/>
				)}

				{/* Property Media Section */}
				<PropertyMediaSection
					form={form as unknown as UseFormReturn<PropertyFormData>}
				/>
			</BaseFormModal>

			{/* Upgrade Prompt Modal */}
			<UpgradePromptModal
				isOpen={showUpgradeModal}
				onClose={() => setShowUpgradeModal(false)}
				action="Add New Property"
				reason={getUpgradeReason('property')}
				currentPlan={userPlan || 'FREETRIAL'}
				suggestedPlan="BASIC"
			/>
		</>
	)
}
