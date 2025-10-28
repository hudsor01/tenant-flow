'use client'

import { tenantKeys, useTenantWithLeaseSuspense } from '#hooks/api/use-tenant'
import { useTenantStore } from '#stores/tenant-store'
import type { TenantWithLeaseInfo } from '@repo/shared/types/core'
import { useQueryClient } from '@tanstack/react-query'
import { createContext, use, useCallback, useMemo, type ReactNode } from 'react'

/**
 * Tenant Context Value
 * React 19 pattern: Use Context for request-scoped data (current tenant from URL)
 */
interface TenantContextValue {
	/** Current tenant from URL parameter */
	tenant: TenantWithLeaseInfo
	/** Tenant ID from URL */
	tenantId: string
	/** Refresh current tenant data */
	refresh: () => Promise<void>
	/** Check if tenant is loading */
	isLoading: boolean
	/** Invalidate tenant cache */
	invalidate: () => Promise<void>
}

const TenantContext = createContext<TenantContextValue | null>(null)

interface TenantProviderProps {
	children: ReactNode
	tenantId: string
}

/**
 * Tenant Provider Component
 * Provides current tenant context using React 19 patterns
 *
 * Usage:
 * ```tsx
 * <TenantProvider tenantId={params.id}>
 *   <TenantDetails />
 * </TenantProvider>
 * ```
 */
export function TenantProvider({ children, tenantId }: TenantProviderProps) {
	const queryClient = useQueryClient()
	const setCurrentTenant = useTenantStore(state => state.setCurrentTenant)

	// Use Suspense query - automatically suspends during loading
	const { data: tenant } = useTenantWithLeaseSuspense(tenantId)

	// Sync to Zustand store for global access
	useMemo(() => {
		setCurrentTenant(tenant)
	}, [tenant, setCurrentTenant])

	const refresh = useCallback(async () => {
		await queryClient.refetchQueries({
			queryKey: tenantKeys.withLease(tenantId)
		})
	}, [queryClient, tenantId])

	const invalidate = useCallback(async () => {
		await queryClient.invalidateQueries({
			queryKey: tenantKeys.withLease(tenantId)
		})
	}, [queryClient, tenantId])

	const value = useMemo<TenantContextValue>(
		() => ({
			tenant,
			tenantId,
			refresh,
			isLoading: false, // Suspense handles loading
			invalidate
		}),
		[tenant, tenantId, refresh, invalidate]
	)

	return (
		<TenantContext.Provider value={value}>{children}</TenantContext.Provider>
	)
}

/**
 * Hook to access current tenant context
 * React 19 pattern: Use React.use() for context consumption
 *
 * @throws Error if used outside TenantProvider
 */
export function useTenantContext(): TenantContextValue {
	const context = use(TenantContext)
	if (!context) {
		throw new Error('useTenantContext must be used within TenantProvider')
	}
	return context
}

/**
 * Hook to access only the current tenant
 * Optimized selector to prevent unnecessary re-renders
 */
export function useCurrentTenantFromContext(): TenantWithLeaseInfo {
	const { tenant } = useTenantContext()
	return tenant
}

/**
 * Hook to access tenant actions
 * Optimized selector for actions only
 */
export function useTenantActions() {
	const { refresh, invalidate } = useTenantContext()
	return useMemo(() => ({ refresh, invalidate }), [refresh, invalidate])
}

/**
 * Optional Tenant Provider (doesn't throw if no tenant ID)
 * Use for pages where tenant context is optional
 */
export function OptionalTenantProvider({
	children,
	tenantId
}: {
	children: ReactNode
	tenantId?: string
}) {
	if (!tenantId) {
		return <>{children}</>
	}
	return <TenantProvider tenantId={tenantId}>{children}</TenantProvider>
}
