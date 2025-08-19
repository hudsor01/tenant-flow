import { Module } from '@nestjs/common'
import { ZodValidationPipe } from './zod-validation.pipe'

/**
 * Native Validation Module
 * 
 * Provides NestJS native class-validator functionality.
 * Maintains the same module name for backward compatibility
 * but now uses class-validator instead of Zod.
 * 
 * Note: Removed @Global decorator - import this module where needed
 * to follow NestJS best practices for reduced global scope.
 */
@Module({
	providers: [ZodValidationPipe],
	exports: [ZodValidationPipe]
})
export class ZodValidationModule {}