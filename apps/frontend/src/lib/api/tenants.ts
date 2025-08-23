/**
 * Tenants API - Direct API calls only
 */

import { apiClient } from '@/lib/api-client'
import type { Tenant, CreateTenantInput, UpdateTenantInput, TenantQuery } from '@repo/shared'

export interface TenantStats {
  total: number
  active: number
  inactive: number
  newThisMonth: number
}

/**
 * Query keys for React Query caching
 */
export const tenantKeys = {
  all: ['tenants'] as const,
  lists: () => [...tenantKeys.all, 'list'] as const,
  list: (filters?: TenantQuery) => [...tenantKeys.lists(), filters] as const,
  details: () => [...tenantKeys.all, 'detail'] as const,
  detail: (id: string) => [...tenantKeys.details(), id] as const,
  stats: () => [...tenantKeys.all, 'stats'] as const,
  byProperty: (propertyId: string) => [...tenantKeys.all, 'by-property', propertyId] as const,
}

/**
 * Tenants API functions - Direct calls only
 */
export const tenantApi = {
  async getAll(filters?: TenantQuery) {
    const params = filters ? new URLSearchParams(
      Object.entries(filters)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => [key, String(value)])
    ).toString() : ''
    return apiClient.get<Tenant[]>(`/tenants${params ? `?${params}` : ''}`)
  },

  async getById(id: string) {
    return apiClient.get<Tenant>(`/tenants/${id}`)
  },

  async create(data: CreateTenantInput) {
    return apiClient.post<Tenant>('/tenants', data)
  },

  async update(id: string, data: UpdateTenantInput) {
    return apiClient.put<Tenant>(`/tenants/${id}`, data)
  },

  async delete(id: string) {
    await apiClient.delete<{ success: boolean }>(`/tenants/${id}`)
    // Return void to match hook expectations
    return
  },

  async getStats() {
    return apiClient.get<TenantStats>('/tenants/stats')
  },

  async getByProperty(propertyId: string) {
    return apiClient.get<Tenant[]>(`/tenants/by-property/${propertyId}`)
  },
}