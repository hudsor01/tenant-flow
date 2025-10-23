'use client'

import { revalidatePath } from 'next/cache'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { maintenanceApi } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Trash2, Wrench } from 'lucide-react'
import Link from 'next/link'
import { useOptimistic, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ColumnDef } from '@tanstack/react-table'
import type { MaintenanceRequestResponse } from '@repo/shared/types/core'

const logger = createLogger({ component: 'MaintenancePage' })

const PRIORITY_VARIANTS: Record<string, 'destructive' | 'secondary' | 'outline'> = {
	HIGH: 'destructive',
	MEDIUM: 'secondary',
	LOW: 'outline'
}

async function deleteMaintenanceRequest(requestId: string) {
	'use server'
	try {
		await maintenanceApi.remove(requestId)
		revalidatePath('/manage/maintenance')
		return { success: true }
	} catch (error) {
		logger.error('Failed to delete maintenance request', {
			action: 'deleteMaintenanceRequest',
			metadata: { requestId, error: error instanceof Error ? error.message : String(error) }
		})
		throw error
	}
}

export default async function MaintenancePage() {
	const data = await maintenanceApi.list()
	return <MaintenanceClient initialData={data} deleteAction={deleteMaintenanceRequest} />
}

type MaintenanceRequest = MaintenanceRequestResponse['data'][number]

function MaintenanceClient({
	initialData,
	deleteAction
}: {
	initialData: MaintenanceRequestResponse
	deleteAction: (id: string) => Promise<{ success: boolean }>
}) {
	const [isPending, startTransition] = useTransition()
	const [deletingId, setDeletingId] = useState<string | null>(null)
	const [optimisticRequests, removeOptimistic] = useOptimistic(
		initialData.data,
		(state: MaintenanceRequestResponse['data'], requestId: string) => state.filter(r => r.id !== requestId)
	)

	const handleDelete = (requestId: string, requestTitle: string) => {
		setDeletingId(requestId)
		startTransition(async () => {
			removeOptimistic(requestId)
			try {
				await deleteAction(requestId)
				toast.success(`Request "${requestTitle}" deleted`)
			} catch (error) {
				logger.error('Failed to delete maintenance request', undefined, error)
				toast.error('Failed to delete request')
			} finally {
				setDeletingId(null)
			}
		})
	}

	// ✅ Inline columns - NO wrapper file
	const columns: ColumnDef<MaintenanceRequest>[] = [
		{
			accessorKey: 'title',
			header: 'Request',
			cell: ({ row }) => {
				const request = row.original
				return (
					<Link href={`/manage/maintenance/${request.id}`} className="hover:underline">
						<div className="flex flex-col gap-1">
							<span className="font-medium">{request.title}</span>
							<span className="text-sm text-muted-foreground">
								Created {new Date(request.createdAt ?? '').toLocaleDateString()}
							</span>
						</div>
					</Link>
				)
			}
		},
		{
			accessorKey: 'property',
			header: 'Location',
			cell: ({ row }) => {
				const request = row.original
				return (
					<div>
						<div className="text-sm">{request.property?.name ?? 'Unassigned'}</div>
						<div className="text-xs text-muted-foreground">{request.unit?.name ?? 'No unit'}</div>
					</div>
				)
			}
		},
		{
			accessorKey: 'status',
			header: 'Status',
			cell: ({ row }) => <Badge variant="outline">{row.getValue('status') as string}</Badge>
		},
		{
			accessorKey: 'priority',
			header: 'Priority',
			cell: ({ row }) => {
				const priority = row.getValue('priority') as string
				return <Badge variant={PRIORITY_VARIANTS[priority] ?? 'outline'}>{priority}</Badge>
			}
		},
		{
			id: 'actions',
			cell: ({ row }) => {
				const request = row.original
				return (
					<div className="flex items-center justify-end gap-1">
						<Button asChild size="sm" variant="ghost">
							<Link href={`/manage/maintenance/${request.id}`}>View</Link>
						</Button>
						<Button asChild size="sm" variant="ghost">
							<Link href={`/manage/maintenance/${request.id}/edit`}>Edit</Link>
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
									<AlertDialogTitle>Delete maintenance request</AlertDialogTitle>
									<AlertDialogDescription>
										Permanently remove <strong>{request.title}</strong>?
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction
										disabled={isPending && deletingId === request.id}
										onClick={() => handleDelete(request.id, request.title)}
										className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
									>
										{isPending && deletingId === request.id ? 'Deleting...' : 'Delete'}
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
		<div className="space-y-10">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">Maintenance</h1>
				<p className="text-muted-foreground">Stay on top of maintenance requests and keep residents updated on progress.</p>
			</div>

			<div>
				<Button asChild>
					<Link href="/manage/maintenance/new">
						<Wrench className="size-4 mr-2" />
						New Request
					</Link>
				</Button>
			</div>

			{/* Inline DataTable */}
			<Card>
				<CardHeader>
					<CardTitle>Maintenance Requests</CardTitle>
					<CardDescription>Track maintenance tickets and resolution progress</CardDescription>
				</CardHeader>
				<CardContent>
					<DataTable columns={columns} data={optimisticRequests} filterColumn="title" filterPlaceholder="Filter by request title..." />
				</CardContent>
			</Card>
		</div>
	)
}
