import { Global, Module } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { UsageLimitsGuard } from './guards/usage-limits.guard'
import { AuthGuard } from './guards/auth.guard'
import { TokenValidationService } from './services/token-validation.service'

/**
 * Shared Module - Provides shared services and guards
 * across the entire backend application
 * 
 * Contains:
 * - TokenValidationService: Ultra-native token validation without circular dependencies
 * - AuthGuard: JWT authentication and role-based access control
 * - UsageLimitsGuard: Rate limiting and usage enforcement
 * - Reflector: NestJS metadata reflection service for guards
 */
@Global()
@Module({
	imports: [],
	providers: [Reflector, TokenValidationService, UsageLimitsGuard, AuthGuard],
	exports: [Reflector, TokenValidationService, UsageLimitsGuard, AuthGuard]
})
export class SharedModule {}
