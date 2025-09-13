/**
 * Mock Authentication Status API Route
 * CLAUDE.md Compliance: Native Next.js API route, production safety guards
 */
import { NextRequest, NextResponse } from 'next/server'
import { canUseMockAuth } from '@/lib/mock-auth-data'

/**
 * GET /api/dev-auth/status
 * Returns current mock authentication status for debugging
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ available: false }, { status: 404 })
  }

  const cookies = request.cookies
  const hasAuthCookie = Boolean(
    cookies.get('sb-access-token')?.value ||
    cookies.get('supabase-auth-token')?.value ||
    cookies.get('supabase.auth.token')?.value
  )

  const mockEnabled = canUseMockAuth()

  return NextResponse.json({
    available: true,
    mockAuthEnabled: mockEnabled,
    hasAuthCookie,
    environment: process.env.NODE_ENV,
    cookies: {
      'sb-access-token': cookies.get('sb-access-token')?.value ? 'present' : 'missing',
      'supabase-auth-token': cookies.get('supabase-auth-token')?.value ? 'present' : 'missing',
      'mock-user-id': cookies.get('mock-user-id')?.value ? 'present' : 'missing'
    }
  })
}