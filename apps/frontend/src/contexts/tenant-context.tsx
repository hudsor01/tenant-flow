/**
 * Tenant Context Provider
 * Provides tenant-specific data and state management across the application
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useTenantStore, useSelectedTenantId } from '@/stores/tenant-store'
import { useCurrentTenant } from '@/stores/tenant-store'
import { apiClient } from '@repo/shared/utils/api-client'
import type { TenantWithLeaseInfo } from '@repo/shared/types/core'

interface TenantContextType {
  currentTenant: TenantWithLeaseInfo | null
  setCurrentTenant: (tenant: TenantWithLeaseInfo | null) => void
  isLoading: boolean
  error: string | null
  refreshTenant: () => Promise<void>
  tenantPermissions: {
    canView: boolean
    canEdit: boolean
    canDelete: boolean
    canManageLease: boolean
    canViewFinancials: boolean
  }
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

interface TenantProviderProps {
  children: ReactNode
  initialTenant?: TenantWithLeaseInfo | null
}

export function TenantProvider({ children, initialTenant }: TenantProviderProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const currentTenantStore = useCurrentTenant()
  const selectedTenantId = useSelectedTenantId()
  const { setCurrentTenant: setStoreTenant } = useTenantStore()

  // Initialize with store or prop
  useEffect(() => {
    if (initialTenant) {
      setStoreTenant(initialTenant)
    }
    setIsLoading(false)
    // setStoreTenant is stable from zustand; include it to satisfy lint rules
  }, [initialTenant, setStoreTenant])

  const setCurrentTenant = (tenant: TenantWithLeaseInfo | null) => {
    setStoreTenant(tenant)
  }

  const refreshTenant = useCallback(async (id?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const tenantId = id || currentTenantStore?.id || initialTenant?.id || selectedTenantId
      if (!tenantId) {
        setError('No tenant id available to refresh')
        return
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''
      const data = await apiClient<TenantWithLeaseInfo>(`${API_BASE_URL}/api/v1/tenants/${tenantId}/with-lease`)
      setStoreTenant(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh tenant')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [currentTenantStore?.id, initialTenant, selectedTenantId, setStoreTenant])

  // Auto-refresh when selected tenant id changes
  useEffect(() => {
    if (selectedTenantId) {
      void refreshTenant(selectedTenantId)
    }
  }, [selectedTenantId, refreshTenant])

  const tenantPermissions = {
    canView: !!currentTenantStore,
    canEdit: !!currentTenantStore,
    canDelete: !!currentTenantStore,
    canManageLease: !!currentTenantStore?.currentLease,
    canViewFinancials: !!currentTenantStore
  }

 const value: TenantContextType = {
    currentTenant: currentTenantStore,
    setCurrentTenant,
    isLoading,
    error,
    refreshTenant,
    tenantPermissions
 }

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenantContext() {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error('useTenantContext must be used within a TenantProvider')
  }
  return context
}

// Convenience hooks that can be used independently
export function useCurrentTenantContext() {
  const { currentTenant } = useTenantContext()
  return currentTenant
}

export function useTenantPermissions() {
  const { tenantPermissions } = useTenantContext()
  return tenantPermissions
}

export function useTenantLoading() {
  const { isLoading, error } = useTenantContext()
  return { isLoading, error }
}
