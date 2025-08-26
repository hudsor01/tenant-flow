/**
 * Server Actions for Property Management
 * Direct API integration without abstraction
 */

'use server'

import { revalidatePath } from 'next/cache'
import { apiClient } from '@/lib/api-client'
import type {
	Property,
	CreatePropertyInput,
	UpdatePropertyInput,
	PropertyType
} from '@repo/shared'

export interface PropertyFormState {
	success: boolean
	error?: string
	errors?: Record<string, string[]>
	message?: string
	data?: Property
}

export async function createPropertyAction(
	prevState: PropertyFormState,
	formData: FormData
): Promise<PropertyFormState> {
	try {
		// Extract and validate required fields
		const name = formData.get('name') as string
		const address = formData.get('address') as string
		const city = formData.get('city') as string
		const state = formData.get('state') as string
		const zipCode = formData.get('zipCode') as string
		const propertyType = (formData.get('propertyType') ||
			formData.get('type')) as PropertyType

		// Basic validation
		const errors: Record<string, string[]> = {}
		if (!name?.trim()) {
			errors.name = ['Property name is required']
		}
		if (!address?.trim()) {
			errors.address = ['Address is required']
		}
		if (!city?.trim()) {
			errors.city = ['City is required']
		}
		if (!state?.trim()) {
			errors.state = ['State is required']
		}
		if (!zipCode?.trim()) {
			errors.zipCode = ['ZIP code is required']
		}
		if (!propertyType) {
			errors.propertyType = ['Property type is required']
		}

		if (Object.keys(errors).length > 0) {
			return {
				success: false,
				error: 'Please correct the form errors',
				errors
			}
		}

		const input: CreatePropertyInput = {
			name,
			address,
			city,
			state,
			zipCode,
			propertyType,
			units: parseInt(formData.get('units') as string) || 1,
			rentAmount: parseFloat(formData.get('rentAmount') as string) || 0,
			description: (formData.get('description') as string) || undefined
		}

		const property = await apiClient.post<Property>('/properties', input)

		revalidatePath('/properties')
		revalidatePath('/dashboard')

		return {
			success: true,
			message: 'Property created successfully',
			data: property
		}
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Failed to create property'
		return {
			success: false,
			error: message,
			errors: { _form: [message] }
		}
	}
}

export async function updatePropertyAction(
	id: string,
	prevState: PropertyFormState,
	formData: FormData
): Promise<PropertyFormState> {
	try {
		const input: UpdatePropertyInput = {
			name: formData.get('name') as string,
			address: formData.get('address') as string,
			city: formData.get('city') as string,
			state: formData.get('state') as string,
			zipCode: formData.get('zipCode') as string,
			propertyType: (formData.get('propertyType') ||
				formData.get('type')) as PropertyType,
			units: parseInt(formData.get('units') as string) || 1,
			rentAmount: parseFloat(formData.get('rentAmount') as string) || 0,
			description: (formData.get('description') as string) || undefined
		}

		const property = await apiClient.patch<Property>(
			`/properties/${id}`,
			input
		)

		revalidatePath('/properties')
		revalidatePath(`/properties/${id}`)
		revalidatePath('/dashboard')

		return {
			success: true,
			message: 'Property updated successfully',
			data: property
		}
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Failed to update property'
		return {
			success: false,
			error: message,
			errors: { _form: [message] }
		}
	}
}

export async function deletePropertyAction(
	prevState: PropertyFormState,
	formData: FormData
): Promise<PropertyFormState> {
	try {
		const id = formData.get('propertyId') as string
		if (!id) {
			return {
				success: false,
				error: 'Property ID is required',
				errors: { _form: ['Property ID is required'] }
			}
		}

		await apiClient.delete(`/properties/${id}`)

		revalidatePath('/properties')
		revalidatePath('/dashboard')

		return {
			success: true,
			message: 'Property deleted successfully'
		}
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Failed to delete property'
		return {
			success: false,
			error: message,
			errors: { _form: [message] }
		}
	}
}

// Export aliases for compatibility
export const createProperty = createPropertyAction
export const updateProperty = updatePropertyAction
export const deleteProperty = deletePropertyAction

export type { Property, CreatePropertyInput, UpdatePropertyInput }
