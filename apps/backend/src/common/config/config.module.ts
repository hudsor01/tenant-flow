import { Global, Module } from '@nestjs/common'
import { ConfigModule as NestConfigModule } from '@nestjs/config'
import { TypeSafeConfigService } from './config.service'
import { configSchema } from './config.schema'

/**
 * Configuration Module with Zod validation
 * 
 * This module provides:
 * - Global configuration service with type safety
 * - Zod-based validation of environment variables
 * - Derived configuration objects for better organization
 */

// Validation function for NestJS ConfigModule
export function validateConfig(config: Record<string, unknown>) {
  const result = configSchema.safeParse(config)
  
  if (!result.success) {
    // Format validation errors for better readability
    const errorMessages = result.error.issues.map((error) => {
      const path = error.path.join('.')
      return `${path}: ${error.message}`
    })
    
    const errorMessage = `Configuration validation failed:\n${errorMessages.join('\n')}`
    throw new Error(errorMessage)
  }
  
  return result.data
}

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      // In production, don't look for .env files - use runtime environment variables
      // In development, use .env.local for local testing
      // CRITICAL: Check NODE_ENV early and default to production if not set
      envFilePath: (process.env.NODE_ENV || 'production') === 'production' ? [] : ['.env.local', '.env'],
      ignoreEnvFile: (process.env.NODE_ENV || 'production') === 'production', // Explicitly ignore in production
      validate: validateConfig,
      validationOptions: {
        allowUnknown: true, // Allow extra env vars not in schema
        abortEarly: false   // Show all validation errors at once
      },
      expandVariables: true // Support variable expansion like ${VAR}
    })
  ],
  providers: [TypeSafeConfigService],
  exports: [TypeSafeConfigService]
})
export class TypeSafeConfigModule {
  /**
   * Type-Safe Configuration Module
   * 
   * This module replaces the standard ConfigModule with enhanced type safety:
   * - Runtime validation using Zod schemas
   * - Type-safe configuration access throughout the application
   * - Better error messages for configuration issues
   * - Derived configuration objects for organized access
   * 
   * Usage:
   * ```typescript
   * constructor(private readonly config: TypeSafeConfigService) {}
   * 
   * // Type-safe access
   * const dbConfig = this.config.database
   * const isProduction = this.config.isProduction
   * ```
   */
}