// Refactored: useTenantDetailData now uses tRPC for all backend data fetching

import { useMemo } from 'react'
import { trpc } from '../lib/api'

interface UseTenantDetailDataProps {
	tenantId: string | undefined
}


interface TenantProperty {
	id: string
	name: string
	address: string
	[key: string]: string | number | boolean | null | undefined
}

interface TenantUnit {
	id: string
	unitNumber: string
	property: TenantProperty
	[key: string]: string | number | boolean | null | undefined | TenantProperty
}

interface TenantLease {
	id: string
	status: string
	unit: TenantUnit
	unitId: string
	[key: string]: string | number | boolean | null | undefined | TenantUnit
}

interface CurrentLeaseInfo {
	currentLease: TenantLease | undefined
	currentUnit: TenantUnit | undefined
	currentProperty: TenantProperty | undefined
}

/**
 * Custom hook for managing tenant detail data
 * Handles complex data fetching, calculations, and statistics
 */
export function useTenantDetailData({ tenantId }: UseTenantDetailDataProps) {
	// Fetch tenant with related data using tRPC
	const {
		data: tenant,
		isLoading,
		error
	} = trpc.tenants.byId.useQuery(
		{ id: tenantId! },
		{ enabled: !!tenantId }
	)

	// Type the tenant data properly
	interface TenantWithLeases {
		id: string
		name: string
		email: string
		leases?: TenantLease[]
	}

	// Fetch maintenance requests for this tenant
	const { data: maintenanceRequests = [] } = trpc.maintenance.list.useQuery(
		{ tenantId: tenantId || '' },
		{ enabled: !!tenantId }
	)

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
