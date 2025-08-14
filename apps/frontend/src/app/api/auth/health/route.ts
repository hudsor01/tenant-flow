import { NextResponse } from 'next/server'
import { authHealthChecker } from '@/lib/auth/auth-health-check'

/**
 * GET /api/auth/health
 * Returns comprehensive auth system health status
 */
export async function GET(request: Request) {
  try {
    // Check for admin authorization in production
    if (process.env.NODE_ENV === 'production') {
      const authHeader = request.headers.get('authorization')
      const expectedToken = process.env.AUTH_HEALTH_CHECK_TOKEN
      
      if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }
    
    // Run health check
    const status = await authHealthChecker.runHealthCheck()
    
    // Return appropriate status code based on health
    const statusCode = status.overall === 'healthy' ? 200 :
                      status.overall === 'degraded' ? 200 : 503
    
    // Check for HTML format request
    const acceptHeader = request.headers.get('accept')
    if (acceptHeader?.includes('text/html')) {
      const html = authHealthChecker.generateHTMLReport(status)
      return new NextResponse(html, {
        status: statusCode,
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      })
    }
    
    // Return JSON by default
    return NextResponse.json(status, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (error) {
    console.error('Auth health check failed:', error)
    
    return NextResponse.json(
      {
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}