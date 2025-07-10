import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { queryKeys } from '@/lib/utils'

interface UseTenantDetailDataProps {
	tenantId: string | undefined
}

interface TenantStats {
	totalPayments: number
	totalLeases: number
	activeLeases: number
}

interface Property {
	[key: string]: Property | string
}

interface Unit {
	property: string
	[key: string]: Unit | string
}

interface Lease {
	status: string
	unit: Unit
	[key: string]: string | Unit
}

interface CurrentLeaseInfo {
	currentLease: (Lease & { unit: Unit & { property: Property } }) | undefined
	currentUnit: (Unit & { property: Property }) | undefined
	currentProperty: Property | undefined
}

/**
 * Custom hook for managing tenant detail data
 * Handles complex data fetching, calculations, and statistics
 */
export function useTenantDetailData({ tenantId }: UseTenantDetailDataProps) {
	// Fetch tenant with related data using API client
	const {
		data: tenant,
		isLoading,
		error
	} = useQuery({
		queryKey: queryKeys.tenants.detail(tenantId || ''),
		queryFn: () => apiClient.tenants.getById(tenantId || ''),
		enabled: !!tenantId
	})

	// Fetch maintenance requests for this tenant
	const { data: maintenanceRequests = [] } = useQuery({
		queryKey: queryKeys.maintenance.list({ tenantId: tenantId || '' }),
		queryFn: async () => {
			if (!tenantId) return []

			try {
				// Get all maintenance requests and filter by tenant
				const allRequests = await apiClient.maintenance.getAll()
				return allRequests.filter(
					request => request.unitId && tenant?.leases?.some(lease => lease.unitId === request.unitId)
				)
			} catch (error) {
				// Return empty array if maintenance API is not available
				console.warn(
					'Maintenance API not available for tenant detail',
					error
				)
				return []
			}
		},
		enabled: !!tenantId
	})

	// Fetch payment data for this tenant
	const { data: payments = [] } = useQuery({
		queryKey: queryKeys.payments.list({ tenantId: tenantId || '' }),
		queryFn: async () => {
			if (!tenantId) return []

			try {
				// Get all payments and filter by tenant
				const allPayments = await apiClient.payments.getAll()
				return allPayments.filter(
					payment => payment.leaseId && tenant?.leases?.some(lease => lease.id === payment.leaseId)
				)
			} catch (error) {
				// Return empty array if payments API is not available
				console.warn(
					'Payments API not available for tenant detail',
					error
				)
				return []
			}
		},
		enabled: !!tenantId
	})

	// Calculate comprehensive stats
	const stats: TenantStats = useMemo(() => {
		if (!tenant?.leases) {
			return {
				totalPayments: 0,
				totalLeases: 0,
				activeLeases: 0
			}
		}

		const totalPayments = payments.reduce(
			(sum, payment) => sum + (payment.amount || 0),
			0
		)
		const totalLeases = tenant.leases.length
		const activeLeases = (tenant.leases as unknown as Lease[]).filter(
			lease => lease.status === 'ACTIVE'
		).length

		return {
			totalPayments,
			totalLeases,
			activeLeases,
			// Additional stats
			totalMaintenanceRequests: maintenanceRequests.length,
			openMaintenanceRequests: maintenanceRequests.filter(
				req => req.status === 'OPEN'
			).length,
			avgPaymentAmount:
				payments.length > 0 ? totalPayments / payments.length : 0,
			lastPaymentDate:
				payments.length > 0
					? Math.max(
							...payments.map(p =>
								new Date(p.date || p.createdAt).getTime()
							)
						)
					: null,
			onTimePayments: payments.filter(
				p => new Date(p.date || '') <= new Date(p.dueDate || '')
			).length,
			paymentSuccessRate:
				payments.length > 0
					? (payments.filter(p => p.status === 'COMPLETED').length /
							payments.length) *
						100
					: 0
		}
	}, [tenant?.leases, payments, maintenanceRequests])

	// Get current lease information
	const currentLeaseInfo: CurrentLeaseInfo = useMemo(() => {
		const currentLease = tenant?.leases?.find(
			lease => (lease as unknown as Lease).status === 'ACTIVE'
		) as (Lease & { unit: Unit & { property: Property } }) | undefined
		const currentUnit = currentLease?.unit
		const currentProperty = currentUnit?.property

		return {
			currentLease,
			currentUnit,
			currentProperty
		}
	}, [tenant?.leases])

	return {
		tenant,
		isLoading,
		error,
		maintenanceRequests,
		stats,
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
