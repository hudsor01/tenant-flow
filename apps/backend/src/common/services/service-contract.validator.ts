/**
 * Service Contract Validator
 * Validates that CRUD service implementations follow the required patterns
 */

import { Logger } from '@nestjs/common'
import type { ICrudService, BaseQueryOptions} from './base-crud.service';
import { BaseCrudService } from './base-crud.service'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface ServiceMetadata {
  serviceName: string
  entityName: string
  hasCustomMethods: boolean
  implementsAllAliases: boolean
  hasProperErrorHandling: boolean
}

/**
 * Validates service implementations for consistency and completeness
 */
export class ServiceContractValidator {
  private readonly logger = new Logger(ServiceContractValidator.name)

  /**
   * Validate a service implementation against the CRUD contract
   */
  validateService<T extends BaseCrudService>(
    service: T,
    serviceName: string
  ): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Check required methods exist
      this.validateRequiredMethods(service, errors)
      
      // Check alias methods exist
      this.validateAliasMethods(service, errors)
      
      // Check abstract method implementations
      this.validateAbstractMethods(service, errors)
      
      // Check error handling patterns
      this.validateErrorHandling(service, warnings)
      
      // Check logging implementation
      this.validateLogging(service, warnings)

    } catch (error) {
      errors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`)
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings
    }

    this.logValidationResult(serviceName, result)
    return result
  }

  /**
   * Generate service metadata for documentation
   */
  generateServiceMetadata<T extends BaseCrudService>(
    service: T,
    serviceName: string
  ): ServiceMetadata {
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(service))
    const baseMethods = Object.getOwnPropertyNames(BaseCrudService.prototype)
    const serviceWithProps = service as unknown as { entityName?: string }
    
    return {
      serviceName,
      entityName: serviceWithProps.entityName || 'Unknown',
      hasCustomMethods: methods.some(method => !baseMethods.includes(method)),
      implementsAllAliases: this.checkAliasMethods(service),
      hasProperErrorHandling: this.checkErrorHandling(service)
    }
  }

  /**
   * Validate that all required CRUD methods are implemented
   */
  private validateRequiredMethods<T extends BaseCrudService>(
    service: T,
    errors: string[]
  ): void {
    const requiredMethods: (keyof ICrudService<unknown, unknown, unknown, BaseQueryOptions>)[] = [
      'getByOwner',
      'getByIdOrThrow', 
      'getStats',
      'create',
      'update',
      'delete'
    ]

    for (const method of requiredMethods) {
      if (typeof service[method] !== 'function') {
        errors.push(`Missing required method: ${String(method)}`)
      }
    }
  }

  /**
   * Validate that alias methods are properly implemented
   */
  private validateAliasMethods<T extends BaseCrudService>(
    service: T,
    errors: string[]
  ): void {
    const aliasMethods = [
      'findAllByOwner',
      'findById', 
      'findOne',
      'remove'
    ]

    for (const method of aliasMethods) {
      if (typeof (service as Record<string, unknown>)[method] !== 'function') {
        errors.push(`Missing alias method: ${method}`)
      }
    }
  }

  /**
   * Validate that abstract methods are implemented
   */
  private validateAbstractMethods<T extends BaseCrudService>(
    service: T,
    errors: string[]
  ): void {
    const abstractMethods = [
      'findByIdAndOwner',
      'calculateStats',
      'prepareCreateData',
      'prepareUpdateData',
      'createOwnerWhereClause'
    ]

    for (const method of abstractMethods) {
      const implementation = (service as Record<string, unknown>)[method]
      if (typeof implementation !== 'function') {
        errors.push(`Missing abstract method implementation: ${method}`)
      } else {
        // Check if it's still the abstract version (throws error)
        try {
          // This is a heuristic check - abstract methods should be overridden
          const methodString = implementation.toString()
          if (methodString.includes('throw') && methodString.includes('abstract')) {
            errors.push(`Abstract method not implemented: ${method}`)
          }
        } catch {
          // Method exists, assume it's implemented
        }
      }
    }
  }

  /**
   * Check error handling patterns
   */
  private validateErrorHandling<T extends BaseCrudService>(
    service: T,
    warnings: string[]
  ): void {
    // Check if errorHandler is injected
    const errorHandler = (service as unknown as { errorHandler?: unknown })['errorHandler']
    if (!errorHandler) {
      warnings.push('ErrorHandlerService not found - error handling may be inconsistent')
    }

    // Check if logger is initialized
    const logger = (service as unknown as { logger?: Logger })['logger']
    if (!logger) {
      warnings.push('Logger not found - operation logging may be missing')
    }
  }

  /**
   * Check logging implementation
   */
  private validateLogging<T extends BaseCrudService>(
    service: T,
    warnings: string[]
  ): void {
    const logger = (service as unknown as { logger?: Logger })['logger']
    if (logger && !(logger as Logger).log) {
      warnings.push('Logger instance does not have log method')
    }
  }

  /**
   * Check if alias methods are properly implemented
   */
  private checkAliasMethods<T extends BaseCrudService>(service: T): boolean {
    const aliasMethods = ['findAllByOwner', 'findById', 'findOne', 'remove']
    return aliasMethods.every(method => typeof (service as Record<string, unknown>)[method] === 'function')
  }

  /**
   * Check if error handling is properly configured
   */
  private checkErrorHandling<T extends BaseCrudService>(service: T): boolean {
    // Access protected properties through reflection since they exist in BaseCrudService
    const serviceWithProps = service as unknown as { errorHandler?: unknown; logger?: Logger }
    return !!serviceWithProps.errorHandler && !!serviceWithProps.logger
  }

  /**
   * Log validation results
   */
  private logValidationResult(serviceName: string, result: ValidationResult): void {
    if (result.isValid) {
      this.logger.log(`✅ Service validation passed: ${serviceName}`)
    } else {
      this.logger.error(`❌ Service validation failed: ${serviceName}`)
      result.errors.forEach(error => {
        this.logger.error(`  - ${error}`)
      })
    }

    if (result.warnings.length > 0) {
      this.logger.warn(`⚠️  Service warnings for ${serviceName}:`)
      result.warnings.forEach(warning => {
        this.logger.warn(`  - ${warning}`)
      })
    }
  }
}

/**
 * Decorator to automatically validate service implementations
 * Note: Disabled due to TypeScript limitations with abstract classes in decorators
 */
export function ValidateCrudService(serviceName?: string) {
  return function <T extends new (...args: never[]) => BaseCrudService>(constructor: T): T {
    // TODO: Re-implement when TypeScript supports abstract class decorators better
    // For now, use serviceValidator.validateService() manually
    console.warn(`Service validation decorator applied to ${serviceName || constructor.name}`)
    return constructor
  }
}

/**
 * Test utility to validate multiple services
 */
export class ServiceTestValidator {
  private readonly validator = new ServiceContractValidator()

  /**
   * Validate all services in a module
   */
  validateAllServices(services: Record<string, BaseCrudService>): ValidationResult {
    const allErrors: string[] = []
    const allWarnings: string[] = []

    for (const [name, service] of Object.entries(services)) {
      const result = this.validator.validateService(service, name)
      
      allErrors.push(...result.errors.map(error => `${name}: ${error}`))
      allWarnings.push(...result.warnings.map(warning => `${name}: ${warning}`))
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    }
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(services: Record<string, BaseCrudService>): string {
    const results = Object.entries(services).map(([name, service]) => {
      const validation = this.validator.validateService(service, name)
      const metadata = this.validator.generateServiceMetadata(service, name)
      
      return {
        name,
        validation,
        metadata
      }
    })

    const compliantServices = results.filter(r => r.validation.isValid)
    const nonCompliantServices = results.filter(r => !r.validation.isValid)

    let report = '# CRUD Service Compliance Report\n\n'
    report += `**Total Services:** ${results.length}\n`
    report += `**Compliant:** ${compliantServices.length}\n`
    report += `**Non-Compliant:** ${nonCompliantServices.length}\n\n`

    if (compliantServices.length > 0) {
      report += '## ✅ Compliant Services\n\n'
      compliantServices.forEach(({ name, metadata }) => {
        report += `- **${name}** (${metadata.entityName})\n`
        if (metadata.hasCustomMethods) {
          report += '  - Has custom methods\n'
        }
      })
      report += '\n'
    }

    if (nonCompliantServices.length > 0) {
      report += '## ❌ Non-Compliant Services\n\n'
      nonCompliantServices.forEach(({ name, validation }) => {
        report += `### ${name}\n\n`
        validation.errors.forEach(error => {
          report += `- ❌ ${error}\n`
        })
        validation.warnings.forEach(warning => {
          report += `- ⚠️ ${warning}\n`
        })
        report += '\n'
      })
    }

    return report
  }
}

// Export singleton validator instance for convenience
export const serviceValidator = new ServiceContractValidator()