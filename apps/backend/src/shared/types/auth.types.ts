// Import auth types from shared package
import type { SupabaseAuthUser, GoogleOAuthUser } from '@repo/shared/types/auth'

// For backward compatibility with existing code
export type { SupabaseAuthUser, GoogleOAuthUser }
export type { SupabaseAuthUser as authUser, SupabaseAuthUser as User }
export type { Database } from '@repo/shared/types/supabase'
