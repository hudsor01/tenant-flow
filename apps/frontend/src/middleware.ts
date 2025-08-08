import { type NextRequest, NextResponse } from 'next/server'
import { applyEnhancedSecurityHeaders } from '@/lib/security/enhanced-security-headers'

export function middleware(request: NextRequest) {
  // Create response
  const response = NextResponse.next()
  
  // Apply security headers
  applyEnhancedSecurityHeaders(response, request)
  
  return response
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - api routes (API endpoints)
     * - favicon.ico (favicon file)
     * - public folder files
     * - files with extensions (css, js, json, xml, etc.)
     */
    '/((?!api/|_next/static|_next/image|_next/webpack-hmr|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|json|xml|ico|woff|woff2|ttf|eot)$).*)',
  ],
}