'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { useQueryClient } from '@tanstack/react-query'
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
} from '#components/ui/dialog'
import { Clock, MapPin, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type {
	MaintenanceRequest,
	MaintenanceStatus,
	MaintenancePriority
} from '@repo/shared/types/core'
import { apiRequest } from '#lib/api-request'
import { maintenanceQueries } from '#hooks/api/query-keys/maintenance-keys'

// Extended type with optional relations for display
type MaintenanceRequestWithRelations = MaintenanceRequest & {
	property?: { name: string } | null
	unit?: { name: string } | null
	assignedTo?: { name: string } | null
	tenant?: { name: string } | null
}

// Status badge styling aligned with design-os
function getStatusBadge(status: MaintenanceStatus | string) {
	const normalizedStatus = status?.toLowerCase()
	const config: Record<string, { className: string; label: string }> = {
		open: {
			className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
			label: 'Open'
		},
		in_progress: {
			className: 'bg-primary/10 text-primary',
			label: 'In Progress'
		},
		completed: {
			className: 'bg-green-500/10 text-green-600 dark:text-green-400',
			label: 'Completed'
		},
		on_hold: {
			className: 'bg-muted text-muted-foreground',
			label: 'On Hold'
		},
		cancelled: {
			className: 'bg-muted text-muted-foreground',
			label: 'Cancelled'
		}
	}

	const badge = config[normalizedStatus] ?? {
		className: 'bg-muted text-muted-foreground',
		label: status
	}

	return (
		<span
			className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
		>
			{badge.label}
		</span>
	)
}

// Priority badge styling aligned with design-os
function getPriorityBadge(priority: MaintenancePriority | string) {
	const normalizedPriority = priority?.toLowerCase()
	const config: Record<string, { className: string; label: string }> = {
		low: {
			className: 'bg-muted text-muted-foreground',
			label: 'Low'
		},
		medium: {
			className: 'bg-primary/10 text-primary',
			label: 'Medium'
		},
		normal: {
			className: 'bg-primary/10 text-primary',
			label: 'Normal'
		},
		high: {
			className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
			label: 'High'
		},
		urgent: {
			className: 'bg-destructive/10 text-destructive',
			label: 'Urgent'
		}
	}

	const badge = config[normalizedPriority] ?? {
		className: 'bg-muted text-muted-foreground',
		label: priority
	}

	return (
		<span
			className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
		>
			{badge.label}
		</span>
	)
}

// Calculate days open for aging display
function getDaysOpen(timestamp: string | null | undefined): number {
	if (!timestamp) return 0
	const date = new Date(timestamp)
	const now = new Date()
	const diff = now.getTime() - date.getTime()
	return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function getAgingBadge(timestamp: string | null | undefined) {
	const days = getDaysOpen(timestamp)

	let className: string
	let label: string

	if (days <= 3) {
		className = 'bg-green-500/10 text-green-600 dark:text-green-400'
		label = days === 0 ? 'Today' : days === 1 ? '1 day' : `${days} days`
	} else if (days <= 7) {
		className = 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
		label = `${days} days`
	} else if (days <= 14) {
		className =
			'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
		label = `${days} days`
	} else {
		className = 'bg-destructive/10 text-destructive'
		label = `${days} days`
	}

	return (
		<div
			className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
		>
			<Clock className="w-3 h-3" />
			{label}
		</div>
	)
}

export const columns: ColumnDef<MaintenanceRequestWithRelations>[] = [
	{
		accessorKey: 'title',
		header: 'Request',
		cell: ({ row }) => {
			const request = row.original
			return (
				<Link
					href={`/maintenance/${request.id}`}
					className="hover:underline block"
				>
					<div className="flex flex-col gap-1">
						<span className="font-medium text-foreground line-clamp-1">
							{request.title ?? request.description}
						</span>
						{getAgingBadge(request.created_at)}
					</div>
				</Link>
			)
		}
	},
	{
		accessorKey: 'properties',
		header: 'Location',
		cell: ({ row }) => {
			const request = row.original
			const propertyName = request.property?.name ?? 'Unassigned'
			const unitName = request.unit?.name

			return (
				<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
					<MapPin className="w-3.5 h-3.5 flex-shrink-0" />
					<span className="truncate">
						{propertyName}
						{unitName && ` · Unit ${unitName}`}
					</span>
				</div>
			)
		}
	},
	{
		accessorKey: 'status',
		header: 'Status',
		cell: ({ row }) => getStatusBadge(row.getValue('status') as string)
	},
	{
		accessorKey: 'priority',
		header: 'Priority',
		cell: ({ row }) => getPriorityBadge(row.getValue('priority') as string)
	},
	{
		id: 'actions',
		header: 'Actions',
		cell: ({ row }) => <MaintenanceActionsCell request={row.original} />
	}
]

function MaintenanceActionsCell({
	request
}: {
	request: MaintenanceRequestWithRelations
}) {
	const queryClient = useQueryClient()
	const [isDeleting, setIsDeleting] = useState(false)

	const handleDelete = async () => {
		setIsDeleting(true)
		try {
			await apiRequest<void>(`/api/v1/maintenance/${request.id}`, {
				method: 'DELETE'
			})
			toast.success('Request deleted')

			await Promise.all([
				queryClient.invalidateQueries({ queryKey: maintenanceQueries.lists() }),
				queryClient.invalidateQueries({
					queryKey: maintenanceQueries.stats().queryKey
				})
			])
		} catch {
			toast.error('Failed to delete')
		} finally {
			setIsDeleting(false)
		}
	}

	return (
		<div className="flex items-center gap-2">
			<Button asChild size="sm" variant="ghost">
				<Link href={`/maintenance/${request.id}/edit`}>Edit</Link>
			</Button>
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button
						size="sm"
						variant="ghost"
						className="text-destructive hover:text-destructive"
						disabled={isDeleting}
						aria-label="Delete request"
					>
						<Trash2 className="size-4" />
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Request</AlertDialogTitle>
						<AlertDialogDescription>
							Permanently delete "{request.title ?? request.description}"? This
							action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={handleDelete}
						>
							{isDeleting ? 'Deleting...' : 'Delete'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
