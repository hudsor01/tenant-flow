/**
 * Native Fastify Date Serializer
<<<<<<< HEAD
 *
=======
 * 
>>>>>>> origin/main
 * Purpose: Standardize Date object serialization across all API responses
 * Implementation: Route-local or global registration in bootstrap
 * Performance: Minimal overhead, only applied where needed
 */

import type { FastifyInstance } from 'fastify'

/**
 * Date serializer configuration for consistent timestamp formatting
 */
export interface DateSerializerOptions {
<<<<<<< HEAD
	/**
	 * Whether to use UTC timezone (recommended for API consistency)
	 * @default true
	 */
	useUTC?: boolean

	/**
	 * Whether to include milliseconds in output
	 * @default false
	 */
	includeMilliseconds?: boolean
=======
  /**
   * Whether to use UTC timezone (recommended for API consistency)
   * @default true
   */
  useUTC?: boolean
  
  /**
   * Whether to include milliseconds in output
   * @default false  
   */
  includeMilliseconds?: boolean
>>>>>>> origin/main
}

/**
 * Custom Date serializer that ensures consistent ISO string formatting
 * Replaces manual .toISOString() calls throughout controllers
 */
export function createDateSerializer(options: DateSerializerOptions = {}) {
<<<<<<< HEAD
	const { useUTC = true, includeMilliseconds = false } = options

	return function dateSerializer(
		this: FastifyInstance,
		payload: unknown
	): string {
		if (payload instanceof Date) {
			const isoString = useUTC
				? payload.toISOString()
				: payload.toString()

			if (!includeMilliseconds && isoString.includes('.')) {
				// Remove milliseconds: 2023-12-01T10:30:45.123Z -> 2023-12-01T10:30:45Z
				return isoString.replace(/\.\d{3}Z$/, 'Z')
			}

			return isoString
		}

		// Return original value for non-Date objects
		return JSON.stringify(payload)
	}
=======
  const { useUTC = true, includeMilliseconds = false } = options

  return function dateSerializer(this: FastifyInstance, payload: unknown): string {
    if (payload instanceof Date) {
      const isoString = useUTC ? payload.toISOString() : payload.toString()
      
      if (!includeMilliseconds && isoString.includes('.')) {
        // Remove milliseconds: 2023-12-01T10:30:45.123Z -> 2023-12-01T10:30:45Z
        return isoString.replace(/\.\d{3}Z$/, 'Z')
      }
      
      return isoString
    }
    
    // Return original value for non-Date objects
    return JSON.stringify(payload)
  }
>>>>>>> origin/main
}

/**
 * Register date serializer for specific content types
 * Use this for route-local registration
 */
export function registerDateSerializerForRoute(
<<<<<<< HEAD
	fastify: FastifyInstance,
	options: DateSerializerOptions = {}
) {
	const serializer = createDateSerializer(options)

	// Register for JSON responses only
	fastify.setSerializerCompiler(({ schema }) => {
		// Only apply to responses that include Date fields
		if (typeof schema === 'object' && 'properties' in schema) {
			const hasDateFields = Object.values(schema.properties ?? {}).some(
				(prop: unknown) =>
					typeof prop === 'object' &&
					prop !== null &&
					'type' in prop &&
					prop.type === 'string' &&
					'format' in prop &&
					prop.format === 'date-time'
			)

			if (hasDateFields) {
				return (data: unknown) => {
					return JSON.stringify(data, (_key, value) => {
						if (value instanceof Date) {
							return serializer.call(fastify, value)
						}
						return value as unknown
					})
				}
			}
		}

		// Fallback to default JSON serialization
		return JSON.stringify
	})
=======
  fastify: FastifyInstance, 
  options: DateSerializerOptions = {}
) {
  const serializer = createDateSerializer(options)
  
  // Register for JSON responses only
  fastify.setSerializerCompiler(({ schema }) => {
    // Only apply to responses that include Date fields
    if (schema && typeof schema === 'object' && 'properties' in schema) {
      const hasDateFields = Object.values(schema.properties || {}).some(
        (prop: unknown) => typeof prop === 'object' && prop !== null && 'type' in prop && prop.type === 'string' && 'format' in prop && prop.format === 'date-time'
      )
      
      if (hasDateFields) {
        return (data: unknown) => {
          return JSON.stringify(data, (key, value) => {
            if (value instanceof Date) {
              return serializer.call(fastify, value)
            }
            return value
          })
        }
      }
    }
    
    // Fallback to default JSON serialization
    return JSON.stringify
  })
>>>>>>> origin/main
}

/**
 * Schema helper for OpenAPI documentation
 * Use this to mark Date fields in your DTOs/schemas
 */
export const DateTimeSchema = {
<<<<<<< HEAD
	type: 'string',
	format: 'date-time',
	example: '2023-12-01T10:30:45Z',
	description: 'ISO 8601 date-time string in UTC'
=======
  type: 'string',
  format: 'date-time',
  example: '2023-12-01T10:30:45Z',
  description: 'ISO 8601 date-time string in UTC'
>>>>>>> origin/main
} as const

/**
 * Route schema example showing proper Date serialization
 * Add this to controllers that return Date objects
 */
export const ResponseWithTimestampSchema = {
<<<<<<< HEAD
	type: 'object',
	properties: {
		success: { type: 'boolean' },
		data: { type: 'object' },
		message: { type: 'string' },
		timestamp: DateTimeSchema
	},
	required: ['success', 'data', 'message', 'timestamp']
} as const
=======
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: { type: 'object' },
    message: { type: 'string' },
    timestamp: DateTimeSchema
  },
  required: ['success', 'data', 'message', 'timestamp']
} as const
>>>>>>> origin/main
