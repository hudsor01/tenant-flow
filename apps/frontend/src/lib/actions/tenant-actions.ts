/**
 * Server Actions for Tenant Management
 * React 19 Server Actions with Zod validation
 * Pure server-side processing with typed results
 */

'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { apiClient } from '@/lib/api-client'
import { tenantApi } from '@/lib/api/tenants'
import type {
	Tenant,
	TenantStats,
	CreateTenantInput,
	UpdateTenantInput,
	TenantQuery,
	TenantStatus
} from '@repo/shared'

// ============================================================================
// TYPE DEFINITIONS - Action results following React 19 patterns
// ============================================================================

export type ActionResult<T = void> = 
	| { success: true; data: T }
	| { success: false; error: string; fieldErrors?: Record<string, string[]> }

// ============================================================================
// VALIDATION SCHEMAS - Comprehensive Zod validation
// ============================================================================

const createTenantSchema = z.object({
	firstName: z.string().min(1, 'First name is required').max(50),
	lastName: z.string().min(1, 'Last name is required').max(50),
	email: z.string().email('Invalid email format').toLowerCase(),
	phone: z.string().regex(/^[\d\s\-\+\(\)\.]+$/, 'Invalid phone number').optional(),
	dateOfBirth: z.string().optional(),
	emergencyContact: z.string().max(100).optional(),
	emergencyPhone: z.string().regex(/^[\d\s\-\+\(\)\.]+$/, 'Invalid phone number').optional(),
	employer: z.string().max(100).optional(),
	employmentStatus: z.enum(['employed', 'self_employed', 'unemployed', 'retired', 'student']).optional(),
	monthlyIncome: z.number().positive().optional(),
	previousAddress: z.string().max(200).optional(),
	reasonForMoving: z.string().max(500).optional(),
	pets: z.array(z.string()).optional(),
	references: z.array(z.object({
		name: z.string().max(100),
		phone: z.string(),
		relationship: z.string().max(50)
	})).optional()
})

const updateTenantSchema = createTenantSchema.partial().extend({
	id: z.string().uuid('Invalid tenant ID'),
	status: z.enum(['active', 'inactive', 'pending', 'evicted']).optional()
})

const deleteTenantSchema = z.object({
	id: z.string().uuid('Invalid tenant ID')
})

// ============================================================================
// SERVER ACTIONS - Pure server-side functions with validation
// ============================================================================

/**
 * Create a new tenant with comprehensive validation
 * Progressive enhancement: Works without JavaScript
 */
export async function createTenantAction(
	formData: FormData
): Promise<ActionResult<Tenant>> {
	try {
		// Parse FormData into object
		const rawInput = {
			firstName: formData.get('firstName'),
			lastName: formData.get('lastName'),
			email: formData.get('email'),
			phone: formData.get('phone') || undefined,
			dateOfBirth: formData.get('dateOfBirth') || undefined,
			emergencyContact: formData.get('emergencyContact') || undefined,
			emergencyPhone: formData.get('emergencyPhone') || undefined,
			employer: formData.get('employer') || undefined,
			employmentStatus: formData.get('employmentStatus') || undefined,
			monthlyIncome: formData.get('monthlyIncome') ? Number(formData.get('monthlyIncome')) : undefined,
			previousAddress: formData.get('previousAddress') || undefined,
			reasonForMoving: formData.get('reasonForMoving') || undefined,
			pets: formData.getAll('pets').filter(Boolean) as string[]
		}

		// Validate with Zod
		const validationResult = createTenantSchema.safeParse(rawInput)
		
		if (!validationResult.success) {
			const fieldErrors = validationResult.error.flatten().fieldErrors
			return {
				success: false,
				error: 'Validation failed',
				fieldErrors: Object.fromEntries(
					Object.entries(fieldErrors).map(([key, value]) => [key, value as string[]])
				)
			}
		}

		// Call backend API
		const tenant = await tenantApi.create(validationResult.data as CreateTenantInput)

		// Revalidate caches
		revalidatePath('/tenants')
		revalidatePath('/dashboard')
		revalidateTag('tenants')
		revalidateTag('tenant-stats')

		return {
			success: true,
			data: tenant
		}
	} catch (error) {
		console.error('Create tenant error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to create tenant'
		}
	}
}

/**
 * Update an existing tenant with validation
 * Uses optimistic updates on the client
 */
export async function updateTenantAction(
	id: string,
	formData: FormData
): Promise<ActionResult<Tenant>> {
	try {
		// Parse FormData into object
		const rawInput = {
			id,
			firstName: formData.get('firstName') || undefined,
			lastName: formData.get('lastName') || undefined,
			email: formData.get('email') || undefined,
			phone: formData.get('phone') || undefined,
			dateOfBirth: formData.get('dateOfBirth') || undefined,
			emergencyContact: formData.get('emergencyContact') || undefined,
			emergencyPhone: formData.get('emergencyPhone') || undefined,
			employer: formData.get('employer') || undefined,
			employmentStatus: formData.get('employmentStatus') || undefined,
			monthlyIncome: formData.get('monthlyIncome') ? Number(formData.get('monthlyIncome')) : undefined,
			status: formData.get('status') as TenantStatus | undefined
		}

		// Remove undefined values
		const cleanInput = Object.fromEntries(
			Object.entries(rawInput).filter(([_, v]) => v !== undefined)
		)

		// Validate with Zod
		const validationResult = updateTenantSchema.safeParse(cleanInput)
		
		if (!validationResult.success) {
			const fieldErrors = validationResult.error.flatten().fieldErrors
			return {
				success: false,
				error: 'Validation failed',
				fieldErrors: Object.fromEntries(
					Object.entries(fieldErrors).map(([key, value]) => [key, value as string[]])
				)
			}
		}

		// Call backend API
		const tenant = await tenantApi.update(id, validationResult.data as UpdateTenantInput)

		// Revalidate caches
		revalidatePath(`/tenants/${id}`)
		revalidatePath('/tenants')
		revalidatePath('/dashboard')
		revalidateTag('tenants')
		revalidateTag(`tenant-${id}`)

		return {
			success: true,
			data: tenant
		}
	} catch (error) {
		console.error('Update tenant error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to update tenant'
		}
	}
}

/**
 * Delete a tenant with validation
 * Includes cascade handling for related entities
 */
export async function deleteTenantAction(
	id: string
): Promise<ActionResult<void>> {
	try {
		// Validate ID
		const validationResult = deleteTenantSchema.safeParse({ id })
		
		if (!validationResult.success) {
			return {
				success: false,
				error: 'Invalid tenant ID'
			}
		}

		// Call backend API
		await tenantApi.delete(id)

		// Revalidate caches
		revalidatePath('/tenants')
		revalidatePath('/dashboard')
		revalidateTag('tenants')
		revalidateTag('tenant-stats')
		revalidateTag(`tenant-${id}`)

		return {
			success: true,
			data: undefined
		}
	} catch (error) {
		console.error('Delete tenant error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to delete tenant'
		}
	}
}

/**
 * Fetch tenants with optional filtering
 * Used for server components and suspense boundaries
 */
export async function getTenantsAction(
	query?: TenantQuery
): Promise<ActionResult<Tenant[]>> {
	try {
		const tenants = await tenantApi.getAll(query)

		return {
			success: true,
			data: tenants
		}
	} catch (error) {
		console.error('Get tenants error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to fetch tenants'
		}
	}
}

/**
 * Fetch single tenant by ID
 * Optimized for server components with caching
 */
export async function getTenantAction(
	id: string
): Promise<ActionResult<Tenant>> {
	try {
		// Validate ID
		if (!z.string().uuid().safeParse(id).success) {
			return {
				success: false,
				error: 'Invalid tenant ID'
			}
		}

		const tenant = await tenantApi.getById(id)

		return {
			success: true,
			data: tenant
		}
	} catch (error) {
		console.error('Get tenant error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to fetch tenant'
		}
	}
}

/**
 * Fetch tenant statistics
 * Used for dashboard metrics with auto-refresh
 */
export async function getTenantStatsAction(): Promise<ActionResult<TenantStats>> {
	try {
		const stats = await tenantApi.getStats()

		return {
			success: true,
			data: stats
		}
	} catch (error) {
		console.error('Get tenant stats error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to fetch tenant statistics'
		}
	}
}

/**
 * Batch update tenant statuses
 * Efficient bulk operation for administrative tasks
 */
export async function batchUpdateTenantStatusAction(
	tenantIds: string[],
	status: TenantStatus
): Promise<ActionResult<{ updated: number }>> {
	try {
		// Validate inputs
		const validStatuses: TenantStatus[] = ['active', 'inactive', 'pending', 'evicted']
		if (!validStatuses.includes(status)) {
			return {
				success: false,
				error: 'Invalid tenant status'
			}
		}

		if (!tenantIds.every(id => z.string().uuid().safeParse(id).success)) {
			return {
				success: false,
				error: 'One or more tenant IDs are invalid'
			}
		}

		// Call backend API for batch update
		const result = await apiClient.post<{ updated: number }>(
			'/tenants/batch-status',
			{ tenantIds, status }
		)

		// Revalidate caches
		revalidatePath('/tenants')
		revalidateTag('tenants')
		revalidateTag('tenant-stats')
		tenantIds.forEach(id => revalidateTag(`tenant-${id}`))

		return {
			success: true,
			data: result
		}
	} catch (error) {
		console.error('Batch update tenant status error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to update tenant statuses'
		}
	}
}

/**
 * Verify tenant background check
 * Integration with third-party background check services
 */
export async function verifyTenantBackgroundAction(
	tenantId: string
): Promise<ActionResult<{
	verified: boolean
	creditScore?: number
	criminalRecord?: boolean
	evictionHistory?: boolean
	verifiedAt: string
}>> {
	try {
		// Validate ID
		if (!z.string().uuid().safeParse(tenantId).success) {
			return {
				success: false,
				error: 'Invalid tenant ID'
			}
		}

		const result = await apiClient.post<{
			verified: boolean
			creditScore?: number
			criminalRecord?: boolean
			evictionHistory?: boolean
			verifiedAt: string
		}>(`/tenants/${tenantId}/verify-background`)

		// Revalidate tenant cache
		revalidateTag(`tenant-${tenantId}`)

		return {
			success: true,
			data: result
		}
	} catch (error) {
		console.error('Verify tenant background error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to verify tenant background'
		}
	}
}

/**
 * Send tenant communication (email/SMS)
 * Handles tenant notifications and announcements
 */
export async function sendTenantCommunicationAction(
	tenantId: string,
	message: {
		subject: string
		body: string
		type: 'email' | 'sms' | 'both'
	}
): Promise<ActionResult<{ sent: boolean }>> {
	try {
		// Validate inputs
		if (!z.string().uuid().safeParse(tenantId).success) {
			return {
				success: false,
				error: 'Invalid tenant ID'
			}
		}

		const messageSchema = z.object({
			subject: z.string().min(1).max(200),
			body: z.string().min(1).max(5000),
			type: z.enum(['email', 'sms', 'both'])
		})

		const validationResult = messageSchema.safeParse(message)
		if (!validationResult.success) {
			return {
				success: false,
				error: 'Invalid message format',
				fieldErrors: validationResult.error.flatten().fieldErrors
			}
		}

		const result = await apiClient.post<{ sent: boolean }>(
			`/tenants/${tenantId}/communicate`,
			validationResult.data
		)

		return {
			success: true,
			data: result
		}
	} catch (error) {
		console.error('Send tenant communication error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to send communication'
		}
	}
}

// ============================================================================
// EXPORTS - Clean interface for server actions
// ============================================================================

export type {
	Tenant,
	TenantStats,
	CreateTenantInput,
	UpdateTenantInput,
	TenantQuery,
	TenantStatus
}