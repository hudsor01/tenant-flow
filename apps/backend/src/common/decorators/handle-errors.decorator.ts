import { ErrorHandlerService } from '../errors/error-handler.service'

/**
 * Method decorator for consistent error handling across service methods
 * Automatically wraps methods in try-catch and uses ErrorHandlerService
 *
 * @param resource - The resource name for error context
 * @param options - Additional error handling options
 */
export function HandleServiceErrors(
	resource?: string,
	options: {
		logLevel?: 'error' | 'warn' | 'info'
		includeStack?: boolean
		rethrow?: boolean
	} = {}
) {
	return function (
		_target: unknown,
		propertyName: string,
		descriptor: PropertyDescriptor
	) {
		const originalMethod = descriptor.value
		const isAsync = originalMethod.constructor.name === 'AsyncFunction'

		if (isAsync) {
			descriptor.value = async function (...args: unknown[]) {
				try {
					return await originalMethod.apply(this, args)
				} catch (error) {
					// Access the error handler from the service instance
					const errorHandler = (this as { errorHandler?: unknown })
						.errorHandler

					if (
						!errorHandler ||
						!(errorHandler instanceof ErrorHandlerService)
					) {
						// If no error handler is available, just rethrow
						throw error
					}

					// Build metadata from method arguments
					const metadata: Record<
						string,
						| string
						| number
						| boolean
						| null
						| undefined
						| string[]
						| Record<string, string | number | boolean | null>
					> = {}

					// Try to extract meaningful data from arguments
					if (args.length > 0) {
						// Common patterns in service methods
						if (typeof args[0] === 'string') {
							metadata.id = args[0] // Often the first arg is an ID
						} else if (
							typeof args[0] === 'object' &&
							args[0] !== null
						) {
							// First arg might be a DTO
							metadata.data = args[0] as Record<
								string,
								string | number | boolean | null
							>
						}

						// Check for owner ID (often second parameter)
						if (args.length > 1 && typeof args[1] === 'string') {
							metadata.ownerId = args[1]
						}
					}

					// Use errorHandler to process the error
					const handledError = errorHandler.handleErrorEnhanced(
						error as Error,
						{
							operation: propertyName,
							resource:
								resource ||
								(this as { entityName?: string }).entityName ||
								'unknown',
							metadata
						}
					)

					// Log based on specified level
					if (options.logLevel) {
						const logger = (
							this as {
								logger?: {
									error: (
										msg: string,
										stack?: unknown
									) => void
									warn: (msg: string) => void
									info: (msg: string) => void
								}
							}
						).logger
						if (logger) {
							const logMessage = `Error in ${propertyName}: ${(error as Error).message}`

							switch (options.logLevel) {
								case 'error':
									logger.error(
										logMessage,
										options.includeStack
											? (error as Error).stack
											: undefined
									)
									break
								case 'warn':
									logger.warn(logMessage)
									break
								case 'info':
									logger.info(logMessage)
									break
							}
						}
					}

					// Rethrow if specified or by default
					if (options.rethrow !== false) {
						throw handledError
					}

					return null // Return null if not rethrowing
				}
			}
		} else {
			// Handle synchronous methods
			descriptor.value = function (...args: unknown[]) {
				try {
					return originalMethod.apply(this, args)
				} catch (error) {
					const errorHandler = (this as { errorHandler?: unknown })
						.errorHandler

					if (
						!errorHandler ||
						!(errorHandler instanceof ErrorHandlerService)
					) {
						throw error
					}

					const metadata: Record<
						string,
						| string
						| number
						| boolean
						| null
						| undefined
						| string[]
						| Record<string, string | number | boolean | null>
					> = {}

					if (args.length > 0) {
						if (typeof args[0] === 'string') {
							metadata.id = args[0]
						} else if (
							typeof args[0] === 'object' &&
							args[0] !== null
						) {
							metadata.data = args[0] as Record<
								string,
								string | number | boolean | null
							>
						}
					}

					const handledError = errorHandler.handleErrorEnhanced(
						error as Error,
						{
							operation: propertyName,
							resource:
								resource ||
								(this as { entityName?: string }).entityName ||
								'unknown',
							metadata
						}
					)

					if (options.rethrow !== false) {
						throw handledError
					}

					return null
				}
			}
		}

		return descriptor
	}
}

/**
 * Class decorator that automatically applies error handling to all methods
 *
 * @param resource - The resource name for error context
 */
export function HandleAllErrors(resource?: string) {
	return function <T extends new (...args: unknown[]) => object>(
		constructor: T
	) {
		const prototype = constructor.prototype
		const propertyNames = Object.getOwnPropertyNames(prototype)

		propertyNames.forEach(name => {
			const descriptor = Object.getOwnPropertyDescriptor(prototype, name)

			// Skip constructor and non-method properties
			if (
				name === 'constructor' ||
				!descriptor ||
				typeof descriptor.value !== 'function'
			) {
				return
			}

			// Skip private methods (convention: start with _)
			if (name.startsWith('_')) {
				return
			}

			// Apply the error handling decorator
			HandleServiceErrors(resource)(prototype, name, descriptor)
			Object.defineProperty(prototype, name, descriptor)
		})

		return constructor
	}
}

/**
 * Parameter decorator to mark a parameter as the error handler
 * Useful for dependency injection
 */
export function InjectErrorHandler() {
	return function (
		target: unknown,
		_propertyKey: string | symbol | undefined,
		parameterIndex: number
	) {
		// Store metadata about the error handler parameter
		const existingTokens =
			Reflect.getMetadata(
				'custom:inject-error-handler',
				target as object
			) || []
		existingTokens.push(parameterIndex)
		Reflect.defineMetadata(
			'custom:inject-error-handler',
			existingTokens,
			target as object
		)
	}
}
