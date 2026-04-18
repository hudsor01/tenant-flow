'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { tenantQueries } from '#hooks/api/query-keys/tenant-keys'
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
	const rawTenants = tenantsResponse?.data ?? []

	const totalPaidByTenant = new Map<string, number>()
	const tenants = rawTenants.map(tenant => transformToTenantItem(tenant, totalPaidByTenant))

	// Get selected tenant detail
	const selectedTenant = (() => {
		if (!selectedTenantId) return undefined
		const raw = rawTenants.find(t => t.id === selectedTenantId)
		return raw
			? transformToTenantSectionDetail(raw, totalPaidByTenant)
			: undefined
	})()

	// Delete mutation — consolidated hook with active-lease guard
	const { mutate: deleteTenant } = useDeleteTenantMutation()

	// Callbacks
	const handleViewTenant = (tenantId: string) => {
		setSelectedTenantId(tenantId)
	}

	const handleEditTenant = (tenantId: string) => {
			router.push(`/tenants/${tenantId}/edit`)
		}

	const confirmDeleteTenant = () => {
		if (tenantToDelete) {
			deleteTenant(tenantToDelete)
			setTenantToDelete(null)
		}
	}

	const handleContactTenant = (tenantId: string, method: 'email' | 'phone') => {
			const tenant = rawTenants.find(t => t.id === tenantId)
			if (!tenant) return

			if (method === 'email' && tenant.email) {
				window.location.href = `mailto:${tenant.email}`
			} else if (method === 'phone' && tenant.phone) {
				window.location.href = `tel:${tenant.phone}`
			}
		}

	const handleViewLease = (leaseId: string) => {
			router.push(`/leases/${leaseId}`)
		}

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
				onViewTenant={handleViewTenant}
				onEditTenant={handleEditTenant}
				onContactTenant={handleContactTenant}
				onViewLease={handleViewLease}
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
