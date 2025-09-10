import { type NextRequest, NextResponse } from 'next/server'
import { supabaseClient } from '@repo/shared/lib/supabase-client'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    // Get the current session using the shared client
    const {
      data: { session },
      error,
    } = await supabaseClient.auth.getSession()

    const user = error ? null : session?.user ?? null
    
    if (error) {
      console.error('[Middleware] Session error:', error)
    }

  const pathname = request.nextUrl.pathname

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.info(`[Middleware] ${pathname} - User: ${user ? user.email : 'None'}`)
  }

  // Define protected routes - these require authentication
  const protectedRoutes = ['/dashboard']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Define public routes that should redirect to dashboard if logged in
  const publicAuthRoutes = ['/auth/login', '/auth/register', '/auth/sign-up', '/login']
  const isPublicAuthRoute = publicAuthRoutes.some(route => pathname === route)

  // Redirect unauthenticated users to login if accessing protected routes
  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/auth/login', request.url)
    // Optional: Add the attempted URL as a query parameter for post-login redirect
    loginUrl.searchParams.set('redirectTo', pathname)
    
    if (process.env.NODE_ENV === 'development') {
      console.info(`[Middleware] Redirecting to login: ${loginUrl}`)
    }
    
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users to dashboard if accessing auth pages
  if (isPublicAuthRoute && user) {
    const dashboardUrl = new URL('/dashboard', request.url)
    
    if (process.env.NODE_ENV === 'development') {
      console.info(`[Middleware] Authenticated user on auth page, redirecting to dashboard: ${dashboardUrl}`)
    }
    
    return NextResponse.redirect(dashboardUrl)
  }

  if (process.env.NODE_ENV === 'development' && user && isProtectedRoute) {
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