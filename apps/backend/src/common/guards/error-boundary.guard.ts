import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  HttpException,
  HttpStatus
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { ErrorHandlerService } from '../errors/error-handler.service'

/**
 * Guard that acts as an error boundary for critical operations
 * Catches and handles errors that might crash the application
 */
@Injectable()
export class ErrorBoundaryGuard implements CanActivate {
  private readonly logger = new Logger(ErrorBoundaryGuard.name)

  constructor(_errorHandler: ErrorHandlerService) {
    // ErrorHandler service available for enhanced error processing
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    try {
      const request = context.switchToHttp().getRequest()
      const handler = context.getHandler()
      const className = context.getClass().name
      const methodName = handler.name

      // Add error boundary context to request
      request.errorBoundary = {
        className,
        methodName,
        timestamp: new Date().toISOString(),
        requestId: request.id || this.generateRequestId()
      }

      return true
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.logger.error('Error in ErrorBoundaryGuard', {
        error: err.message,
        stack: err.stack
      })

      // Don't block the request, but log the issue
      return true
    }
  }

  /**
   * Handle critical errors that occur within the error boundary
   */
  static handleCriticalError(error: unknown, context?: unknown): never {
    const logger = new Logger('CriticalErrorHandler')
    
    logger.error('Critical error occurred', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
      timestamp: new Date().toISOString()
    })

    // Send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // This could integrate with Sentry, DataDog, etc.
      try {
        // Example: await monitoringService.reportCriticalError(error, context)
      } catch (monitoringError) {
        logger.error('Failed to report critical error to monitoring service', monitoringError)
      }
    }

    throw new HttpException(
      {
        error: {
          message: 'A critical error occurred',
          code: 'CRITICAL_ERROR',
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          timestamp: new Date().toISOString(),
          requestId: (context as { requestId?: string })?.requestId
        }
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    )
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Decorator to wrap methods with error boundary protection
 */
export function WithErrorBoundary(
  fallbackValue?: unknown,
  customHandler?: (error: unknown, context: unknown) => unknown
): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    const logger = new Logger(`${target.constructor.name}.${String(propertyKey)}`)

    descriptor.value = async function (...args: unknown[]) {
      const context = {
        className: target.constructor.name,
        methodName: String(propertyKey),
        timestamp: new Date().toISOString(),
        args: args.length
      }

      try {
        return await originalMethod.apply(this, args)
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        logger.error('Error caught by error boundary', {
          ...context,
          error: err.message,
          stack: err.stack
        })

        if (customHandler) {
          return customHandler(error, context)
        }

        if (fallbackValue !== undefined) {
          logger.warn('Returning fallback value due to error', {
            ...context,
            fallbackValue
          })
          return fallbackValue
        }

        // Re-throw if no fallback provided
        throw error
      }
    }

    return descriptor
  }
}

/**
 * Class decorator to add error boundary to all methods
 */
export function WithClassErrorBoundary(
  fallbackValue?: unknown,
  customHandler?: (error: unknown, context: unknown) => unknown
) {
  return function <T extends new (...args: unknown[]) => object>(constructor: T): T {
    const methodNames = Object.getOwnPropertyNames(constructor.prototype)
      .filter(name => name !== 'constructor' && typeof constructor.prototype[name] === 'function')

    methodNames.forEach(methodName => {
      const originalMethod = constructor.prototype[methodName]
      const logger = new Logger(`${constructor.name}.${methodName}`)
      
      constructor.prototype[methodName] = async function (...args: unknown[]) {
        const context = {
          className: constructor.name,
          methodName,
          timestamp: new Date().toISOString(),
          args: args.length
        }

        try {
          return await originalMethod.apply(this, args)
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error))
          logger.error('Error caught by class error boundary', {
            ...context,
            error: err.message,
            stack: err.stack
          })

          if (customHandler) {
            return customHandler(error, context)
          }

          if (fallbackValue !== undefined) {
            logger.warn('Returning fallback value due to error', {
              ...context,
              fallbackValue
            })
            return fallbackValue
          }

          throw error
        }
      }
    })

    return constructor
  }
}