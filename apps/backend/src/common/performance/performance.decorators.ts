import { Logger } from '@nestjs/common'

const logger = new Logger('PerformanceDecorator')

/**
 * Decorator to measure module load time
 */
export function MeasureLoadTime(moduleName?: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function <T extends new (...args: any[]) => object>(constructor: T) {
        const name = moduleName || constructor.name
        const startTime = Date.now()
        
        return class extends constructor {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            constructor(...args: any[]) {
                super(...args)
                
                // Measure load time after constructor completes
                const loadTime = Date.now() - startTime
                
                // Log performance
                if (loadTime > 100) {
                    logger.warn(`⚠️ ${name} took ${loadTime}ms to load`)
                } else if (loadTime > 50) {
                    logger.log(`📊 ${name} loaded in ${loadTime}ms`)
                } else if (process.env.NODE_ENV === 'development') {
                    logger.debug(`✅ ${name} loaded quickly (${loadTime}ms)`)
                }
            }
        }
    }
}

/**
 * Decorator to measure service initialization time
 */
export function MeasureServiceInit(serviceName?: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function <T extends new (...args: any[]) => object>(constructor: T) {
        const name = serviceName || constructor.name
        
        return class extends constructor {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            constructor(...args: any[]) {
                const startTime = performance.now()
                super(...args)
                const endTime = performance.now()
                const initTime = Math.round((endTime - startTime) * 100) / 100
                
                // Log initialization time
                if (initTime > 10) {
                    logger.warn(`⚠️ ${name} initialization took ${initTime}ms`)
                } else if (process.env.NODE_ENV === 'development') {
                    logger.debug(`✅ ${name} initialized in ${initTime}ms`)
                }
            }
        }
    }
}

/**
 * Method decorator to measure method execution time
 */
export function MeasureMethod(threshold = 100) {
    return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value
        
        descriptor.value = function (...args: unknown[]) {
            const startTime = performance.now()
            const result = method.apply(this, args)
            
            // Handle both sync and async methods
            if (result && typeof result.then === 'function') {
                return result.finally(() => {
                    const endTime = performance.now()
                    const executionTime = Math.round((endTime - startTime) * 100) / 100
                    
                    if (executionTime > threshold) {
                        logger.warn(`⚠️ ${(target as object).constructor.name}.${propertyName}() took ${executionTime}ms`)
                    }
                })
            } else {
                const endTime = performance.now()
                const executionTime = Math.round((endTime - startTime) * 100) / 100
                
                if (executionTime > threshold) {
                    logger.warn(`⚠️ ${(target as object).constructor.name}.${propertyName}() took ${executionTime}ms`)
                }
                
                return result
            }
        }
        
        return descriptor
    }
}

/**
 * Async timeout decorator to prevent hanging operations
 */
export function AsyncTimeout(timeoutMs = 5000, errorMessage?: string) {
    return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value
        
        descriptor.value = function (...args: unknown[]) {
            const result = method.apply(this, args)
            
            if (result && typeof result.then === 'function') {
                return Promise.race([
                    result,
                    new Promise((_, reject) => {
                        setTimeout(() => {
                            const message = errorMessage || `${(target as object).constructor.name}.${propertyName}() timed out after ${timeoutMs}ms`
                            reject(new Error(message))
                        }, timeoutMs)
                    })
                ])
            }
            
            return result
        }
        
        return descriptor
    }
}