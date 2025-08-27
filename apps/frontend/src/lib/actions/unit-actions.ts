/**
 * Server Actions for Unit Management + Batch Operations
 * BUSINESS LOGIC: Moved from frontend components
 */

'use server'

import { revalidatePath } from 'next/cache'
import { apiClient } from '@/lib/api-client'
import type { Unit, CreateUnitInput, UpdateUnitInput } from '@repo/shared'

export interface UnitFormState {
	success: boolean
	error?: string
	errors?: Record<string, string[]>
	message?: string
	data?: Unit | Unit[]
}

/**
 * Batch Unit Creation - Server Action
 * MOVED FROM: components/properties/quick-property-setup.tsx
 * REASON: Batch operations belong in backend for atomicity and consistency
 */
export async function createBatchUnitsAction(
	propertyId: string,
	numberOfUnits: number,
	unitConfig: {
		bedrooms: number
		bathrooms: number
		monthlyRent: number
	}
): Promise<UnitFormState> {
	try {
		// Validate inputs
		if (!propertyId) {
			return {
				success: false,
				error: 'Property ID is required',
				errors: { propertyId: ['Property ID is required'] }
			}
		}

		if (numberOfUnits < 1 || numberOfUnits > 50) {
			return {
				success: false,
				error: 'Number of units must be between 1 and 50',
				errors: { numberOfUnits: ['Must be between 1 and 50 units'] }
			}
		}

		if (unitConfig.monthlyRent <= 0) {
			return {
				success: false,
				error: 'Monthly rent must be greater than 0',
				errors: { monthlyRent: ['Must be greater than 0'] }
			}
		}

		// Create units in parallel (backend can handle atomicity)
		const unitPromises = Array.from(
			{ length: numberOfUnits },
			(_, index) => {
				const unitInput: CreateUnitInput = {
					propertyId,
					unitNumber: (index + 1).toString(),
					bedrooms: unitConfig.bedrooms,
					bathrooms: unitConfig.bathrooms,
					monthlyRent: unitConfig.monthlyRent,
					status: 'VACANT'
				}
				return apiClient.post<Unit>('/units', unitInput)
			}
		)

		const units = await Promise.all(unitPromises)

		// Revalidate related paths
		revalidatePath('/properties')
		revalidatePath(`/properties/${propertyId}`)
		revalidatePath('/dashboard')
		revalidatePath('/units')

		return {
			success: true,
			message: `Created ${numberOfUnits} unit${numberOfUnits > 1 ? 's' : ''} successfully`,
			data: units
		}
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Failed to create units'
		return {
			success: false,
			error: message,
			errors: { _form: [message] }
		}
	}
}

/**
 * Single Unit Creation - Server Action
 */
export async function createUnitAction(
	prevState: UnitFormState,
	formData: FormData
): Promise<UnitFormState> {
	try {
		const propertyId = formData.get('propertyId') as string
		const unitNumber = formData.get('unitNumber') as string
		const bedrooms = parseInt(formData.get('bedrooms') as string) || 0
		const bathrooms = parseFloat(formData.get('bathrooms') as string) || 0
		const monthlyRent = parseFloat(formData.get('monthlyRent') as string) || 0

		// Basic validation
		const errors: Record<string, string[]> = {}
		if (!propertyId) {
			errors.propertyId = ['Property ID is required']
		}
		if (!unitNumber?.trim()) {
			errors.unitNumber = ['Unit number is required']
		}
		if (bedrooms < 0) {
			errors.bedrooms = ['Bedrooms cannot be negative']
		}
		if (bathrooms < 0.5) {
			errors.bathrooms = ['Must be at least 0.5 bathrooms']
		}
		if (monthlyRent <= 0) {
			errors.monthlyRent = ['Monthly rent must be greater than 0']
		}

		if (Object.keys(errors).length > 0) {
			return {
				success: false,
				error: 'Please correct the form errors',
				errors
			}
		}

		const input: CreateUnitInput = {
			propertyId,
			unitNumber,
			bedrooms,
			bathrooms,
			monthlyRent,
			status: 'VACANT'
		}

		const unit = await apiClient.post<Unit>('/units', input)

		revalidatePath('/units')
		revalidatePath('/properties')
		revalidatePath(`/properties/${propertyId}`)
		revalidatePath('/dashboard')

		return {
			success: true,
			message: 'Unit created successfully',
			data: unit
		}
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Failed to create unit'
		return {
			success: false,
			error: message,
			errors: { _form: [message] }
		}
	}
}

/**
 * Update Unit - Server Action
 */
export async function updateUnitAction(
	id: string,
	prevState: UnitFormState,
	formData: FormData
): Promise<UnitFormState> {
	try {
		const input: UpdateUnitInput = {
			unitNumber: formData.get('unitNumber') as string,
			bedrooms: parseInt(formData.get('bedrooms') as string) || 0,
			bathrooms: parseFloat(formData.get('bathrooms') as string) || 0,
			monthlyRent: parseFloat(formData.get('monthlyRent') as string) || 0,
			status: (formData.get('status') as 'VACANT' | 'OCCUPIED' | 'MAINTENANCE') || 'VACANT'
		}

		const unit = await apiClient.patch<Unit>(`/units/${id}`, input)

		revalidatePath('/units')
		revalidatePath('/properties')
		revalidatePath(`/properties/${unit.propertyId}`)
		revalidatePath('/dashboard')

		return {
			success: true,
			message: 'Unit updated successfully',
			data: unit
		}
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Failed to update unit'
		return {
			success: false,
			error: message,
			errors: { _form: [message] }
		}
	}
}

/**
 * Delete Unit - Server Action
 */
export async function deleteUnitAction(
	prevState: UnitFormState,
	formData: FormData
): Promise<UnitFormState> {
	try {
		const id = formData.get('unitId') as string
		if (!id) {
			return {
				success: false,
				error: 'Unit ID is required',
				errors: { _form: ['Unit ID is required'] }
			}
		}

		// Get unit info for revalidation before deletion
		const unit = await apiClient.get<Unit>(`/units/${id}`)
		
		await apiClient.delete(`/units/${id}`)

		revalidatePath('/units')
		revalidatePath('/properties')
		revalidatePath(`/properties/${unit.propertyId}`)
		revalidatePath('/dashboard')

		return {
			success: true,
			message: 'Unit deleted successfully'
		}
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Failed to delete unit'
		return {
			success: false,
			error: message,
			errors: { _form: [message] }
		}
	}
}

// Export aliases for compatibility
export const createUnit = createUnitAction
export const updateUnit = updateUnitAction
export const deleteUnit = deleteUnitAction
export const createBatchUnits = createBatchUnitsAction

export type { Unit, CreateUnitInput, UpdateUnitInput }