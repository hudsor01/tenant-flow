'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { tenantQueries } from '#hooks/api/queries/tenant-queries'
import { tenantPaymentQueries } from '#hooks/api/use-rent-payments'
import {
	useCancelInvitation,
	useResendInvitation
} from '#hooks/api/mutations/tenant-mutations'
import { apiRequest } from '#lib/api-request'
import type { TenantWithLeaseInfo } from '@repo/shared/types/core'
import { Skeleton } from '#components/ui/skeleton'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '#components/ui/alert-dialog'
import { Tenants } from '#components/tenants/tenants'
import type {
	TenantItem,
	TenantDetail,
	LeaseStatus
} from '@repo/shared/types/sections/tenants'

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

type TenantPaymentStatus = NonNullable<
	TenantDetail['paymentHistory']
>[number]['status']

function normalizePaymentStatus(status: string | null | undefined): TenantPaymentStatus {
	const normalized = status?.toLowerCase()
	if (
		normalized === 'pending' ||
		normalized === 'processing' ||
		normalized === 'succeeded' ||
		normalized === 'failed' ||
		normalized === 'canceled'
	) {
		return normalized
	}
	return 'processing'
}

/**
 * Transform API tenant data to design-os TenantItem format
 */
function transformToTenantItem(
	tenant: TenantWithLeaseInfo,
	totalPaidByTenant?: Map<string, number>
): TenantItem {
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
		else if (status === 'pending' || status === 'pending_signature')
			leaseStatus = 'pending_signature'
		else if (status === 'expired' || status === 'ended') leaseStatus = 'ended'
		else if (status === 'terminated') leaseStatus = 'terminated'
		else if (status === 'draft') leaseStatus = 'draft'
	}

	return {
		id: tenant.id,
		fullName: displayName,
		email: tenant.email ?? '',
		...(tenant.phone ? { phone: tenant.phone } : {}),
		...(tenant.property?.name ? { currentProperty: tenant.property.name } : {}),
		...(tenant.unit?.unit_number ? { currentUnit: tenant.unit.unit_number } : {}),
		...(leaseStatus ? { leaseStatus } : {}),
		...(tenant.currentLease?.id ? { leaseId: tenant.currentLease.id } : {}),
		totalPaid: totalPaidByTenant?.get(tenant.id) ?? 0
	}
}

/**
 * Transform API tenant to design-os TenantDetail format
 */
function transformToTenantDetail(
	tenant: TenantWithLeaseInfo,
	totalPaidByTenant?: Map<string, number>,
	paymentHistory?: TenantDetail['paymentHistory']
): TenantDetail {
	const base = transformToTenantItem(tenant, totalPaidByTenant)

	return {
		...base,
		...(tenant.emergency_contact_name ? { emergencyContactName: tenant.emergency_contact_name } : {}),
		...(tenant.emergency_contact_phone ? { emergencyContactPhone: tenant.emergency_contact_phone } : {}),
		...(tenant.emergency_contact_relationship ? { emergencyContactRelationship: tenant.emergency_contact_relationship } : {}),
		identityVerified: tenant.identity_verified ?? false,
		createdAt: tenant.created_at ?? new Date().toISOString(),
		updatedAt: tenant.updated_at ?? new Date().toISOString(),
		...(paymentHistory ? { paymentHistory } : {}),
		...(tenant.currentLease
			? {
					currentLease: {
						id: tenant.currentLease.id,
						propertyName: tenant.property?.name ?? '',
						unitNumber: tenant.unit?.unit_number ?? '',
						startDate: tenant.currentLease.start_date,
						endDate: tenant.currentLease.end_date,
						rentAmount: (tenant.currentLease.rent_amount ?? 0) * 100, // Convert to cents
						autopayEnabled: tenant.autopay_enabled ?? false
					}
				}
			: {})
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
	const [selectedTenantId, setSelectedTenantId] = React.useState<string | null>(
		null
	)
	const [tenantToDelete, setTenantToDelete] = React.useState<string | null>(null)

	// Fetch tenants list
	const { data: tenantsResponse, isLoading } = useQuery(tenantQueries.list())
	const rawTenants = React.useMemo(
		() => tenantsResponse?.data ?? [],
		[tenantsResponse?.data]
	)

	// Transform to design-os format
	const { data: selectedTenantPayments } = useQuery(
		tenantPaymentQueries.ownerPayments(selectedTenantId ?? '', {
			limit: 100,
			enabled: Boolean(selectedTenantId)
		})
	)
	const selectedTenantTotalPaid = React.useMemo(() => {
		if (!selectedTenantPayments?.payments?.length) return 0
		return selectedTenantPayments.payments.reduce((total, payment) => {
			if (payment.status?.toLowerCase() === 'succeeded') {
				return total + payment.amount
			}
			return total
		}, 0)
	}, [selectedTenantPayments?.payments])
	const selectedTenantPaymentHistory = React.useMemo(() => {
		if (!selectedTenantPayments?.payments?.length) return undefined
		return selectedTenantPayments.payments.map(payment => ({
			id: payment.id,
			amount: payment.amount,
			status: normalizePaymentStatus(payment.status),
			dueDate: payment.due_date,
			...(payment.paid_date !== null ? { paidDate: payment.paid_date } : {})
		}))
	}, [selectedTenantPayments?.payments])
	const totalPaidByTenant = React.useMemo(() => {
		if (!selectedTenantId) return new Map<string, number>()
		return new Map([[selectedTenantId, selectedTenantTotalPaid]])
	}, [selectedTenantId, selectedTenantTotalPaid])
	const tenants = React.useMemo(
		() => rawTenants.map(tenant => transformToTenantItem(tenant, totalPaidByTenant)),
		[rawTenants, totalPaidByTenant]
	)

	// Get selected tenant detail
	const selectedTenant = React.useMemo(() => {
		if (!selectedTenantId) return undefined
		const raw = rawTenants.find(t => t.id === selectedTenantId)
		return raw
			? transformToTenantDetail(
					raw,
					totalPaidByTenant,
					selectedTenantPaymentHistory
				)
			: undefined
	}, [
		selectedTenantId,
		rawTenants,
		totalPaidByTenant,
		selectedTenantPaymentHistory
	])

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

	const { mutate: resendInvitation } = useResendInvitation()
	const { mutate: cancelInvitation } = useCancelInvitation()

	// Callbacks
	const handleInviteTenant = React.useCallback(() => {
		router.push('/tenants/new')
	}, [router])

	const handleViewTenant = React.useCallback((tenantId: string) => {
		setSelectedTenantId(tenantId)
	}, [])

	const handleEditTenant = React.useCallback(
		(tenantId: string) => {
			router.push(`/tenants/${tenantId}/edit`)
		},
		[router]
	)


	const confirmDeleteTenant = React.useCallback(() => {
		if (tenantToDelete) {
			deleteTenant(tenantToDelete)
			setTenantToDelete(null)
		}
	}, [tenantToDelete, deleteTenant])

	const handleContactTenant = React.useCallback(
		(tenantId: string, method: 'email' | 'phone') => {
			const tenant = rawTenants.find(t => t.id === tenantId)
			if (!tenant) return

			if (method === 'email' && tenant.email) {
				window.location.href = `mailto:${tenant.email}`
			} else if (method === 'phone' && tenant.phone) {
				window.location.href = `tel:${tenant.phone}`
			}
		},
		[rawTenants]
	)

	const handleViewLease = React.useCallback(
		(leaseId: string) => {
			router.push(`/leases/${leaseId}`)
		},
		[router]
	)

	const handleViewPaymentHistory = React.useCallback(
		(tenantId: string) => {
			router.push(`/tenants/${tenantId}/payments`)
		},
		[router]
	)

	const handleResendInvitation = React.useCallback((invitationId: string) => {
		toast.info('Resending invitation...')
		resendInvitation(invitationId)
	}, [resendInvitation])

	const handleCancelInvitation = React.useCallback((invitationId: string) => {
		toast.info('Cancelling invitation...')
		cancelInvitation(invitationId)
	}, [cancelInvitation])

	if (isLoading) {
		return <TenantsLoadingSkeleton />
	}

	return (
		<>
			<Tenants
				tenants={tenants}
				invitations={[]}
				selectedTenant={selectedTenant}
				onInviteTenant={handleInviteTenant}
				onResendInvitation={handleResendInvitation}
				onCancelInvitation={handleCancelInvitation}
				onViewTenant={handleViewTenant}
				onEditTenant={handleEditTenant}
				onContactTenant={handleContactTenant}
				onViewLease={handleViewLease}
				onViewPaymentHistory={handleViewPaymentHistory}
			/>

			<AlertDialog
				open={tenantToDelete !== null}
				onOpenChange={open => !open && setTenantToDelete(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Tenant</AlertDialogTitle>
						<AlertDialogDescription>
							This will mark the tenant as inactive and remove them from active
							listings. Their data will be retained for legal compliance. Are you
							sure you want to continue?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDeleteTenant}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
