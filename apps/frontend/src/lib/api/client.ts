/**
 * Client-side API utility for TanStack Query hooks
 * Simplified auth session management with race condition prevention
 */
import { createClient } from '#utils/supabase/client'
import { getApiBaseUrl } from '#lib/api-config'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { ERROR_MESSAGES } from '#lib/constants/error-messages'
import { ApiError, ApiErrorCode } from './api-error'

const logger = createLogger({ component: 'ClientAPI' })

// Mutex for auth session refresh to prevent multiple concurrent refreshes
let refreshPromise: Promise<Awaited<ReturnType<ReturnType<typeof createClient>['auth']['refreshSession']>>> | null = null

/**
 * Get auth headers with Supabase JWT token
 */
export async function getAuthHeaders(
  additionalHeaders?: Record<string, string>,
  requireAuth: boolean = true,
  omitContentType: boolean = false
): Promise<Record<string, string>> {
  const headers: Record<string, string> = omitContentType
    ? { ...additionalHeaders }
    : { 'Content-Type': 'application/json', ...additionalHeaders }

  const supabase = createClient()

  // Get user and session
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError && requireAuth) {
    throw new Error(ERROR_MESSAGES.AUTH_SESSION_EXPIRED)
  }

  if (user) {
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.access_token) {
      // Check if token is expired and refresh if needed
      if (session.expires_at && session.expires_at < Date.now() / 1000) {
        if (refreshPromise) {
          await refreshPromise
          const { data: { session: refreshedSession } } = await supabase.auth.getSession()
          if (refreshedSession?.access_token) {
            headers['Authorization'] = `Bearer ${refreshedSession.access_token}`
          } else if (requireAuth) {
            throw new Error(ERROR_MESSAGES.AUTH_SESSION_EXPIRED)
          }
        } else {
          refreshPromise = supabase.auth.refreshSession()
          try {
            const result = await refreshPromise
            if (!result || result.error || !result.data?.session) {
              if (requireAuth) throw new Error(ERROR_MESSAGES.AUTH_SESSION_EXPIRED)
            } else {
              headers['Authorization'] = `Bearer ${result.data.session.access_token}`
            }
          } finally {
            refreshPromise = null
          }
        }
      } else {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
    } else if (requireAuth) {
      throw new Error(ERROR_MESSAGES.AUTH_SESSION_EXPIRED)
    }
  } else if (requireAuth) {
    throw new Error(ERROR_MESSAGES.AUTH_SESSION_EXPIRED)
  }

  return headers
}

/**
 * Client-side fetch with Supabase authentication
 */
export async function clientFetch<T>(
  endpoint: string,
  options?: RequestInit & {
    requireAuth?: boolean
    omitJsonContentType?: boolean
  }
): Promise<T> {
  const {
    requireAuth = true,
    omitJsonContentType = false,
    ...fetchOptions
  } = options || {}

  // Build headers
  const customHeaders: Record<string, string> = {}
  if (fetchOptions.headers) {
    Object.entries(fetchOptions.headers).forEach(([key, value]) => {
      if (typeof value === 'string') customHeaders[key] = value
    })
  }

  const headers = await getAuthHeaders(
    customHeaders,
    requireAuth,
    omitJsonContentType
  )

  const finalOptions = { ...fetchOptions, headers }

  if (fetchOptions.method && ['POST', 'PUT', 'PATCH'].includes(fetchOptions.method.toUpperCase()) && !finalOptions.body) {
    logger.warn('Request body missing for mutation method', {
      metadata: { endpoint, method: fetchOptions.method }
    })
  }

  const url = `${getApiBaseUrl()}${endpoint}`

  // Debug: Log API URL to help trace upload issues
  if (endpoint.includes('images')) {
    logger.info('Image request URL:', { metadata: { url, method: fetchOptions.method } })
  }

  try {
    const response = await fetch(url, {
      ...finalOptions,
      credentials: finalOptions.credentials ?? 'include'
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      let errorData: Record<string, unknown> | null = null

      try {
        errorData = JSON.parse(errorText)
      } catch {
        // Not JSON, use text directly
      }

      const message: string = (typeof errorData?.message === 'string' ? errorData.message : undefined) ||
        (typeof errorData?.error === 'string' ? errorData.error : undefined) ||
        errorText ||
        response.statusText ||
        'API request failed'
      const backendCode = errorData?.code

      logger.error('API request failed', {
        metadata: { endpoint, status: response.status, code: backendCode, error: message }
      })

      throw new ApiError(
        message,
        mapStatusToApiErrorCode(response.status),
        response.status,
        errorData ? { ...errorData } : { raw: errorText }
      )
    }

    const contentType = response.headers.get('content-type')
    if (response.status === 204 || response.status === 205 || !contentType) {
      return undefined as T
    }

    const data = await response.json()

    // Handle wrapped API responses
    if (data && typeof data === 'object' && 'success' in data && data.success === false) {
      const message = data.error || data.message || 'API request failed'
      logger.error('API returned error response', { metadata: { endpoint, error: message, data } })
      throw new ApiError(message, ApiErrorCode.API_SERVER_ERROR, data.statusCode, { ...data })
    }

    // Unwrap { data: T } responses
    if (data && typeof data === 'object' && 'data' in data && !('total' in data)) {
      return (data as { data: T }).data
    }

    return data as T

  } catch (error) {
    if (error instanceof ApiError) throw error

    const errorMessage = error instanceof Error ? error.message : 'Network request failed'
    logger.error('Network error during API request', { metadata: { endpoint, error: errorMessage } })

    throw new ApiError(
      'Network request failed. Please check your connection and try again.',
      ApiErrorCode.NETWORK_ERROR,
      undefined,
      { endpoint, error: errorMessage }
    )
  }
}

function mapStatusToApiErrorCode(status?: number): ApiErrorCode {
  switch (status) {
    case 400: return ApiErrorCode.API_BAD_REQUEST
    case 401: case 403: return ApiErrorCode.AUTH_UNAUTHORIZED
    case 404: return ApiErrorCode.API_NOT_FOUND
    case 429: return ApiErrorCode.API_RATE_LIMITED
    case 500: return ApiErrorCode.API_SERVER_ERROR
    case 503: return ApiErrorCode.API_SERVICE_UNAVAILABLE
    default: return ApiErrorCode.UNKNOWN_ERROR
  }
}
