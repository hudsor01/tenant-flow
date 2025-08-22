'use server'

import { revalidateTag, revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import {
	leaseInputSchema,
	leaseRenewalSchema,
	leaseTerminationSchema
} from '@repo/shared/validation/leases'
import type { Lease } from '@repo/shared/types/leases'
import type { Document } from '@repo/shared/types/documents'

export interface LeaseFormState {
	errors?: {
		propertyId?: string[]
		tenantId?: string[]
		unitId?: string[]
		startDate?: string[]
		endDate?: string[]
		monthlyRent?: string[]
		securityDeposit?: string[]
		leaseTerm?: string[]
		status?: string[]
		leaseType?: string[]
		petPolicy?: string[]
		smokingPolicy?: string[]
		utilities?: string[]
		additionalTerms?: string[]
		terminationDate?: string[]
		reason?: string[]
		earlyTerminationFee?: string[]
		refundableDeposit?: string[]
		notes?: string[]
		renewalTerms?: string[]
		newRent?: string[]
		_form?: string[]
	}
	success?: boolean
	message?: string
	data?: Lease | { url?: string; document?: Document }
}

export async function createLease(
	prevState: LeaseFormState,
	formData: FormData
): Promise<LeaseFormState> {
	const rawData = {
		propertyId: formData.get('propertyId'),
		tenantId: formData.get('tenantId'),
		unitId: formData.get('unitId') || undefined,
		startDate: formData.get('startDate'),
		endDate: formData.get('endDate'),
		monthlyRent: Number(formData.get('monthlyRent')),
		securityDeposit: Number(formData.get('securityDeposit')),
		leaseTerm: Number(formData.get('leaseTerm')),
		status: formData.get('status') || 'draft',
		leaseType: formData.get('leaseType') || 'fixed',
		petPolicy: formData.get('petPolicy'),
		smokingPolicy: formData.get('smokingPolicy'),
		utilities: formData.getAll('utilities'),
		additionalTerms: formData.get('additionalTerms')
	}

	const result = leaseInputSchema.safeParse(rawData)

	if (!result.success) {
		return {
			errors: result.error.flatten().fieldErrors
		}
	}

	try {
		const lease = await apiClient.post<Lease>('/leases', result.data)

		// Revalidate relevant caches
		revalidateTag('leases')
		revalidateTag('properties')
		revalidateTag('tenants')
		revalidatePath('/leases')

		// Redirect to new lease
		redirect(`/leases/${lease.id}`)
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

export async function updateLease(
	leaseId: string,
	prevState: LeaseFormState,
	formData: FormData
): Promise<LeaseFormState> {
	const rawData = {
		propertyId: formData.get('propertyId'),
		tenantId: formData.get('tenantId'),
		unitId: formData.get('unitId') || undefined,
		startDate: formData.get('startDate'),
		endDate: formData.get('endDate'),
		monthlyRent: Number(formData.get('monthlyRent')),
		securityDeposit: Number(formData.get('securityDeposit')),
		leaseTerm: Number(formData.get('leaseTerm')),
		status: formData.get('status'),
		leaseType: formData.get('leaseType'),
		petPolicy: formData.get('petPolicy'),
		smokingPolicy: formData.get('smokingPolicy'),
		utilities: formData.getAll('utilities'),
		additionalTerms: formData.get('additionalTerms')
	}

	const result = leaseInputSchema.safeParse(rawData)

	if (!result.success) {
		return {
			errors: result.error.flatten().fieldErrors
		}
	}

	try {
		const lease = await apiClient.put<Lease>(`/leases/${leaseId}`, result.data)

		// Revalidate caches
		revalidateTag('leases')
		revalidateTag('lease')
		revalidateTag('properties')
		revalidateTag('tenants')
		revalidatePath(`/leases/${leaseId}`)
		revalidatePath('/leases')

		return {
			success: true,
			message: 'Lease updated successfully',
			data: lease
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

export async function deleteLease(
	leaseId: string
): Promise<{ success: boolean; error?: string }> {
	try {
		await apiClient.delete<{ message: string }>(`/leases/${leaseId}`)

		// Revalidate caches
		revalidateTag('leases')
		revalidateTag('properties')
		revalidateTag('tenants')
		revalidatePath('/leases')

		// Redirect to leases list
		redirect('/leases')
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

export async function activateLease(
	leaseId: string
): Promise<{ success: boolean; error?: string; message?: string }> {
	try {
		await apiClient.post<{ message: string }>(`/leases/${leaseId}/activate`)

		// Revalidate caches
		revalidateTag('leases')
		revalidateTag('lease')
		revalidateTag('properties')
		revalidateTag('tenants')
		revalidatePath(`/leases/${leaseId}`)

		return {
			success: true,
			message: 'Lease activated successfully'
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

export async function renewLease(
	leaseId: string,
	prevState: LeaseFormState,
	formData: FormData
): Promise<LeaseFormState> {
	const rawData = {
		endDate: formData.get('endDate'),
		newRent: formData.get('newRent')
			? Number(formData.get('newRent'))
			: undefined,
		renewalTerms: formData.get('renewalTerms')
	}

	const result = leaseRenewalSchema.safeParse(rawData)

	if (!result.success) {
		return {
			errors: result.error.flatten().fieldErrors
		}
	}

	try {
		const lease = await apiClient.post<Lease>(
			`/leases/${leaseId}/renew`,
			result.data
		)

		// Revalidate caches
		revalidateTag('leases')
		revalidateTag('lease')
		revalidatePath(`/leases/${leaseId}`)

		return {
			success: true,
			message: 'Lease renewed successfully',
			data: lease
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

export async function terminateLease(
	leaseId: string,
	prevState: LeaseFormState,
	formData: FormData
): Promise<LeaseFormState> {
	const rawData = {
		terminationDate: formData.get('terminationDate'),
		reason: formData.get('reason'),
		earlyTerminationFee: formData.get('earlyTerminationFee')
			? Number(formData.get('earlyTerminationFee'))
			: undefined,
		refundableDeposit: formData.get('refundableDeposit')
			? Number(formData.get('refundableDeposit'))
			: undefined,
		notes: formData.get('notes')
	}

	const result = leaseTerminationSchema.safeParse(rawData)

	if (!result.success) {
		return {
			errors: result.error.flatten().fieldErrors
		}
	}

	try {
		const lease = await apiClient.post<Lease>(
			`/leases/${leaseId}/terminate`,
			result.data
		)

		// Revalidate caches
		revalidateTag('leases')
		revalidateTag('lease')
		revalidateTag('properties')
		revalidateTag('tenants')
		revalidatePath(`/leases/${leaseId}`)
		revalidatePath('/leases')

		return {
			success: true,
			message: 'Lease terminated successfully',
			data: lease
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

export async function generateLeasePDF(
	leaseId: string
): Promise<{ success: boolean; error?: string; url?: string }> {
	try {
		const data = await apiClient.post<{ url: string }>(`/leases/${leaseId}/generate-pdf`)

		return {
			success: true,
			url: data.url
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

export async function uploadLeaseDocument(
	leaseId: string,
	file: File
): Promise<{ success: boolean; error?: string; document?: Document }> {
	try {
		const formData = new FormData()
		formData.append('file', file)

		const document = await apiClient.post<Document>(
			`/leases/${leaseId}/documents`,
			formData
		)

		// Revalidate lease data
		revalidateTag('lease')
		revalidatePath(`/leases/${leaseId}`)

		return {
			success: true,
			document
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
