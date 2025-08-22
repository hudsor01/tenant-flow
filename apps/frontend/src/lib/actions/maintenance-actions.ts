'use server'

import { revalidateTag, revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import {
	maintenanceInputSchema,
	maintenanceUpdateSchema,
	maintenanceCommentSchema
} from '@repo/shared/validation/maintenance'
import type { MaintenanceRequest } from '@repo/shared/types/maintenance'

export interface MaintenanceFormState {
	errors?: {
		propertyId?: string[]
		tenantId?: string[]
		unitId?: string[]
		title?: string[]
		description?: string[]
		priority?: string[]
		category?: string[]
		status?: string[]
		requestedBy?: string[]
		assignedTo?: string[]
		scheduledDate?: string[]
		estimatedCost?: string[]
		actualCost?: string[]
		notes?: string[]
		completionNotes?: string[]
		comment?: string[]
		_form?: string[]
	}
	success?: boolean
	message?: string
	data?:
		| MaintenanceRequest
		| { image?: { id: string; url: string; filename: string } }
}

export async function createMaintenanceRequest(
	prevState: MaintenanceFormState,
	formData: FormData
): Promise<MaintenanceFormState> {
	const rawData = {
		propertyId: formData.get('propertyId'),
		tenantId: formData.get('tenantId') || undefined,
		unitId: formData.get('unitId') || undefined,
		title: formData.get('title'),
		description: formData.get('description'),
		priority: formData.get('priority'),
		category: formData.get('category'),
		status: formData.get('status') || 'open',
		requestedBy: formData.get('requestedBy'),
		assignedTo: formData.get('assignedTo'),
		scheduledDate: formData.get('scheduledDate'),
		estimatedCost: formData.get('estimatedCost')
			? Number(formData.get('estimatedCost'))
			: undefined,
		actualCost: formData.get('actualCost')
			? Number(formData.get('actualCost'))
			: undefined,
		notes: formData.get('notes')
	}

	const result = maintenanceInputSchema.safeParse(rawData)

	if (!result.success) {
		return {
			errors: result.error.flatten().fieldErrors
		}
	}

	try {
		const maintenanceRequest = await apiClient.post<MaintenanceRequest>('/maintenance', result.data)

		// Revalidate relevant caches
		revalidateTag('maintenance')
		revalidateTag('properties')
		revalidatePath('/maintenance')

		// Redirect to new maintenance request
		redirect(`/maintenance/${maintenanceRequest.id}`)
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

export async function updateMaintenanceRequest(
	maintenanceId: string,
	prevState: MaintenanceFormState,
	formData: FormData
): Promise<MaintenanceFormState> {
	const rawData = {
		propertyId: formData.get('propertyId'),
		tenantId: formData.get('tenantId') || undefined,
		unitId: formData.get('unitId') || undefined,
		title: formData.get('title'),
		description: formData.get('description'),
		priority: formData.get('priority'),
		category: formData.get('category'),
		status: formData.get('status'),
		requestedBy: formData.get('requestedBy'),
		assignedTo: formData.get('assignedTo'),
		scheduledDate: formData.get('scheduledDate'),
		estimatedCost: formData.get('estimatedCost')
			? Number(formData.get('estimatedCost'))
			: undefined,
		actualCost: formData.get('actualCost')
			? Number(formData.get('actualCost'))
			: undefined,
		notes: formData.get('notes')
	}

	const result = maintenanceInputSchema.safeParse(rawData)

	if (!result.success) {
		return {
			errors: result.error.flatten().fieldErrors
		}
	}

	try {
		const maintenanceRequest = await apiClient.put<MaintenanceRequest>(
			`/maintenance/${maintenanceId}`,
			result.data
		)

		// Revalidate caches
		revalidateTag('maintenance')
		revalidateTag('maintenance-request')
		revalidatePath(`/maintenance/${maintenanceId}`)
		revalidatePath('/maintenance')

		return {
			success: true,
			message: 'Maintenance request updated successfully',
			data: maintenanceRequest
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

export async function deleteMaintenanceRequest(
	maintenanceId: string
): Promise<{ success: boolean; error?: string }> {
	try {
		await apiClient.delete<{ message: string }>(`/maintenance/${maintenanceId}`)

		// Revalidate caches
		revalidateTag('maintenance')
		revalidatePath('/maintenance')

		// Redirect to maintenance list
		redirect('/maintenance')
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

export async function updateMaintenanceStatus(
	maintenanceId: string,
	prevState: MaintenanceFormState,
	formData: FormData
): Promise<MaintenanceFormState> {
	const rawData = {
		status: formData.get('status'),
		assignedTo: formData.get('assignedTo'),
		scheduledDate: formData.get('scheduledDate'),
		actualCost: formData.get('actualCost')
			? Number(formData.get('actualCost'))
			: undefined,
		completionNotes: formData.get('completionNotes')
	}

	const result = maintenanceUpdateSchema.safeParse(rawData)

	if (!result.success) {
		return {
			errors: result.error.flatten().fieldErrors
		}
	}

	try {
		const maintenanceRequest = await apiClient.patch<MaintenanceRequest>(
			`/maintenance/${maintenanceId}/status`,
			result.data
		)

		// Revalidate caches
		revalidateTag('maintenance')
		revalidateTag('maintenance-request')
		revalidatePath(`/maintenance/${maintenanceId}`)

		return {
			success: true,
			message: 'Maintenance status updated successfully',
			data: maintenanceRequest
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

export async function assignMaintenanceToVendor(
	maintenanceId: string,
	vendorId: string
): Promise<{ success: boolean; error?: string; message?: string }> {
	try {
		await apiClient.post<MaintenanceRequest>(
			`/maintenance/${maintenanceId}/assign`,
			{ vendorId }
		)

		// Revalidate caches
		revalidateTag('maintenance')
		revalidateTag('maintenance-request')
		revalidatePath(`/maintenance/${maintenanceId}`)

		return {
			success: true,
			message: 'Maintenance request assigned successfully'
		}
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

export async function addMaintenanceComment(
	maintenanceId: string,
	prevState: MaintenanceFormState,
	formData: FormData
): Promise<MaintenanceFormState> {
	const rawData = {
		content: formData.get('comment'),
		maintenanceRequestId: maintenanceId
	}

	const result = maintenanceCommentSchema.safeParse(rawData)

	if (!result.success) {
		return {
			errors: {
				comment: result.error.flatten().fieldErrors.content || []
			}
		}
	}

	try {
		const maintenanceRequest = await apiClient.post<MaintenanceRequest>(
			`/maintenance/${maintenanceId}/comments`,
			result.data
		)

		// Revalidate maintenance request data
		revalidateTag('maintenance-request')
		revalidatePath(`/maintenance/${maintenanceId}`)

		return {
			success: true,
			message: 'Comment added successfully',
			data: maintenanceRequest
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

export async function uploadMaintenanceImage(
	maintenanceId: string,
	file: File
): Promise<{
	success: boolean
	error?: string
	image?: { id: string; url: string; filename: string }
}> {
	try {
		const formData = new FormData()
		formData.append('image', file)

		const imageData = await apiClient.post<{
			id: string
			url: string
			filename: string
		}>(`/maintenance/${maintenanceId}/images`, formData)

		// Revalidate maintenance request data
		revalidateTag('maintenance-request')
		revalidatePath(`/maintenance/${maintenanceId}`)

		return {
			success: true,
			image: imageData
		}
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

// Quick status update actions for optimistic UI updates
export async function markMaintenanceInProgress(maintenanceId: string) {
	try {
		await apiClient.patch<{ message: string }>(
			`/maintenance/${maintenanceId}/status`,
			{
				status: 'in_progress'
			}
		)

		// Revalidate maintenance data
		revalidateTag('maintenance')
		revalidatePath(`/maintenance/${maintenanceId}`)

		return { success: true }
	} catch (error: unknown) {
		const message =
			error instanceof Error
				? error.message
				: 'An unexpected error occurred'
		return { success: false, error: message }
	}
}

export async function markMaintenanceCompleted(maintenanceId: string) {
	try {
		await apiClient.patch<{ message: string }>(
			`/maintenance/${maintenanceId}/status`,
			{
				status: 'completed'
			}
		)

		// Revalidate maintenance data
		revalidateTag('maintenance')
		revalidatePath(`/maintenance/${maintenanceId}`)

		return { success: true }
	} catch (error: unknown) {
		const message =
			error instanceof Error
				? error.message
				: 'An unexpected error occurred'
		return { success: false, error: message }
	}
}
