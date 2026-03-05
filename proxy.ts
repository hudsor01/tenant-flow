import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '#lib/supabase/middleware'

// ---------------------------------------------------------------------------
// In-memory rate limiter for /monitoring (Sentry tunnel)
// Next.js middleware runs in a persistent process, so a Map works here.
// ---------------------------------------------------------------------------
const MONITORING_RATE_LIMIT = 60 // requests per window
const MONITORING_WINDOW_MS = 60_000 // 1 minute
const monitoringRateMap = new Map<string, { count: number; resetAt: number }>()
let monitoringRequestCount = 0

function getMonitoringIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const parts = xff.split(',')
    const first = parts[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip') ?? 'unknown'
}

function isMonitoringRateLimited(request: NextRequest): NextResponse | null {
  const ip = getMonitoringIp(request)
  const now = Date.now()

  // Periodic cleanup: every 100 requests, purge expired entries
  monitoringRequestCount++
  if (monitoringRequestCount % 100 === 0) {
    for (const [key, entry] of monitoringRateMap) {
      if (entry.resetAt < now) monitoringRateMap.delete(key)
    }
  }

  const entry = monitoringRateMap.get(ip)
  if (!entry || entry.resetAt < now) {
    // New window
    monitoringRateMap.set(ip, { count: 1, resetAt: now + MONITORING_WINDOW_MS })
    return null
  }

  entry.count++
  if (entry.count > MONITORING_RATE_LIMIT) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.max(retryAfter, 1)) },
      },
    )
  }

  return null
}

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

  // Rate limit Sentry tunnel (/monitoring) before any other processing
  if (pathname === '/monitoring' || pathname.startsWith('/monitoring/')) {
    const rateLimited = isMonitoringRateLimited(request)
    if (rateLimited) return rateLimited
  }

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

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|monitoring|api/).*)',
  ],
}
