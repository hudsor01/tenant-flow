import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  const pathname = request.nextUrl.pathname

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Middleware] ${pathname} - User: ${user ? user.email : 'None'}`)
  }

  // Define protected routes - all dashboard routes require authentication
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
      console.log(`[Middleware] Redirecting to login: ${loginUrl}`)
    }
    
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users to dashboard if accessing auth pages
  if (isPublicAuthRoute && user) {
    const dashboardUrl = new URL('/dashboard', request.url)
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Middleware] Authenticated user on auth page, redirecting to dashboard: ${dashboardUrl}`)
    }
    
    return NextResponse.redirect(dashboardUrl)
  }

  if (process.env.NODE_ENV === 'development' && user && isProtectedRoute) {
    console.log(`[Middleware] Allowing authenticated access to ${pathname}`)
  }

  return supabaseResponse
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