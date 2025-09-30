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
		super(
			{
				message,
				error: 'Business Rule Violation',
				code,
				details
			},
			status
		)

		this.code = code
		this.details = details
	}
}
