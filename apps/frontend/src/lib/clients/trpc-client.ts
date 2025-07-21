/**
 * Unified API Client Configuration
 * 
 * This is the SINGLE source of truth for all API communication.
 * Frontend is purely frontend - all logic is handled by the backend.
 */

import { createTRPCReact } from '@trpc/react-query'
import { httpBatchLink } from '@trpc/client'
import { createClient } from '@supabase/supabase-js'
import superjson from 'superjson'
import { queryClient } from './query-client'
import { logger } from '../logger'
import type { AppRouter } from '../types/trpc'

// Network Information API types
interface NetworkInformation {
  effectiveType?: string
  downlink?: number
  rtt?: number
  saveData?: boolean
}

// Environment validation with enhanced debugging
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Environment debugging (development only)
if (import.meta.env.DEV) {
  logger.debug('Environment configuration', undefined, {
    API_BASE_URL: API_BASE_URL || 'MISSING',
    SUPABASE_URL: SUPABASE_URL ? '[CONFIGURED]' : 'MISSING',
    SUPABASE_ANON_KEY: SUPABASE_ANON_KEY ? '[CONFIGURED]' : 'MISSING',
    NODE_ENV: import.meta.env.NODE_ENV,
    DEV: import.meta.env.DEV,
    MODE: import.meta.env.MODE,
    BASE_URL: import.meta.env.BASE_URL,
    PROD: import.meta.env.PROD,
    SSR: import.meta.env.SSR,
    ALL_VITE_VARS: Object.entries(import.meta.env).filter(([key]) => key.startsWith('VITE_'))
  })

  // Browser network state debugging
  const navigatorWithConnection = navigator as Navigator & { connection?: NetworkInformation }
  logger.debug('Browser network state', undefined, {
    onLine: navigator.onLine,
    connection: navigatorWithConnection.connection ? {
      effectiveType: navigatorWithConnection.connection.effectiveType,
      downlink: navigatorWithConnection.connection.downlink,
      rtt: navigatorWithConnection.connection.rtt,
      saveData: navigatorWithConnection.connection.saveData
    } : 'Not available',
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled
  })

  if (!API_BASE_URL) {
    logger.error('Missing VITE_API_BASE_URL environment variable', undefined, {
      availableEnvVars: Object.keys(import.meta.env),
      message: 'Please check your .env.local file in apps/frontend/'
    })
  }
}

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL environment variable is required')
}

// Test API URL reachability
const testApiReachability = async () => {
  try {
    const testUrl = `${API_BASE_URL}/health`
    logger.debug('Testing API reachability', undefined, { testUrl })
    const response = await fetch(testUrl, { method: 'HEAD', mode: 'cors' })
    logger.debug('API reachability test result', undefined, {
      url: testUrl,
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    })
  } catch (error) {
    logger.warn('API reachability test failed (this is normal during app startup)', undefined, {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: error?.constructor?.name
    })
  }
}

// Run reachability test (non-blocking)
testApiReachability()

// TRPC React Query integration (SINGLE INSTANCE)
export const trpc = createTRPCReact<AppRouter>()

// Network monitoring setup
const networkEventListeners: (() => void)[] = []

const setupNetworkMonitoring = () => {
  const onOnline = () => {
    logger.info('Browser came online', undefined, { timestamp: new Date().toISOString() })
  }
  
  const onOffline = () => {
    logger.error('Browser went offline', undefined, { timestamp: new Date().toISOString() })
  }
  
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  
  networkEventListeners.push(() => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  })
}

// Setup network monitoring immediately
setupNetworkMonitoring()

// TRPC Client factory (SINGLE IMPLEMENTATION)
export const createTRPCClient = () => {
  const trpcUrl = `${API_BASE_URL}/trpc`
  
  if (import.meta.env.DEV) {
    logger.debug('Creating TRPC client', undefined, {
      baseUrl: API_BASE_URL,
      trpcUrl: trpcUrl,
      parsedUrl: {
        protocol: new URL(trpcUrl).protocol,
      hostname: new URL(trpcUrl).hostname,
      port: new URL(trpcUrl).port,
      pathname: new URL(trpcUrl).pathname,
      origin: new URL(trpcUrl).origin
    },
      currentLocation: {
        origin: window.location.origin,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        port: window.location.port
      },
      timestamp: new Date().toISOString()
    })
  }
  
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${API_BASE_URL}/trpc`,
        transformer: superjson,
        async headers() {
          // Use Supabase session for auth tokens
          if (!supabase) return {}
          
          const { data: { session } } = await supabase.auth.getSession()
          const token = session?.access_token
          logger.debug('Auth token present', undefined, { tokenPresent: !!token })
          return {
            authorization: token ? `Bearer ${token}` : '',
          }
        },
        fetch(url, options) {
          const requestStart = performance.now()
          const requestId = `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          
          logger.debug(`STARTING request`, undefined, { requestId, url })
          logger.debug(`Request details`, undefined, {
            url: url,
            method: options?.method || 'GET',
            headers: options?.headers ? Object.fromEntries(Object.entries(options.headers)) : {},
            bodyLength: options?.body ? String(options.body).length : 0,
            hasBody: !!options?.body,
            timestamp: new Date().toISOString(),
            requestId: requestId
          })
          
          // Enhanced browser state debugging
          logger.debug(`Browser state check`, undefined, {
            requestId,
            online: navigator.onLine,
            cookiesEnabled: navigator.cookieEnabled,
            currentURL: window.location.href,
            origin: window.location.origin,
            referrer: document.referrer || 'none',
            timestamp: new Date().toISOString()
          })
          
          // Log request body for debugging
          if (options?.body) {
            try {
              const bodyStr = String(options.body)
              logger.debug(`Request body (raw)`, undefined, { requestId, bodyStr })
              if (bodyStr.startsWith('{') || bodyStr.startsWith('[')) {
                const bodyJson = JSON.parse(bodyStr)
                logger.debug(`Request body (parsed)`, undefined, { requestId, bodyJson })
              }
            } catch (e) {
              logger.debug(`Could not parse request body as JSON`, e as Error, { requestId })
            }
          }
          
          // Enhanced CORS debugging
          if (options?.method === 'POST' || options?.method === 'PUT' || options?.method === 'PATCH') {
            logger.debug(`CORS check`, undefined, {
              requestId,
              requestOrigin: window.location.origin,
              targetURL: url,
              targetOrigin: new URL(String(url)).origin,
              isSameOrigin: window.location.origin === new URL(String(url)).origin,
              method: options.method,
              hasCustomHeaders: !!(options?.headers && Object.keys(options.headers).length > 0)
            })
          }
          
          return fetch(url, options).then(async response => {
            const requestDuration = performance.now() - requestStart
            
            logger.debug(`Response received`, undefined, {
              requestId,
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              url: response.url,
              redirected: response.redirected,
              type: response.type,
              ok: response.ok,
              requestDuration: `${requestDuration.toFixed(2)}ms`,
              timestamp: new Date().toISOString()
            })
            
            // Enhanced response body logging
            const responseClone = response.clone()
            try {
              const responseText = await responseClone.text()
              logger.debug(`Response body (raw)`, undefined, { requestId, responseText })
              
              if (responseText.startsWith('{') || responseText.startsWith('[')) {
                try {
                  const responseJson = JSON.parse(responseText)
                  logger.debug(`Response body (parsed)`, undefined, { requestId, responseJson })
                } catch (parseError) {
                  logger.warn(`Response looks like JSON but failed to parse`, parseError as Error, { requestId })
                }
              } else if (responseText.includes('html')) {
                logger.warn(`Response appears to be HTML (possible CORS/routing issue)`, undefined, { 
                  requestId, 
                  responsePreview: responseText.substring(0, 200) 
                })
              }
            } catch (bodyError) {
              logger.warn(`Could not read response body`, bodyError as Error, { requestId })
            }
            
            // Enhanced error logging for non-OK responses
            if (!response.ok) {
              logger.error(`HTTP Error Details`, undefined, {
                requestId,
                status: response.status,
                statusText: response.statusText,
                url: response.url,
                redirected: response.redirected,
                type: response.type,
                headers: Object.fromEntries(response.headers.entries()),
                requestDuration: `${requestDuration.toFixed(2)}ms`,
                possibleCauses: response.status === 0 ? ['Network error', 'CORS blocked', 'Request blocked by browser'] :
                                 response.status === 404 ? ['Endpoint not found', 'Wrong API URL', 'Server not running'] :
                                 response.status === 405 ? ['Method not allowed', 'Wrong HTTP method', 'CORS preflight failed'] :
                                 response.status === 500 ? ['Server error', 'Backend crash', 'Database error'] :
                                 ['Unknown error']
              })
            }
            
            return response
          }).catch(error => {
            const requestDuration = performance.now() - requestStart
            
            logger.error(`Network error`, error, {
              requestId,
              requestDuration: `${requestDuration.toFixed(2)}ms`,
              request: {
                url: url,
                method: options?.method || 'GET',
                hasBody: !!options?.body,
                bodyLength: options?.body ? String(options.body).length : 0
              },
              context: {
                online: navigator.onLine,
                currentURL: window.location.href,
                origin: window.location.origin,
                timestamp: new Date().toISOString()
              },
              troubleshooting: {
                commonCauses: [
                  'Network connectivity issue',
                  'CORS policy blocking request',
                  'Backend server not running',
                  'Wrong API URL configuration',
                  'Firewall/proxy blocking request',
                  'SSL/TLS certificate issue'
                ],
                checkList: [
                  '1. Verify API_BASE_URL in environment variables',
                  '2. Check if backend server is running',
                  '3. Verify CORS configuration on backend',
                  '4. Check browser network tab for detailed error',
                  '5. Test API endpoint directly (e.g., curl or Postman)',
                  '6. Check browser console for additional errors'
                ]
              }
            })
            
            // Enhanced error message for debugging
            const enhancedError = new Error(`Network request failed: ${error.message}`)
            enhancedError.cause = error
            ;(enhancedError as Error & { requestId?: string; url?: string; duration?: number }).requestId = requestId
            ;(enhancedError as Error & { requestId?: string; url?: string; duration?: number }).url = String(url)
            ;(enhancedError as Error & { requestId?: string; url?: string; duration?: number }).duration = requestDuration
            
            throw enhancedError
          })
        },
      }),
    ],
  })
}

// Query Client is imported from query-client.ts - single instance
// Re-export for convenience
export { queryClient }

// Supabase client with proper session management
export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'implicit'
      }
    })
  : null

// Note: AppRouter type will be properly exported once TRPC setup is fixed

// Create and export a singleton client instance for non-hook usage
export const trpcClient = createTRPCClient()
