import {
	BadRequestException,
	Injectable,
	ValidationPipe
} from '@nestjs/common'

/**
 * Native NestJS Validation Pipe
 * 
 * Replaces Zod validation with NestJS native class-validator.
 * This file maintains the same name for compatibility but now uses
 * class-validator instead of Zod.
 * 
 * @see https://docs.nestjs.com/techniques/validation
 * @see https://docs.nestjs.com/pipes#class-validator
 */
@Injectable()
export class ZodValidationPipe extends ValidationPipe {
	constructor() {
		super({
			whitelist: true, // Strip properties that don't have decorators
			forbidNonWhitelisted: true, // Throw error on non-whitelisted properties
			transform: true, // Auto-transform payloads to DTO instances
			transformOptions: {
				enableImplicitConversion: true // Allow implicit type conversion
			},
			exceptionFactory: (errors) => {
				// Format validation errors consistently
				const formattedErrors = errors.reduce((acc, error) => {
					const property = error.property
					const constraints = error.constraints || {}
					
					acc[property] = Object.values(constraints)
					return acc
				}, {} as Record<string, string[]>)
				
				return new BadRequestException({
					statusCode: 400,
					message: 'Validation failed',
					errors: formattedErrors
				})
			}
		})
	}
}

// Export for backward compatibility
export { ZodValidationPipe as NativeValidationPipe }