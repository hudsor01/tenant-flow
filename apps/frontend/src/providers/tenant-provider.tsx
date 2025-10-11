'use client'

import { TenantSuspenseWrapper } from '@/components/tenant/tenant-suspense-wrapper'
import {
	OptionalTenantProvider,
	TenantProvider as TenantContext
} from '@/contexts/tenant-context'
import type { ReactNode } from 'react'

/**
 * Composed Tenant Provider
 * Combines Context, Suspense, and Error Boundary in one wrapper
 *
 * This is the provider composition pattern - multiple providers working together
 * without creating custom abstraction layers
 *
 * Usage:
 * ```tsx
 * <TenantProvider tenantId={params.id}>
 *   <TenantDetails />
 * </TenantProvider>
 * ```
 */
export function TenantProvider({
	children,
	tenantId
}: {
	children: ReactNode
	tenantId: string
}) {
	return (
		<TenantSuspenseWrapper fallbackType="detail">
			<TenantContext tenantId={tenantId}>{children}</TenantContext>
		</TenantSuspenseWrapper>
	)
}

/**
 * Optional Tenant Provider with Suspense
 * Use for pages where tenant may not be present
 */
export function OptionalTenantProviderWithSuspense({
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

/**
 * Tenant List Provider
 * For pages showing lists of tenants (table view)
 */
export function TenantListProvider({ children }: { children: ReactNode }) {
	return (
		<TenantSuspenseWrapper fallbackType="table">
			{children}
		</TenantSuspenseWrapper>
	)
}

/**
 * Tenant Form Provider
 * For pages with tenant forms (create/edit)
 */
export function TenantFormProvider({
	children,
	tenantId
}: {
	children: ReactNode
	tenantId?: string
}) {
	return (
		<TenantSuspenseWrapper fallbackType="form">
			<OptionalTenantProvider tenantId={tenantId}>
				{children}
			</OptionalTenantProvider>
		</TenantSuspenseWrapper>
	)
}
