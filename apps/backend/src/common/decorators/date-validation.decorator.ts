import { ValidationException } from '../exceptions/base.exception'
import { DateQueryUtils } from '../utils/date-query.utils'

/**
 * Method decorator for validating date ranges in service methods
 * Ensures end date is after start date
 * 
 * @param startField - Name of the start date field in the data object
 * @param endField - Name of the end date field in the data object
 * @param options - Additional validation options
 */
export function ValidateDateRange(
  startField = 'startDate',
  endField = 'endDate',
  options: {
    required?: boolean;
    allowEqual?: boolean;
    maxDays?: number;
    minDays?: number;
  } = {}
) {
  return function (
    _target: unknown,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: unknown[]) {
      // Assume first argument is the data object
      const data = args[0]
      
      if (!data || typeof data !== 'object') {
        return originalMethod.apply(this, args)
      }
      
      const startDate = (data as Record<string, unknown>)[startField]
      const endDate = (data as Record<string, unknown>)[endField]
      
      // Check if dates are required
      if (options.required) {
        if (!startDate) {
          throw new ValidationException(
            `${startField} is required`,
            startField
          )
        }
        if (!endDate) {
          throw new ValidationException(
            `${endField} is required`,
            endField
          )
        }
      }
      
      // Only validate if both dates are present
      if (startDate && endDate) {
        try {
          // Basic date range validation
          DateQueryUtils.validateDateRange(
            startDate as string | Date,
            endDate as string | Date,
            { start: startField, end: endField }
          )
          
          // Check if equal dates are allowed
          if (!options.allowEqual) {
            const start = new Date(startDate as string | number | Date)
            const end = new Date(endDate as string | number | Date)
            
            if (start.getTime() === end.getTime()) {
              throw new ValidationException(
                `${endField} must be different from ${startField}`,
                endField
              )
            }
          }
          
          // Check maximum days constraint
          if (options.maxDays !== undefined) {
            const days = DateQueryUtils.daysBetween(startDate as string | Date, endDate as string | Date)
            if (days > options.maxDays) {
              throw new ValidationException(
                `Date range cannot exceed ${options.maxDays} days`,
                endField
              )
            }
          }
          
          // Check minimum days constraint
          if (options.minDays !== undefined) {
            const days = DateQueryUtils.daysBetween(startDate as string | Date, endDate as string | Date)
            if (days < options.minDays) {
              throw new ValidationException(
                `Date range must be at least ${options.minDays} days`,
                endField
              )
            }
          }
        } catch (error) {
          if (error instanceof ValidationException) {
            throw error
          }
          
          // Convert generic errors to validation exceptions
          throw new ValidationException(
            (error as Error).message,
            propertyName
          )
        }
      }
      
      // Call the original method
      return originalMethod.apply(this, args)
    }
    
    return descriptor
  }
}

/**
 * Property decorator for validating individual date fields
 * Ensures date is valid and optionally within constraints
 */
export function ValidateDate(
  options: {
    required?: boolean;
    future?: boolean;
    past?: boolean;
    minDate?: Date | string;
    maxDate?: Date | string;
  } = {}
) {
  return function (target: unknown, propertyKey: string) {
    let value: unknown
    
    const getter = function () {
      return value
    }
    
    const setter = function (newValue: unknown) {
      if (options.required && !newValue) {
        throw new ValidationException(
          `${propertyKey} is required`,
          propertyKey
        )
      }
      
      if (newValue) {
        const date = typeof newValue === 'string' ? new Date(newValue) : newValue as Date
        
        if (isNaN(date.getTime())) {
          throw new ValidationException(
            `Invalid date for ${propertyKey}`,
            propertyKey
          )
        }
        
        const now = new Date()
        
        if (options.future && date <= now) {
          throw new ValidationException(
            `${propertyKey} must be in the future`,
            propertyKey
          )
        }
        
        if (options.past && date >= now) {
          throw new ValidationException(
            `${propertyKey} must be in the past`,
            propertyKey
          )
        }
        
        if (options.minDate) {
          const min = typeof options.minDate === 'string' 
            ? new Date(options.minDate) 
            : options.minDate
            
          if (date < min) {
            throw new ValidationException(
              `${propertyKey} cannot be before ${min.toISOString()}`,
              propertyKey
            )
          }
        }
        
        if (options.maxDate) {
          const max = typeof options.maxDate === 'string' 
            ? new Date(options.maxDate) 
            : options.maxDate
            
          if (date > max) {
            throw new ValidationException(
              `${propertyKey} cannot be after ${max.toISOString()}`,
              propertyKey
            )
          }
        }
      }
      
      value = newValue
    }
    
    // Delete the original property
    if (delete (target as Record<string, unknown>)[propertyKey]) {
      // Create new property with getter and setter
      Object.defineProperty(target, propertyKey, {
        get: getter,
        set: setter,
        enumerable: true,
        configurable: true
      })
    }
  }
}