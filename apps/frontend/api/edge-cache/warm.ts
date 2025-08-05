/**
 * Cache Warming Strategy for Vercel Edge Network
 * Preloads critical routes and API endpoints for optimal performance
 */

export const config = {
  runtime: 'edge',
  regions: ['iad1', 'sfo1', 'lhr1', 'fra1', 'sin1']
}

class CacheWarmer {
  private criticalRoutes = [
    '/',
    '/pricing',
    '/about',
    '/blog',
    '/contact',
    '/auth/login',
    '/auth/signup'
  ]
  
  private staticAPIEndpoints = [
    '/api/health',
    '/api/meta/app-info',
    '/api/lookup/states',
    '/api/billing/plans'
  ]

  /**
   * Warm critical routes
   */
  async warmRoutes(origin: string) {
    const results: Array<
      | { route: string; status: number; cached: boolean }
      | { route: string; status: 'error'; error: string }
    > = []
    
    for (const route of this.criticalRoutes) {
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
          cached: response.headers.get('x-vercel-cache') === 'HIT'
        })
      } catch (error) {
        results.push({
          route,
          status: 'error',
          error: (error as Error).message
        })
      }
    }
    
    return results
  }

  async warmAPIEndpoints(origin: string) {
    const results: Array<
      | { endpoint: string; status: number; cached: boolean }
      | { endpoint: string; status: 'error'; error: string }
    > = []
    
    for (const endpoint of this.staticAPIEndpoints) {
      try {
        const response = await fetch(`${origin}${endpoint}`, {
          method: 'GET',
          headers: {
            'User-Agent': 'TenantFlow-CacheWarmer/1.0',
            'Cache-Control': 'no-cache',
            'X-Cache-Warm': 'true'
          }
        })
        
        results.push({
          endpoint,
          status: response.status,
          cached: response.headers.get('x-vercel-cache') === 'HIT'
        })
      } catch (error) {
        results.push({
          endpoint,
          status: 'error',
          error: (error as Error).message
        })
      }
    }
    
    return results
  }
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Security check - only allow warming from specific origins
  const origin = new URL(request.url).origin
  const allowedOrigins = [
    'https://tenantflow.app',
    'https://www.tenantflow.app'
  ]
  
  const referer = request.headers.get('referer')
  if (!referer || !allowedOrigins.some(allowed => referer.startsWith(allowed))) {
    return new Response('Unauthorized', { status: 401 })
  }

  const warmer = new CacheWarmer()
  
  try {
    const [routeResults, apiResults] = await Promise.all([
      warmer.warmRoutes(origin),
      warmer.warmAPIEndpoints(origin)
    ])

    const report = {
      timestamp: new Date().toISOString(),
      origin,
      routes: routeResults,
      api: apiResults,
      summary: {
        routesWarmed: routeResults.filter(r => r.status === 200).length,
        apiEndpointsWarmed: apiResults.filter(r => r.status === 200).length,
        errors: [...routeResults, ...apiResults].filter(r => r.status === 'error').length
      }
    }

    return new Response(JSON.stringify(report, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Cache warming failed', 
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}