'use client'

import {
	TenantDetailSkeleton,
	TenantFormSkeleton,
	TenantTableSkeleton
} from '#app/(protected)/tenant/tenant-loading-skeleton'
import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { Suspense, type ReactNode } from 'react'
import { TenantErrorBoundary } from './tenant-error-boundary'

interface TenantSuspenseWrapperProps {
	children: ReactNode
	fallbackType?: 'form' | 'table' | 'detail'
	onResetAction?: (() => void) | undefined
}

/**
 * Wrapper component combining React Suspense with Error Boundary
 * Follows React 19 + TanStack Query v5 patterns for automatic loading/error states
 *
 * Usage:
 * ```tsx
 * <TenantSuspenseWrapper fallbackType="form">
 *   <TenantEditForm id={id} />
 * </TenantSuspenseWrapper>
 * ```
 */
export function TenantSuspenseWrapper({
	children,
	fallbackType = 'table',
	onResetAction
}: TenantSuspenseWrapperProps) {
	const fallbacks = {
		form: <TenantFormSkeleton />,
		table: <TenantTableSkeleton />,
		detail: <TenantDetailSkeleton />
	}

	return (
		<QueryErrorResetBoundary>
			{({ reset }) => (
				<TenantErrorBoundary
					onReset={() => {
						reset()
						onResetAction?.()
					}}
				>
					<Suspense fallback={fallbacks[fallbackType]}>{children}</Suspense>
				</TenantErrorBoundary>
			)}
		</QueryErrorResetBoundary>
	)
}

/**
 * Specialized wrapper for tenant forms with optimized loading skeleton
 */
export function TenantFormSuspense({
	children,
	onResetAction
}: {
	children: ReactNode
	onResetAction?: () => void
}) {
	return (
		<TenantSuspenseWrapper
			fallbackType="form"
			{...(onResetAction ? { onResetAction } : {})}
		>
			{children}
		</TenantSuspenseWrapper>
	)
}

/**
 * Specialized wrapper for tenant tables with optimized loading skeleton
 */
export function TenantTableSuspense({
	children,
	onResetAction
}: {
	children: ReactNode
	onResetAction?: () => void
}) {
	return (
		<TenantSuspenseWrapper
			fallbackType="table"
			{...(onResetAction ? { onResetAction } : {})}
		>
			{children}
		</TenantSuspenseWrapper>
	)
}

/**
 * Specialized wrapper for tenant detail pages with optimized loading skeleton
 */
export function TenantDetailSuspense({
	children,
	onResetAction
}: {
	children: ReactNode
	onResetAction?: () => void
}) {
	return (
		<TenantSuspenseWrapper
			fallbackType="detail"
			{...(onResetAction ? { onResetAction } : {})}
		>
			{children}
		</TenantSuspenseWrapper>
	)
}
