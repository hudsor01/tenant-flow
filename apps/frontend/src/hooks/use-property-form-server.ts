'use client'

import { useState, useActionState } from 'react'
import {
	createProperty,
	updateProperty
} from '@/app/actions/properties'
import { toast } from 'sonner'
import type { Database, PropertyWithUnits } from '@repo/shared'

// Define types directly from Database schema - NO DUPLICATION
type Property = Database['public']['Tables']['Property']['Row']

interface UsePropertyFormServerProps {
	property?: Property
	mode?: 'create' | 'edit'
	onSuccess?: () => void
}

interface PropertyFormState {
	success: boolean
	error?: string
	property?: PropertyWithUnits
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

	// Wrapper action to match useActionState signature
	const wrappedAction = async (
		prevState: PropertyFormState,
		formData: FormData
	): Promise<PropertyFormState> => {
		try {
			let result: PropertyWithUnits
			if (mode === 'create') {
				result = await createProperty(formData)
			} else {
				if (!property?.id) {
					throw new Error('Property ID is required for update')
				}
				result = await updateProperty(property.id, formData)
			}

			const successMessage =
				mode === 'create'
					? 'Property created successfully'
					: 'Property updated successfully'

			toast.success(successMessage)
			onSuccess?.()

			return { success: true, property: result }
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Failed to save property'
			toast.error(errorMessage)
			return { success: false, error: errorMessage }
		}
	}

	// Use React 19's useActionState for form state management
	const [formState, formAction, isPending] = useActionState(
		wrappedAction,
		initialState
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