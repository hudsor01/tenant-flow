/**
 * Next.js Server Actions for Tenant Operations
 * Secure server-side operations with validation
 */

'use server'

import { serverFetch } from '@/lib/api/server'
import type { Database } from '@repo/shared/types/supabase-generated'
import {
	tenantInputSchema,
	tenantUpdateSchema
} from '@repo/shared/validation/tenants'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Type alias for tenant row
type Tenant = Database['public']['Tables']['tenant']['Row']

export type CreateTenantInput = z.infer<typeof tenantInputSchema>
export type UpdateTenantInput = z.infer<typeof tenantUpdateSchema>

/**
 * Server action to create a new tenant
 * Validates data, calls API, and revalidates cache
 */
export async function createTenant(
	data: CreateTenantInput
): Promise<
	{ success: true; data: Tenant } | { success: false; error: string }
> {
	try {
		// Validate input
		const validated = tenantInputSchema.parse(data)

		// Call API to create tenant
		const tenant = await serverFetch<Tenant>('/api/v1/tenants', {
			method: 'POST',
			body: JSON.stringify(validated),
			cache: 'no-store'
		})

		// Revalidate tenant pages to show new data
		revalidatePath('/owner/tenants')
		revalidatePath('/manage/tenants')

		return { success: true, data: tenant }
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Failed to create tenant'
		return { success: false, error: errorMessage }
	}
}

/**
 * Server action to update an existing tenant
 * Validates data, calls API, and revalidates cache
 */
export async function updateTenant(
	id: string,
	data: UpdateTenantInput
): Promise<
	{ success: true; data: Tenant } | { success: false; error: string }
> {
	try {
		// Validate tenant ID
		if (!id || typeof id !== 'string') {
			return { success: false, error: 'Invalid tenant ID' }
		}

		// Validate input
		const validated = tenantUpdateSchema.parse(data)

		// Call API to update tenant
		const tenant = await serverFetch<Tenant>(`/api/v1/tenants/${id}`, {
			method: 'PUT',
			body: JSON.stringify(validated),
			cache: 'no-store'
		})

		// Revalidate relevant pages
		revalidatePath(`/owner/tenants/${id}`)
		revalidatePath(`/manage/tenants/${id}`)

		return { success: true, data: tenant }
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Failed to update tenant'
		return { success: false, error: errorMessage }
	}
}

/**
 * Server action to delete a tenant
 * Calls API and revalidates cache
 */
export async function deleteTenant(
	id: string
): Promise<{ success: true } | { success: false; error: string }> {
	try {
		// Validate tenant ID
		if (!id || typeof id !== 'string') {
			return { success: false, error: 'Invalid tenant ID' }
		}

		// Call API to delete tenant
		await serverFetch(`/api/v1/tenants/${id}`, {
			method: 'DELETE',
			cache: 'no-store'
		})

		// Revalidate tenant pages
		revalidatePath('/owner/tenants')
		revalidatePath('/manage/tenants')

		return { success: true }
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Failed to delete tenant'
		return { success: false, error: errorMessage }
	}
}

/**
 * Server action to check email uniqueness
 * Calls API to verify email is not already in use
 */
export async function checkTenantEmailAvailable(
	email: string
): Promise<{ available: boolean; error?: string }> {
	try {
		// Validate email format first
		const emailSchema = z.string().email()
		emailSchema.parse(email)

		// Call API to check email uniqueness
		const response = await serverFetch<{ available: boolean }>(
			'/api/v1/tenants/check-email',
			{
				method: 'POST',
				body: JSON.stringify({ email }),
				cache: 'no-store'
			}
		)

		return { available: response.available }
	} catch (error) {
		if (error instanceof z.ZodError) {
			return {
				available: false,
				error: error.issues[0]?.message || 'Invalid email format'
			}
		}
		return {
			available: false,
			error: error instanceof Error ? error.message : 'Validation failed'
		}
	}
}
