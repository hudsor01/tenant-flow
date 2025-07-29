import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/axios-client'
import type {
	TenantLease,
	CurrentLeaseInfo
} from '@tenantflow/shared/types/tenants'
import type { TenantWithLeases } from '@tenantflow/shared/types/relations'

interface UseTenantDetailDataProps {
	tenantId: string | undefined
}

/**
 * Custom hook for managing tenant detail data
 * Handles complex data fetching, calculations, and statistics
 */
export function useTenantDetailData({ tenantId }: UseTenantDetailDataProps) {
	// Fetch tenant with related data using axios client and React Query
	const {
		data: tenant,
		isLoading,
		error
	} = useQuery({
		queryKey: ['tenants', 'byId', tenantId],
		queryFn: async () => {
			if (!tenantId) throw new Error('Tenant ID required')
			const response = await api.tenants.get(tenantId)
			return response.data
		},
		enabled: !!tenantId
	})

	// Type the tenant data properly using shared types

	// Fetch maintenance requests for this tenant
	const { data: maintenanceRequests = [] } = useQuery({
		queryKey: ['maintenance', 'list', tenantId],
		queryFn: async () => {
			if (!tenantId) return []
			try {
				const response = await api.maintenance.list({ tenantId })
				const data = response.data
				return Array.isArray(data) ? data : data.requests || []
			} catch {
				return []
			}
		},
		enabled: !!tenantId
	})

	// Get current lease information
	const currentLeaseInfo: CurrentLeaseInfo = useMemo(() => {
		const typedTenant = tenant as TenantWithLeases
		const currentLease = typedTenant?.leases?.find(
			(lease: TenantLease) => lease.status === 'ACTIVE'
		) as TenantLease | undefined
		const currentUnit = currentLease?.unit
		const currentProperty = currentUnit?.property

		return {
			currentLease,
			currentUnit,
			currentProperty
		}
	}, [tenant])

	return {
		tenant,
		isLoading,
		error,
		maintenanceRequests,
		currentLeaseInfo
	}
}

/**
 * Helper function to get status icon based on status string
 */
export function getStatusIconName(status: string): string {
	switch (status) {
		case 'ACTIVE':
			return 'CheckCircle'
		case 'PENDING':
			return 'Clock'
		case 'EXPIRED':
		case 'TERMINATED':
			return 'XCircle'
		default:
			return 'AlertCircle'
	}
}

/**
 * Helper function to get badge variant for status
 */
export function getStatusBadgeVariant(
	status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
	switch (status) {
		case 'ACTIVE':
		case 'COMPLETED':
			return 'default'
		case 'EXPIRED':
		case 'IN_PROGRESS':
			return 'secondary'
		case 'TERMINATED':
			return 'destructive'
		default:
			return 'outline'
	}
}

/**
 * Helper function to get maintenance badge variant
 */
export function getMaintenanceBadgeVariant(
	status: string,
	priority?: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
	if (status === 'COMPLETED') return 'default'
	if (status === 'IN_PROGRESS') return 'secondary'
	if (priority === 'EMERGENCY') return 'destructive'
	return 'outline'
}
