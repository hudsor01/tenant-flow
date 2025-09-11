import { Global, Module } from '@nestjs/common'
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
 */
@Global()
@Module({
	imports: [],
	providers: [TokenValidationService, UsageLimitsGuard, AuthGuard],
	exports: [TokenValidationService, UsageLimitsGuard, AuthGuard]
})
export class SharedModule {}
