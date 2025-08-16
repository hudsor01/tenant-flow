import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common'
import { ZodError, ZodObject, ZodRawShape, ZodSchema } from 'zod'
import { ValidationException } from '../exceptions/base.exception'
import { ZodErrorMappingService } from './zod-error-mapping.service'

/**
 * Zod Validation Pipe for NestJS
 * Provides seamless integration between Zod schemas and NestJS validation
 */

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(
    private schema: ZodSchema,
    private errorMapper?: ZodErrorMappingService
  ) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      const parsedValue = this.schema.parse(value)
      return parsedValue
    } catch (error) {
      if (error instanceof ZodError) {
        if (this.errorMapper) {
          // Use the error mapping service for enhanced error handling
          throw this.errorMapper.toValidationException(error, metadata.type)
        }
        
        // Fallback to simple error mapping
        const errors = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          received: (err as { received?: unknown }).received
        }))

        const firstError = errors[0] || { field: 'unknown', message: 'Validation failed', code: 'VALIDATION_ERROR' }
        const message = errors.length === 1 
          ? firstError.message
          : `Validation failed: ${errors.map(e => `${e.field}: ${e.message}`).join(', ')}`

        throw new ValidationException(
          message,
          firstError.field,
          [message]
        )
      }
      throw error
    }
  }
}

/**
 * Factory function to create Zod validation pipes
 */
export const ZodValidation = (schema: ZodSchema) => {
  return new ZodValidationPipe(schema)
}

/**
 * Decorator for applying Zod validation to controller methods
 */
export function ValidateWith(schema: ZodSchema) {
  return function (_target: object, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = function (...args: unknown[]) {
      // Validate the first argument (usually the DTO)
      if (args.length > 0) {
        try {
          args[0] = schema.parse(args[0])
        } catch (error) {
          if (error instanceof ZodError) {
            const errors = error.issues.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code
            }))

            const message = `Validation failed: ${errors.map(e => `${e.field}: ${e.message}`).join(', ')}`
            throw new ValidationException(message, errors[0]?.field, errors.map(e => e.message))
          }
          throw error
        }
      }

      return method.apply(this, args)
    }
  }
}

/**
 * Service for validating data with Zod schemas
 * Use this for programmatic validation in services
 */
@Injectable()
export class ZodValidationService {
  constructor(private errorMapper?: ZodErrorMappingService) {}
  /**
   * Validate data with a schema, throw on error
   */
  validate<T>(schema: ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data)
    } catch (error) {
      if (error instanceof ZodError) {
        if (this.errorMapper) {
          throw this.errorMapper.toValidationException(error)
        }
        
        // Fallback error handling
        const errors = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))

        const message = errors.length === 1 
          ? errors[0]?.message || 'Validation failed'
          : `Validation failed: ${errors.map(e => `${e.field}: ${e.message}`).join(', ')}`

        throw new ValidationException(message, errors[0]?.field, errors.map(e => e.message))
      }
      throw error
    }
  }

  /**
   * Safely validate data, return result with success/error
   */
  safeValidate<T>(schema: ZodSchema<T>, data: unknown): { 
    success: true; data: T 
  } | { 
    success: false; error: ZodError; mappedErrors: {field: string; message: string; code: string; value?: unknown}[] 
  } {
    const result = schema.safeParse(data)
    
    if (result.success) {
      return { success: true, data: result.data }
    }
    
    const mappedErrors = this.errorMapper 
      ? this.errorMapper.mapZodError(result.error, { includeValues: true })
      : result.error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
    
    return { 
      success: false, 
      error: result.error, 
      mappedErrors 
    }
  }

  /**
   * Transform Zod errors to a format suitable for API responses
   */
  formatZodError(error: ZodError): {
    message: string
    errors: {field: string; message: string; code: string}[]
  } {
    const errors = error.issues.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))

    const message = errors.length === 1 
      ? errors[0]?.message || 'Validation failed'
      : `Validation failed on ${errors.length} field${errors.length > 1 ? 's' : ''}`

    return { message, errors }
  }

  /**
   * Validate array of items with schema
   */
  validateArray<T>(schema: ZodSchema<T>, data: unknown[]): T[] {
    return data.map((item, index) => {
      try {
        return schema.parse(item)
      } catch (error) {
        if (error instanceof ZodError) {
          const errors = error.issues.map(err => ({
            field: `[${index}].${err.path.join('.')}`,
            message: err.message,
            code: err.code
          }))

          const message = `Validation failed on item ${index}: ${errors.map(e => e.message).join(', ')}`
          throw new ValidationException(message, errors[0]?.field, errors.map(e => e.message))
        }
        throw error
      }
    })
  }

  /**
   * Validate partial update data (ignores undefined fields)
   */
  validatePartial<T extends Record<string, unknown>>(schema: ZodObject<ZodRawShape>, data: unknown): Partial<T> {
    // Create a schema that makes all fields optional
    const partialSchema = schema.partial()
    return this.validate(partialSchema, data) as Partial<T>
  }

  /**
   * Merge and validate multiple schemas
   */
  validateMerged<T, U>(schema1: ZodObject<ZodRawShape>, schema2: ZodObject<ZodRawShape>, data: unknown): T & U {
    const mergedSchema = schema1.merge(schema2)
    return this.validate(mergedSchema as ZodSchema<T & U>, data)
  }
}