import { type NextRequest, NextResponse } from 'next/server'
import { applyEnhancedSecurityHeaders } from '@/lib/security/enhanced-security-headers'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Create Edge-compatible Supabase client
  const { supabase, response: supabaseResponse } = createMiddlewareClient(request)
  
  // Get current session
  const { data: { session } } = await supabase.auth.getSession()
  
  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/properties', '/tenants', '/leases', '/maintenance', '/profile']
  
  // Auth routes that should redirect if already authenticated
  const authRoutes = ['/login', '/signup', '/auth/login', '/auth/signup']
  
  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname === route)
  
  // Create response based on auth status
  let response: NextResponse
  
  if (isProtectedRoute && !session) {
    // Redirect to login if trying to access protected route without session
    response = NextResponse.redirect(new URL('/auth/login', request.url))
  } else if (isAuthRoute && session) {
    // Redirect to dashboard if already authenticated
    response = NextResponse.redirect(new URL('/dashboard', request.url))
  } else {
    // Use the Supabase response which has the cookies already set
    response = supabaseResponse
  }
  
  // Apply enhanced security headers
  applyEnhancedSecurityHeaders(response, request)
  
  return response
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files) - CRITICAL: Don't apply CSP to Next.js chunks
     * - _next/image (image optimization files)
     * - _next/ (all Next.js internal routes)
     * - api routes (API endpoints)
     * - favicon.ico (favicon file)  
     * - public folder files
     * - files with extensions (css, js, json, xml, etc.)
     */
    '/((?!api/|_next/|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|json|xml|ico|woff|woff2|ttf|eot)$).*)',
  ],
}