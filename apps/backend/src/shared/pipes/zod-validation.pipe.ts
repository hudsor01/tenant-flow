/**
 * Zod Validation Pipe - Native NestJS implementation
 *
 * Following CLAUDE.md principles:
 * - Use native NestJS features directly
 * - Use shared Zod schemas as single source of truth
 * - No custom abstractions or wrappers
 */

import { PipeTransform, Injectable, BadRequestException, Logger } from '@nestjs/common'
import type { ZodSchema } from 'zod'
import { ZodError } from 'zod'

@Injectable()
export class ZodValidationPipe implements PipeTransform {
	private readonly logger = new Logger(ZodValidationPipe.name)

	constructor(private schema: ZodSchema) {}

	transform(value: unknown) {
		try {
			return this.schema.parse(value)
		} catch (error) {
			if (error instanceof ZodError) {
				const messages = error.issues.map(
					(err) => `${err.path.join('.')}: ${err.message}`
				)
				this.logger.debug('Zod validation failed', {
					operation: 'zod_validation',
					errorCount: error.issues.length,
					errorPaths: error.issues.map(err => err.path.join('.')),
					errorCodes: error.issues.map(err => err.code),
					valueType: typeof value,
					hasValue: value !== undefined && value !== null
				})
				throw new BadRequestException(
					`Validation failed: ${messages.join(', ')}`
				)
			}
			this.logger.error('Unexpected validation error occurred', {
				operation: 'zod_validation_unexpected',
				errorType: error instanceof Error ? error.constructor.name : 'Unknown',
				errorMessage: error instanceof Error ? error.message : String(error),
				valueType: typeof value
			})
			throw new BadRequestException('Validation failed')
		}
	}
}
