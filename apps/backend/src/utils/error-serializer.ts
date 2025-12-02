/**
 * Serializes an error for logging purposes.
 * NestJS Logger doesn't properly serialize objects in the context parameter,
 * so we need to convert errors to a string that displays correctly in logs.
 */
export function serializeError(error: unknown): string {
	if (error instanceof Error) {
		return `${error.name}: ${error.message}`
	}
	if (typeof error === 'object' && error !== null) {
		return JSON.stringify(error)
	}
	return String(error)
}

/**
 * Formats an error for NestJS Logger.
 * NestJS Logger only accepts (message, trace?, context?) - object params don't work.
 * Use this to include error details in the message:
 *   this.logger.error(logError('Failed to query', error))
 */
export function logError(message: string, error: unknown): string {
	return `${message}: ${serializeError(error)}`
}
