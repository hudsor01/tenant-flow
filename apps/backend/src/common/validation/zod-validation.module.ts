import { Global, Module } from '@nestjs/common'
import { ZodValidationService } from './zod-validation.pipe'
import { ZodErrorMappingService } from './zod-error-mapping.service'
import { RuntimeTypeCheckerService } from './runtime-type-checker.service'

/**
 * Global Zod Validation Module
 * Provides comprehensive Zod validation services, error mapping, and runtime type checking
 * across the entire application
 */

@Global()
@Module({
	providers: [
		ZodValidationService,
		ZodErrorMappingService,
		RuntimeTypeCheckerService
	],
	exports: [
		ZodValidationService,
		ZodErrorMappingService,
		RuntimeTypeCheckerService
	]
})
export class ZodValidationModule {}
