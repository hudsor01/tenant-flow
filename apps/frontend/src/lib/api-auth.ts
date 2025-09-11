/**
 * API Route Authentication Utilities
 * 
 * Official Supabase pattern for Next.js App Router API routes
 * https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@repo/shared'

/**
 * Authentication result for API routes
 */
export interface ApiAuthResult {
  user: User | null
  error?: string
  supabase: ReturnType<typeof createServerClient<Database>>
}

/**
 * Create authenticated Supabase client for API routes
 * Following official Supabase App Router pattern
 */
export async function createApiClient(): Promise<ApiAuthResult> {
  const cookieStore = await cookies()
  
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      return {
        user: null,
        error: error.message,
        supabase,
      }
    }

    return {
      user,
      supabase,
    }
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error.message : 'Authentication failed',
      supabase,
    }
  }
}

/**
 * Require authentication for API route
 * Returns 401 response if user is not authenticated
 */
export async function requireAuth(): Promise<
  | { user: User; supabase: ReturnType<typeof createServerClient<Database>> }
  | NextResponse
> {
  const { user, error, supabase } = await createApiClient()

  if (!user || error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Authentication required',
        message: error || 'User not authenticated',
      },
      { status: 401 }
    )
  }

  return { user, supabase }
}

/**
 * Create error response for API routes
 */
export function createApiError(
  message: string,
  status: number = 400,
  error?: string
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: error || 'Request failed',
      message,
    },
    { status }
  )
}

/**
 * Create success response for API routes
 */
export function createApiSuccess<T = unknown>(
  data: T,
  message?: string
): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    ...(message && { message }),
  })
}