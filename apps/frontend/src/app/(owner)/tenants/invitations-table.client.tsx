'use client'

import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { DataTable } from '#components/data-table/data-table'
import { DataTableToolbar } from '#components/data-table/data-table-toolbar'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '#components/ui/dialog'
import { Badge } from '#components/ui/badge'
import { RotateCcw, X, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import {
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable
} from '@tanstack/react-table'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { apiRequest } from '#lib/api-request'
import {
	tenantQueries,
	type TenantInvitation
} from '#hooks/api/queries/tenant-queries'
import { formatDistanceToNow } from 'date-fns'

const logger = createLogger({ component: 'InvitationsTableClient' })

export function InvitationsTableClient() {
	const [cancellingId, setCancellingId] = useState<string | null>(null)
	const [_isPending, startTransition] = useTransition()
	const queryClient = useQueryClient()

	// Fetch invitations
	const { data, isLoading } = useQuery(tenantQueries.invitationList())

	// Cancel mutation
	const cancelMutation = useMutation({
		mutationFn: async (invitation_id: string) =>
			apiRequest<void>(`/api/v1/tenants/invitations/${invitation_id}/cancel`, {
				method: 'POST'
			}),
		onSuccess: () => {
			toast.success('Invitation cancelled')
			queryClient.invalidateQueries({ queryKey: tenantQueries.invitations() })
		},
		onError: error => {
			logger.error('Failed to cancel invitation', { error })
			toast.error('Failed to cancel invitation')
		}
	})

	// Resend mutation
	const resendMutation = useMutation({
		mutationFn: async (tenant_id: string) =>
			apiRequest<void>(`/api/v1/tenants/${tenant_id}/resend-invitation`, {
				method: 'POST'
			}),
		onSuccess: () => {
			toast.success('Invitation resent')
			queryClient.invalidateQueries({ queryKey: tenantQueries.invitations() })
		},
		onError: error => {
			logger.error('Failed to resend invitation', { error })
			toast.error('Failed to resend invitation')
		}
	})

	const handleCancel = (invitation_id: string) => {
		setCancellingId(invitation_id)
		startTransition(() => {
			cancelMutation.mutate(invitation_id, {
				onSettled: () => setCancellingId(null)
			})
		})
	}

	const getStatusBadge = (status: TenantInvitation['status']) => {
		switch (status) {
			case 'sent':
				return (
					<Badge
						variant="outline"
						className="border-warning text-warning bg-warning/10"
					>
						<Clock className="size-3 mr-1" />
						Pending
					</Badge>
				)
			case 'accepted':
				return (
					<Badge
						variant="outline"
						className="border-success text-success bg-success/10"
					>
						<CheckCircle2 className="size-3 mr-1" />
						Accepted
					</Badge>
				)
			case 'expired':
				return (
					<Badge
						variant="outline"
						className="border-muted/500 text-muted/600 bg-muted/50"
					>
						<AlertCircle className="size-3 mr-1" />
						Expired
					</Badge>
				)
			default:
				return null
		}
	}

	const columns: ColumnDef<TenantInvitation>[] = [
		{
			accessorKey: 'email',
			header: 'Email',
			meta: {
				label: 'Email',
				variant: 'text',
				placeholder: 'Search email...'
			},
			enableColumnFilter: true,
			cell: ({ row }) => {
				const invitation = row.original
				const name =
					invitation.first_name && invitation.last_name
						? `${invitation.first_name} ${invitation.last_name}`
						: null
				return (
					<div className="flex flex-col">
						{name && <span className="font-medium">{name}</span>}
						<span>{invitation.email}</span>
					</div>
				)
			}
		},
		{
			accessorKey: 'property_name',
			header: 'Property',
			cell: ({ row }) => {
				const invitation = row.original
				return (
					<div className="flex flex-col">
						<span>{invitation.property_name}</span>
						{invitation.unit_number && (
							<span className="text-muted-foreground">
								Unit {invitation.unit_number}
							</span>
						)}
					</div>
				)
			}
		},
		{
			accessorKey: 'status',
			header: 'Status',
			meta: {
				label: 'Status',
				variant: 'select',
				options: [
					{ label: 'Pending', value: 'sent' },
					{ label: 'Accepted', value: 'accepted' },
					{ label: 'Expired', value: 'expired' }
				]
			},
			enableColumnFilter: true,
			cell: ({ row }) => getStatusBadge(row.original.status)
		},
		{
			accessorKey: 'created_at',
			header: 'Sent',
			cell: ({ row }) => (
				<span className="text-muted-foreground">
					{formatDistanceToNow(new Date(row.original.created_at), {
						addSuffix: true
					})}
				</span>
			)
		},
		{
			accessorKey: 'expires_at',
			header: 'Expires',
			cell: ({ row }) => {
				const isExpired = new Date(row.original.expires_at) < new Date()
				return (
					<span
						className={isExpired ? 'text-destructive' : 'text-muted-foreground'}
					>
						{formatDistanceToNow(new Date(row.original.expires_at), {
							addSuffix: true
						})}
					</span>
				)
			}
		},
		{
			id: 'actions',
			cell: ({ row }) => {
				const invitation = row.original
				const isPending = invitation.status === 'sent'

				if (!isPending) return null

				return (
					<div className="flex items-center justify-end gap-1">
						<Button
							size="sm"
							variant="ghost"
							onClick={() => resendMutation.mutate(invitation.id)}
							disabled={resendMutation.isPending}
						>
							<RotateCcw className="size-4 mr-1" />
							Resend
						</Button>

						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button
									size="sm"
									variant="ghost"
									className="text-destructive hover:text-destructive"
								>
									<X className="size-4" />
									<span className="sr-only">Cancel</span>
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Cancel invitation</AlertDialogTitle>
									<AlertDialogDescription>
										Cancel the invitation sent to{' '}
										<strong>{invitation.email}</strong>? They will no longer be
										able to accept this invitation.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Keep Invitation</AlertDialogCancel>
									<AlertDialogAction
										disabled={
											cancelMutation.isPending && cancellingId === invitation.id
										}
										onClick={() => handleCancel(invitation.id)}
										className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
									>
										{cancelMutation.isPending && cancellingId === invitation.id
											? 'Cancelling...'
											: 'Cancel Invitation'}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				)
			}
		}
	]

	const invitations = data?.data ?? []

	const table = useReactTable({
		data: invitations,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Pending Invitations</CardTitle>
					<CardDescription>Track tenant invitation status</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex-center h-32">
						<span className="text-muted-foreground">
							Loading invitations...
						</span>
					</div>
				</CardContent>
			</Card>
		)
	}

	if (invitations.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Pending Invitations</CardTitle>
					<CardDescription>Track tenant invitation status</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex-center h-32">
						<span className="text-muted-foreground">No invitations yet</span>
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Pending Invitations</CardTitle>
				<CardDescription>
					{invitations.filter(i => i.status === 'sent').length} pending,{' '}
					{invitations.filter(i => i.status === 'accepted').length} accepted
				</CardDescription>
			</CardHeader>
			<CardContent>
				<DataTable table={table}>
					<DataTableToolbar table={table} />
				</DataTable>
			</CardContent>
		</Card>
	)
}
