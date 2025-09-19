/**
 * Shared API client using native fetch
 * Follows backend error handling standards from global-exception.filter.ts
 * 30 lines max - native functionality only
 */
import { createBrowserClient } from '@supabase/ssr'
import type { Json } from '../types/supabase-generated'

export interface FetchResponse<T = Json> {
  success: boolean
  data?: T
  error?: string
  message?: string
  statusCode?: number
}

export async function apiClient<T = Json>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const {
    data: { session }
  } = await supabase.auth.getSession()

  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  // Add custom headers if provided
  if (options?.headers) {
    const customHeaders = options.headers as Record<string, string>
    Object.assign(baseHeaders, customHeaders)
  }

  if (session) {
    baseHeaders['Authorization'] = `Bearer ${session.access_token}`
  }

  const response = await fetch(url, {
    ...options,
    headers: baseHeaders
  })

  // Handle network/connection errors
  if (!response) {
    throw new Error('Network error: Unable to connect to server')
  }

  let data: FetchResponse<T>

  try {
    data = await response.json() as FetchResponse<T>
  } catch (parseError) {
    // Handle non-JSON responses
    const text = await response.text()
    throw new Error(`Invalid response format: ${text.substring(0, 100)}...`)
  }

  if (!response.ok || !data.success) {
    // Create detailed error message based on status code
    let errorMessage = data.error || data.message || 'Request failed'

    // Add status code context for better error categorization
    if (response.status >= 500) {
      errorMessage = `Server error (${response.status}): ${errorMessage}`
    } else if (response.status === 404) {
      errorMessage = `Not found (404): ${errorMessage}`
    } else if (response.status === 401) {
      errorMessage = `Unauthorized (401): ${errorMessage}`
    } else if (response.status === 403) {
      errorMessage = `Forbidden (403): ${errorMessage}`
    } else if (response.status === 422) {
      errorMessage = `Validation error (422): ${errorMessage}`
    } else if (response.status >= 400) {
      errorMessage = `Client error (${response.status}): ${errorMessage}`
    }

    const error = Object.assign(new Error(errorMessage), {
      statusCode: response.status,
      response: data
    })
    throw error
  }

  return data.data as T
}

// Convenience methods
export const get = <T>(url: string) => apiClient<T>(url)
export const post = <T>(url: string, body: Json) =>
  apiClient<T>(url, { method: 'POST', body: JSON.stringify(body) })
export const put = <T>(url: string, body: Json) =>
  apiClient<T>(url, { method: 'PUT', body: JSON.stringify(body) })
export const del = <T>(url: string) => apiClient<T>(url, { method: 'DELETE' })
