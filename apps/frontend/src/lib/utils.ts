import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

/**
 * Check if Supabase environment variables are configured
 * Used by middleware to skip auth checks during local dev without env vars
 */
export const hasEnvVars =
	!!process.env.NEXT_PUBLIC_SUPABASE_URL &&
	!!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
