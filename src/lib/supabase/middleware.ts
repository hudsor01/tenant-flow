import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'

/**
 * Refreshes the Supabase auth session in middleware.
 *
 * Creates a Supabase server client that syncs cookies between the
 * incoming request and the outgoing response. Calls getUser() for
 * server-validated auth (never getSession()).
 *
 * Returns the authenticated user (or null) and the response with
 * updated cookies.
 */
export async function updateSession(
  request: NextRequest
): Promise<{ user: User | null; supabaseResponse: NextResponse }> {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Update request cookies for downstream server components
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Re-create response with updated request to keep cookies in sync
          // (Pitfall 1: must pass { request } to avoid cookie desync)
          supabaseResponse = NextResponse.next({ request })
          // Set cookies on the response for the browser
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Use getUser(), never getSession(), for server-validated auth.
  // getUser() validates the JWT with the Supabase auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { user, supabaseResponse }
}
