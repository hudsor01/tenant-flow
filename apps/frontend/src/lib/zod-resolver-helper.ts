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
  // Cast schema to any to handle the type mismatch between
  // @hookform/resolvers and zod v4 - this is a known issue
  return originalZodResolver(schema as any) as Resolver<TFieldValues>
}