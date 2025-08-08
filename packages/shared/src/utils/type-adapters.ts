/**
 * Type Adapter Utilities
 * Provides type-safe bridges between domain types and API layer requirements
 */

/**
 * Generic type adapter interface that ensures type safety while satisfying API requirements
 */
export interface TypeAdapter<TDomain, TApi extends Record<string, unknown>> {
  toApi: (domain: TDomain) => TApi
  fromApi: (api: TApi) => TDomain
}

/**
 * Creates a type-safe query parameter adapter
 * Ensures domain query types are properly converted to API-compatible formats
 */
export function createQueryAdapter<T extends Record<string, unknown>>(
  query?: T
): Record<string, unknown> {
  if (!query) return {}
  
  // Filter out undefined values and ensure proper serialization
  const filtered: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      // Handle nested objects by serializing them
      if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        filtered[key] = JSON.stringify(value)
      } else if (value instanceof Date) {
        filtered[key] = value.toISOString()
      } else {
        filtered[key] = value
      }
    }
  }
  
  return filtered
}

/**
 * Creates a type-safe mutation data adapter
 * Ensures domain input types are properly converted to API-compatible formats
 */
export function createMutationAdapter<T extends Record<string, unknown>>(
  data: T
): Record<string, unknown> {
  // Ensure all required fields are present and properly typed
  const adapted: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      // Handle Date objects
      if (value instanceof Date) {
        adapted[key] = value.toISOString()
      } 
      // Handle arrays
      else if (Array.isArray(value)) {
        adapted[key] = value
      }
      // Handle nested objects  
      else if (typeof value === 'object' && value !== null) {
        adapted[key] = value
      }
      // Handle primitive types
      else {
        adapted[key] = value
      }
    }
  }
  
  return adapted
}

/**
 * Type-safe parameter validator that ensures required fields are present
 */
export function validateApiParams<T extends Record<string, unknown>>(
  params: T,
  requiredFields: (keyof T)[]
): asserts params is T & Required<Pick<T, typeof requiredFields[number]>> {
  for (const field of requiredFields) {
    if (params[field] === undefined || params[field] === null) {
      throw new Error(`Required field '${String(field)}' is missing`)
    }
  }
}

/**
 * Creates a type-safe response adapter
 * Converts API responses back to domain types with proper type checking
 */
export function createResponseAdapter<TApi, TDomain>(
  apiData: TApi,
  transformer: (data: TApi) => TDomain
): TDomain {
  try {
    return transformer(apiData)
  } catch (error) {
    throw new Error(`Failed to transform API response: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Enum validation helper
 * Ensures enum values are valid and provides type safety
 */
export function validateEnumValue<T extends Record<string, string>>(
  value: string,
  enumObject: T,
  fallback?: T[keyof T]
): T[keyof T] {
  const enumValues = Object.values(enumObject)
  if (enumValues.includes(value as T[keyof T])) {
    return value as T[keyof T]
  }
  
  if (fallback !== undefined) {
    return fallback
  }
  
  throw new Error(`Invalid enum value '${value}'. Valid values are: ${enumValues.join(', ')}`)
}

/**
 * Utility to safely convert strings to numbers for query parameters
 */
export function safeParseNumber(value: string | number | undefined): number | undefined {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? undefined : parsed
  }
  return undefined
}

/**
 * Utility to safely convert strings to dates for API parameters
 */
export function safeParseDate(value: string | Date | undefined): Date | undefined {
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const parsed = new Date(value)
    return isNaN(parsed.getTime()) ? undefined : parsed
  }
  return undefined
}

/**
 * Type-safe deep merge utility for combining API parameters
 */
export function mergeApiParams<T extends Record<string, unknown>, U extends Record<string, unknown>>(
  base: T,
  override: U
): T & U {
  return { ...base, ...override }
}

/**
 * Creates a typed API call wrapper that ensures proper parameter conversion
 */
export function createApiCall<TParams extends Record<string, unknown>>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'
): {
  endpoint: string
  method: string
  prepareParams: (params: TParams) => Record<string, unknown>
  prepareData: (data: TParams) => Record<string, unknown>
} {
  return {
    endpoint,
    method,
    prepareParams: (params: TParams): Record<string, unknown> => createQueryAdapter(params),
    prepareData: (data: TParams): Record<string, unknown> => createMutationAdapter(data),
  }
}

// Type guards for common API parameter validation
export function isValidQueryParam(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

export function isValidMutationData(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Error handling utilities for type adapter operations
 */
export class TypeAdapterError extends Error {
  constructor(
    message: string,
    public readonly operation: 'query' | 'mutation' | 'response',
    public readonly originalData: unknown
  ) {
    super(message)
    this.name = 'TypeAdapterError'
  }
}

export function handleAdapterError(error: unknown, operation: 'query' | 'mutation' | 'response', data: unknown): never {
  if (error instanceof Error) {
    throw new TypeAdapterError(error.message, operation, data)
  }
  throw new TypeAdapterError('Unknown adapter error', operation, data)
}