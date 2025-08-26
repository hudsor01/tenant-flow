/**
 * Runtime API Response Validation using Zod
 * Ensures all API responses match expected schemas
 */

<<<<<<< HEAD
import { z, type ZodTypeAny, ZodError } from 'zod'
import { logger } from '@/lib/logger/logger'
=======
import { z, type ZodSchema, ZodError } from 'zod'
import { logger } from '@/lib/logger'
>>>>>>> origin/main

export class ApiResponseValidationError extends Error {
	constructor(
		public schema: string,
		public validationErrors: ZodError,
		public rawResponse: unknown
	) {
		super(
			`API response validation failed for ${schema}: ${validationErrors.message}`
		)
		this.name = 'ApiResponseValidationError'
	}
}

export interface ValidationOptions {
	throwOnFailure?: boolean
	logErrors?: boolean
	schema?: string
}

export class ResponseValidator {
	/**
	 * Validate API response against Zod schema
	 */
	static validate<T>(
<<<<<<< HEAD
		schema: ZodTypeAny,
=======
		schema: ZodSchema<T>,
>>>>>>> origin/main
		data: unknown,
		schemaName: string,
		options: ValidationOptions = {}
	): T {
		const {
			throwOnFailure = true,
			logErrors = true,
			schema: schemaLabel
		} = options

		try {
			// Parse and validate the data
<<<<<<< HEAD
			const result = schema.parse(data) as T
=======
			const result = schema.parse(data)
>>>>>>> origin/main

			// Log successful validation in development
			if (process.env.NODE_ENV === 'development') {
				logger.debug('API response validation successful', {
					schema: schemaLabel || schemaName,
					dataType: typeof data
				})
			}

			return result
		} catch (error) {
			if (error instanceof ZodError) {
				const validationError = new ApiResponseValidationError(
					schemaLabel || schemaName,
					error,
					data
				)

				if (logErrors) {
					console.error('API response validation failed', {
						error: validationError.message,
						schema: schemaLabel || schemaName,
						errors: error.issues,
						receivedData: data,
						expectedShape: this.describeSchema(schema)
					})
				}

				if (throwOnFailure) {
					throw validationError
				}

				// Return raw data if not throwing
				return data as T
			}

			// Re-throw non-Zod errors
			throw error
		}
	}

	/**
	 * Create a safe validator that doesn't throw but logs issues
	 */
<<<<<<< HEAD
	static createSafeValidator<T>(schema: ZodTypeAny, schemaName: string) {
=======
	static createSafeValidator<T>(schema: ZodSchema<T>, schemaName: string) {
>>>>>>> origin/main
		return (data: unknown): T => {
			return this.validate(schema, data, schemaName, {
				throwOnFailure: false,
				logErrors: true
			})
		}
	}

	/**
	 * Validate array responses
	 */
	static validateArray<T>(
<<<<<<< HEAD
		itemSchema: ZodTypeAny,
=======
		itemSchema: ZodSchema<T>,
>>>>>>> origin/main
		data: unknown,
		schemaName: string,
		options: ValidationOptions = {}
	): T[] {
		const arraySchema = z.array(itemSchema)
		return this.validate(arraySchema, data, `${schemaName}[]`, options)
	}

	/**
	 * Validate optional/nullable responses
	 */
	static validateOptional<T>(
<<<<<<< HEAD
		schema: ZodTypeAny,
=======
		schema: ZodSchema<T>,
>>>>>>> origin/main
		data: unknown,
		schemaName: string,
		options: ValidationOptions = {}
	): T | null {
		const optionalSchema = schema.nullable()
		return this.validate(optionalSchema, data, `${schemaName}?`, options)
	}

	/**
	 * Describe schema shape for error reporting
	 */
<<<<<<< HEAD
	private static describeSchema(schema: ZodTypeAny): Record<string, string> {
=======
	private static describeSchema(schema: ZodSchema): Record<string, string> {
>>>>>>> origin/main
		try {
			// Try to get schema shape description
			if ('_def' in schema) {
				const def = schema._def as {
					shape?: () => Record<
						string,
						{ _def?: { typeName?: string } }
					>
				}
				if (def.shape) {
					const shapeFunction = def.shape
					const shape: Record<string, string> = {}
					Object.keys(shapeFunction()).forEach(key => {
						const fieldSchema = shapeFunction()[key]
						shape[key] = fieldSchema?._def?.typeName || 'unknown'
					})
					return shape
				}
			}
			return { type: 'schema shape not available' }
		} catch {
			return { type: 'unknown schema' }
		}
	}

	/**
	 * Extract validation error messages for user display
	 */
	static getValidationErrorMessages(
		error: ApiResponseValidationError
	): string[] {
		return error.validationErrors.issues.map(err => {
			const path = err.path.length > 0 ? err.path.join('.') : 'root'
			return `${path}: ${err.message}`
		})
	}

	/**
	 * Check if error is a validation error
	 */
	static isValidationError(
		error: unknown
	): error is ApiResponseValidationError {
		return error instanceof ApiResponseValidationError
	}
}

/**
 * Common validation patterns
 */
export const commonValidators = {
	/**
	 * Standard API response wrapper
	 */
<<<<<<< HEAD
	apiResponse: (dataSchema: ZodTypeAny) =>
=======
	apiResponse: <T>(dataSchema: ZodSchema<T>) =>
>>>>>>> origin/main
		z.object({
			success: z.boolean(),
			data: dataSchema,
			message: z.string().optional(),
			timestamp: z.string().optional()
		}),

	/**
	 * Paginated response
	 */
<<<<<<< HEAD
	paginatedResponse: (itemSchema: ZodTypeAny) =>
=======
	paginatedResponse: <T>(itemSchema: ZodSchema<T>) =>
>>>>>>> origin/main
		z.object({
			items: z.array(itemSchema),
			total: z.number(),
			page: z.number(),
			limit: z.number(),
			hasNext: z.boolean().optional(),
			hasPrev: z.boolean().optional()
		}),

	/**
	 * Error response
	 */
	errorResponse: z.object({
		success: z.literal(false),
		message: z.string(),
		code: z.string().optional(),
		details: z.record(z.string(), z.unknown()).optional()
	}),

	/**
	 * ID response for creation operations
	 */
	idResponse: z.object({
		id: z.string(),
		message: z.string().optional()
	}),

	/**
	 * Boolean success response
	 */
	successResponse: z.object({
		success: z.boolean(),
		message: z.string().optional()
	})
} as const

/**
 * Type-safe validator factory
 */
<<<<<<< HEAD
export function createValidator(schema: ZodTypeAny, name: string) {
=======
export function createValidator<T>(schema: ZodSchema<T>, name: string) {
>>>>>>> origin/main
	return {
		validate: (data: unknown, options?: ValidationOptions) =>
			ResponseValidator.validate(schema, data, name, options),

		validateSafe: ResponseValidator.createSafeValidator(schema, name),

		validateArray: (data: unknown, options?: ValidationOptions) =>
			ResponseValidator.validateArray(schema, data, name, options),

		validateOptional: (data: unknown, options?: ValidationOptions) =>
			ResponseValidator.validateOptional(schema, data, name, options)
	}
}

export default ResponseValidator
