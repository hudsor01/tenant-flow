import { HttpException, HttpStatus } from '@nestjs/common'
import type { BusinessErrorCode } from '@repo/shared/types/errors'

/**
 * Business Exception for domain-specific errors
 * Following CLAUDE.md RULE #3: No abstractions - direct NestJS usage only
 *
 * Simple exception class that extends NestJS HttpException
 */
export class BusinessException extends HttpException {
	public readonly code: BusinessErrorCode
	public readonly details?: Record<string, unknown>

	constructor(
		code: BusinessErrorCode,
		message: string,
		status: HttpStatus = HttpStatus.BAD_REQUEST,
		details?: Record<string, unknown>
	) {
		const responseBody: {
			message: string
			error: string
			code: BusinessErrorCode
			details?: Record<string, unknown>
		} = {
			message,
			error: 'Business Rule Violation',
			code
		}

		// Only assign details if provided
		if (details !== undefined) {
			responseBody.details = details
		}

		super(responseBody, status)

		this.code = code
		if (details !== undefined) {
			this.details = details
		}
	}
}
