import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;")

  try {
    // Check for Supabase auth cookies
    const cookies = request.cookies
    const hasSupabaseAuth = Boolean(
      cookies.get('sb-access-token')?.value ||
      cookies.get('supabase-auth-token')?.value ||
      cookies.get('supabase.auth.token')?.value
    )
    // Development-only mock authentication bypass
    // CLAUDE.md Compliance: Environment-based, production-safe, no abstractions
    const isDevelopment = process.env.NODE_ENV === 'development'
    const enableMockAuth = process.env.ENABLE_MOCK_AUTH === 'true'
    const isAuthenticated = (isDevelopment && enableMockAuth) || hasSupabaseAuth

    const pathname = request.nextUrl.pathname

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.info(`[Middleware] ${pathname} - Auth: ${isAuthenticated ? 'Yes' : 'No'}`)
      console.info(`[Middleware] Available cookies:`, request.cookies.toString())
    }

    // Define protected routes - these require authentication
    const protectedRoutes = ['/dashboard']
    const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

    // Define public routes that should redirect to dashboard if logged in
    const publicAuthRoutes = ['/auth/login', '/auth/register', '/auth/sign-up', '/login']
    const isPublicAuthRoute = publicAuthRoutes.some((route) => pathname === route)

    // Redirect unauthenticated users to login if accessing protected routes
    if (isProtectedRoute && !isAuthenticated) {
      const loginUrl = new URL('/auth/login', request.url)
      // Optional: Add the attempted URL as a query parameter for post-login redirect
      loginUrl.searchParams.set('redirectTo', pathname)

      if (process.env.NODE_ENV === 'development') {
        console.info(`[Middleware] Redirecting to login: ${loginUrl}`)
      }

      return NextResponse.redirect(loginUrl)
    }

    // Redirect authenticated users to dashboard if accessing auth pages
    if (isPublicAuthRoute && isAuthenticated) {
      const dashboardUrl = new URL('/dashboard', request.url)

      if (process.env.NODE_ENV === 'development') {
        console.info(
          `[Middleware] Authenticated user on auth page, redirecting to dashboard: ${dashboardUrl}`,
        )
      }

      return NextResponse.redirect(dashboardUrl)
    }

    if (process.env.NODE_ENV === 'development' && isAuthenticated && isProtectedRoute) {
      console.info(`[Middleware] Allowing authenticated access to ${pathname}`)
    }

    return response
  } catch (error) {
    console.error('[Middleware] Unexpected error:', error)
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
