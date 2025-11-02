'use client'

import { Button } from '#components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#components/ui/card'
import { DataTable } from '#components/ui/data-table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '#components/ui/alert-dialog'
import { Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useOptimistic, useState, useTransition, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { ColumnDef } from '@tanstack/react-table'
import type { TenantWithLeaseInfo } from '@repo/shared/types/core'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { clientFetch } from '#lib/api/client'
import { useResendInvitation } from '#hooks/api/use-tenant'

const logger = createLogger({ component: 'TenantsTableClient' })

interface TenantsTableClientProps {
	columns: ColumnDef<TenantWithLeaseInfo>[]
	initialTenants: TenantWithLeaseInfo[]
}

export function TenantsTableClient({ columns, initialTenants }: TenantsTableClientProps) {
	const [isPending, startTransition] = useTransition()
	const [deletingId, setDeletingId] = useState<string | null>(null)
	const [optimisticTenants, removeOptimistic] = useOptimistic(
		initialTenants,
		(state, tenantId: string) => state.filter(t => t.id !== tenantId)
	)

	const resendInvitationMutation = useResendInvitation()
	
	// Store mutation in ref to prevent re-registering event listener
	const mutationRef = useRef(resendInvitationMutation)
	mutationRef.current = resendInvitationMutation

	// Listen for resend invitation events from columns
	useEffect(() => {
		const handleResendInvitation = (event: Event) => {
			const customEvent = event as CustomEvent<{ tenantId: string }>
			const { tenantId } = customEvent.detail
			mutationRef.current.mutate(tenantId)
		}

		window.addEventListener('resend-invitation', handleResendInvitation)
		return () => {
			window.removeEventListener('resend-invitation', handleResendInvitation)
		}
	}, []) // Empty deps - listener only registered once

	const handleDelete = (tenantId: string, tenantName: string) => {
		setDeletingId(tenantId)
		startTransition(async () => {
			removeOptimistic(tenantId)
			try {
				await clientFetch(`/api/v1/tenants/${tenantId}`, { method: 'DELETE' })
				toast.success(`Tenant "${tenantName}" deleted`)
			} catch (error) {
				logger.error('Delete failed', { action: 'handleDelete', metadata: { tenantId, error } })
				toast.error('Failed to delete tenant')
				// Optimistic update will auto-rollback on error
			} finally {
				setDeletingId(null)
			}
		})
	}

	// Add delete action column
	const columnsWithActions: ColumnDef<TenantWithLeaseInfo>[] = [
		...columns,
		{
			id: 'actions',
			cell: ({ row }) => {
				const tenant = row.original
				return (
					<div className="flex items-center justify-end gap-1">
						<Button asChild size="sm" variant="ghost">
							<Link href={`/manage/tenants/${tenant.id}`}>View</Link>
						</Button>
						<Button asChild size="sm" variant="ghost">
							<Link href={`/manage/tenants/${tenant.id}/edit`}>Edit</Link>
						</Button>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
									<Trash2 className="size-4" />
									<span className="sr-only">Delete</span>
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Delete tenant</AlertDialogTitle>
									<AlertDialogDescription>
										Permanently delete <strong>{tenant.name}</strong> and associated leases?
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction
										disabled={isPending && deletingId === tenant.id}
										onClick={() => handleDelete(tenant.id, tenant.name)}
										className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
									>
										{isPending && deletingId === tenant.id ? 'Deleting...' : 'Delete'}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				)
			}
		}
	]

	return (
		<Card>
			<CardHeader>
				<CardTitle>Tenants</CardTitle>
				<CardDescription>Manage tenants and lease information</CardDescription>
			</CardHeader>
			<CardContent>
				<DataTable columns={columnsWithActions} data={optimisticTenants} filterColumn="name" filterPlaceholder="Filter by tenant name..." />
			</CardContent>
		</Card>
	)
}
