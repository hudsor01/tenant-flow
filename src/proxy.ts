import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { env } from '#env'
import { updateSession } from '#lib/supabase/middleware'

/** Stripe subscription statuses that grant dashboard access. */
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])

/**
 * Public routes that skip auth checks.
 * Token refresh (updateSession) still runs for cookie freshness.
 */
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/pricing',
  '/about',
  '/blog',
  '/contact',
  '/faq',
  '/features',
  '/help',
  '/privacy',
  '/terms',
  '/security-policy',
  '/support',
  '/resources',
  '/compare',
  '/search',
  '/accept-invite',
  '/auth/callback',
  '/auth/confirm-email',
  '/auth/post-checkout',
  '/auth/update-password',
  '/auth/signout',
  '/auth/select-role',
]

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  )
}

/**
 * Helper: copy all Supabase cookies from supabaseResponse to a redirect
 * response. Prevents session loss on proxy redirects.
 */
function redirectWithCookies(
  url: URL,
  supabaseResponse: NextResponse
): NextResponse {
  const redirectResponse = NextResponse.redirect(url)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
  })
  return redirectResponse
}

// Next.js 16: proxy.ts replaces deprecated middleware.ts
export async function proxy(
  request: NextRequest
): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  const { user, supabaseResponse } = await updateSession(request)

  // Public routes: return supabaseResponse (token refresh only, no auth check)
  if (isPublicRoute(pathname)) {
    return supabaseResponse
  }

  // Unauthenticated: redirect to login with redirect param
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return redirectWithCookies(url, supabaseResponse)
  }

  // Role-based route enforcement
  const userType = user.app_metadata?.user_type as string | undefined

  // /admin/* is admin-only. Non-admin users (OWNER / TENANT / PENDING)
  // are redirected to their primary surface. This is the first gate;
  // the (admin) route group's layout.tsx performs a second check.
  if (pathname.startsWith('/admin')) {
    if (userType !== 'ADMIN') {
      const fallback = userType === 'TENANT' ? '/tenant' : '/dashboard'
      return redirectWithCookies(
        new URL(fallback, request.url),
        supabaseResponse
      )
    }
  }

  // TENANT accessing owner routes
  if (userType === 'TENANT' && pathname.startsWith('/dashboard')) {
    return redirectWithCookies(
      new URL('/tenant', request.url),
      supabaseResponse
    )
  }

  // OWNER or ADMIN accessing tenant routes
  if (
    (userType === 'OWNER' || userType === 'ADMIN') &&
    pathname.startsWith('/tenant')
  ) {
    return redirectWithCookies(
      new URL('/dashboard', request.url),
      supabaseResponse
    )
  }

  // PENDING or no user_type on non-auth routes -> select role
  if (
    (userType === 'PENDING' || !userType) &&
    !pathname.startsWith('/auth/')
  ) {
    return redirectWithCookies(
      new URL('/auth/select-role', request.url),
      supabaseResponse
    )
  }

  // Subscription gate: OWNER must have an active or trialing Stripe subscription
  // to access the dashboard. Webhook handlers (stripe-webhooks Edge Function)
  // keep public.users.subscription_status in sync with Stripe in real-time.
  // Allowlist: /pricing (plan selection), /billing/checkout and /billing/plans
  // (Stripe checkout flow), /auth/* (already public, defense-in-depth).
  if (
    userType === 'OWNER' &&
    !pathname.startsWith('/pricing') &&
    !pathname.startsWith('/billing/checkout') &&
    !pathname.startsWith('/billing/plans') &&
    !pathname.startsWith('/auth/')
  ) {
    // Read subscription_status with the user's session (RLS allows users to read
    // their own row). Single PK lookup, ~5ms — proxy already does an auth.getUser
    // round trip so this is the second round trip per request.
    const subClient = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {},
        },
      }
    )
    const { data: row } = await subClient
      .from('users')
      .select('subscription_status')
      .eq('id', user.id)
      .maybeSingle()

    const status = row?.subscription_status as string | null | undefined
    if (!status || !ACTIVE_SUBSCRIPTION_STATUSES.has(status)) {
      return redirectWithCookies(
        new URL('/pricing', request.url),
        supabaseResponse
      )
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|monitoring|api/).*)',
  ],
}
