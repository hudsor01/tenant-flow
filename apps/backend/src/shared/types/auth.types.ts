import type { Database } from '@repo/shared'

// Use Database schema for User type - NO DUPLICATION
export type AuthenticatedUser = Database['public']['Tables']['User']['Row']
export type ValidatedUser = AuthenticatedUser  // Alias for backward compatibility
export type User = AuthenticatedUser  // Alias for backward compatibility
export type AuthServiceValidatedUser = AuthenticatedUser  // Alias for backward compatibility

// UserRole from Database enums
export type UserRole = Database['public']['Enums']['UserRole']

// Supabase User type
export type SupabaseUser = {
	id: string
	email: string
	user_metadata?: Record<string, unknown>
	app_metadata?: Record<string, unknown>
}

export interface RequestWithUser extends Request {
	user: AuthenticatedUser
}

export interface GoogleOAuthUser {
	id: string
	email: string
	name?: string
	picture?: string
	[key: string]: string | number | boolean | null | undefined
}
