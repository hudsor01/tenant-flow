import { Logger } from '@nestjs/common'

const logger = new Logger('PerformanceDecorator')

/**
 * Performance Monitoring Decorators
 * 
 * Expected load times in production:
 * - Simple modules: < 100ms
 * - Database modules: 100-300ms  
 * - External service modules (Stripe, etc): 300-1000ms
 * - Complex modules with multiple dependencies: 500-1500ms
 * 
 * These thresholds are environment-aware:
 * - Development: Stricter thresholds for quick feedback
 * - Production: Relaxed thresholds accounting for network latency
 */

/**
 * Constructor type for classes that can be decorated - TypeScript mixin requirement
 * IMPORTANT: The `any[]` type is required here due to TypeScript mixin pattern limitations.
 * This allows decorators to work with any constructor signature. Do NOT remove this disable
 * unless you have an alternative solution that maintains mixin compatibility.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = object> = new (...args: any[]) => T

/**
 * Decorator to measure module load time
 */
export function MeasureLoadTime(moduleName?: string) {
    return function <T extends Constructor>(constructor: T) {
        const name = moduleName || constructor.name
        const startTime = Date.now()
        
        return class extends constructor {
            // REQUIRED: Constructor must accept any arguments for mixin pattern compatibility
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            constructor(...args: any[]) {
                super(...args)
                
                // Measure load time after constructor completes
                const loadTime = Date.now() - startTime
                
                // Different thresholds for production vs development
                const isProduction = process.env.NODE_ENV === 'production'
                const warnThreshold = isProduction ? 1000 : 100  // 1s in prod, 100ms in dev
                const infoThreshold = isProduction ? 500 : 50    // 500ms in prod, 50ms in dev
                
                // Log performance based on environment-aware thresholds
                if (loadTime > warnThreshold) {
                    logger.warn(`⚠️ ${name} took ${loadTime}ms to load (threshold: ${warnThreshold}ms)`)
                } else if (loadTime > infoThreshold) {
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
    return function <T extends Constructor>(constructor: T) {
        const name = serviceName || constructor.name
        
        return class extends constructor {
            // REQUIRED: Constructor must accept any arguments for mixin pattern compatibility
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            constructor(...args: any[]) {
                const startTime = performance.now()
                super(...args)
                const endTime = performance.now()
                const initTime = Math.round((endTime - startTime) * 100) / 100
                
                // Different thresholds for production vs development
                const isProduction = process.env.NODE_ENV === 'production'
                const warnThreshold = isProduction ? 50 : 10  // 50ms in prod, 10ms in dev
                
                // Log initialization time
                if (initTime > warnThreshold) {
                    logger.warn(`⚠️ ${name} initialization took ${initTime}ms (threshold: ${warnThreshold}ms)`)
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