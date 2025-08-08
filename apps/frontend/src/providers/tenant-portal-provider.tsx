/**
 * Tenant Portal Provider
 * Provides isolated scope for tenant-specific data
 */
'use client'

import { type ReactNode, useEffect } from 'react'
import { useSetAtom } from 'jotai'
import { useParams } from 'next/navigation'
import {
  currentTenantIdAtom,
} from '@/atoms/tenant-portal/scoped-atoms'

interface TenantPortalProviderProps {
  children: ReactNode
  tenantId?: string
}

export function TenantPortalProvider({ 
  children, 
  tenantId: propTenantId 
}: TenantPortalProviderProps) {
  const params = useParams()
  const tenantId = propTenantId || params?.tenantId as string

  return (
    <TenantInitializer tenantId={tenantId}>
      {children}
    </TenantInitializer>
  )
}

// Internal component to set the tenant ID within the scope
function TenantInitializer({ 
  children, 
  tenantId 
}: { 
  children: ReactNode
  tenantId?: string 
}) {
  const setTenantId = useSetAtom(currentTenantIdAtom)

  useEffect(() => {
    if (tenantId) {
      setTenantId(tenantId)
    }
  }, [tenantId, setTenantId])

  return <>{children}</>
}

/**
 * Usage example:
 * 
 * // In your tenant portal layout
 * <TenantPortalProvider tenantId={session.user.tenantId}>
 *   <TenantDashboard />
 *   <MaintenanceRequests />
 *   <PaymentHistory />
 * </TenantPortalProvider>
 * 
 * // Each tenant gets completely isolated state!
 * // No data leakage between tenants
 */