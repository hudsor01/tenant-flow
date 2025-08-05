import { Building2 } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import { BaseFormModal } from '@/components/modals/BaseFormModal'
import type { Property } from '@repo/shared'
import type { PropertyFormData, CreatePropertyInput } from '@repo/shared'
import { UpgradePromptModal } from './UpgradePromptModal'
import { createAsyncHandler } from '@/utils/async-handlers'
import { usePropertyFormData } from '../../hooks/usePropertyFormData'
import { usePropertyForm } from '../../hooks/usePropertyForm'
import { PropertyBasicInfoSection } from '../properties/sections/PropertyBasicInfoSection'
import { PropertyLocationSection } from '../properties/sections/PropertyLocationSection'
import { PropertyFeaturesSection } from '../properties/sections/PropertyFeaturesSection'
import { PropertyMediaSection } from '../properties/sections/PropertyMediaSection'

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

	// Wrap mutations to match expected interface
	const wrappedCreateProperty = {
		mutateAsync: async (data: PropertyFormData) => {
			// Convert PropertyFormData to CreatePropertyInput
			const propertyData: CreatePropertyInput = {
				name: data.name,
				address: data.address,
				city: data.city,
				state: data.state,
				zipCode: data.zipCode,
				description: data.description || undefined,
				imageUrl: data.imageUrl || undefined,
				propertyType: data.propertyType || 'SINGLE_FAMILY'
			}
			await createProperty.mutateAsync(propertyData)
		},
		isPending: createProperty.isPending
	}

	const wrappedUpdateProperty = {
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
				currentPlan={userPlan?.id || 'FREE'}
				suggestedPlan="BASIC"
			/>
		</>
	)
}
