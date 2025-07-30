import { Logger } from '@nestjs/common'

/**
 * Method decorator that automatically catches and handles errors
 * Useful for service methods that need consistent error handling
 */
export function CatchErrors(
  errorMessage?: string,
  throwAs?: new (...args: unknown[]) => Error
): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    const logger = new Logger(target.constructor.name)

    descriptor.value = async function (...args: unknown[]) {
      try {
        return await originalMethod.apply(this, args)
      } catch (error) {
        const methodName = String(propertyKey)
        const className = target.constructor.name
        
        const err = error instanceof Error ? error : new Error(String(error))
        logger.error(
          `Error in ${className}.${methodName}: ${err.message}`,
          {
            className,
            methodName,
            error: err.message,
            stack: err.stack,
            args: args.map((arg, index) => ({
              index,
              type: typeof arg,
              value: typeof arg === 'object' ? JSON.stringify(arg) : arg
            }))
          }
        )

        if (throwAs) {
          const err = error instanceof Error ? error : new Error(String(error))
          throw new throwAs(errorMessage || err.message)
        }

        if (errorMessage) {
          throw new Error(errorMessage)
        }

        throw error
      }
    }

    return descriptor
  }
}

/**
 * Class decorator that adds error handling to all methods
 */
export function CatchAllErrors(
  errorMessage?: string,
  throwAs?: new (...args: unknown[]) => Error
) {
  return function <T extends new (...args: unknown[]) => object>(constructor: T): T {
    const logger = new Logger(constructor.name)

    // Get all method names from prototype
    const methodNames = Object.getOwnPropertyNames(constructor.prototype)
      .filter(name => name !== 'constructor' && typeof constructor.prototype[name] === 'function')

    // Apply error handling to each method
    methodNames.forEach(methodName => {
      const originalMethod = constructor.prototype[methodName]
      
      constructor.prototype[methodName] = async function (...args: unknown[]) {
        try {
          return await originalMethod.apply(this, args)
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error))
          logger.error(
            `Error in ${constructor.name}.${methodName}: ${err.message}`,
            {
              className: constructor.name,
              methodName,
              error: err.message,
              stack: err.stack
            }
          )

          if (throwAs) {
            const err = error instanceof Error ? error : new Error(String(error))
            throw new throwAs(errorMessage || err.message)
          }

          if (errorMessage) {
            throw new Error(errorMessage)
          }

          throw error
        }
      }
    })

    return constructor
  }
}

/**
 * Parameter decorator for automatic validation error handling
 */
export function ValidateAndCatch(
  validator: (value: unknown) => boolean | Promise<boolean>,
  errorMessage: string
): ParameterDecorator {
  return function (target: object, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingMetadata = Reflect.getMetadata('validation:parameters', target) || []
    
    existingMetadata.push({
      index: parameterIndex,
      validator,
      errorMessage,
      methodName: propertyKey
    })
    
    Reflect.defineMetadata('validation:parameters', existingMetadata, target)
  }
}