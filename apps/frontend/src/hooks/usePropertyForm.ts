import { z } from 'zod'
import { toast } from 'sonner'
import type { PropertyFormData } from '@/types/forms'
import { useFormValidation } from '@/hooks/useFormValidation'
import { toastMessages } from '@/lib/toast-messages'

// Form validation schema
const propertySchema = z.object({
	name: z
		.string()
		.min(1, 'Property name is required')
		.max(100, 'Name must be less than 100 characters'),
	address: z
		.string()
		.min(1, 'Address is required')
		.max(255, 'Address must be less than 255 characters'),
	city: z
		.string()
		.min(1, 'City is required')
		.max(100, 'City must be less than 100 characters'),
	state: z
		.string()
		.min(2, 'State is required')
		.max(50, 'State must be less than 50 characters'),
	zipCode: z
		.string()
		.regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code'),
	imageUrl: z
		.string()
		.url('Please enter a valid URL')
		.optional()
		.or(z.literal('')),
	description: z.string().optional(),
	propertyType: z.enum(['SINGLE_FAMILY', 'MULTI_UNIT', 'APARTMENT', 'COMMERCIAL'] as const).optional(),
	hasGarage: z.boolean().optional(),
	hasPool: z.boolean().optional(),
	numberOfUnits: z.number().min(1).max(500).optional(),
	createUnitsNow: z.boolean().optional()
})

interface UsePropertyFormProps {
	mode: 'create' | 'edit'
	property?: { id: string }
	defaultValues: PropertyFormData
	checkCanCreateProperty: () => boolean
	createProperty: {
		mutateAsync: (data: PropertyFormData) => Promise<void>
		isPending: boolean
	}
	updateProperty: {
		mutateAsync: (data: {
			id: string
			updates: Partial<PropertyFormData>
		}) => Promise<void>
		isPending: boolean
	}
	onClose: () => void
}

/**
 * Custom hook for managing property form logic and validation
 * Separates form state and business logic from UI components
 */
export function usePropertyForm({
	mode,
	property,
	defaultValues,
	checkCanCreateProperty,
	createProperty,
	updateProperty,
	onClose
}: UsePropertyFormProps) {
	const form = useFormValidation(propertySchema, defaultValues)

	const propertyType = form.watch('propertyType')
	const numberOfUnits = form.watch('numberOfUnits')

	const handleSubmit = async (data: PropertyFormData) => {
		try {
			if (mode === 'create') {
				// Check subscription limits before creating
				if (!checkCanCreateProperty()) {
					return
				}

				await createProperty.mutateAsync({
					name: data.name,
					address: data.address,
					city: data.city,
					state: data.state,
					zipCode: data.zipCode,
					imageUrl: data.imageUrl,
					propertyType: data.propertyType,
					hasGarage: data.hasGarage || false,
					hasPool: data.hasPool || false,
					numberOfUnits: data.numberOfUnits,
					createUnitsNow: data.createUnitsNow || false
				})

				// Show success message with unit creation info
				if (
					data.createUnitsNow &&
					data.numberOfUnits &&
					data.numberOfUnits > 0
				) {
					toast.success(
						`🏠 Property created successfully with ${data.numberOfUnits} units!`,
						{
							description:
								'You can now start adding tenants to your units.',
							duration: 5000
						}
					)
				} else {
					toast.success(toastMessages.success.created('property'))
				}
			} else {
				// Edit mode
				if (!property) return

				await updateProperty.mutateAsync({
					id: property.id,
					updates: {
						name: data.name,
						address: data.address,
						city: data.city,
						state: data.state,
						zipCode: data.zipCode,
						imageUrl: data.imageUrl,
						propertyType: data.propertyType,
						hasGarage: data.hasGarage || false,
						hasPool: data.hasPool || false
					}
				})

				toast.success(toastMessages.success.updated('property'))
			}

			onClose()
		} catch (error) {
			console.error('Property operation failed:', error)
			toast.error(
				mode === 'create'
					? toastMessages.error.operationFailed + ' to create property'
					: toastMessages.error.operationFailed + ' to update property'
			)
		}
	}

	return {
		form,
		propertyType,
		numberOfUnits,
		handleSubmit,
		propertySchema
	}
}
