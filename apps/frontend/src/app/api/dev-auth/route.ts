/**
 * Development-only authentication route for dashboard testing
 * CLAUDE.md Compliance: Native Next.js API route, production safety guards
 * Purpose: Enable dashboard access without full authentication flow
 */
import { NextRequest, NextResponse } from 'next/server'
import { canUseMockAuth } from '@/lib/mock-auth-data'

/**
 * GET /api/dev-auth
 * Sets mock authentication cookies and redirects to dashboard
 * Only available in development mode with ENABLE_MOCK_AUTH=true
 */
export async function GET(request: NextRequest) {
  // Production safety guard - return 404 if not in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Development auth endpoint not available in production' }, 
      { status: 404 }
    )
  }

  // Additional safety check using mock auth utility
  if (!canUseMockAuth()) {
    return NextResponse.json(
      { 
        error: 'Mock authentication not enabled', 
        hint: 'Set ENABLE_MOCK_AUTH=true in your .env.local file' 
      }, 
      { status: 403 }
    )
  }

  // Create redirect response to dashboard
  const dashboardUrl = new URL('/dashboard', request.url)
  const response = NextResponse.redirect(dashboardUrl)

  // Set mock authentication cookies that middleware will recognize
  // Using the same cookie names that middleware checks for
  const cookieOptions = {
    httpOnly: true,
    secure: false, // Development only - secure: false in development
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/'
  }

  // Set primary auth cookie that middleware checks first
  response.cookies.set('sb-access-token', 'mock-dev-token-123', cookieOptions)
  
  // Set backup auth cookies for redundancy (middleware checks multiple names)
  response.cookies.set('supabase-auth-token', 'mock-dev-backup-token', cookieOptions)
  
  // Set additional mock session data
  response.cookies.set('mock-user-id', 'mock-user-dev-123', {
    ...cookieOptions,
    httpOnly: false // Allow client-side access for debugging
  })

  // Development logging
  console.info('[Dev Auth] Mock authentication cookies set, redirecting to dashboard')
  console.info('[Dev Auth] User will be authenticated as: test@tenantflow.dev')
  console.info('[Dev Auth] Mock session expires in 24 hours')

  return response
}

/**
 * POST /api/dev-auth
 * Clears mock authentication cookies for testing logout scenarios
 */
export async function POST() {
  // Production safety guard
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Development auth endpoint not available in production' }, 
      { status: 404 }
    )
  }

  if (!canUseMockAuth()) {
    return NextResponse.json(
      { error: 'Mock authentication not enabled' }, 
      { status: 403 }
    )
  }

  // Create response that clears all auth cookies
  const response = NextResponse.json({ 
    success: true, 
    message: 'Mock authentication cleared' 
  })

  // Clear all authentication cookies
  const clearCookieOptions = {
    maxAge: 0,
    path: '/'
  }

  response.cookies.set('sb-access-token', '', clearCookieOptions)
  response.cookies.set('supabase-auth-token', '', clearCookieOptions)
  response.cookies.set('supabase.auth.token', '', clearCookieOptions)
  response.cookies.set('mock-user-id', '', clearCookieOptions)

  console.info('[Dev Auth] Mock authentication cookies cleared')

  return response
}