/**
 * Limit Validation Pipe - Native NestJS Implementation
 * Replaces duplicate limit validation across controllers
 */

import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common'

@Injectable()
export class LimitValidationPipe implements PipeTransform {
	transform(value: unknown): number {
		// Default to 10 if not provided
		if (!value) return 10

		const limit = parseInt(String(value), 10)
		
		// Validate parsed value
		if (isNaN(limit)) {
			throw new BadRequestException('Limit must be a number')
		}
		
		if (limit < 1 || limit > 50) {
			throw new BadRequestException('Limit must be between 1 and 50')
		}
		
		return limit
	}
}