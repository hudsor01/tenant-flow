/**
 * Shared API client using native fetch
 * Follows backend error handling standards from global-exception.filter.ts
 * 30 lines max - native functionality only
 */
import { createBrowserClient } from '@supabase/ssr'

export interface FetchResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  statusCode?: number
}

export async function apiClient<T = unknown>(
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

  const data = await response.json() as FetchResponse<T>

  if (!response.ok || !data.success) {
    throw new Error(data.error || data.message || 'Request failed')
  }

  return data.data as T
}

// Convenience methods
export const get = <T>(url: string) => apiClient<T>(url)
export const post = <T>(url: string, body: unknown) =>
  apiClient<T>(url, { method: 'POST', body: JSON.stringify(body) })
export const put = <T>(url: string, body: unknown) =>
  apiClient<T>(url, { method: 'PUT', body: JSON.stringify(body) })
export const del = <T>(url: string) => apiClient<T>(url, { method: 'DELETE' })
