'use client'

import { TenantSuspenseWrapper } from '#app/(protected)/tenant/tenant-suspense-wrapper'
import {
	OptionalTenantProvider,
	TenantProvider as TenantContext
} from '#contexts/tenant-context'
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
 * <TenantProvider tenant_id={params.id}>
 *   <TenantDetails />
 * </TenantProvider>
 * ```
 */
export function TenantProvider({
	children,
	tenant_id
}: {
	children: ReactNode
	tenant_id: string
}) {
	return (
		<TenantSuspenseWrapper fallbackType="detail">
			<TenantContext tenant_id={tenant_id}>{children}</TenantContext>
		</TenantSuspenseWrapper>
	)
}

/**
 * Optional Tenant Provider with Suspense
 * Use for pages where tenant may not be present
 */
export function OptionalTenantProviderWithSuspense({
	children,
	tenant_id
}: {
	children: ReactNode
	tenant_id?: string
}) {
	if (!tenant_id) {
		return <>{children}</>
	}

	return <TenantProvider tenant_id={tenant_id}>{children}</TenantProvider>
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
	tenant_id
}: {
	children: ReactNode
	tenant_id?: string
}) {
	return (
		<TenantSuspenseWrapper fallbackType="form">
			<OptionalTenantProvider {...(tenant_id ? { tenant_id } : {})}>
				{children}
			</OptionalTenantProvider>
		</TenantSuspenseWrapper>
	)
}
