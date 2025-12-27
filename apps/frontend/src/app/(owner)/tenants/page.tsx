'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { tenantQueries } from '#hooks/api/queries/tenant-queries'
import { apiRequest } from '#lib/api-request'
import type { TenantWithLeaseInfo } from '@repo/shared/types/core'
import { Skeleton } from '#components/ui/skeleton'
import { Tenants, type TenantItem, type TenantDetail, type LeaseStatus } from '#components/tenants/tenants'

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

/**
 * Transform API tenant data to design-os TenantItem format
 */
function transformToTenantItem(tenant: TenantWithLeaseInfo): TenantItem {
	const displayName =
		tenant.name ||
		(tenant.first_name && tenant.last_name
			? `${tenant.first_name} ${tenant.last_name}`.trim()
			: tenant.first_name || tenant.last_name || 'Unknown')

	// Map API status to design-os LeaseStatus
	let leaseStatus: LeaseStatus | undefined
	if (tenant.lease_status) {
		const status = tenant.lease_status.toLowerCase()
		if (status === 'active') leaseStatus = 'active'
		else if (status === 'pending' || status === 'pending_signature') leaseStatus = 'pending_signature'
		else if (status === 'expired' || status === 'ended') leaseStatus = 'ended'
		else if (status === 'terminated') leaseStatus = 'terminated'
		else if (status === 'draft') leaseStatus = 'draft'
	}

	return {
		id: tenant.id,
		fullName: displayName,
		email: tenant.email ?? '',
		phone: tenant.phone ?? undefined,
		currentProperty: tenant.property?.name ?? undefined,
		currentUnit: tenant.unit?.unit_number ?? undefined,
		leaseStatus,
		leaseId: tenant.currentLease?.id ?? undefined,
		totalPaid: 0 // TODO: Fetch from payments API if needed
	}
}

/**
 * Transform API tenant to design-os TenantDetail format
 */
function transformToTenantDetail(tenant: TenantWithLeaseInfo): TenantDetail {
	const base = transformToTenantItem(tenant)

	return {
		...base,
		emergencyContactName: undefined, // TODO: Add to API
		emergencyContactPhone: undefined, // TODO: Add to API
		emergencyContactRelationship: undefined, // TODO: Add to API
		identityVerified: false, // TODO: Add to API
		createdAt: tenant.created_at ?? new Date().toISOString(),
		updatedAt: tenant.updated_at ?? new Date().toISOString(),
		currentLease: tenant.currentLease ? {
			id: tenant.currentLease.id,
			propertyName: tenant.property?.name ?? '',
			unitNumber: tenant.unit?.unit_number ?? '',
			startDate: tenant.currentLease.start_date,
			endDate: tenant.currentLease.end_date,
			rentAmount: (tenant.currentLease.rent_amount ?? 0) * 100, // Convert to cents
			autopayEnabled: false // TODO: Add to API
		} : undefined
	}
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function TenantsLoadingSkeleton() {
	return (
		<div className="p-6 lg:p-8 bg-background min-h-full space-y-6">
			{/* Header skeleton */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<Skeleton className="h-8 w-32 mb-2" />
					<Skeleton className="h-5 w-64" />
				</div>
				<Skeleton className="h-10 w-32" />
			</div>
			{/* Stats skeleton */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				{[1, 2, 3, 4].map(i => (
					<Skeleton key={i} className="h-28 rounded-lg" />
				))}
			</div>
			{/* Quick actions skeleton */}
			<div className="flex gap-3">
				{[1, 2, 3, 4].map(i => (
					<Skeleton key={i} className="h-16 w-40 rounded-lg" />
				))}
			</div>
			{/* Table skeleton */}
			<Skeleton className="h-96 rounded-lg" />
		</div>
	)
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function TenantsPage() {
	const router = useRouter()
	const queryClient = useQueryClient()
	const [selectedTenantId, setSelectedTenantId] = React.useState<string | null>(null)

	// Fetch tenants list
	const { data: tenantsResponse, isLoading } = useQuery(tenantQueries.list())
	const rawTenants = React.useMemo(() => tenantsResponse?.data ?? [], [tenantsResponse?.data])

	// Transform to design-os format
	const tenants = React.useMemo(
		() => rawTenants.map(transformToTenantItem),
		[rawTenants]
	)

	// Get selected tenant detail
	const selectedTenant = React.useMemo(() => {
		if (!selectedTenantId) return undefined
		const raw = rawTenants.find(t => t.id === selectedTenantId)
		return raw ? transformToTenantDetail(raw) : undefined
	}, [selectedTenantId, rawTenants])

	// Delete mutation
	const { mutate: deleteTenant } = useMutation({
		mutationFn: async (tenantId: string) =>
			apiRequest<void>(`/api/v1/tenants/${tenantId}`, { method: 'DELETE' }),
		onSuccess: () => {
			toast.success('Tenant deleted')
			queryClient.invalidateQueries({ queryKey: ['tenants'] })
		},
		onError: () => {
			toast.error('Failed to delete tenant')
		}
	})

	// Callbacks
	const handleInviteTenant = React.useCallback(() => {
		router.push('/tenants/new')
	}, [router])

	const handleViewTenant = React.useCallback((tenantId: string) => {
		setSelectedTenantId(tenantId)
	}, [])

	const handleEditTenant = React.useCallback((tenantId: string) => {
		router.push(`/tenants/${tenantId}/edit`)
	}, [router])

	const handleDeleteTenant = React.useCallback((tenantId: string) => {
		// TODO: Add confirmation dialog
		deleteTenant(tenantId)
	}, [deleteTenant])

	const handleContactTenant = React.useCallback((tenantId: string, method: 'email' | 'phone') => {
		const tenant = rawTenants.find(t => t.id === tenantId)
		if (!tenant) return

		if (method === 'email' && tenant.email) {
			window.location.href = `mailto:${tenant.email}`
		} else if (method === 'phone' && tenant.phone) {
			window.location.href = `tel:${tenant.phone}`
		}
	}, [rawTenants])

	const handleViewLease = React.useCallback((leaseId: string) => {
		router.push(`/leases/${leaseId}`)
	}, [router])

	const handleExport = React.useCallback(() => {
		toast.info('Export functionality coming soon')
	}, [])

	const handleMessageAll = React.useCallback(() => {
		toast.info('Bulk messaging coming soon')
	}, [])

	if (isLoading) {
		return <TenantsLoadingSkeleton />
	}

	return (
		<Tenants
			tenants={tenants}
			selectedTenant={selectedTenant}
			onInviteTenant={handleInviteTenant}
			onViewTenant={handleViewTenant}
			onEditTenant={handleEditTenant}
			onDeleteTenant={handleDeleteTenant}
			onContactTenant={handleContactTenant}
			onViewLease={handleViewLease}
			onExport={handleExport}
			onMessageAll={handleMessageAll}
		/>
	)
}
