"use client"

import Link from 'next/link'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
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
import { toast } from 'sonner'
import type { MaintenanceRequestResponse } from '@repo/shared/types/core'
import { clientFetch } from '#lib/api/client'

const PRIORITY_VARIANTS: Record<string, 'destructive' | 'secondary' | 'outline'> = {
	HIGH: 'destructive',
	MEDIUM: 'secondary',
	LOW: 'outline'
}

type MaintenanceRequest = MaintenanceRequestResponse['data'][number]

export const columns: ColumnDef<MaintenanceRequest>[] = [
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
		header: 'Actions',
		cell: ({ row }) => {
			const request = row.original
			return (
				<div className="flex items-center gap-2">
					<Button asChild size="sm" variant="ghost">
						<Link href={`/manage/maintenance/${request.id}/edit`}>Edit</Link>
					</Button>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
								<Trash2 className="size-4" />
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete Request</AlertDialogTitle>
								<AlertDialogDescription>
									Permanently delete "{request.title}"? This action cannot be undone.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
									onClick={async () => {
									try {
										await clientFetch(`/api/v1/maintenance/${request.id}`, { method: 'DELETE' })
										toast.success('Request deleted')
										window.location.reload()
									} catch {
										toast.error('Failed to delete')
									}
								}}
								>
									Delete
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			)
		}
	}
]
