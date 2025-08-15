/**
 * TenantFlow Typed Supabase Client
 *
 * Pre-configured Supabase clients with full type safety.
 * Use these instead of raw createClient calls throughout the application.
 */

import { createClient, type SupabaseClient, type User, type Session, type AuthError } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

// ========================
// Client Configuration
// ========================

// Environment variables validation
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL) {
  throw new Error('Missing SUPABASE_URL environment variable')
}

if (!SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE_ANON_KEY environment variable')
}

// ========================
// Typed Client Instances
// ========================

/**
 * Client-side Supabase client with anonymous/authenticated access
 * Use this in frontend components and client-side API calls
 */
export const supabaseClient: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    db: {
      schema: 'public'
    }
  }
)

/**
 * Server-side admin client with full database access
 * ONLY use this in backend services where you need to bypass RLS
 * 
 * SECURITY WARNING: Never use this client with user input without validation
 */
export const supabaseAdmin: SupabaseClient<Database> = (() => {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_SERVICE_KEY required for admin client')
  }
  
  return createClient<Database>(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public'
      }
    }
  )
})()

// ========================
// Client Factory Functions
// ========================

/**
 * Create a user-scoped client for specific operations
 * Useful for operations that need to respect RLS with a specific user context
 */
export function createUserScopedClient(accessToken: string): SupabaseClient<Database> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase configuration')
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
    },
    db: {
      schema: 'public'
    }
  })
}

/**
 * Create a client for specific schema (useful for multi-tenant setups)
 * Example: createSchemaClient('tenant_123')
 */
export function createSchemaClient(schema: 'public' = 'public'): SupabaseClient<Database, typeof schema> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase configuration')
  }
  return createClient<Database, typeof schema>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: {
      schema: schema as 'public'
    }
  })
}

// ========================
// Type-Safe Query Helpers
// ========================

/**
 * Helper to create type-safe queries with proper error handling
 * 
 * Example:
 * const result = await createSafeQuery(
 *   supabaseClient.from('User').select('*').eq('id', userId)
 * )
 */
export async function createSafeQuery<T>(
  query: PromiseLike<{ data: T | null; error: unknown }>
): Promise<{ data: T; error: null } | { data: null; error: unknown }> {
  try {
    const result = await query
    if (result.error) {
      return { data: null, error: result.error }
    }
    return { data: result.data as T, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

// ========================
// Common Query Patterns
// ========================

/**
 * Get current authenticated user with type safety
 */
export async function getCurrentUser(): Promise<{ user: User | null; error: AuthError | null }> {
  const { data: { user }, error } = await supabaseClient.auth.getUser()
  return { user, error }
}

/**
 * Get user session with type safety  
 */
export async function getCurrentSession(): Promise<{ session: Session | null; error: AuthError | null }> {
  const { data: { session }, error } = await supabaseClient.auth.getSession()
  return { session, error }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabaseClient.auth.signOut()
  return { error }
}

// ========================
// Multi-tenant Helpers
// ========================

/**
 * Get organization-scoped data with automatic filtering
 * Ensures all queries are properly scoped to the user's organization
 */
export class OrganizationScopedClient {
  constructor(
    private client: SupabaseClient<Database>,
    private organizationId: string
  ) {}

  /**
   * Query properties for the current organization
   */
  properties(): ReturnType<SupabaseClient<Database>['from']> {
    return this.client
      .from('Property')
      .select('*')
      .eq('organizationId', this.organizationId)
  }

  /**
   * Query tenants for the current organization
   */
  tenants(): ReturnType<SupabaseClient<Database>['from']> {
    return this.client
      .from('Tenant')
      .select('*')
      .eq('organizationId', this.organizationId)
  }

  /**
   * Query maintenance requests for the current organization
   */
  maintenanceRequests(): ReturnType<SupabaseClient<Database>['from']> {
    return this.client
      .from('MaintenanceRequest')
      .select('*')
      .eq('organizationId', this.organizationId)
  }
}

/**
 * Create an organization-scoped client for multi-tenant operations
 */
export function createOrganizationClient(
  organizationId: string,
  client: SupabaseClient<Database> = supabaseClient
): OrganizationScopedClient {
  return new OrganizationScopedClient(client, organizationId)
}

// ========================
// Type Exports
// ========================

// Re-export useful types for consumers
export type { Database } from '../types/supabase'
export type { 
  Tables, 
  TablesInsert, 
  TablesUpdate, 
  Enums,
  QueryData,
  QueryError,
  TenantFlowUserMetadata,
  TenantFlowOrganizationSettings,
  TenantFlowPropertyMetadata
} from '../types/supabase'