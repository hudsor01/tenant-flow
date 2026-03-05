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
 * response. Prevents session loss on middleware redirects (Pitfall 2).
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

export async function middleware(
  request: NextRequest
): Promise<NextResponse> {
  const { user, supabaseResponse } = await updateSession(request)
  const { pathname } = request.nextUrl

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

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|monitoring|api/).*)',
  ],
}
