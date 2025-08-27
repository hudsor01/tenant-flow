/**
 * Shared API client using native fetch
 * Follows backend error handling standards from global-exception.filter.ts
 * 30 lines max - native functionality only
 */

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
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options
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