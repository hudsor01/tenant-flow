/**
 * Next.js Server Actions for Form Validation
 * Secure server-side validation before API calls
 */

'use server'

import { z } from 'zod'

/**
 * Generic server action for form validation
 * Returns validation errors or success
 */
export async function validateForm<T>(
	schema: z.ZodSchema<T>,
	data: unknown
): Promise<
	| { success: true; data: T }
	| { success: false; errors: Record<string, string[]> }
> {
	try {
		const validated = await schema.parseAsync(data)
		return { success: true, data: validated }
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errors: Record<string, string[]> = {}
			error.issues.forEach(err => {
				const path = err.path.join('.')
				if (!errors[path]) {
					errors[path] = []
				}
				errors[path].push(err.message)
			})
			return { success: false, errors }
		}
		return {
			success: false,
			errors: { _form: ['Validation failed'] }
		}
	}
}

/**
 * Server action for async field validation
 * Useful for checking uniqueness, availability, etc.
 */
export async function validateField<T>(
	schema: z.ZodSchema<T>,
	fieldName: string,
	value: unknown
): Promise<{ valid: boolean; error?: string }> {
	try {
		await schema.parseAsync(value)
		return { valid: true }
	} catch (error) {
		if (error instanceof z.ZodError) {
			const fieldError = error.issues.find(err => err.path.includes(fieldName))
			return {
				valid: false,
				error: fieldError?.message || 'Validation failed'
			}
		}
		return { valid: false, error: 'Validation failed' }
	}
}

/**
 * Server action for batch field validation
 * Validates multiple fields at once
 */
export async function validateFields<T>(
	schema: z.ZodSchema<T>,
	data: Partial<T>
): Promise<Record<string, { valid: boolean; error?: string }>> {
	const results: Record<string, { valid: boolean; error?: string }> = {}

	try {
		await schema.parseAsync(data)
		// All fields valid
		Object.keys(data).forEach(key => {
			results[key] = { valid: true }
		})
	} catch (error) {
		if (error instanceof z.ZodError) {
			// Mark all fields as checked
			Object.keys(data).forEach(key => {
				results[key] = { valid: true }
			})
			// Override with errors
			error.issues.forEach(err => {
				const path = err.path.join('.')
				results[path] = { valid: false, error: err.message }
			})
		}
	}

	return results
}
