'use server'

import { revalidateTag, revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { propertyInputSchema } from '@repo/shared/validation/properties'
import type { Property } from '@repo/shared/types/properties'

export interface PropertyFormState {
	errors?: {
		name?: string[]
		address?: string[]
		type?: string[]
		units?: string[]
		description?: string[]
		_form?: string[]
	}
	success?: boolean
	data?: Property
}

export async function createProperty(
	prevState: PropertyFormState,
	formData: FormData
): Promise<PropertyFormState> {
	// Extract form data
	const rawData = {
		name: formData.get('name'),
		address: formData.get('address'),
		type: formData.get('type'),
		units: Number(formData.get('units')),
		description: formData.get('description'),
		amenities: formData.getAll('amenities'),
		images: formData.getAll('images')
	}

	// Validate form data
	const result = propertyInputSchema.safeParse(rawData)

	if (!result.success) {
		return {
			errors: result.error.flatten().fieldErrors
		}
	}

	try {
		// Create property via API
		const property = await apiClient.createProperty(result.data)

		// Revalidate relevant caches
		revalidateTag('properties')
		revalidatePath('/properties')

		// Redirect to new property
		redirect(`/properties/${property.id}`)
	} catch (error: unknown) {
		const message =
			error instanceof Error
				? error.message
				: 'An unexpected error occurred'
		return {
			errors: {
				_form: [message]
			}
		}
	}
}

export async function updateProperty(
	propertyId: string,
	prevState: PropertyFormState,
	formData: FormData
): Promise<PropertyFormState> {
	const rawData = {
		name: formData.get('name'),
		address: formData.get('address'),
		type: formData.get('type'),
		units: Number(formData.get('units')),
		description: formData.get('description'),
		amenities: formData.getAll('amenities'),
		images: formData.getAll('images')
	}

	const result = propertyInputSchema.safeParse(rawData)

	if (!result.success) {
		return {
			errors: result.error.flatten().fieldErrors
		}
	}

	try {
		const property = await apiClient.updateProperty(propertyId, result.data)

		// Revalidate caches
		revalidateTag('properties')
		revalidateTag('property')
		revalidatePath(`/properties/${propertyId}`)
		revalidatePath('/properties')

		return {
			success: true,
			data: property
		}
	} catch (error: unknown) {
		const message =
			error instanceof Error
				? error.message
				: 'An unexpected error occurred'
		return {
			errors: {
				_form: [message]
			}
		}
	}
}

export async function deleteProperty(
	propertyId: string
): Promise<{ success: boolean; error?: string }> {
	try {
		await apiClient.deleteProperty(propertyId)

		// Revalidate caches
		revalidateTag('properties')
		revalidatePath('/properties')

		// Redirect to properties list
		redirect('/properties')
	} catch (error: unknown) {
		const message =
			error instanceof Error
				? error.message
				: 'An unexpected error occurred'
		return {
			success: false,
			error: message
		}
	}
}

// Optimistic update action for quick UI updates
export async function togglePropertyStatus(
	propertyId: string,
	_status: 'active' | 'inactive'
) {
	try {
		// Note: This endpoint would need to be implemented in ApiService
		// For now, just revalidate the cache
		
		// Revalidate specific property
		revalidateTag('properties')
		revalidatePath(`/properties/${propertyId}`)

		return { success: true }
	} catch (error: unknown) {
		const message =
			error instanceof Error
				? error.message
				: 'An unexpected error occurred'
		return { success: false, error: message }
	}
}
