/**
 * Simple Response Validator using Zod
 * NATIVE IMPLEMENTATION: Direct Zod usage without custom abstractions
 */
import type { ZodTypeAny } from 'zod'

export interface ValidationOptions {
	strict?: boolean
	stripUnknown?: boolean
}

export class ResponseValidator {
	static validate<T>(
		schema: ZodTypeAny,
		data: unknown,
		schemaName: string,
		_options?: ValidationOptions
	): T {
		try {
			// Use Zod directly - no custom abstraction needed
			const result = schema.parse(data)
			return result as T
		} catch (error) {
			console.error(`Validation failed for ${schemaName}:`, error)
			console.error('Data that failed validation:', data)
			throw new Error(`API response validation failed for ${schemaName}`)
		}
	}
}