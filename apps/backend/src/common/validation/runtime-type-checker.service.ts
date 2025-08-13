import { Injectable, Logger } from '@nestjs/common'
import { ZodSchema, ZodError } from 'zod'
import { ZodErrorMappingService } from './zod-error-mapping.service'

/**
 * Runtime Type Checker Service
 * Provides runtime type validation with comprehensive error handling and logging
 */

interface TypeCheckOptions {
  throwOnError?: boolean
  logErrors?: boolean
  context?: string
  includeStackTrace?: boolean
}

interface TypeCheckResult<T> {
  valid: boolean
  data?: T
  errors?: {field: string; message: string; code: string}[]
  context?: string
}

@Injectable()
export class RuntimeTypeCheckerService {
  private readonly logger = new Logger(RuntimeTypeCheckerService.name)

  constructor(private readonly errorMapper: ZodErrorMappingService) {}

  /**
   * Validate data at runtime with comprehensive error handling
   */
  check<T>(
    schema: ZodSchema<T>, 
    data: unknown, 
    options: TypeCheckOptions = {}
  ): TypeCheckResult<T> {
    const { throwOnError = false, logErrors = true, context, includeStackTrace = false } = options

    try {
      const validatedData = schema.parse(data)
      
      if (logErrors && context) {
        this.logger.debug(`✓ Type check passed for ${context}`)
      }

      return {
        valid: true,
        data: validatedData,
        context
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const mappedErrors = this.errorMapper.mapZodError(error, { includeValues: true })
        
        if (logErrors) {
          const errorMessage = `✗ Type check failed${context ? ` for ${context}` : ''}: ${mappedErrors.map(e => `${e.field}: ${e.message}`).join(', ')}`
          
          if (includeStackTrace) {
            this.logger.error(errorMessage, error.stack)
          } else {
            this.logger.warn(errorMessage)
          }
        }

        if (throwOnError) {
          throw this.errorMapper.toValidationException(error, context)
        }

        return {
          valid: false,
          errors: mappedErrors,
          context
        }
      }

      // Non-Zod error
      const errorMessage = `Unexpected error during type checking${context ? ` for ${context}` : ''}: ${error instanceof Error ? error.message : String(error)}`
      
      if (logErrors) {
        this.logger.error(errorMessage, includeStackTrace ? (error as Error).stack : undefined)
      }

      if (throwOnError) {
        throw error
      }

      return {
        valid: false,
        errors: [{ field: 'unknown', message: errorMessage, code: 'unexpected_error' }],
        context
      }
    }
  }

  /**
   * Assert that data matches schema, throw on validation failure
   */
  assert<T>(schema: ZodSchema<T>, data: unknown, context?: string): T {
    const result = this.check(schema, data, { 
      throwOnError: true, 
      logErrors: true, 
      context,
      includeStackTrace: true 
    })
    
    // This should never be reached due to throwOnError, but TypeScript needs it
    if (!result.valid) {
      throw new Error(`Assertion failed${context ? ` for ${context}` : ''}`)
    }
    
    return result.data as T
  }

  /**
   * Safely check data without throwing, return detailed result
   */
  safeCheck<T>(schema: ZodSchema<T>, data: unknown, context?: string): TypeCheckResult<T> {
    return this.check(schema, data, { 
      throwOnError: false, 
      logErrors: false, 
      context 
    })
  }

  /**
   * Check if data matches schema (boolean result only)
   */
  isValid<T>(schema: ZodSchema<T>, data: unknown): boolean {
    const result = this.check(schema, data, { 
      throwOnError: false, 
      logErrors: false 
    })
    return result.valid
  }

  /**
   * Validate array of items with detailed error reporting
   */
  checkArray<T>(
    schema: ZodSchema<T>, 
    data: unknown[], 
    options: TypeCheckOptions = {}
  ): TypeCheckResult<T[]> {
    const { throwOnError = false, logErrors = true, context } = options
    const results: T[] = []
    const allErrors: {field: string; message: string; code: string}[] = []

    for (let i = 0; i < data.length; i++) {
      const itemResult = this.check(schema, data[i], { 
        throwOnError: false, 
        logErrors: false, 
        context: `${context}[${i}]` 
      })

      if (itemResult.valid) {
        results.push(itemResult.data as T)
      } else {
        const indexedErrors = itemResult.errors?.map(error => ({
          ...error,
          field: `[${i}].${error.field}`
        })) || []
        allErrors.push(...indexedErrors)
      }
    }

    if (allErrors.length > 0) {
      if (logErrors) {
        const errorMessage = `Array validation failed${context ? ` for ${context}` : ''}: ${allErrors.length} errors across ${data.length} items`
        this.logger.warn(errorMessage)
      }

      if (throwOnError) {
        const error = new ZodError(allErrors.map(err => ({
          code: 'custom' as const,
          path: err.field.split(/[[\].]/).filter(Boolean),
          message: err.message,
          params: {}
        })))
        throw this.errorMapper.toValidationException(error, context)
      }

      return {
        valid: false,
        errors: allErrors,
        context
      }
    }

    return {
      valid: true,
      data: results,
      context
    }
  }

  /**
   * Deep validate nested object with path-aware error reporting
   */
  deepCheck<T>(
    schema: ZodSchema<T>, 
    data: unknown, 
    path = 'root',
    options: TypeCheckOptions = {}
  ): TypeCheckResult<T> {
    return this.check(schema, data, { 
      ...options, 
      context: path 
    })
  }

  /**
   * Validate with custom error messages
   */
  checkWithMessages<T>(
    schema: ZodSchema<T>,
    data: unknown,
    customMessages: Record<string, string>,
    context?: string
  ): TypeCheckResult<T> {
    try {
      const validatedData = schema.parse(data)
      return {
        valid: true,
        data: validatedData,
        context
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const mappedErrors = this.errorMapper.mapZodError(error, { 
          customMessages,
          includeValues: true 
        })
        
        return {
          valid: false,
          errors: mappedErrors,
          context
        }
      }
      throw error
    }
  }

  /**
   * Type-safe cast with runtime validation
   */
  cast<T>(schema: ZodSchema<T>, data: unknown, context?: string): T {
    return this.assert(schema, data, context)
  }

  /**
   * Validate API response data
   */
  validateApiResponse<T>(
    schema: ZodSchema<T>, 
    response: unknown, 
    endpoint?: string
  ): TypeCheckResult<T> {
    return this.check(schema, response, {
      throwOnError: false,
      logErrors: true,
      context: endpoint ? `API response from ${endpoint}` : 'API response',
      includeStackTrace: false
    })
  }

  /**
   * Validate user input with detailed error messages
   */
  validateUserInput<T>(
    schema: ZodSchema<T>, 
    input: unknown, 
    formName?: string
  ): TypeCheckResult<T> {
    return this.check(schema, input, {
      throwOnError: false,
      logErrors: true,
      context: formName ? `${formName} form` : 'user input',
      includeStackTrace: false
    })
  }

  /**
   * Validate database query result
   */
  validateDbResult<T>(
    schema: ZodSchema<T>, 
    result: unknown, 
    query?: string
  ): TypeCheckResult<T> {
    return this.check(schema, result, {
      throwOnError: true, // DB results should always be valid
      logErrors: true,
      context: query ? `DB query: ${query}` : 'database result',
      includeStackTrace: true
    })
  }

  /**
   * Validate configuration object
   */
  validateConfig<T>(
    schema: ZodSchema<T>, 
    config: unknown, 
    configName?: string
  ): T {
    return this.assert(schema, config, 
      configName ? `${configName} configuration` : 'configuration'
    )
  }

  /**
   * Create a typed guard function
   */
  createGuard<T>(schema: ZodSchema<T>): (data: unknown) => data is T {
    return (data): data is T => {
      return this.isValid(schema, data)
    }
  }

  /**
   * Validate with performance monitoring
   */
  checkWithTiming<T>(
    schema: ZodSchema<T>, 
    data: unknown, 
    context?: string
  ): TypeCheckResult<T> & { duration: number } {
    const startTime = performance.now()
    const result = this.check(schema, data, { context, logErrors: true })
    const duration = performance.now() - startTime
    
    if (duration > 100) { // Warn if validation takes more than 100ms
      this.logger.warn(`Slow validation detected${context ? ` for ${context}` : ''}: ${duration.toFixed(2)}ms`)
    }
    
    return { ...result, duration }
  }

  /**
   * Batch validate multiple schemas
   */
  batchCheck(validations: {
    schema: ZodSchema
    data: unknown
    context?: string
  }[]): TypeCheckResult<unknown>[] {
    return validations.map(({ schema, data, context }) => 
      this.safeCheck(schema, data, context)
    )
  }
}