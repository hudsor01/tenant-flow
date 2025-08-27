/**
 * Server Actions for Property Management
 * React 19 Server Actions with Zod validation
 * Pure server-side processing with typed results
 */

'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { apiClient } from '@/lib/api-client'
import { propertyInputSchema } from '@repo/shared/validation/properties'
import type {
	Property,
	PropertyStats,
	CreatePropertyInput,
	UpdatePropertyInput,
	PropertyQuery
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

const createPropertySchema = z.object({
	name: z.string().min(1, 'Property name is required').max(100),
	address: z.string().min(1, 'Address is required').max(200),
	city: z.string().min(1, 'City is required').max(50),
	state: z.string().min(2, 'State is required').max(2),
	zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
	propertyType: z.enum(['single_family', 'multi_family', 'apartment', 'condo', 'townhouse', 'commercial']),
	units: z.number().int().positive().default(1),
	rentAmount: z.number().positive('Rent amount must be positive').optional(),
	description: z.string().max(1000).optional(),
	amenities: z.array(z.string()).optional(),
	images: z.array(z.string().url()).optional()
})

const updatePropertySchema = createPropertySchema.partial().extend({
	id: z.string().uuid('Invalid property ID')
})

const deletePropertySchema = z.object({
	id: z.string().uuid('Invalid property ID')
})

// ============================================================================
// SERVER ACTIONS - Pure server-side functions with validation
// ============================================================================

/**
 * Create a new property with comprehensive validation
 * Progressive enhancement: Works without JavaScript
 */
export async function createPropertyAction(
	formData: FormData
): Promise<ActionResult<Property>> {
	try {
		// Parse FormData into object
		const rawInput = {
			name: formData.get('name'),
			address: formData.get('address'),
			city: formData.get('city'),
			state: formData.get('state'),
			zipCode: formData.get('zipCode'),
			propertyType: formData.get('propertyType'),
			units: Number(formData.get('units')) || 1,
			rentAmount: formData.get('rentAmount') ? Number(formData.get('rentAmount')) : undefined,
			description: formData.get('description') || undefined,
			amenities: formData.getAll('amenities').filter(Boolean) as string[],
			images: formData.getAll('images').filter(Boolean) as string[]
		}

		// Validate with Zod
		const validationResult = createPropertySchema.safeParse(rawInput)
		
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
		const property = await apiClient.post<Property>('/properties', validationResult.data)

		// Revalidate caches
		revalidatePath('/properties')
		revalidatePath('/dashboard')
		revalidateTag('properties')
		revalidateTag('property-stats')

		return {
			success: true,
			data: property
		}
	} catch (error) {
		console.error('Create property error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to create property'
		}
	}
}

/**
 * Update an existing property with validation
 * Uses optimistic updates on the client
 */
export async function updatePropertyAction(
	id: string,
	formData: FormData
): Promise<ActionResult<Property>> {
	try {
		// Parse FormData into object
		const rawInput = {
			id,
			name: formData.get('name') || undefined,
			address: formData.get('address') || undefined,
			city: formData.get('city') || undefined,
			state: formData.get('state') || undefined,
			zipCode: formData.get('zipCode') || undefined,
			propertyType: formData.get('propertyType') || undefined,
			units: formData.get('units') ? Number(formData.get('units')) : undefined,
			rentAmount: formData.get('rentAmount') ? Number(formData.get('rentAmount')) : undefined,
			description: formData.get('description') || undefined
		}

		// Remove undefined values
		const cleanInput = Object.fromEntries(
			Object.entries(rawInput).filter(([_, v]) => v !== undefined)
		)

		// Validate with Zod
		const validationResult = updatePropertySchema.safeParse(cleanInput)
		
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
		const property = await apiClient.put<Property>(`/properties/${id}`, validationResult.data)

		// Revalidate caches
		revalidatePath(`/properties/${id}`)
		revalidatePath('/properties')
		revalidatePath('/dashboard')
		revalidateTag('properties')
		revalidateTag(`property-${id}`)

		return {
			success: true,
			data: property
		}
	} catch (error) {
		console.error('Update property error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to update property'
		}
	}
}

/**
 * Delete a property with validation
 * Includes cascade handling for related entities
 */
export async function deletePropertyAction(
	id: string
): Promise<ActionResult<void>> {
	try {
		// Validate ID
		const validationResult = deletePropertySchema.safeParse({ id })
		
		if (!validationResult.success) {
			return {
				success: false,
				error: 'Invalid property ID'
			}
		}

		// Call backend API
		await apiClient.delete(`/properties/${id}`)

		// Revalidate caches
		revalidatePath('/properties')
		revalidatePath('/dashboard')
		revalidateTag('properties')
		revalidateTag('property-stats')
		revalidateTag(`property-${id}`)

		return {
			success: true,
			data: undefined
		}
	} catch (error) {
		console.error('Delete property error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to delete property'
		}
	}
}

/**
 * Fetch properties with optional filtering
 * Used for server components and suspense boundaries
 */
export async function getPropertiesAction(
	query?: PropertyQuery
): Promise<ActionResult<Property[]>> {
	try {
		const properties = await apiClient.get<Property[]>('/properties', { 
			params: query,
			next: { 
				revalidate: 60, // Cache for 1 minute
				tags: ['properties']
			}
		})

		return {
			success: true,
			data: properties
		}
	} catch (error) {
		console.error('Get properties error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to fetch properties'
		}
	}
}

/**
 * Fetch single property by ID
 * Optimized for server components with caching
 */
export async function getPropertyAction(
	id: string
): Promise<ActionResult<Property>> {
	try {
		// Validate ID
		if (!z.string().uuid().safeParse(id).success) {
			return {
				success: false,
				error: 'Invalid property ID'
			}
		}

		const property = await apiClient.get<Property>(`/properties/${id}`, {
			next: { 
				revalidate: 60, // Cache for 1 minute
				tags: ['properties', `property-${id}`]
			}
		})

		return {
			success: true,
			data: property
		}
	} catch (error) {
		console.error('Get property error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to fetch property'
		}
	}
}

/**
 * Fetch property statistics
 * Used for dashboard metrics with auto-refresh
 */
export async function getPropertyStatsAction(): Promise<ActionResult<PropertyStats>> {
	try {
		const stats = await apiClient.get<PropertyStats>('/properties/stats', {
			next: { 
				revalidate: 30, // Cache for 30 seconds
				tags: ['property-stats']
			}
		})

		return {
			success: true,
			data: stats
		}
	} catch (error) {
		console.error('Get property stats error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to fetch property statistics'
		}
	}
}

/**
 * Batch create units for a property
 * Efficient bulk operation with transaction support
 */
export async function batchCreateUnitsAction(
	propertyId: string,
	unitCount: number,
	baseRent: number
): Promise<ActionResult<{ created: number }>> {
	try {
		// Validate inputs
		if (!z.string().uuid().safeParse(propertyId).success) {
			return {
				success: false,
				error: 'Invalid property ID'
			}
		}

		if (unitCount < 1 || unitCount > 100) {
			return {
				success: false,
				error: 'Unit count must be between 1 and 100'
			}
		}

		if (baseRent < 0) {
			return {
				success: false,
				error: 'Base rent must be positive'
			}
		}

		// Call backend API for batch creation
		const result = await apiClient.post<{ created: number }>(
			`/properties/${propertyId}/units/batch`,
			{ count: unitCount, baseRent }
		)

		// Revalidate caches
		revalidatePath(`/properties/${propertyId}`)
		revalidatePath('/units')
		revalidateTag(`property-${propertyId}`)
		revalidateTag('units')

		return {
			success: true,
			data: result
		}
	} catch (error) {
		console.error('Batch create units error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to create units'
		}
	}
}

/**
 * Calculate property metrics (occupancy, revenue, etc.)
 * Pure server-side calculation with caching
 */
export async function calculatePropertyMetricsAction(
	propertyId: string
): Promise<ActionResult<{
	occupancyRate: number
	monthlyRevenue: number
	potentialRevenue: number
	maintenanceCosts: number
}>> {
	try {
		// Validate ID
		if (!z.string().uuid().safeParse(propertyId).success) {
			return {
				success: false,
				error: 'Invalid property ID'
			}
		}

		const metrics = await apiClient.get<{
			occupancyRate: number
			monthlyRevenue: number
			potentialRevenue: number
			maintenanceCosts: number
		}>(`/properties/${propertyId}/metrics`, {
			next: { 
				revalidate: 60, // Cache for 1 minute
				tags: [`property-metrics-${propertyId}`]
			}
		})

		return {
			success: true,
			data: metrics
		}
	} catch (error) {
		console.error('Calculate property metrics error:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to calculate metrics'
		}
	}
}

// ============================================================================
// EXPORTS - Clean interface for server actions
// ============================================================================

export type {
	Property,
	PropertyStats,
	CreatePropertyInput,
	UpdatePropertyInput,
	PropertyQuery
}