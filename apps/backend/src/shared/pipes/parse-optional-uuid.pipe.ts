import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common'

/**
 * NestJS native pipe for optional UUID validation in query parameters
 * Ultra-native: Direct validation using built-in patterns, no abstraction
 */
@Injectable()
export class ParseOptionalUUIDPipe
	implements PipeTransform<string | undefined>
{
	private readonly uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

	transform(value: string | undefined): string | undefined {
		// Allow undefined/null values (optional parameter)
		if (!value) {
			return undefined
		}

		// Validate UUID format
		if (!this.uuidRegex.test(value)) {
			throw new BadRequestException('Invalid UUID format')
		}

		return value
	}
}
