import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    // Avoid using supabase-js in Edge runtime (middleware). Rely on cookies only.
    // Supabase cookies (when using SSR helpers) are typically `sb-access-token` and `sb-refresh-token`.
    const hasAccessToken = Boolean(request.cookies.get('sb-access-token')?.value)
    const isAuthenticated = hasAccessToken

    const pathname = request.nextUrl.pathname

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.info(`[Middleware] ${pathname} - Auth: ${isAuthenticated ? 'Yes' : 'No'}`)
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
