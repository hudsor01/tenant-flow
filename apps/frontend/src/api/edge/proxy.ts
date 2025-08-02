/**
 * Edge Function for API Proxy
 * Optimizes API calls with edge caching and geographic routing
 */

export const config = {
  runtime: 'edge',
  regions: ['iad1', 'sfo1', 'lhr1', 'fra1', 'sin1']
}

// interface RequestContext {
//   url: string
//   method: string
//   headers: Headers
//   body?: ReadableStream<Uint8Array> | null
// }

class EdgeAPIProxy {
  private readonly API_BASE_URL = 'https://api.tenantflow.app'
  private readonly CACHE_HEADERS = {
    // API responses - short cache with aggressive revalidation
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300, stale-if-error=86400',
    'CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    'Vercel-CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    'Vary': 'Authorization, Accept-Encoding'
  }
  
  private readonly STATIC_CACHE_HEADERS = {
    // Static API data - longer cache for immutable responses
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600, stale-if-error=86400',
    'CDN-Cache-Control': 'public, s-maxage=300',
    'Vercel-CDN-Cache-Control': 'public, s-maxage=300'
  }

  /**
   * Determine if request can be cached at edge
   */
  private isCacheable(method: string, pathname: string): boolean {
    return method === 'GET' && 
           !pathname.includes('/auth/') &&
           !pathname.includes('/realtime') &&
           !pathname.includes('/websocket') &&
           !pathname.includes('/webhook') &&
           !pathname.includes('/billing/session')
  }

  /**
   * Determine if request should use static cache headers (longer TTL)
   */
  private isStaticData(pathname: string): boolean {
    return pathname.includes('/properties/') && !pathname.includes('/dashboard') ||
           pathname.includes('/lookup') ||
           pathname.includes('/meta') ||
           pathname.includes('/states') ||
           pathname.includes('/plans')
  }


  // Unused method - remove or use if needed for auth logging
  // private extractUserIdFromAuth(auth: string): string {
  //   if (!auth || !auth.startsWith('Bearer ')) return 'anonymous'
  //   
  //   try {
  //     // Extract user ID from JWT payload (simplified)
  //     const token = auth.split(' ')[1]
  //     if (!token) return 'invalid'
  //     
  //     const tokenParts = token.split('.')
  //     if (tokenParts.length !== 3 || !tokenParts[1]) return 'invalid'
  //     
  //     const payload = JSON.parse(atob(tokenParts[1]))
  //     return payload.sub || payload.user_id || 'unknown'
  //   } catch {
  //     return 'invalid'
  //   }
  // }

  /**
   * Add geographical routing headers
   */
  private addGeoHeaders(request: Request): HeadersInit {
    const geo = {
      country: request.headers.get('x-vercel-ip-country') || 'US',
      region: request.headers.get('x-vercel-ip-country-region') || '',
      city: request.headers.get('x-vercel-ip-city') || ''
    }

    return {
      'X-Forwarded-For': request.headers.get('x-forwarded-for') || '',
      'X-Vercel-IP-Country': geo.country,
      'X-Vercel-IP-Country-Region': geo.region,
      'X-Vercel-IP-City': geo.city,
      'X-Edge-Region': process.env.VERCEL_REGION || 'iad1'
    }
  }

  /**
   * Proxy request to backend API
   */
  async proxyRequest(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const apiPath = url.pathname.replace('/api', '')
    const targetUrl = `${this.API_BASE_URL}${apiPath}${url.search}`

    const proxyHeaders = new Headers(request.headers)
    
    // Add edge headers
    Object.entries(this.addGeoHeaders(request)).forEach(([key, value]) => {
      proxyHeaders.set(key, value)
    })

    // Remove Vercel-specific headers that shouldn't be forwarded
    proxyHeaders.delete('x-vercel-deployment-url')
    proxyHeaders.delete('x-vercel-forwarded-for')

    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: proxyHeaders,
        body: request.body
        // Note: AbortSignal.timeout not available in all edge runtimes
      })

      const responseHeaders = new Headers(response.headers)

      // Add caching headers for cacheable requests
      if (this.isCacheable(request.method, apiPath)) {
        const cacheHeaders = this.isStaticData(apiPath) 
          ? this.STATIC_CACHE_HEADERS 
          : this.CACHE_HEADERS
        
        Object.entries(cacheHeaders).forEach(([key, value]) => {
          responseHeaders.set(key, value)
        })
        
        // Add ETag for better cache validation
        const etag = response.headers.get('etag')
        if (etag) {
          responseHeaders.set('ETag', etag)
        }
      }

      // Add performance headers
      responseHeaders.set('X-Edge-Cache', 'MISS')
      responseHeaders.set('X-Response-Time', Date.now().toString())

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      })

    } catch (error) {
      console.error('Edge proxy error:', error)

      return new Response(
        JSON.stringify({
          error: 'Proxy Error',
          message: 'Failed to reach backend API',
          timestamp: new Date().toISOString()
        }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            'X-Edge-Error': 'true'
          }
        }
      )
    }
  }

  /**
   * Handle CORS preflight requests
   */
  handlePreflight(request: Request): Response {
    const origin = request.headers.get('origin')
    const allowedOrigins = [
      'https://tenantflow.app',
      'https://www.tenantflow.app',
      'http://localhost:5173',
      'http://localhost:3000'
    ]

    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }

    if (origin && allowedOrigins.includes(origin)) {
      corsHeaders['Access-Control-Allow-Origin'] = origin
    }

    return new Response(null, {
      status: 200,
      headers: corsHeaders
    })
  }
}

const edgeProxy = new EdgeAPIProxy()

export default async function handler(request: Request): Promise<Response> {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return edgeProxy.handlePreflight(request)
  }

  // Proxy all other requests
  return edgeProxy.proxyRequest(request)
}