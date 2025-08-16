import { HttpStatus, Injectable } from '@nestjs/common'
import { ZodError, ZodIssue } from 'zod'
import { BusinessException, ValidationException } from '../exceptions/base.exception'

/**
 * Zod Error Mapping Service
 * Provides comprehensive error mapping and transformation for Zod validation errors
 */

interface MappedError {
  field: string
  message: string
  code: string
  value?: unknown
}

interface ErrorMappingOptions {
  includeValues?: boolean
  customMessages?: Record<string, string>
  fieldMapping?: Record<string, string>
}

@Injectable()
export class ZodErrorMappingService {
  
  /**
   * Map Zod error to application-specific validation errors
   */
  mapZodError(error: ZodError, options?: ErrorMappingOptions): MappedError[] {
    return error.issues.map((issue) => this.mapZodIssue(issue, options))
  }

  /**
   * Convert Zod error to ValidationException
   */
  toValidationException(error: ZodError, entity?: string, options?: ErrorMappingOptions): ValidationException {
    const mappedErrors = this.mapZodError(error, options)
    const primaryError = mappedErrors[0]
    
    if (!primaryError) {
      return new ValidationException(
        'Validation failed',
        'unknown',
        ['Validation failed']
      )
    }
    
    if (mappedErrors.length === 1) {
      return new ValidationException(
        primaryError.message,
        primaryError.field,
        [primaryError.message]
      )
    }

    // Multiple errors - create a summary message
    const errorSummary = mappedErrors.map(e => `${e.field}: ${e.message}`).join(', ')
    const entityName = entity || 'input'
    
    return new ValidationException(
      `Validation failed for ${entityName}: ${errorSummary}`,
      'multiple',
      mappedErrors.map(e => e.message)
    )
  }

  /**
   * Convert Zod error to BusinessException
   */
  toBusinessException(error: ZodError, operation: string, resource: string): BusinessException {
    const mappedErrors = this.mapZodError(error)
    const primaryError = mappedErrors[0]
    
    return new BusinessException(
      'VALIDATION_ERROR',
      `Validation failed during ${operation}`,
      HttpStatus.BAD_REQUEST,
      {
        resource,
        operation,
        errors: mappedErrors,
        primaryField: primaryError?.field,
        primaryMessage: primaryError?.message
      }
    )
  }

  /**
   * Map individual Zod issue to readable error
   */
  private mapZodIssue(issue: ZodIssue, options?: ErrorMappingOptions): MappedError {
    const field = this.getFieldPath(issue.path, options?.fieldMapping)
    const code = issue.code
    let message = this.getErrorMessage(issue, options?.customMessages)
    
    // Apply custom field mapping to message
    if (options?.fieldMapping?.[field]) {
      const friendlyField = options.fieldMapping[field]
      message = message.replace(field, friendlyField)
    }

    const mappedError: MappedError = {
      field,
      message,
      code
    }

    if (options?.includeValues && 'received' in issue) {
      mappedError.value = issue.received
    }

    return mappedError
  }

  /**
   * Generate field path from Zod path array
   */
  private getFieldPath(path: PropertyKey[], fieldMapping?: Record<string, string>): string {
    const fieldPath = path.join('.')
    return fieldMapping?.[fieldPath] || fieldPath
  }

  /**
   * Get human-readable error message for Zod issue
   */
  private getErrorMessage(issue: ZodIssue, customMessages?: Record<string, string>): string {
    const field = this.getFieldPath(issue.path as PropertyKey[])
    const customMessage = customMessages?.[`${field}.${issue.code}`] || customMessages?.[field]
    
    if (customMessage) {
      return customMessage
    }

    // Return Zod's built-in message, or create a custom one based on code
    if (issue.message && issue.message !== 'Required') {
      return issue.message
    }

    // Fallback messages for common validation codes
    switch (issue.code) {
      case 'invalid_type':
        return this.getTypeErrorMessage(issue as ZodIssue)
      case 'too_small':
        return this.getSizeErrorMessage(issue as ZodIssue, 'small')
      case 'too_big':
        return this.getSizeErrorMessage(issue as ZodIssue, 'big')
      case 'custom':
        return issue.message || 'Validation failed'
      default:
        return issue.message || `Invalid ${field}`
    }
  }

  /**
   * Generate type error message
   */
  private getTypeErrorMessage(issue: ZodIssue): string {
    const field = this.getFieldPath(issue.path)
    const invalidTypeIssue = issue as unknown as { expected: string; received: string }
    const expected = issue.code === 'invalid_type' ? this.friendlyTypeName(invalidTypeIssue.expected) : 'unknown'
    const received = issue.code === 'invalid_type' ? this.friendlyTypeName(invalidTypeIssue.received) : 'unknown'
    
    if (issue.code === 'invalid_type' && invalidTypeIssue.expected === 'string' && invalidTypeIssue.received === 'undefined') {
      return `${field} is required`
    }
    
    return `${field} must be ${expected}, received ${received}`
  }

  /**
   * Generate size error message
   */
  private getSizeErrorMessage(
    issue: ZodIssue,
    type: 'small' | 'big'
  ): string {
    const field = this.getFieldPath(issue.path)
    
    if (issue.code === 'too_small' || issue.code === 'too_big') {
      const sizeIssue = issue as unknown as { type: string; minimum?: number; maximum?: number }
      if (sizeIssue.type === 'string') {
        if (type === 'small') {
          return `${field} must be at least ${sizeIssue.minimum} characters`
        } else {
          return `${field} must be no more than ${sizeIssue.maximum} characters`
        }
      }
      
      if (sizeIssue.type === 'number') {
        if (type === 'small') {
          return `${field} must be at least ${sizeIssue.minimum}`
        } else {
          return `${field} must be no more than ${sizeIssue.maximum}`
        }
      }
      
      if (sizeIssue.type === 'array') {
        if (type === 'small') {
          return `${field} must contain at least ${sizeIssue.minimum} items`
        } else {
          return `${field} must contain no more than ${sizeIssue.maximum} items`
        }
      }
    }
    
    return `${field} size is invalid`
  }


  /**
   * Convert technical type names to user-friendly names
   */
  private friendlyTypeName(type: string): string {
    const typeMap: Record<string, string> = {
      'string': 'text',
      'number': 'a number',
      'boolean': 'true or false',
      'array': 'a list',
      'object': 'an object',
      'null': 'null',
      'undefined': 'undefined',
      'date': 'a date'
    }
    
    return typeMap[type] || type
  }

  /**
   * Flatten nested errors for display
   */
  flattenErrors(errors: MappedError[]): Record<string, string> {
    const flattened: Record<string, string> = {}
    
    errors.forEach(error => {
      if (error?.field) {
        flattened[error.field] = error.message
      }
    })
    
    return flattened
  }

  /**
   * Group errors by field for complex forms
   */
  groupErrorsByField(errors: MappedError[]): Record<string, MappedError[]> {
    return errors.reduce((groups, error) => {
      const field = error.field?.split('.')[0] || 'general' // Get top-level field
      if (!groups[field]) {
        groups[field] = []
      }
      groups[field].push(error)
      return groups
    }, {} as Record<string, MappedError[]>)
  }

  /**
   * Generate user-friendly error summary
   */
  generateErrorSummary(errors: MappedError[], entity?: string): string {
    if (errors.length === 0) {return 'No errors'}
    if (errors.length === 1) {return errors[0]?.message || 'Validation error'}
    
    const entityName = entity || 'form'
    const errorCount = errors.length
    const primaryError = errors[0]
    
    if (primaryError) {
      if (errorCount === 2) {
        return `${primaryError.message} and 1 other error in ${entityName}`
      }
      
      return `${primaryError.message} and ${errorCount - 1} other errors in ${entityName}`
    }
    
    return `Multiple validation errors in ${entityName}`
  }

  /**
   * Check if error is field-specific or general
   */
  isFieldError(error: MappedError): boolean {
    return error.field !== 'multiple' && error.field !== 'general'
  }

  /**
   * Extract all field names from errors
   */
  getErrorFields(errors: MappedError[]): string[] {
    return [...new Set(errors.map(error => error.field))]
  }
}