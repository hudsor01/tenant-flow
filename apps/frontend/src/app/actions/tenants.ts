'use server'

import { serverFetch } from '@/lib/api/server'
import { revalidatePath } from 'next/cache'
import type { Tenant } from '@repo/shared/types/supabase'

/**
 * Server Actions for Tenants
 * All business logic handled by backend/database
 * Frontend only triggers actions and displays results
 */

/**
 * Create a new tenant
 * Backend handles validation and sends invitations
 */
export async function createTenant(formData: FormData) {
	const tenantData = {
		name: formData.get('name'),
		email: formData.get('email'),
		phone: formData.get('phone'),
		emergencyContact: formData.get('emergencyContact')
	}

	try {
		const result = await serverFetch<Tenant>('/api/v1/tenants', {
			method: 'POST',
			body: JSON.stringify(tenantData)
		})

		// Revalidate pages that display tenant data
		revalidatePath('/dashboard/tenants')
		revalidatePath('/dashboard')

		return { success: true, data: result }
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to create tenant'
		}
	}
}

/**
 * Update tenant information
 * Backend validates and updates related records
 */
export async function updateTenant(tenantId: string, formData: FormData) {
	const tenantData = {
		name: formData.get('name'),
		email: formData.get('email'),
		phone: formData.get('phone'),
		emergencyContact: formData.get('emergencyContact')
	}

	try {
		const result = await serverFetch<Tenant>(`/api/v1/tenants/${tenantId}`, {
			method: 'PUT',
			body: JSON.stringify(tenantData)
		})

		// Revalidate affected pages
		revalidatePath('/dashboard/tenants')
		revalidatePath(`/dashboard/tenants/${tenantId}`)
		revalidatePath('/dashboard')

		return { success: true, data: result }
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to update tenant'
		}
	}
}

/**
 * Delete a tenant
 * Backend ensures no active leases exist
 */
export async function deleteTenant(tenantId: string) {
	try {
		await serverFetch(`/api/v1/tenants/${tenantId}`, {
			method: 'DELETE'
		})

		// Revalidate affected pages
		revalidatePath('/dashboard/tenants')
		revalidatePath('/dashboard')

		return { success: true }
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to delete tenant'
		}
	}
}

/**
 * Send invitation to tenant
 * Backend handles email sending and tracking
 */
export async function sendTenantInvitation(tenantId: string) {
	try {
		await serverFetch(`/api/v1/tenants/${tenantId}/invite`, {
			method: 'POST'
		})

		// Revalidate to update invitation status
		revalidatePath('/dashboard/tenants')
		revalidatePath(`/dashboard/tenants/${tenantId}`)

		return { success: true }
	} catch (error) {
		return {
			success: false,
			error:
				error instanceof Error ? error.message : 'Failed to send invitation'
		}
	}
}

/**
 * Create a lease for tenant
 * Backend calculates all financial metrics
 */
export async function createLeaseForTenant(
	tenantId: string,
	formData: FormData
) {
	const leaseData = {
		unitId: formData.get('unitId'),
		startDate: formData.get('startDate'),
		endDate: formData.get('endDate'),
		rentAmount: parseFloat(formData.get('rentAmount') as string) || 0,
		securityDeposit: parseFloat(formData.get('securityDeposit') as string) || 0,
		paymentFrequency: formData.get('paymentFrequency') || 'monthly'
	}

	try {
		const result = await serverFetch(`/api/v1/tenants/${tenantId}/leases`, {
			method: 'POST',
			body: JSON.stringify(leaseData)
		})

		// Revalidate multiple pages affected by new lease
		revalidatePath('/dashboard/tenants')
		revalidatePath('/dashboard/leases')
		revalidatePath('/dashboard/properties')
		revalidatePath('/dashboard')

		return { success: true, data: result }
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to create lease'
		}
	}
}

/**
 * Bulk email tenants
 * Backend handles email queuing and delivery
 */
export async function bulkEmailTenants(
	tenantIds: string[],
	emailData: {
		subject: string
		message: string
	}
) {
	try {
		await serverFetch('/api/v1/tenants/bulk-email', {
			method: 'POST',
			body: JSON.stringify({ tenantIds, ...emailData })
		})

		return { success: true }
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to send emails'
		}
	}
}
