/**
 * Serialization utilities for TenantFlow Backend
<<<<<<< HEAD
 *
 * This module provides minimal, targeted serialization for specific data types:
 * - Date objects (ISO string formatting)
 * - Currency amounts (cents to dollars, precision control)
 *
=======
 * 
 * This module provides minimal, targeted serialization for specific data types:
 * - Date objects (ISO string formatting)
 * - Currency amounts (cents to dollars, precision control)
 * 
>>>>>>> origin/main
 * Usage Philosophy:
 * - Only add serializers where absolutely necessary
 * - Keep serializers native to Fastify
 * - Apply route-locally or register once in bootstrap
 * - No global formatting frameworks
 */

// Date serialization
export {
<<<<<<< HEAD
	createDateSerializer,
	registerDateSerializerForRoute,
	DateTimeSchema,
	ResponseWithTimestampSchema,
	type DateSerializerOptions
} from './fastify-date.serializer'

// Currency serialization
export {
	createCurrencySerializer,
	registerCurrencySerializerForRoute,
	createCurrencyAmount,
	toStripeCents,
	fromStripeCents,
	CurrencyAmountSchema,
	StripeCentsAmountSchema,
	SubscriptionResponseSchema,
	type CurrencySerializerOptions,
	type CurrencyAmount
=======
  createDateSerializer,
  registerDateSerializerForRoute,
  DateTimeSchema,
  ResponseWithTimestampSchema,
  type DateSerializerOptions
} from './fastify-date.serializer'

// Currency serialization  
export {
  createCurrencySerializer,
  registerCurrencySerializerForRoute,
  createCurrencyAmount,
  toStripeCents,
  fromStripeCents,
  CurrencyAmountSchema,
  StripeCentsAmountSchema,
  SubscriptionResponseSchema,
  type CurrencySerializerOptions,
  type CurrencyAmount
>>>>>>> origin/main
} from './fastify-currency.serializer'

/**
 * Performance monitoring for custom serializers
 * Use in development to ensure serializers don't impact performance
 */
export interface SerializerMetrics {
<<<<<<< HEAD
	dateSerializationCount: number
	currencySerializationCount: number
	averageSerializationTime: number
}

let metrics: SerializerMetrics = {
	dateSerializationCount: 0,
	currencySerializationCount: 0,
	averageSerializationTime: 0
=======
  dateSerializationCount: number
  currencySerializationCount: number
  averageSerializationTime: number
}

let metrics: SerializerMetrics = {
  dateSerializationCount: 0,
  currencySerializationCount: 0,
  averageSerializationTime: 0
>>>>>>> origin/main
}

/**
 * Get serializer performance metrics
 * Useful for development and monitoring
 */
export function getSerializerMetrics(): SerializerMetrics {
<<<<<<< HEAD
	return { ...metrics }
=======
  return { ...metrics }
>>>>>>> origin/main
}

/**
 * Reset serializer metrics
 */
export function resetSerializerMetrics(): void {
<<<<<<< HEAD
	metrics = {
		dateSerializationCount: 0,
		currencySerializationCount: 0,
		averageSerializationTime: 0
	}
=======
  metrics = {
    dateSerializationCount: 0,
    currencySerializationCount: 0,
    averageSerializationTime: 0
  }
>>>>>>> origin/main
}

/**
 * Wrap serializer with performance tracking (development only)
 */
<<<<<<< HEAD
export function withPerformanceTracking<
	T extends (...args: unknown[]) => unknown
>(serializer: T, type: 'date' | 'currency'): T {
	if (process.env.NODE_ENV !== 'development') {
		return serializer
	}

	return ((...args: Parameters<T>) => {
		const start = performance.now()
		const result = serializer(...args)
		const duration = performance.now() - start

		if (type === 'date') {
			metrics.dateSerializationCount++
		} else {
			metrics.currencySerializationCount++
		}

		// Update rolling average
		const totalCount =
			metrics.dateSerializationCount + metrics.currencySerializationCount
		metrics.averageSerializationTime =
			(metrics.averageSerializationTime * (totalCount - 1) + duration) /
			totalCount

		return result
	}) as T
}
=======
export function withPerformanceTracking<T extends (...args: unknown[]) => unknown>(
  serializer: T,
  type: 'date' | 'currency'
): T {
  if (process.env.NODE_ENV !== 'development') {
    return serializer
  }

  return ((...args: Parameters<T>) => {
    const start = performance.now()
    const result = serializer(...args)
    const duration = performance.now() - start
    
    if (type === 'date') {
      metrics.dateSerializationCount++
    } else {
      metrics.currencySerializationCount++
    }
    
    // Update rolling average
    const totalCount = metrics.dateSerializationCount + metrics.currencySerializationCount
    metrics.averageSerializationTime = 
      (metrics.averageSerializationTime * (totalCount - 1) + duration) / totalCount
    
    return result
  }) as T
}
>>>>>>> origin/main
