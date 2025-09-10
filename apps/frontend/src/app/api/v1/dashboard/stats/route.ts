import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { logger } from '@repo/shared/lib/frontend-logger'

// In development, proxy to the real production backend
// In production, Vercel handles the rewrite directly
const BACKEND_URL = 'https://api.tenantflow.app/api/v1'

export async function GET(request: NextRequest) {
  try {
    logger.info(`Proxying to production backend: ${BACKEND_URL}/dashboard/stats`)
    
    const response = await fetch(`${BACKEND_URL}/dashboard/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward any auth headers if present
        ...(request.headers.get('authorization') && {
          'authorization': request.headers.get('authorization') || ''
        })
      }
    })
    
    logger.info(`Backend response status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(`Backend error response: ${errorText}`)
      throw new Error(`Backend API responded with ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    })
  } catch (error) {
    logger.error({ error }, 'API proxy error')
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to fetch dashboard stats from production backend'
      },
      { status: 500 }
    )
  }
}