import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines class names with Tailwind CSS merge support
 *
 * @param inputs - Class values to combine (strings, arrays, objects, or conditionals)
 * @returns Merged class string with Tailwind conflicts resolved
 *
 * @example
 * cn('p-4', 'p-2') // 'p-2' (latter wins)
 * cn('text-red-500', className) // merges with passed className
 * cn({ 'hidden': isHidden }, 'flex') // conditional classes
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

/**
 * Check if Supabase environment variables are configured
 * Used by middleware to skip auth checks during local dev without env vars
 *
 * Note: Uses process.env directly to avoid circular dependency with env.ts
 * during middleware initialization. The t3-env validation happens at build time.
 */
export const hasEnvVars =
	!!process.env.NEXT_PUBLIC_SUPABASE_URL &&
	!!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
