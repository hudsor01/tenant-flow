/**
 * Server-side API client for Next.js App Router
 * Uses existing Supabase authentication pattern
 */
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@repo/shared'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL

/**
 * Server-side fetch with Supabase authentication
 * Pattern copied from login/actions.ts
 */
export async function serverFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const cookieStore = await cookies()

  // Create Supabase client with cookie handling (pattern from login/actions.ts)
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {} // Read-only for server components
      }
    }
  )

  // Get current session
  const { data: { session } } = await supabase.auth.getSession()

  // Make API request with Bearer token if available
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  // Add any additional headers from options
  if (options?.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers[key] = value
      }
    })
  }

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    // Use no-store for dashboard data that should be fresh
    cache: options?.cache || 'no-store'
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API Error (${response.status}): ${errorText || response.statusText}`)
  }

  const data = await response.json()

  // Handle API response format (success/data pattern)
  if (data.success === false) {
    throw new Error(data.error || data.message || 'API request failed')
  }

  // Return data directly or the whole response based on API format
  return data.data || data
}