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
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}