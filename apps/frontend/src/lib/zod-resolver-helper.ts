import { zodResolver as originalZodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import type { Resolver, FieldValues } from 'react-hook-form'

/**
 * Type-safe wrapper for zodResolver that handles the v5 + Zod v4 compatibility issues
 * This avoids the need to use 'any' type casting throughout the codebase
 */
export function zodResolver<TFieldValues extends FieldValues>(
  schema: z.ZodType<TFieldValues>
): Resolver<TFieldValues> {
  // REQUIRED: Cast schema to any to handle the type mismatch between
  // @hookform/resolvers v5.2.1 and zod v4.0.14 - this is STILL an unresolved compatibility issue.
  // Multiple open GitHub issues exist (e.g. #800, #799, #793) regarding this compatibility problem.
  // Do NOT remove this disable until these upstream library issues are resolved.
  // Tested 2025-08-06: Direct resolver still fails TypeScript compilation.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return originalZodResolver(schema as any) as Resolver<TFieldValues>
}