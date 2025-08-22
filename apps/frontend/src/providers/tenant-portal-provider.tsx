/**
 * Tenant Portal Provider - POST-JOTAI MIGRATION
 * Uses React Context instead of Jotai atoms for tenant scope
 */
'use client'

import { type ReactNode, createContext, useContext, useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

interface TenantPortalContextType {
	tenantId: string | null
	setTenantId: (id: string | null) => void
}

const TenantPortalContext = createContext<TenantPortalContextType | null>(null)

export function useTenantPortal() {
	const context = useContext(TenantPortalContext)
	if (!context) {
		throw new Error('useTenantPortal must be used within TenantPortalProvider')
	}
	return context
}

interface TenantPortalProviderProps {
	children: ReactNode
	tenantId?: string
}

export function TenantPortalProvider({
	children,
	tenantId: propTenantId
}: TenantPortalProviderProps) {
	const params = useParams()
	const [tenantId, setTenantId] = useState<string | null>(
		propTenantId || (params?.tenantId as string) || null
	)

	useEffect(() => {
		const resolvedTenantId = propTenantId || (params?.tenantId as string)
		if (resolvedTenantId && resolvedTenantId !== tenantId) {
			setTenantId(resolvedTenantId)
		}
	}, [propTenantId, params?.tenantId, tenantId])

	const value = {
		tenantId,
		setTenantId
	}

	return (
		<TenantPortalContext.Provider value={value}>
			{children}
		</TenantPortalContext.Provider>
	)
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
