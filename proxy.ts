import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '#lib/supabase/middleware'

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

  // Subscription gate: OWNER who has never subscribed (no stripe_customer_id)
  // must complete checkout before accessing the dashboard.
  // Lapsed subscriptions (canceled/unpaid) are handled client-side by
  // SubscriptionStatusBanner since they still have a stripe_customer_id.
  if (
    userType === 'OWNER' &&
    !user.app_metadata?.stripe_customer_id &&
    !pathname.startsWith('/pricing') &&
    !pathname.startsWith('/billing') &&
    !pathname.startsWith('/auth/')
  ) {
    return redirectWithCookies(
      new URL('/pricing', request.url),
      supabaseResponse
    )
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|monitoring|api/).*)',
  ],
}
