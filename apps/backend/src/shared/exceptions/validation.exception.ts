import { BadRequestException } from '@nestjs/common'

export class ValidationException extends BadRequestException {
	constructor(message: string, details?: unknown) {
		super({ message, details })
	}
}
