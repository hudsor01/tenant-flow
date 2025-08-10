/**
 * Environment Variable Validator
 * Ensures all required environment variables are properly configured
 */

import { Logger } from '@nestjs/common'

interface EnvConfig {
  required: string[]
  optional: string[]
  development?: string[]
  production?: string[]
  test?: string[]
}

export class EnvValidator {
  private static readonly logger = new Logger('EnvValidator')

  private static readonly config: EnvConfig = {
    required: [
      // Database
      'DATABASE_URL',
      
      // Supabase
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_JWT_SECRET',
      
      // Application
      'NODE_ENV',
      'PORT',
    ],
    optional: [
      // Stripe
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'STRIPE_STARTER_MONTHLY',
      'STRIPE_STARTER_ANNUAL',
      'STRIPE_GROWTH_MONTHLY',
      'STRIPE_GROWTH_ANNUAL',
      'STRIPE_TENANTFLOW_MAX_MONTHLY',
      'STRIPE_TENANTFLOW_MAX_ANNUAL',
      
      // Email
      'RESEND_API_KEY',
      'FROM_EMAIL',
      
      // URLs
      'FRONTEND_URL',
      'API_URL',
      
      // CORS
      'CORS_ORIGINS',
      'ALLOW_LOCALHOST_CORS',
      
      // Monitoring
      'SENTRY_DSN',
      'LOG_LEVEL',
      
      // Analytics
      'POSTHOG_API_KEY',
      
      // Cache
      'REDIS_URL',
      
      // Timeouts
      'API_TIMEOUT',
      'DATABASE_QUERY_TIMEOUT',
      'CHECKOUT_SESSION_TIMEOUT',
      
      // Rate Limiting
      'RATE_LIMIT_WINDOW',
      'RATE_LIMIT_MAX_REQUESTS',
    ],
    development: [
      'ALLOW_LOCALHOST_CORS',
    ],
    production: [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'RESEND_API_KEY',
    ],
    test: [
      'TEST_MODE',
    ]
  }

  /**
   * Validate environment variables on application startup
   */
  static validate(): void {
    const env = process.env.NODE_ENV || 'development'
    const errors: string[] = []
    const warnings: string[] = []
    const info: string[] = []

    // Check required variables
    for (const key of this.config.required) {
      if (!process.env[key]) {
        errors.push(`Missing required environment variable: ${key}`)
      }
    }

    // Check environment-specific required variables
    if (env === 'production' && this.config.production) {
      for (const key of this.config.production) {
        if (!process.env[key]) {
          errors.push(`Missing required production environment variable: ${key}`)
        }
      }
    }

    // Check optional variables and provide warnings
    for (const key of this.config.optional) {
      if (!process.env[key]) {
        // Only warn for critical optional variables in production
        if (env === 'production' && this.config.production?.includes(key)) {
          warnings.push(`Missing recommended environment variable for production: ${key}`)
        } else if (env === 'development') {
          info.push(`Optional environment variable not set: ${key}`)
        }
      }
    }

    // Validate specific variable formats
    this.validateUrls(errors)
    this.validatePorts(errors)
    this.validateTimeouts(warnings)
    this.validateSecrets(errors, env)

    // Log results
    if (info.length > 0 && env === 'development') {
      this.logger.debug('Environment configuration info:')
      info.forEach(msg => this.logger.debug(`  ℹ️  ${msg}`))
    }

    if (warnings.length > 0) {
      this.logger.warn('Environment configuration warnings:')
      warnings.forEach(msg => this.logger.warn(`  ⚠️  ${msg}`))
    }

    if (errors.length > 0) {
      this.logger.error('Environment configuration errors:')
      errors.forEach(msg => this.logger.error(`  ❌ ${msg}`))
      
      if (env === 'production') {
        throw new Error('Environment validation failed. Please fix the errors above.')
      } else {
        this.logger.warn('Continuing despite errors (non-production environment)')
      }
    } else {
      this.logger.log('✅ Environment configuration validated successfully')
    }

    // Log environment summary
    this.logEnvironmentSummary(env)
  }

  private static validateUrls(errors: string[]): void {
    const urlKeys = ['DATABASE_URL', 'SUPABASE_URL', 'FRONTEND_URL', 'API_URL', 'REDIS_URL']
    
    for (const key of urlKeys) {
      const value = process.env[key]
      if (value && !this.isValidUrl(value)) {
        errors.push(`Invalid URL format for ${key}: ${value}`)
      }
    }

    // Special validation for database URL
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
      errors.push('DATABASE_URL must be a PostgreSQL connection string')
    }
  }

  private static validatePorts(errors: string[]): void {
    const portKeys = ['PORT', 'FRONTEND_PORT']
    
    for (const key of portKeys) {
      const value = process.env[key]
      if (value) {
        const port = parseInt(value, 10)
        if (isNaN(port) || port < 1 || port > 65535) {
          errors.push(`Invalid port number for ${key}: ${value}`)
        }
      }
    }
  }

  private static validateTimeouts(warnings: string[]): void {
    const timeoutKeys = [
      'API_TIMEOUT',
      'DATABASE_QUERY_TIMEOUT',
      'CHECKOUT_SESSION_TIMEOUT',
      'WEBHOOK_PROCESSING_TIMEOUT'
    ]
    
    for (const key of timeoutKeys) {
      const value = process.env[key]
      if (value) {
        const timeout = parseInt(value, 10)
        if (isNaN(timeout) || timeout < 0) {
          warnings.push(`Invalid timeout value for ${key}: ${value}`)
        }
        if (timeout > 60000) {
          warnings.push(`Very high timeout value for ${key}: ${timeout}ms`)
        }
      }
    }
  }

  private static validateSecrets(errors: string[], env: string): void {
    // Check for exposed secrets in non-production
    if (env !== 'production') {
      const secretKeys = [
        'SUPABASE_SERVICE_ROLE_KEY',
        'STRIPE_SECRET_KEY',
        'JWT_SECRET',
        'SUPABASE_JWT_SECRET'
      ]
      
      for (const key of secretKeys) {
        const value = process.env[key]
        if (value && (
          value.includes('your-') ||
          value.includes('test-') ||
          value.includes('example') ||
          value === 'secret'
        )) {
          errors.push(`${key} appears to contain a placeholder value: ${value.substring(0, 20)}...`)
        }
      }
    }

    // Ensure Stripe keys match environment
    if (env === 'production') {
      if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
        errors.push('Using test Stripe key in production environment')
      }
    }
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      // PostgreSQL URLs might not be standard URLs
      return url.startsWith('postgresql://') || url.startsWith('postgres://')
    }
  }

  private static logEnvironmentSummary(env: string): void {
    const summary = {
      environment: env,
      port: process.env.PORT || 'not set',
      database: process.env.DATABASE_URL ? '✓ configured' : '✗ not configured',
      supabase: process.env.SUPABASE_URL ? '✓ configured' : '✗ not configured',
      stripe: process.env.STRIPE_SECRET_KEY ? '✓ configured' : '✗ not configured',
      email: process.env.RESEND_API_KEY ? '✓ configured' : '✗ not configured',
      redis: process.env.REDIS_URL ? '✓ configured' : '✗ not configured',
      cors: process.env.CORS_ORIGINS ? '✓ configured' : '✗ using defaults',
    }

    this.logger.log('Environment Summary:')
    Object.entries(summary).forEach(([key, value]) => {
      this.logger.log(`  ${key}: ${value}`)
    })
  }

  /**
   * Get typed environment variable with fallback
   */
  static get<T = string>(key: string, defaultValue?: T): T {
    const value = process.env[key]
    
    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue
      }
      throw new Error(`Environment variable ${key} is not defined`)
    }

    // Type conversion based on default value type
    if (typeof defaultValue === 'number') {
      return parseInt(value, 10) as T
    }
    
    if (typeof defaultValue === 'boolean') {
      return (value === 'true') as T
    }
    
    return value as T
  }

  /**
   * Get required environment variable (throws if not found)
   */
  static getRequired(key: string): string {
    const value = process.env[key]
    if (!value) {
      throw new Error(`Required environment variable ${key} is not defined`)
    }
    return value
  }

  /**
   * Get optional environment variable with default
   */
  static getOptional(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue
  }

  /**
   * Parse comma-separated environment variable into array
   */
  static getArray(key: string, defaultValue: string[] = []): string[] {
    const value = process.env[key]
    if (!value) return defaultValue
    return value.split(',').map(item => item.trim()).filter(Boolean)
  }
}