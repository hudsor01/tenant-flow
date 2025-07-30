/**
 * Edge function to warm critical routes
 * Runs every 6 hours to ensure hot cache for key pages
 */
export const config = {
  runtime: 'edge',
  regions: ['iad1', 'sfo1', 'lhr1', 'hnd1', 'bom1']
}

const CRITICAL_ROUTES = [
  '/',
  '/pricing',
  '/lease-generator',
  '/blog',
  '/login',
  '/signup'
]

export default async function handler(req) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  
  // Simple token validation (use environment variable in production)
  if (token !== process.env.CACHE_WARM_TOKEN) {
    return new Response('Unauthorized', { status: 401 })
  }

  const origin = req.headers.get('origin') || 'https://tenantflow.app'
  const results = []

  try {
    // Warm critical routes
    const warmPromises = CRITICAL_ROUTES.map(async (route) => {
      try {
        const response = await fetch(`${origin}${route}`, {
          method: 'GET',
          headers: {
            'User-Agent': 'TenantFlow-CacheWarmer/1.0',
            'Cache-Control': 'no-cache',
            'X-Cache-Warm': 'true'
          }
        })
        
        results.push({
          route,
          status: response.status,
          headers: {
            'cache-control': response.headers.get('cache-control'),
            'x-vercel-cache': response.headers.get('x-vercel-cache')
          }
        })
        
        return { route, success: true, status: response.status }
      } catch (error) {
        results.push({
          route,
          error: error.message
        })
        return { route, success: false, error: error.message }
      }
    })

    await Promise.allSettled(warmPromises)

    return new Response(JSON.stringify({
      success: true,
      warmed: results.length,
      results,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })
  }
}