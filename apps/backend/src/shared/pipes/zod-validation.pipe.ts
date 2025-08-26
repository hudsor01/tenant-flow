/**
 * Zod Validation Pipe - Native NestJS implementation
 *
 * Following CLAUDE.md principles:
 * - Use native NestJS features directly
 * - Use shared Zod schemas as single source of truth
 * - No custom abstractions or wrappers
 */

import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common'
import type { ZodSchema } from 'zod'
import { ZodError } from 'zod'

@Injectable()
export class ZodValidationPipe implements PipeTransform {
	constructor(private schema: ZodSchema) {}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	transform(value: any) {
		try {
			return this.schema.parse(value)
		} catch (error) {
			if (error instanceof ZodError) {
				const messages = error.issues.map(
					(err: any) => `${err.path.join('.')}: ${err.message}`
				)
				throw new BadRequestException(
					`Validation failed: ${messages.join(', ')}`
				)
			}
			throw new BadRequestException('Validation failed')
		}
	}
}
