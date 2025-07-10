import { HttpException, HttpStatus } from '@nestjs/common'

/**
 * Generic error handler for controller operations
 * Standardizes error responses across all controllers
 */
export function handleControllerError(
	operation: string,
	defaultStatus: HttpStatus = HttpStatus.BAD_REQUEST
): (error: unknown) => never {
	return (error: unknown) => {
		// If it's already an HttpException, re-throw it
		if (error instanceof HttpException) {
			throw error
		}

		// Otherwise, wrap in a standardized HttpException
		const message = error instanceof Error ? error.message : 'Unknown error'
		throw new HttpException(
			`Failed to ${operation}: ${message}`,
			defaultStatus
		)
	}
}

/**
 * Generic error handler decorator for async controller methods
 * Usage: @HandleErrors('create user')
 */
export function HandleErrors(operation: string, status?: HttpStatus) {
	return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
		const method = descriptor.value
		descriptor.value = async function (...args: unknown[]) {
			try {
				return await method.apply(this, args)
			} catch (error) {
				handleControllerError(operation, status)(error)
			}
		}
	}
}

/**
 * Async wrapper that handles errors for operations
 * Usage: await handleAsync(() => service.createUser(data), 'create user')
 */
export async function handleAsync<T>(
	operation: () => Promise<T>,
	operationName: string,
	defaultStatus?: HttpStatus
): Promise<T> {
	try {
		return await operation()
	} catch (error) {
		handleControllerError(operationName, defaultStatus)(error)
		// This line will never be reached but satisfies TypeScript
		throw error
	}
}