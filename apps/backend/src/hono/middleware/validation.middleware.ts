import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import type { Context, Next } from 'hono'

// Request size validation middleware
export const validateRequestSize = (maxSize: number = 10 * 1024 * 1024) => // 10MB default
  createMiddleware(async (c: Context, next: Next) => {
    const contentLength = c.req.header('content-length')
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      throw new HTTPException(413, {
        message: `Request body too large. Maximum size allowed is ${Math.round(maxSize / 1024 / 1024)}MB`,
        cause: 'PAYLOAD_TOO_LARGE'
      })
    }
    
    await next()
  })

// Content-Type validation middleware
export const validateContentType = (allowedTypes: string[] = ['application/json']) =>
  createMiddleware(async (c: Context, next: Next) => {
    const method = c.req.method
    
    // Skip validation for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      await next()
      return
    }
    
    const contentType = c.req.header('content-type')
    
    if (!contentType) {
      throw new HTTPException(400, {
        message: 'Content-Type header is required',
        cause: 'MISSING_CONTENT_TYPE'
      })
    }
    
    const isAllowed = allowedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    )
    
    if (!isAllowed) {
      throw new HTTPException(415, {
        message: `Unsupported media type. Allowed types: ${allowedTypes.join(', ')}`,
        cause: 'UNSUPPORTED_MEDIA_TYPE'
      })
    }
    
    await next()
  })

// API versioning middleware
export const validateApiVersion = (supportedVersions: string[] = ['v1']) =>
  createMiddleware(async (c: Context, next: Next) => {
    const path = c.req.path
    const versionMatch = path.match(/\/api\/([^/]+)/)
    
    if (versionMatch) {
      const version = versionMatch[1]
      
      if (!supportedVersions.includes(version)) {
        throw new HTTPException(400, {
          message: `Unsupported API version: ${version}. Supported versions: ${supportedVersions.join(', ')}`,
          cause: 'UNSUPPORTED_API_VERSION'
        })
      }
    }
    
    await next()
  })

// Request timeout middleware
export const requestTimeout = (timeoutMs = 30000) => // 30 seconds default
  createMiddleware(async (c: Context, next: Next) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, timeoutMs)
    
    try {
      // Add abort signal to request context if needed
      c.set('abortController', controller)
      
      await next()
      
      clearTimeout(timeoutId)
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (controller.signal.aborted) {
        throw new HTTPException(408, {
          message: 'Request timeout',
          cause: 'REQUEST_TIMEOUT'
        })
      }
      
      throw error
    }
  })

// User-Agent validation middleware (basic bot detection)
export const validateUserAgent = createMiddleware(async (c: Context, next: Next) => {
  const userAgent = c.req.header('user-agent')
  
  // Block requests without User-Agent (potential bots/scrapers)
  if (!userAgent || userAgent.trim().length === 0) {
    throw new HTTPException(400, {
      message: 'User-Agent header is required',
      cause: 'MISSING_USER_AGENT'
    })
  }
  
  // Basic bot detection patterns
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python-requests/i
  ]
  
  const isBot = botPatterns.some(pattern => pattern.test(userAgent))
  
  if (isBot) {
    // Log bot access but don't block (might be legitimate)
    console.log(`Bot detected: ${userAgent} from ${c.req.header('x-forwarded-for') || 'unknown'}`)
  }
  
  await next()
})

// Health check validation middleware
export const healthCheckMiddleware = createMiddleware(async (c: Context, next: Next) => {
  const path = c.req.path
  
  // Allow health check endpoints without auth
  if (path === '/health' || path === '/api/health') {
    return c.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0'
    })
  }
  
  await next()
})