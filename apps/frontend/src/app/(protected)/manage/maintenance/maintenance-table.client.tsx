'use client'

import Link from 'next/link'
import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { DataTable } from '#components/ui/data-table'
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
} from '#components/ui/alert-dialog'
import { Trash2 } from 'lucide-react'
import { useOptimistic, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ColumnDef } from '@tanstack/react-table'
import type { MaintenanceRequestResponse } from '@repo/shared/types/core'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'MaintenanceTableClient' })

type MaintenanceRequest = MaintenanceRequestResponse['data'][number]

interface MaintenanceTableClientProps {
	columns: ColumnDef<MaintenanceRequest>[]
	initialRequests: MaintenanceRequest[]
}

export function MaintenanceTableClient({
	columns,
	initialRequests
}: MaintenanceTableClientProps) {
	const [isPending, startTransition] = useTransition()
	const [deletingId, setDeletingId] = useState<string | null>(null)
	const [optimisticRequests, removeOptimistic] = useOptimistic(
		initialRequests,
		(state, requestId: string) => state.filter(r => r.id !== requestId)
	)

	const handleDelete = (requestId: string, requestTitle: string) => {
		setDeletingId(requestId)
		startTransition(async () => {
			removeOptimistic(requestId)
			try {
				const res = await fetch(`/api/v1/maintenance/${requestId}`, {
					method: 'DELETE',
					credentials: 'include'
				})
				if (!res.ok) throw new Error('Failed to delete maintenance request')
				toast.success(`Request "${requestTitle}" deleted`)
			} catch (error) {
				logger.error('Delete failed', {
					action: 'handleDelete',
					metadata: { requestId, error }
				})
				toast.error('Failed to delete request')
				// Optimistic update will auto-rollback on error
			} finally {
				setDeletingId(null)
			}
		})
	}

	// Add delete action column
	const columnsWithActions: ColumnDef<MaintenanceRequest>[] = [
		...columns,
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
								<Button
									size="sm"
									variant="ghost"
									className="text-destructive hover:text-destructive"
								>
									<Trash2 className="size-4" />
									<span className="sr-only">Delete</span>
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>
										Delete maintenance request
									</AlertDialogTitle>
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
										{isPending && deletingId === request.id
											? 'Deleting...'
											: 'Delete'}
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
				<CardTitle>Maintenance Requests</CardTitle>
				<CardDescription>
					Track maintenance tickets and resolution progress
				</CardDescription>
			</CardHeader>
			<CardContent>
				<DataTable
					columns={columnsWithActions}
					data={optimisticRequests}
					filterColumn="title"
					filterPlaceholder="Filter by request title..."
				/>
			</CardContent>
		</Card>
	)
}
