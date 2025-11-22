// Import auth types from shared package
import type { SupabaseAuthUser, GoogleOAuthUser, AuthUser } from '@repo/shared/types/auth'

// For backward compatibility with existing code
export type { SupabaseAuthUser, GoogleOAuthUser, AuthUser }
export type { SupabaseAuthUser as User }
export type { Database } from '@repo/shared/types/supabase'
