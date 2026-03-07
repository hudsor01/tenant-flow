'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { tenantQueries } from '#hooks/api/query-keys/tenant-keys'
import { tenantPaymentQueries } from '#hooks/api/use-payments'
import {
	useCancelInvitationMutation,
	useResendInvitationMutation
} from '#hooks/api/use-tenant-invite-mutations'
import { useDeleteTenantMutation } from '#hooks/api/use-tenant-mutations'
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
import {
	normalizePaymentStatus,
	transformToTenantItem,
	transformToTenantSectionDetail
} from './components/tenant-transforms'
import { TenantsLoadingSkeleton } from './components/tenants-loading-skeleton'

export default function TenantsPage() {
	const router = useRouter()
	const [selectedTenantId, setSelectedTenantId] = useState<string | null>(
		null
	)
	const [tenantToDelete, setTenantToDelete] = useState<string | null>(null)

	// Fetch tenants list
	const { data: tenantsResponse, isLoading, error } = useQuery(tenantQueries.list())
	const rawTenants = useMemo(
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
	const selectedTenantTotalPaid = useMemo(() => {
		if (!selectedTenantPayments?.payments?.length) return 0
		return selectedTenantPayments.payments.reduce((total, payment) => {
			if (payment.status?.toLowerCase() === 'succeeded') {
				return total + payment.amount
			}
			return total
		}, 0)
	}, [selectedTenantPayments?.payments])
	const selectedTenantPaymentHistory = useMemo(() => {
		if (!selectedTenantPayments?.payments?.length) return undefined
		return selectedTenantPayments.payments.map(payment => ({
			id: payment.id,
			amount: payment.amount,
			status: normalizePaymentStatus(payment.status),
			dueDate: payment.due_date,
			...(payment.paid_date !== null ? { paidDate: payment.paid_date } : {})
		}))
	}, [selectedTenantPayments?.payments])
	const totalPaidByTenant = useMemo(() => {
		if (!selectedTenantId) return new Map<string, number>()
		return new Map([[selectedTenantId, selectedTenantTotalPaid]])
	}, [selectedTenantId, selectedTenantTotalPaid])
	const tenants = useMemo(
		() => rawTenants.map(tenant => transformToTenantItem(tenant, totalPaidByTenant)),
		[rawTenants, totalPaidByTenant]
	)

	// Get selected tenant detail
	const selectedTenant = useMemo(() => {
		if (!selectedTenantId) return undefined
		const raw = rawTenants.find(t => t.id === selectedTenantId)
		return raw
			? transformToTenantSectionDetail(
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

	// Delete mutation — consolidated hook with active-lease guard
	const { mutate: deleteTenant } = useDeleteTenantMutation()

	const { mutate: resendInvitation } = useResendInvitationMutation()
	const { mutate: cancelInvitation } = useCancelInvitationMutation()

	// Callbacks
	const handleInviteTenant = useCallback(() => {
		router.push('/tenants/new')
	}, [router])

	const handleViewTenant = useCallback((tenantId: string) => {
		setSelectedTenantId(tenantId)
	}, [])

	const handleEditTenant = useCallback(
		(tenantId: string) => {
			router.push(`/tenants/${tenantId}/edit`)
		},
		[router]
	)

	const confirmDeleteTenant = useCallback(() => {
		if (tenantToDelete) {
			deleteTenant(tenantToDelete)
			setTenantToDelete(null)
		}
	}, [tenantToDelete, deleteTenant])

	const handleContactTenant = useCallback(
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

	const handleViewLease = useCallback(
		(leaseId: string) => {
			router.push(`/leases/${leaseId}`)
		},
		[router]
	)

	const handleViewPaymentHistory = useCallback(
		(tenantId: string) => {
			router.push(`/tenants/${tenantId}/payments`)
		},
		[router]
	)

	const handleResendInvitation = useCallback((invitationId: string) => {
		toast.info('Resending invitation...')
		resendInvitation(invitationId)
	}, [resendInvitation])

	const handleCancelInvitation = useCallback((invitationId: string) => {
		toast.info('Cancelling invitation...')
		cancelInvitation(invitationId)
	}, [cancelInvitation])

	if (isLoading) {
		return <TenantsLoadingSkeleton />
	}

	if (error) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
					<h2 className="text-lg font-semibold text-destructive mb-2">
						Error Loading Tenants
					</h2>
					<p className="text-muted-foreground">
						{error instanceof Error ? error.message : 'Failed to load tenants'}
					</p>
				</div>
			</div>
		)
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
