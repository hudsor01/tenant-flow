import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * Auth Confirmation Route Handler
 * Exchanges Supabase Auth token_hash from email link for a session
 * Called after user clicks invitation email link
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/tenant/onboarding'

  if (token_hash && type) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
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
          }
        }
      }
    )

    // Verify OTP and exchange for session
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as EmailOtpType
    })

    if (!error) {
      // Session stored in cookies automatically
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // Redirect to error page if verification fails
  return NextResponse.redirect(new URL('/error?message=Invalid+invitation+link', request.url))
}
