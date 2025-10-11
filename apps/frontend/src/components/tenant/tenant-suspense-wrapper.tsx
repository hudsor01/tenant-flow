'use client'

import {
	TenantDetailSkeleton,
	TenantFormSkeleton,
	TenantTableSkeleton
} from '@/components/ui/tenant-loading-skeleton'
import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { Suspense, type ReactNode } from 'react'
import { TenantErrorBoundary } from './tenant-error-boundary'

interface TenantSuspenseWrapperProps {
	children: ReactNode
	fallbackType?: 'form' | 'table' | 'detail'
	onReset?: () => void
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
	onReset
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
						onReset?.()
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
	onReset
}: {
	children: ReactNode
	onReset?: () => void
}) {
	return (
		<TenantSuspenseWrapper fallbackType="form" onReset={onReset}>
			{children}
		</TenantSuspenseWrapper>
	)
}

/**
 * Specialized wrapper for tenant tables with optimized loading skeleton
 */
export function TenantTableSuspense({
	children,
	onReset
}: {
	children: ReactNode
	onReset?: () => void
}) {
	return (
		<TenantSuspenseWrapper fallbackType="table" onReset={onReset}>
			{children}
		</TenantSuspenseWrapper>
	)
}

/**
 * Specialized wrapper for tenant detail pages with optimized loading skeleton
 */
export function TenantDetailSuspense({
	children,
	onReset
}: {
	children: ReactNode
	onReset?: () => void
}) {
	return (
		<TenantSuspenseWrapper fallbackType="detail" onReset={onReset}>
			{children}
		</TenantSuspenseWrapper>
	)
}
