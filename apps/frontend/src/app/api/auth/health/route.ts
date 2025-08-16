import { NextResponse } from 'next/server'

// Force dynamic to prevent build-time issues
export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/health
 * Simple health check endpoint
 */
export async function GET() {
  try {
    // Simple health check - just verify env vars exist
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    const status = hasSupabaseUrl && hasSupabaseKey ? 'healthy' : 'unhealthy'
    
    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      checks: {
        supabase_url: hasSupabaseUrl,
        supabase_key: hasSupabaseKey
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}