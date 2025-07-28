import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

/**
 * Safe wrapper for zValidator to avoid TypeScript deep instantiation issues
 * This prevents the "Type instantiation is excessively deep" error
 * by breaking the type inference chain while maintaining runtime validation
 * 
 * Note: Using `any` here is necessary to avoid TypeScript's deep instantiation errors
 * with complex Zod schemas. The runtime validation with Zod is still fully functional.
 * This is a known limitation with Hono + Zod integration in complex TypeScript projects.
 */
export const safeValidator = (schema: z.ZodTypeAny): any => {
  return (zValidator as any)('json', schema)
}

/**
 * Safe validator for query parameters
 * Note: Using `any` return type to avoid TypeScript deep instantiation errors
 */
export const safeQueryValidator = (schema: z.ZodTypeAny): any => {
  return (zValidator as any)('query', schema)
}

/**
 * Safe validator for form data
 * Note: Using `any` return type to avoid TypeScript deep instantiation errors
 */
export const safeFormValidator = (schema: z.ZodTypeAny): any => {
  return (zValidator as any)('form', schema)
}

/**
 * Safe validator for route parameters
 * Note: Using `any` return type to avoid TypeScript deep instantiation errors
 */
export const safeParamValidator = (schema: z.ZodTypeAny): any => {
  return (zValidator as any)('param', schema)
}