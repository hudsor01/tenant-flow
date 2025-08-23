'use client'

import { useState } from 'react'
import { useServerAction } from '@/hooks'
import {
	createProperty,
	updateProperty,
	type PropertyFormState
} from '@/lib/actions/property-actions'
import { toast } from 'sonner'
import type { Property } from '@repo/shared'

interface UsePropertyFormServerProps {
	property?: Property
	mode?: 'create' | 'edit'
	onSuccess?: () => void
}

interface PropertyFormServerHookReturn {
	// Form state and submission
	formState: PropertyFormState
	isPending: boolean
	formAction: (formData: FormData) => void

	// Amenities management
	amenities: string[]
	updateAmenities: (amenities: string[]) => void

	// Form configuration
	mode: 'create' | 'edit'
}

const initialState: PropertyFormState = { success: false }

export function usePropertyFormServer({
	property,
	mode = 'create',
	onSuccess
}: UsePropertyFormServerProps): PropertyFormServerHookReturn {
	const [amenities, setAmenities] = useState<string[]>([])

	// Determine the server action based on mode
	const action =
		mode === 'create'
			? createProperty
			: (prevState: PropertyFormState, formData: FormData) => {
					if (!property?.id) {
						throw new Error('Property ID is required for update')
					}
					return updateProperty(property.id, prevState, formData)
				}

	// Use server action hook for form state management
	const { state: formState, formAction, isPending } = useServerAction(
		action,
		initialState,
		{
			onSuccess: () => {
				const successMessage =
					mode === 'create'
						? 'Property created successfully'
						: 'Property updated successfully'
				
				toast.success(successMessage)
				onSuccess?.()
			},
			showToast: false // Handle toast manually above
		}
	)

	const wrappedFormAction = (formData: FormData) => {
		// Add amenities to form data
		amenities.forEach(amenity => {
			formData.append('amenities', amenity)
		})

		// Use the formAction from useActionState for React 19 compatibility
		formAction(formData)
	}

	const updateAmenities = (newAmenities: string[]) => {
		setAmenities(newAmenities)
	}

	return {
		formState,
		isPending,
		formAction: wrappedFormAction,
		amenities,
		updateAmenities,
		mode
	}
}
