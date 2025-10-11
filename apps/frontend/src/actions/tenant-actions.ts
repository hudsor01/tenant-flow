/**
 * Next.js Server Actions for Tenant Operations
 * Secure server-side operations with validation
 */

'use server'

import { serverFetch } from '@/lib/api/server'
import type { Database } from '@repo/shared/types/supabase-generated'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { validateForm } from './form-validation'

// Type alias for tenant row
type Tenant = Database['public']['Tables']['tenant']['Row']

// Tenant validation schemas
const createTenantSchema = z.object({
	email: z.string().email('Invalid email address'),
	first_name: z.string().min(1, 'First name is required'),
	last_name: z.string().min(1, 'Last name is required'),
	phone: z
		.string()
		.regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
		.optional()
		.nullable(),
	unit_id: z.string().uuid('Invalid unit ID').optional().nullable(),
	lease_start: z.string().optional().nullable(),
	lease_end: z.string().optional().nullable()
})

const updateTenantSchema = createTenantSchema.partial()

export type CreateTenantInput = z.infer<typeof createTenantSchema>
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>

/**
 * Server action to validate tenant creation data
 */
export async function validateCreateTenant(data: unknown) {
	return await validateForm(createTenantSchema, data)
}

/**
 * Server action to validate tenant update data
 */
export async function validateUpdateTenant(data: unknown) {
	return await validateForm(updateTenantSchema, data)
}

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
		const validation = await validateCreateTenant(data)
		if (!validation.success) {
			const firstError = Object.values(validation.errors)[0]?.[0]
			return {
				success: false,
				error: firstError || 'Validation failed'
			}
		}

		// Call API to create tenant
		const tenant = await serverFetch<Tenant>('/api/v1/tenants', {
			method: 'POST',
			body: JSON.stringify(validation.data),
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
		const validation = await validateUpdateTenant(data)
		if (!validation.success) {
			const firstError = Object.values(validation.errors)[0]?.[0]
			return {
				success: false,
				error: firstError || 'Validation failed'
			}
		}

		// Call API to update tenant
		const tenant = await serverFetch<Tenant>(`/api/v1/tenants/${id}`, {
			method: 'PATCH',
			body: JSON.stringify(validation.data),
			cache: 'no-store'
		})

		// Revalidate tenant pages and detail page
		revalidatePath('/owner/tenants')
		revalidatePath('/manage/tenants')
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
