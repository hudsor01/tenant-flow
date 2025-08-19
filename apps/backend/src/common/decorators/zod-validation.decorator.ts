import { applyDecorators, UsePipes } from '@nestjs/common'
import { ApiBody, ApiResponse } from '@nestjs/swagger'
import type { ZodSchema } from 'zod'
import { ZodValidationPipe } from '../validation/zod-validation.pipe'

/**
 * Zod Validation Decorators
 * Provides easy-to-use decorators for applying Zod validation to NestJS controllers
 */

/**
 * Apply Zod validation to controller method body
 * @deprecated Use NestJS ValidationPipe with DTO classes instead
 */
export function ZodBody(_schema: ZodSchema) {
	return applyDecorators(
		UsePipes(new ZodValidationPipe()),
		ApiBody({
			description: 'Request body validation powered by NestJS ValidationPipe',
			required: true
		})
	)
}

/**
 * Apply Zod validation to query parameters
 * @deprecated Use NestJS ValidationPipe with DTO classes instead
 */
export function ZodQuery(_schema: ZodSchema) {
	return applyDecorators(UsePipes(new ZodValidationPipe()))
}

/**
 * Apply Zod validation to path parameters
 * @deprecated Use NestJS ValidationPipe with DTO classes instead
 */
export function ZodParam(_schema: ZodSchema) {
	return applyDecorators(UsePipes(new ZodValidationPipe()))
}

/**
 * Combined decorator for full request validation
 */
export function ZodValidation(options: {
	body?: ZodSchema
	query?: ZodSchema
	params?: ZodSchema
}) {
	const decorators: MethodDecorator[] = []

	if (options.body) {
		decorators.push(UsePipes(new ZodValidationPipe()))
		decorators.push(
			ApiBody({
				description: 'Request body validation powered by NestJS ValidationPipe',
				required: true
			})
		)
	}

	if (options.query) {
		decorators.push(UsePipes(new ZodValidationPipe()))
	}

	if (options.params) {
		decorators.push(UsePipes(new ZodValidationPipe()))
	}

	decorators.push(
		ApiResponse({
			status: 400,
			description: 'Validation Error',
			schema: {
				type: 'object',
				properties: {
					message: { type: 'string' },
					code: { type: 'string' },
					statusCode: { type: 'number' },
					details: {
						type: 'object',
						properties: {
							validationErrors: {
								type: 'array',
								items: {
									type: 'object',
									properties: {
										field: { type: 'string' },
										message: { type: 'string' },
										code: { type: 'string' }
									}
								}
							}
						}
					}
				}
			}
		})
	)

	return applyDecorators(...decorators)
}

/**
 * Method decorator for service-level validation
 */
export function ValidateInput(schema: ZodSchema, paramIndex = 0) {
	return function (
		target: object,
		propertyName: string,
		descriptor: PropertyDescriptor
	) {
		const originalMethod = descriptor.value

		descriptor.value = function (...args: unknown[]) {
			if (args[paramIndex] !== undefined) {
				try {
					args[paramIndex] = schema.parse(args[paramIndex])
				} catch (error) {
					// Re-throw with context
					if (error instanceof Error) {
						error.message = `Validation failed in ${target.constructor.name}.${propertyName}: ${error.message}`
					}
					throw error
				}
			}
			return originalMethod.apply(this, args)
		}

		return descriptor
	}
}

/**
 * Class decorator to validate all method inputs
 */
export function ValidateAllInputs(schemaMap: Record<string, ZodSchema>) {
	return function <T extends new (...args: unknown[]) => object>(
		constructor: T
	) {
		for (const [methodName, schema] of Object.entries(schemaMap)) {
			const originalMethod = constructor.prototype[methodName]

			if (typeof originalMethod === 'function') {
				constructor.prototype[methodName] = function (
					...args: unknown[]
				) {
					if (args[0] !== undefined) {
						try {
							args[0] = schema.parse(args[0])
						} catch (error) {
							if (error instanceof Error) {
								error.message = `Validation failed in ${constructor.name}.${methodName}: ${error.message}`
							}
							throw error
						}
					}
					return originalMethod.apply(this, args)
				}
			}
		}
		return constructor
	}
}

/**
 * Property decorator for validating class properties
 */
export function ZodProperty(schema: ZodSchema) {
	return function (target: object, propertyKey: string) {
		let value: unknown

		const getter = () => value
		const setter = (newValue: unknown) => {
			value = schema.parse(newValue)
		}

		Object.defineProperty(target, propertyKey, {
			get: getter,
			set: setter,
			enumerable: true,
			configurable: true
		})
	}
}

/**
 * Async validation decorator for methods that return promises
 */
export function AsyncValidateInput(schema: ZodSchema, paramIndex = 0) {
	return function (
		target: object,
		propertyName: string,
		descriptor: PropertyDescriptor
	) {
		const originalMethod = descriptor.value

		descriptor.value = async function (...args: unknown[]) {
			if (args[paramIndex] !== undefined) {
				try {
					args[paramIndex] = schema.parse(args[paramIndex])
				} catch (error) {
					if (error instanceof Error) {
						error.message = `Async validation failed in ${target.constructor.name}.${propertyName}: ${error.message}`
					}
					throw error
				}
			}
			return originalMethod.apply(this, args)
		}

		return descriptor
	}
}

/**
 * Decorator for validating method output
 */
export function ValidateOutput(schema: ZodSchema) {
	return function (
		target: object,
		propertyName: string,
		descriptor: PropertyDescriptor
	) {
		const originalMethod = descriptor.value

		descriptor.value = async function (...args: unknown[]) {
			const result = await originalMethod.apply(this, args)

			try {
				return schema.parse(result)
			} catch (error) {
				if (error instanceof Error) {
					error.message = `Output validation failed in ${target.constructor.name}.${propertyName}: ${error.message}`
				}
				throw error
			}
		}

		return descriptor
	}
}

/**
 * Combined input/output validation decorator
 */
export function ValidateInputOutput(options: {
	input?: ZodSchema
	output?: ZodSchema
	inputIndex?: number
}) {
	return function (
		target: object,
		propertyName: string,
		descriptor: PropertyDescriptor
	) {
		const originalMethod = descriptor.value
		const inputIndex = options.inputIndex ?? 0

		descriptor.value = async function (...args: unknown[]) {
			// Validate input
			if (options.input && args[inputIndex] !== undefined) {
				try {
					args[inputIndex] = options.input.parse(args[inputIndex])
				} catch (error) {
					if (error instanceof Error) {
						error.message = `Input validation failed in ${target.constructor.name}.${propertyName}: ${error.message}`
					}
					throw error
				}
			}

			// Execute method
			const result = await originalMethod.apply(this, args)

			// Validate output
			if (options.output) {
				try {
					return options.output.parse(result)
				} catch (error) {
					if (error instanceof Error) {
						error.message = `Output validation failed in ${target.constructor.name}.${propertyName}: ${error.message}`
					}
					throw error
				}
			}

			return result
		}

		return descriptor
	}
}
