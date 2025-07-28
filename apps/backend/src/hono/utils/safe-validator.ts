import { zValidator } from '@hono/zod-validator'

/**
 * Safe wrapper for zValidator to avoid TypeScript deep instantiation issues
 * This prevents the "Type instantiation is excessively deep" error
 * by breaking the type inference chain completely
 * 
 * NOTE: This is intentionally typed as 'any' to avoid TS performance issues
 * The runtime validation is still fully functional
 */
export const safeValidator = (schema: any): any => {
  return zValidator('json', schema)
}

/**
 * Safe validator for query parameters
 */
export const safeQueryValidator = (schema: any): any => {
  return zValidator('query', schema)
}

/**
 * Safe validator for form data
 */
export const safeFormValidator = (schema: any): any => {
  return zValidator('form', schema)
}

/**
 * Safe validator for route parameters
 */
export const safeParamValidator = (schema: any): any => {
  return zValidator('param', schema)
}